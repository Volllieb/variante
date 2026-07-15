import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized, paymentRequired } from '@/lib/auth'
import { BLOCKED_HOSTS, BLOCKED_HOSTNAMES } from '@/lib/ssrf'
import { safeError } from '@/lib/safeLog'
import { stripForCRO, extractStructure, analyzePage, getCachedInsights, cacheInsights } from '@/lib/croAnalyze'

export const maxDuration = 60

// Geschätzte Kosten pro Suggestion-Call (gpt-4o-mini):
// ~5K Input (gekürztes HTML + System-Prompt) + ~1K Output = ~$0.001
// Konservativ auf $0.005 gerundet.
const ESTIMATED_COST = 0.005
const MAX_MONTHLY_COST_PRO = Number(process.env.OPENAI_MAX_MONTHLY_COST) || 20
const MAX_MONTHLY_COST_AGENCY = Number(process.env.OPENAI_MAX_MONTHLY_COST_AGENCY) || 60

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

export async function POST(req: Request) {
  // Auth
  const user = await getApiUser(req)
  if (!user) return unauthorized('POST, OPTIONS')

  // Pro-Gate
  if (user.plan !== 'pro' && user.plan !== 'agency') {
    return paymentRequired('POST, OPTIONS', 'Page-specific AI suggestions require a Pro plan.')
  }

  let body: { url?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const { url: rawUrl } = body
  if (!rawUrl || typeof rawUrl !== 'string') {
    return Response.json({ error: 'url required' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  // Normalize URL
  let url = rawUrl.trim()
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`

  // SSRF-Guard
  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    return Response.json({ error: 'Invalid URL' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }
  if (BLOCKED_HOSTS.test(hostname) || BLOCKED_HOSTNAMES.includes(hostname)) {
    return Response.json({ error: 'Blocked host' }, { status: 403, headers: corsHeaders('POST, OPTIONS') })
  }

  // ─── Cache-Check (vor Cost-Booking — kein Spend bei Cache-Hit) ───
  const cached = await getCachedInsights(user.userId, url)
  if (cached) {
    return Response.json({
      suggestions: cached.suggestions,
      analyzed_url: url,
      cached: true,
      analyzed_at: cached.analyzedAt,
    }, { headers: corsHeaders('POST, OPTIONS') })
  }

  // ─── Cost-Limit: atomar prüfen + buchen (nur bei Cache-Miss) ───
  const { supabase } = await import('@/lib/supabase')
  const costLimit = user.plan === 'agency' ? MAX_MONTHLY_COST_AGENCY : MAX_MONTHLY_COST_PRO
  const { data: withinLimit, error: limitErr } = await supabase.rpc('increment_gen_cost', {
    p_user_id: user.userId,
    p_amount: ESTIMATED_COST,
    p_limit: costLimit,
  })
  if (limitErr || withinLimit === false) {
    return Response.json(
      { error: 'monthly generation limit reached', message: `OpenAI budget exhausted ($${costLimit}/mo). Resets on the 1st.` },
      { status: 429, headers: corsHeaders('POST, OPTIONS') }
    )
  }

  // Fetch page
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  let html = ''
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'variante-cro-analyzer/1.0', 'Accept': 'text/html' },
      redirect: 'follow',
    })
    html = await res.text()
  } catch {
    return Response.json({ error: 'Site unreachable or timed out' }, { status: 502, headers: corsHeaders('POST, OPTIONS') })
  } finally {
    clearTimeout(timeout)
  }

  if (!html || html.length < 100) {
    return Response.json({ error: 'Page returned no usable content' }, { status: 422, headers: corsHeaders('POST, OPTIONS') })
  }

  // Strip + Analyse (Logik in lib/croAnalyze.ts, geteilt mit /api/agent)
  try {
    const stripped = stripForCRO(html)
    const structure = extractStructure(html)
    const suggestions = await analyzePage(stripped, structure)
    if (suggestions.length === 0) {
      return Response.json({ error: 'No suggestions generated' }, { status: 422, headers: corsHeaders('POST, OPTIONS') })
    }

    // Cache befüllen (fire-and-forget — Fehler loggen, Response nicht blockieren)
    cacheInsights(user.userId, url, suggestions, {
      structure,
      title: html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ?? '',
    }).catch(err => safeError('suggestions-cache-write', err))

    return Response.json({ suggestions, analyzed_url: url, cached: false }, { headers: corsHeaders('POST, OPTIONS') })
  } catch (err) {
    safeError('suggestions-analyze', err)
    return Response.json({ error: 'AI generation failed' }, { status: 502, headers: corsHeaders('POST, OPTIONS') })
  }
}
