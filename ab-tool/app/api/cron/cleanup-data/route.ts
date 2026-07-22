import { supabase } from '@/lib/supabase'
import { safeError } from '@/lib/safeLog'

// POST /api/cron/cleanup-data — DSGVO Retention: Waitlist-TTL + verwaiste Events.
// Wird von Vercel Cron wöchentlich aufgerufen (Sonntag 03:00 UTC).
//
// Security: Authorization-Header mit CRON_SECRET erforderlich.
async function run(req: Request) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.CRON_SECRET
  if (!expected || secret !== expected) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase.rpc('cleanup_retention_data')

  if (error) {
    safeError('cron:cleanup-data', error)
    return Response.json({ error: 'db error' }, { status: 500 })
  }

  return Response.json({ actions: data ?? [] })
}

// Vercel Cron ruft den Pfad per GET auf — die Methode ist in vercel.json
// nicht konfigurierbar. Vorher lag die Arbeit ausschliesslich in POST und
// GET gab nur einen Hinweistext zurueck: KEIN Cron-Job lief jemals
// (Plan OPS-01). Der Authorization: Bearer $CRON_SECRET wird von Vercel
// automatisch mitgeschickt.
export const GET = run
export const POST = run
