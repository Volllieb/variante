import { supabase } from '@/lib/supabase'
import { safeError, safeLog } from '@/lib/safeLog'
import { cronRoute } from '@/lib/cronAuth'

// POST /api/cron/cleanup-webhooks — Löscht Stripe-Webhook-Events älter als 90 Tage.
// Wird von Vercel Cron wöchentlich aufgerufen.

export const { GET, POST } = cronRoute(async (_req) => {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { error, count } = await supabase
    .from('stripe_webhook_events')
    .delete({ count: 'exact' })
    .lt('processed_at', cutoff)

  if (error) {
    safeError('cron:cleanup-webhooks', error)
    return Response.json({ error: 'db error' }, { status: 500 })
  }

  safeLog('info', 'cron:cleanup-webhooks', 'completed', { deleted: count ?? 0 })
  return Response.json({ deleted: count ?? 0, cutoff })
})
