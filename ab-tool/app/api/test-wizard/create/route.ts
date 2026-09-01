/**
 * POST /api/test-wizard/create
 *
 * Erstellt einen Test aus dem Wizard-State. Kein KI-Auto-Name mehr —
 * der Name wird vom Client geliefert (manuelle Eingabe im Review-Step).
 *
 * Auth: Supabase-Session (Cookie) — nur eingeloggte User.
 *
 * Body-Validierung über wizardCreateBody (lib/validation.ts) — vorher wurde
 * hier von Hand validiert, was alles stumm verwarf, was nicht im eigenen
 * Interface stand (variant_text, explanation, variant_b_changes, …).
 */

import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getSessionUser } from '@/lib/supabaseServer'
import { safeError } from '@/lib/safeLog'
import { checkRateLimit } from '@/lib/rateLimit'
import { assertOwnedDomain } from '@/lib/domainGate'
import { getTestHealthIssues, describeTestHealthIssues } from '@/lib/testHealth'
import { parseBody } from '@/lib/apiHelpers'
import { wizardCreateBody, parseChangesJson } from '@/lib/validation'

export const maxDuration = 30

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

  // ─── Body (zod: Goal-Guards, Längenlimits, Status-Pflicht) ───
  const parsed = await parseBody(req, wizardCreateBody, 'POST, OPTIONS')
  if (!parsed.ok) return parsed.response

  const {
    site_url, selector, goal, variant_b_html, variant_b_css, original_html,
    site_css, status, name, variant_b_changes, element_type, variant_text, explanation,
  } = parsed.data

  // Normalize: empty string → null for optional fields
  const normalizedSelector = selector?.trim() || null
  const normalizedVariantHtml = variant_b_html?.trim() || null
  const normalizedVariantCss = variant_b_css?.trim() || null
  const normalizedOriginalHtml = original_html?.trim() || null
  // Styles der Zielseite vom Picker — Basis der Vorschau (lib/previewDoc.ts).
  const normalizedSiteCss = site_css?.trim() || null
  const normalizedName = name?.trim() || null
  const normalizedElementType = element_type?.trim() || null
  const normalizedVariantText = variant_text?.trim() || null
  const normalizedExplanation = explanation?.trim() || null
  // Änderungsliste reist als JSON-String → fürs jsonb-Insert parsen.
  const normalizedChanges = parseChangesJson(variant_b_changes)

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

  // Plan DB-02: 'active' erfordert alle Pflichtfelder — sonst blockt der
  // DB-Trigger die Aktivierung nur noch stumm (Insert landet als 'draft').
  // Hier gibt's die verständliche Fehlermeldung dafür. Seit 044 prüft das
  // auch das leere Delta (empty_variant) — Drafts bleiben davon frei.
  if (status === 'active') {
    const issues = getTestHealthIssues({
      name: testName,
      site_url: normalizedSiteUrl,
      selector: normalizedSelector,
      goal,
      variant_b_html: normalizedVariantHtml,
      variant_b_css: normalizedVariantCss,
      original_html: normalizedOriginalHtml,
    })
    if (issues.length > 0) {
      return Response.json(
        { error: 'cannot activate test', message: `Missing: ${describeTestHealthIssues(issues)}`, issues },
        { status: 422, headers },
      )
    }
  }

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
    site_css: normalizedSiteCss,
    status,
    traffic_split: 50,
    variant_b_changes: normalizedChanges,
    element_type: normalizedElementType,
    variant_text: normalizedVariantText,
    explanation: normalizedExplanation,
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
