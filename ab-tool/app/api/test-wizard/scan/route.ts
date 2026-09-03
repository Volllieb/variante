/**
 * POST /api/test-wizard/scan
 *
 * CRO-Scan einer URL — liefert die Top-3-Optimierungs-Vorschläge.
 * Genutzt von TestCreationPanel Step 1 ("What to test").
 *
 * Auth: Supabase-Session (Cookie) — nur eingeloggte User.
 * Limits: aiScans pro Monat (planLimits) + OpenAI-Monatsbudget.
 */

import { supabase } from '@/lib/supabase'
import * as Sentry from '@sentry/nextjs'
import { corsHeaders, preflight } from '@/lib/cors'
import { getSessionUser } from '@/lib/supabaseServer'
import { getPlanForUser } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'
import { getPlanAiLimits, startOfBillingMonth } from '@/lib/planLimits'
import { analyzePageWithPrimary, stripForCRO, extractStructure, extractCandidates, detectPageLanguage, AnalyzeError } from '@/lib/croAnalyze'
import { safeFetch } from '@/lib/safeFetch'
import { checkRateLimit } from '@/lib/rateLimit'

export const maxDuration = 60

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
  if (!(await checkRateLimit(`scan:${user.id}`, 5, 60_000))) {
    return Response.json({ error: 'rate limit', message: 'Max 5 scans per minute.' }, { status: 429, headers })
  }

  // ─── Body ───
  let body: { url?: string }
  try { body = await req.json() } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers })
  }
  if (!body.url || typeof body.url !== 'string') {
    return Response.json({ error: 'url is required' }, { status: 400, headers })
  }

  // ─── URL prüfen + SSRF ───
  let url = body.url.trim()
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`

  let parsed: URL
  try { parsed = new URL(url) } catch {
    return Response.json({ error: 'invalid URL' }, { status: 400, headers })
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return Response.json({ error: 'only http/https allowed' }, { status: 400, headers })
  }
  // safeFetch prüft Hostname + DNS + private IPs intern (Plan SEC-08).

  // ─── Plan-Limit: AI Scans ───
  const plan = await getPlanForUser(user.id)
  const limits = getPlanAiLimits(plan)

  if (limits.scans !== Infinity) {
    // Zähle Scans diesen Monat (site_insights-Einträge). Dieselbe Grenze
    // benutzt die Verbrauchsanzeige im Dashboard (PlanUsageBar).
    const startOfMonth = startOfBillingMonth()

    const { count, error: countErr } = await supabase
      .from('site_insights')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('analyzed_at', startOfMonth.toISOString())

    if (!countErr && count !== null && count >= limits.scans) {
      return Response.json({
        error: 'scan limit reached',
        message: `${limits.scans} scans/month on ${plan} plan. Upgrade for more.`,
        limit: limits.scans,
        used: count,
      }, { status: 429, headers })
    }
  }

  // ─── Budget-Check ───
  const { data: withinBudget, error: budgetErr } = await supabase.rpc('increment_gen_cost', {
    p_user_id: user.id,
    p_amount: 0.01, // scan ~$0.01
    p_limit: limits.monthlyBudget,
  })
  if (budgetErr || withinBudget === false) {
    return Response.json({
      error: 'monthly budget exhausted',
      message: `$${limits.monthlyBudget}/mo OpenAI budget reached. Resets on the 1st.`,
    }, { status: 429, headers })
  }

  // ─── Scan: HTML holen + analysieren ───
  // Plan SEC-08: safeFetch mit DNS-Prüfung statt rohem fetch().
  //
  // Zeitbudget: maxDuration ist 60s. Vorher standen hier 25s Seiten-Fetch und
  // 45s OpenAI — zusammen 70s, also mehr als die Funktion leben darf. Bei einer
  // langsamen Seite wurde der Prozess mitten im AI-Call gekillt und der Client
  // sah einen Netzwerkfehler statt einer Aussage. Jetzt: 12s + max. 35s.
  try {
    const pageRes = await safeFetch(url, {
      timeoutMs: 12_000,
      maxSize: 2_000_000, // 2 MB für HTML-Seiten
      // Ohne UA liefern manche Sites eine Bot-Variante der Seite aus.
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; varianteBot/1.0; +https://www.getvariante.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
    if (!pageRes.ok) {
      const msg = pageRes.error || (
        pageRes.status === 404 ? 'Page not found (404)'
        : pageRes.status >= 500 ? 'Server error on target page'
        : `Page returned status ${pageRes.status}`
      )
      return Response.json({ error: 'page not reachable', message: msg }, { status: 502, headers })
    }

    const rawHtml = pageRes.text
    if (rawHtml.length < 100) {
      return Response.json({ error: 'page too small', message: 'The page returned minimal content — it may require JavaScript to render.' }, { status: 422, headers })
    }

    const html = stripForCRO(rawHtml)
    const structure = extractStructure(html)
    // Kandidaten aus dem ROHEN HTML: stripForCRO entfernt Attribute und kürzt
    // auf 80 KB, beides kostet Selektoren, die es live noch gibt.
    const candidates = extractCandidates(rawHtml)

    if (candidates.length === 0) {
      return Response.json({
        error: 'no candidates',
        message: 'No testable elements found on this page. If it renders client-side, use the visual picker instead.',
      }, { status: 422, headers })
    }

    const { suggestions, primarySuggestionIndex } = await Sentry.startSpan(
      { name: 'scan.analyzePage', op: 'ai.cro.scan' },
      async () => analyzePageWithPrimary(html, structure, { candidates, language: detectPageLanguage(rawHtml) })
    )

    // Nur Vorschläge, die auf ein real existierendes Element zeigen, sind im
    // Wizard brauchbar — alles andere erzeugt einen Test, der auf nichts zeigt.
    const usable = suggestions.filter((s) => !!s.selector)
    if (usable.length === 0) {
      return Response.json({
        error: 'no usable suggestions',
        message: 'The analysis found no element it could target reliably. Pick the element yourself with the visual picker.',
      }, { status: 422, headers })
    }

    const primary = suggestions[primarySuggestionIndex]
    const primarySuggestion = primary?.selector ? primary : usable[0]

    const toClient = (s: typeof primarySuggestion) => ({
      selector: s.selector ?? null,
      element: s.element,
      rationale: s.why,
      elementType: s.type === 'text' && s.element.toLowerCase().includes('button') ? 'button'
        : s.type === 'text' && /h[1-6]/i.test(s.element) ? 'headline'
        : s.type === 'text' ? 'text'
        : s.type === 'layout' ? 'layout'
        : 'element',
    })

    return Response.json({
      suggestions: usable.map(toClient),
      primarySuggestionIndex: usable.indexOf(primarySuggestion),
      primarySuggestion: toClient(primarySuggestion),
    }, { headers })
  } catch (err) {
    // AnalyzeError trägt die Ursache — daraus wird eine Aussage, die dem Nutzer
    // sagt, ob ein zweiter Versuch überhaupt etwas ändern kann. Vorher endete
    // jeder AI-Fehler in "Bitte versuche es erneut", auch bei leerem Guthaben.
    if (err instanceof AnalyzeError) {
      safeError('scan-failed', { url, error: `${err.kind}: ${err.message}` })
      const { status, message } = describeAnalyzeError(err.kind)
      return Response.json({ error: err.kind, message, retryable: RETRYABLE_KINDS.has(err.kind) }, { status, headers })
    }

    const msg = err instanceof Error ? err.message : String(err)
    safeError('scan-failed', { url, error: msg })
    return Response.json({
      error: 'scan failed',
      message: /timed out|timeout|abort/i.test(msg)
        ? 'The analysis took too long. That can happen on large pages — try again.'
        : `Analysis failed: ${msg.slice(0, 200)}`,
      retryable: true,
    }, { status: 502, headers })
  }
}

/** Endzustände brauchen keinen zweiten Versuch — der Client blendet dort das
 *  "Try again" aus, statt in eine Schleife zu laden. */
const RETRYABLE_KINDS = new Set(['rate-limit', 'upstream', 'empty', 'parse'])

function describeAnalyzeError(kind: AnalyzeError['kind']): { status: number; message: string } {
  switch (kind) {
    case 'no-key':
    case 'auth':
      return { status: 503, message: 'AI analysis is unavailable right now — the AI service rejected our credentials. This is on our side.' }
    case 'quota':
      return { status: 503, message: 'AI analysis is temporarily out of budget. Pick the element yourself with the visual picker in the meantime.' }
    case 'rate-limit':
      return { status: 429, message: 'The AI service is busy. Wait a few seconds and try again.' }
    case 'no-candidates':
      return { status: 422, message: 'No testable elements found on this page. If it renders client-side, use the visual picker instead.' }
    case 'parse':
    case 'empty':
      return { status: 502, message: 'The AI returned an unusable answer. Try again — this is usually a one-off.' }
    default:
      return { status: 502, message: 'The AI service is not responding. Try again in a moment.' }
  }
}
