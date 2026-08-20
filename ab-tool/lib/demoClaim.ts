import { supabase } from '@/lib/supabase'

/**
 * Verbindet die auf der Landingpage eingegebene Demo-URL direkt mit dem Account.
 *
 * Wird aufgerufen:
 *   1. Im Auth-Callback — direkt beim Signup/Login (Website ↔ Account-Verbindung).
 *   2. Im Dashboard — Fallback für den Direct-Session-Signup-Pfad (ohne Callback).
 *
 * Legt zwei Dinge an:
 *   - `domains`-Row (unverified) → die eigentliche Verbindung Website ↔ Account.
 *   - Draft-Test "Demo test on <host>" → nur für brandneue Accounts (erster Test).
 *
 * Idempotent: domains hat unique(user_id, url), Dupes fängt der Constraint.
 * Rückgabe: `true`, wenn ein Draft-Test angelegt wurde (fürs New-Highlight).
 */
export async function claimDemoUrlForUser(userId: string, demoUrl: string): Promise<boolean> {
  const normalized = demoUrl.startsWith('http') ? demoUrl : `https://${demoUrl}`

  let hostOnly: string
  try {
    hostOnly = new URL(normalized).hostname
  } catch {
    return false
  }

  // Draft-Test nur für Accounts ohne bestehende Tests („erster Test"-Moment)
  const { count } = await supabase
    .from('tests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  let draftCreated = false
  if ((count ?? 0) === 0) {
    const { error } = await supabase.from('tests').insert({
      user_id: userId,
      name: `Demo test on ${hostOnly}`,
      site_url: normalized,
      goal: 'click',
      status: 'draft',
      traffic_split: 50,
    })
    draftCreated = !error
  }

  // Website ↔ Account verbinden (unverified Domain). Best-effort:
  // Unique-Constraint fängt Dupes, z. B. wenn Callback UND Dashboard claimen.
  try {
    await supabase.from('domains').insert({
      user_id: userId,
      url: hostOnly,
      verified: false,
    })
  } catch { /* best-effort */ }

  return draftCreated
}
