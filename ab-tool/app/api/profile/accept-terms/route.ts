import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/profile/accept-terms
 *
 * Setzt terms_accepted_at auf jetzt — aufgerufen nach Signup (Email) oder
 * beim ersten Login (Google OAuth macht das im Auth-Callback).
 * Idempotent: überschreibt einen bestehenden Timestamp nicht.
 */
export async function POST() {
  const user = await getSessionUser()
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ terms_accepted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('terms_accepted_at', null)

  if (error) {
    return Response.json({ error: 'db error' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
