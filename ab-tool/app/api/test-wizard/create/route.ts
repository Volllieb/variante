/**
 * POST /api/test-wizard/create
 *
 * Erstellt einen Test aus dem Wizard-State. Kein KI-Auto-Name mehr —
 * der Name wird vom Client geliefert (manuelle Eingabe im Review-Step).
 *
 * Auth: Supabase-Session (Cookie) — nur eingeloggte User.
 */

import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getSessionUser } from '@/lib/supabaseServer'
import { safeError } from '@/lib/safeLog'
import { checkRateLimit } from '@/lib/rateLimit'
import { assertOwnedDomain } from '@/lib/domainGate'

export const maxDuration = 30

// ─── Request/Response Types ───

interface CreateTestBody {
  site_url: string
  selector?: string
  goal: string
  variant_b_html?: string
  variant_b_css?: string
  original_html?: string
  status: 'active' | 'paused' | 'draft'
  name?: string
}

// ─── Route ───

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

export async function POST(req: Request) {
  const headers = corsHeaders('POST, OPTIONS')

  // ─── Auth ───
  const user = await getSessionUser()
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401, headers })
  }

  // ─── Rate-Limit ───
  if (!(await checkRateLimit(`create-test:${user.id}`, 5, 60_000))) {
    return Response.json({ error: 'rate limit', message: 'Max 5 test creations per minute.' }, { status: 429, headers })
  }

  // ─── Body ───
  let body: CreateTestBody
  try { body = await req.json() } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers })
  }

  const { site_url, selector, goal, variant_b_html, variant_b_css, original_html, status, name } = body

  if (!site_url || !goal) {
    return Response.json({ error: 'site_url and goal are required' }, { status: 400, headers })
  }
  if (!['active', 'paused', 'draft'].includes(status)) {
    return Response.json({ error: 'status must be active, paused, or draft' }, { status: 400, headers })
  }

  // Input-Längenlimits
  if (site_url.length > 2048) return Response.json({ error: 'site_url too long (max 2048)' }, { status: 400, headers })
  if (goal.length > 256) return Response.json({ error: 'goal too long' }, { status: 400, headers })

  // Validate: click-goals must have a selector.
  // "click" alone is not a valid CSS selector → ab.js would throw SyntaxError
  // and 0 conversions would be tracked. Requires either click:<selector> format
  // or a separate goal_selector field.
  if (goal === 'click' || goal === 'click:') {
    return Response.json({ error: 'Click goal requires a CSS selector (e.g. click:#my-button). Pick a goal element in Step 2.' }, { status: 400, headers })
  }

  // Normalize: empty string → null for optional fields
  const normalizedSelector = selector?.trim() || null
  const normalizedVariantHtml = variant_b_html?.trim() || null
  const normalizedVariantCss = variant_b_css?.trim() || null
  const normalizedOriginalHtml = original_html?.trim() || null
  const normalizedName = name?.trim() || null

  // Validate: if selector is provided, it must be a valid CSS selector (basic check)
  if (normalizedSelector && normalizedSelector.length > 512) {
    return Response.json({ error: 'selector too long' }, { status: 400, headers })
  }

  // Normalize site_url: prepend https:// if no protocol present (Bug 4)
  const normalizedSiteUrl = /^https?:\/\//i.test(site_url) ? site_url : `https://${site_url}`

  // ─── Domain-Gate (nur für Live/Paused-Tests, nicht für Drafts) ───
  // KRITISCH (Plan SEC-01): Dieser Endpunkt hatte KEINEN Domain-Gate, obwohl
  // /api/tests einen hat — und er ist der Pfad, den das Dashboard tatsächlich
  // benutzt. Jeder registrierte Free-User konnte damit einen aktiven Test für
  // eine BELIEBIGE Domain anlegen (fremde Kundenseiten, www.getvariante.com)
  // und über variant_b_html/css beliebiges Markup dorthin ausliefern.
  //
  // Phase 2: Drafts sind von der Domain-Prüfung ausgenommen — Nutzer können
  // Tests als Entwurf erstellen, bevor sie das Snippet installiert haben.
  if (status !== 'draft') {
    const gate = await assertOwnedDomain(user.id, normalizedSiteUrl)
    if (!gate.ok) {
      return Response.json({ error: gate.error }, { status: gate.status, headers })
    }
  }

  // ─── Plan-Limit: Active Tests (Free = 1) ───
  // ponytail: Drafts sind immer kostenlos — kein Limit-Check nötig.
  if (status !== 'draft') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('user_id', user.id)
      .single()
    const plan = profile?.plan ?? 'free'
    if (plan === 'free') {
      const { count } = await supabase
        .from('tests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['active', 'paused'])
      if ((count ?? 0) >= 1) {
        return Response.json({
          error: 'limit reached',
          message: 'Free plan allows 1 active experiment. Upgrade to Pro for unlimited tests.',
        }, { status: 402, headers })
      }
    }
  }

  // ─── Test erstellen (Name vom Client, kein KI-Auto-Name) ───
  const testName = normalizedName || `Test on ${normalizedSiteUrl.replace(/^https?:\/\//, '').slice(0, 60)}`

  // ponytail: Nur Spalten inserted, die in der DB existieren.
  const testRow: Record<string, unknown> = {
    user_id: user.id,
    name: testName,
    site_url: normalizedSiteUrl,
    selector: normalizedSelector,
    goal,
    variant_b_html: normalizedVariantHtml,
    variant_b_css: normalizedVariantCss,
    original_html: normalizedOriginalHtml,
    status,
    traffic_split: 50,
  }

  const { data: test, error: insertErr } = await supabase
    .from('tests')
    .insert(testRow)
    .select('id, name, status, site_url, snippet_key, created_at')
    .single()

  if (insertErr || !test) {
    // ponytail: message und code gingen vorher an den Client — rohe
    // Postgres-Fehlertexte samt Spalten-/Constraint-Namen. Widerspricht der
    // safeLog-Politik; ins Log gehören sie, nicht in die Response.
    safeError('test-wizard-create-failed', insertErr)
    return Response.json({ error: 'Failed to create test' }, { status: 500, headers })
  }

  // ─── Wizard-Draft löschen ───
  await supabase
    .from('wizard_drafts')
    .delete()
    .eq('user_id', user.id)

  return Response.json({ test }, { status: 201, headers })
}
