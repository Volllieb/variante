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
import { corsHeaders, preflight } from '@/lib/cors'
import { getSessionUser } from '@/lib/supabaseServer'
import { safeError } from '@/lib/safeLog'
import { getPlanAiLimits } from '@/lib/planLimits'
import { analyzePageWithPrimary, stripForCRO, extractStructure, type CROSuggestion } from '@/lib/croAnalyze'
import { BLOCKED_HOSTS, BLOCKED_HOSTNAMES } from '@/lib/ssrf'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

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
  const ip = getClientIp(req)
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
  const hostname = parsed.hostname.toLowerCase()
  if (BLOCKED_HOSTS.test(hostname) || BLOCKED_HOSTNAMES.includes(hostname)) {
    return Response.json({ error: 'URL not allowed' }, { status: 400, headers })
  }

  // ─── Plan-Limit: AI Scans ───
  const plan = (user.user_metadata?.plan as string) ?? 'free'
  const limits = getPlanAiLimits(plan)

  if (limits.scans !== Infinity) {
    // Zähle Scans diesen Monat (site_insights-Einträge)
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

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
  try {
    const pageRes = await fetch(url, {
      headers: { 'User-Agent': 'variante-cro-scanner/1.0', 'Accept': 'text/html' },
      signal: AbortSignal.timeout(15_000),
    })
    if (!pageRes.ok) {
      return Response.json({ error: 'page not reachable', message: `Page returned ${pageRes.status}` }, { status: 502, headers })
    }

    const rawHtml = await pageRes.text()
    const html = stripForCRO(rawHtml)
    const structure = extractStructure(html)

    const { suggestions, primarySuggestionIndex } = await analyzePageWithPrimary(html, structure)

    const primarySuggestion = suggestions[primarySuggestionIndex] ?? null

    return Response.json({
      suggestions,
      primarySuggestionIndex,
      primarySuggestion: primarySuggestion ? {
        selector: primarySuggestion.selector ?? null,
        element: primarySuggestion.element,
        rationale: primarySuggestion.why,
        elementType: primarySuggestion.type === 'text' && primarySuggestion.element.toLowerCase().includes('button') ? 'button'
          : primarySuggestion.type === 'text' && /h[1-6]/i.test(primarySuggestion.element) ? 'headline'
          : primarySuggestion.type === 'text' ? 'text'
          : primarySuggestion.type === 'layout' ? 'layout'
          : 'element',
      } : null,
    }, { headers })
  } catch (err) {
    safeError('scan-failed', err)
    return Response.json({
      error: 'scan failed',
      message: 'Could not analyze the page. It might be behind a bot-blocker or too large.',
    }, { status: 502, headers })
  }
}
