import { supabase } from '@/lib/supabase'
import { safeError, safeLog } from '@/lib/safeLog'
import { cronRoute } from '@/lib/cronAuth'

// POST /api/cron/cleanup-data — DSGVO Retention: Waitlist-TTL + verwaiste Events.
// Wird von Vercel Cron wöchentlich aufgerufen (Sonntag 03:00 UTC).

export const { GET, POST } = cronRoute(async (_req) => {
  const { data, error } = await supabase.rpc('cleanup_retention_data')

  if (error) {
    safeError('cron:cleanup-data', error)
    return Response.json({ error: 'db error' }, { status: 500 })
  }

  safeLog('info', 'cron:cleanup-data', 'completed', { actions: data ?? [] })
  return Response.json({ actions: data ?? [] })
})
