import { supabase } from '@/lib/supabase'
import { safeError } from '@/lib/safeLog'

// POST /api/cron/cleanup-webhooks — Löscht Stripe-Webhook-Events älter als 90 Tage.
// Wird von Vercel Cron wöchentlich aufgerufen.
//
// Security: Authorization-Header mit CRON_SECRET erforderlich.
async function run(req: Request) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.CRON_SECRET
  if (!expected || secret !== expected) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { error, count } = await supabase
    .from('stripe_webhook_events')
    .delete({ count: 'exact' })
    .lt('processed_at', cutoff)

  if (error) {
    safeError('cron:cleanup-webhooks', error)
    return Response.json({ error: 'db error' }, { status: 500 })
  }

  return Response.json({ deleted: count ?? 0, cutoff })
}

// Vercel Cron ruft den Pfad per GET auf — die Methode ist in vercel.json
// nicht konfigurierbar. Vorher lag die Arbeit ausschliesslich in POST und
// GET gab nur einen Hinweistext zurueck: KEIN Cron-Job lief jemals
// (Plan OPS-01). Der Authorization: Bearer $CRON_SECRET wird von Vercel
// automatisch mitgeschickt.
export const GET = run
export const POST = run
