import { supabase } from '@/lib/supabase'
import { corsHeaders } from '@/lib/cors'
import { getSessionUser } from '@/lib/supabaseServer'

export type ApiUser = { userId: string; plan: string }

/**
 * Garantiert dass ein profiles-Eintrag für den User existiert.
 * Deckt den Race-Condition-Fall ab, wo der Supabase-auth-Trigger
 * `handle_new_user` noch nicht gefeuert hat (z. B. OAuth-Signup).
 * Idempotent — `on conflict do nothing` auf user_id.
 *
 * Optional: `source`/`plan` für First-Touch-Attribution. Wird nur gesetzt,
 * wenn der profile-row brandneu ist (Trigger war noch nicht da).
 */
export async function ensureProfile(
  userId: string,
  opts?: { source?: string; plan?: string }
): Promise<void> {
  const row: Record<string, unknown> = { user_id: userId }
  if (opts?.source) row.signup_source = opts.source
  if (opts?.plan) row.signup_plan = opts.plan

  // Upsert mit onConflict: wenn die Row schon existiert (Trigger war schneller),
  // nur dann source/plan setzen wenn sie noch null sind (first-touch).
  await supabase
    .from('profiles')
    .upsert(row, { onConflict: 'user_id', ignoreDuplicates: true })

  // Fallback: Row existierte schon, aber signup_source ist noch null → nachtragen
  if (opts?.source || opts?.plan) {
    const update: Record<string, string> = {}
    if (opts?.source) update.signup_source = opts.source
    if (opts?.plan) update.signup_plan = opts.plan
    await supabase
      .from('profiles')
      .update(update)
      .eq('user_id', userId)
      .is('signup_source', null) // nur wenn noch nicht gesetzt
  }
}

// Auth für API-Routen — akzeptiert zwei Wege:
//   1. Plugin/Extension: Header `Authorization: Bearer <api_token>` (aus profiles).
//   2. Dashboard (gleiche Origin): eingeloggte Supabase-Session via Cookie.
// So funktioniert z. B. das Speichern von Schwellen auf der Results-Seite für
// den eingeloggten Besitzer, während fremde Betrachter abgewiesen werden.
export async function getApiUser(req: Request): Promise<ApiUser | null> {
  // 1. Bearer-Token
  const header = req.headers.get('authorization') || ''
  const m = header.match(/^Bearer\s+(.+)$/i)
  const token = m && m[1] ? m[1].trim() : ''
  if (token) {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, plan')
      .eq('api_token', token)
      .single()
    if (data) return { userId: data.user_id, plan: data.plan }
  }

  // 2. Dashboard-Session (Cookie)
  try {
    const sessionUser = await getSessionUser()
    if (sessionUser) {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, plan')
        .eq('user_id', sessionUser.id)
        .single()
      if (data) return { userId: data.user_id, plan: data.plan }
    }
  } catch {
    // cookies() außerhalb eines Request-Kontexts → ignorierbar
  }

  return null
}

// Standard-401 mit CORS-Headern.
export function unauthorized(methods: string): Response {
  return Response.json(
    { error: 'unauthorized', hint: 'API token missing or invalid — copy it from the dashboard.' },
    { status: 401, headers: corsHeaders(methods) }
  )
}

// 402 für Plan-Limits (z. B. Free-Tier-Experimentlimit erreicht).
export function paymentRequired(methods: string, message: string): Response {
  return Response.json(
    { error: 'plan_limit', message, upgrade: true },
    { status: 402, headers: corsHeaders(methods) }
  )
}
