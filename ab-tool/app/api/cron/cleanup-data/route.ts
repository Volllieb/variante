import { supabase } from '@/lib/supabase'
import { safeError } from '@/lib/safeLog'

// POST /api/cron/cleanup-data — DSGVO Retention: Waitlist-TTL + verwaiste Events.
// Wird von Vercel Cron wöchentlich aufgerufen (Sonntag 03:00 UTC).
//
// Security: Authorization-Header mit CRON_SECRET erforderlich.
export async function POST(req: Request) {
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

export async function GET() {
  return Response.json({ status: 'ok', hint: 'Trigger via POST with CRON_SECRET' })
}
