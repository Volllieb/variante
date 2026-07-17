import { supabase } from '@/lib/supabase'
import { safeError } from '@/lib/safeLog'
import { deletePreviewShots } from '@/lib/screenshot'

// POST /api/cron/cleanup-previews — 24h-TTL für ungeclaimte Hybrid-Previews.
// Täglich per Vercel Cron (04:00 UTC). Plan §7 Punkt 3.
//
// Räumt Rows UND Storage ab. Geclaimte Previews (user_id gesetzt) bleiben —
// die gehören dann einem echten User; deren Screenshots löscht der Claim-Pfad.
//
// Security: Authorization-Header mit CRON_SECRET erforderlich.

const TTL_HOURS = 24
const BATCH = 500

export async function POST(req: Request) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.CRON_SECRET
  if (!expected || secret !== expected) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - TTL_HOURS * 3_600_000).toISOString()

  const { data: stale, error } = await supabase
    .from('tests')
    .select('id, preview_data')
    .eq('status', 'preview')
    .is('user_id', null)
    .lt('created_at', cutoff)
    .limit(BATCH)

  if (error) {
    safeError('cron:cleanup-previews', error)
    return Response.json({ error: 'db error' }, { status: 500 })
  }

  if (!stale?.length) return Response.json({ actions: [{ action: 'noop', count: 0 }] })

  // Storage zuerst: bleibt hier was liegen, finden wir es nie wieder — die
  // previewId steht nur in der Row, die wir gleich löschen.
  let shotsDeleted = 0
  for (const row of stale) {
    const previewId = (row.preview_data as { previewId?: string } | null)?.previewId
    if (!previewId) continue
    try {
      await deletePreviewShots(previewId)
      shotsDeleted++
    } catch (err) {
      safeError('cron:cleanup-previews-storage', err)
    }
  }

  const { error: delError } = await supabase
    .from('tests')
    .delete()
    .in('id', stale.map((r) => r.id))

  if (delError) {
    safeError('cron:cleanup-previews-delete', delError)
    return Response.json({ error: 'db error' }, { status: 500 })
  }

  // Jede Website-Preview legt eine temp_sessions-Row an (für den Claim-Pfad).
  // cleanup_temp_sessions() (Migration 012) räumt Sessions >7 Tage samt ihrer
  // Tests ab — bis hierher hatte die Funktion keinen Aufrufer. Ohne das würden
  // ungeclaimte Preview-Sessions unbegrenzt liegen bleiben.
  const { data: sessionActions, error: sessionErr } = await supabase.rpc('cleanup_temp_sessions')
  if (sessionErr) safeError('cron:cleanup-previews-sessions', sessionErr)

  return Response.json({
    actions: [
      { action: 'stale_previews_cleaned', count: stale.length },
      { action: 'preview_shots_cleaned', count: shotsDeleted },
      ...(Array.isArray(sessionActions) ? sessionActions : []),
    ],
  })
}

export async function GET() {
  return Response.json({ status: 'ok', hint: 'Trigger via POST with CRON_SECRET' })
}
