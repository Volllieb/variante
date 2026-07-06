import { supabase } from '@/lib/supabase'
import { safeError } from '@/lib/safeLog'

// POST /api/cron/cleanup-webhooks — Löscht Stripe-Webhook-Events älter als 90 Tage.
// Wird von Vercel Cron wöchentlich aufgerufen.
//
// Security: Authorization-Header mit CRON_SECRET erforderlich.
export async function POST(req: Request) {
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

export async function GET() {
  return Response.json({ status: 'ok', hint: 'Trigger via POST with CRON_SECRET' })
}
