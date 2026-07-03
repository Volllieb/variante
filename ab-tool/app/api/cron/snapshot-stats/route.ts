import { supabase } from '@/lib/supabase'
import { safeError } from '@/lib/safeLog'

// POST /api/cron/snapshot-stats — Täglicher Snapshot aller aktiven Tests
// Wird von Vercel Cron täglich um Mitternacht aufgerufen.
//
// Security: Authorization-Header mit CRON_SECRET erforderlich.
export async function POST(req: Request) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.CRON_SECRET
  if (!expected || secret !== expected) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Alle aktiven und pausierten Tests snapshoten
  const { data: tests, error } = await supabase
    .from('tests')
    .select('id')
    .in('status', ['active', 'paused'])

  if (error) {
    safeError('cron:snapshot-stats', error)
    return Response.json({ error: 'db error' }, { status: 500 })
  }

  let snapshotted = 0
  for (const t of tests ?? []) {
    const { error: rpcError } = await supabase.rpc('snapshot_daily_stats', { p_test_id: t.id })
    if (!rpcError) snapshotted++
  }

  return Response.json({ snapshotted })
}

export async function GET() {
  return Response.json({ status: 'ok', hint: 'Trigger via POST with CRON_SECRET' })
}
