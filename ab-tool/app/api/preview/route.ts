// Hybrid-Onboarding: Value vor Snippet (Plan §3.1, Code-First-Refactor).
//
// Code-First-Flow: erst serverseitig HTML/CSS extrahieren (~1s), dann je nach
// Ergebnis branched:
//   A) Code-Fetch fehlgeschlagen → Screenshot + Vision (Fallback, ~15s)
//   B) SPA erkannt → Screenshot für Display, Snippet-first-Message
//   C) Fast Path (~90% der Seiten) → analyzeCodeOnly() mit gpt-4o-mini (~1-2s)
//      Screenshots werden asynchron per GET /api/preview/screenshots nachgeliefert.
//
// Kosten: ~$0.003/Call im Fast Path vs ~$0.011 vorher (−72%).
// Time-to-first-result: ~3s vs ~15s vorher.

import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { BLOCKED_HOSTS, BLOCKED_HOSTNAMES } from '@/lib/ssrf'
import { safeError } from '@/lib/safeLog'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { extractPageCode, type ExtractedPage } from '@/lib/extractPageCode'
import { analyzePreview, analyzeCodeOnly, buildHighlightCss } from '@/lib/previewAnalyze'
import { renderSettledScreenshot, uploadShot, SHOT_WIDTH, SHOT_HEIGHT } from '@/lib/screenshot'

// Fast Path: ~3s Code-Extraktion + ~2s KI + DB + Puffer. 45s ist 4.5× Headroom.
export const maxDuration = 45

// Kostenschutz: der Endpoint ist unauthentifiziert und gibt pro Call ~$0.02
// aus (2x urlbox + GPT-4o). Das Minuten-Limit bremst Bursts, die Tages-Limits
// deckeln den Schaden durch Bots/Scripted Abuse (Plan §5: Free-Tier ~10/Tag).
// Production-Limits grosszügiger: das Produkt ist live und der Onboarding-Flow
// ist der zentrale Conversion-Pfad. 10/IP/Tag war für eine Beta ok, aber in
// Production treffen echte User auf das Limit — besonders in Shared-Netzwerken
// (Büro, Coworking, Uni) oder nach Fehlversuchen.
const DAILY_IP_LIMIT = Number(process.env.PREVIEW_DAILY_IP_LIMIT) || 25
const DAILY_GLOBAL_LIMIT = Number(process.env.PREVIEW_DAILY_GLOBAL_LIMIT) || 500
const PER_MINUTE_LIMIT = Number(process.env.PREVIEW_PER_MINUTE_LIMIT) || 10
const DAY_MS = 86_400_000

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

export async function POST(req: Request) {
  const ip = getClientIp(req)
  if (!(await checkRateLimit(`preview:${ip}`, PER_MINUTE_LIMIT, 60_000))) {
    return json({ error: 'too many requests', message: `Give it a minute — you can run ${PER_MINUTE_LIMIT} previews per minute.` }, 429)
  }
  if (!(await checkRateLimit(`preview:day:${ip}`, DAILY_IP_LIMIT, DAY_MS))) {
    return json({
      error: 'daily limit',
      message: `You've used ${DAILY_IP_LIMIT} free previews today — create an account to continue testing with saved variants and live A/B tests.`,
      signup_url: '/signup?source=demo-limit',
    }, 429)
  }
  if (!(await checkRateLimit('preview:day:global', DAILY_GLOBAL_LIMIT, DAY_MS))) {
    return json({ error: 'too many requests', message: 'The demo is very busy right now. Try again later.' }, 429)
  }

  let body: { url?: string; testName?: string; temp_token?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const url = normalizeUrl(body.url)
  if (!url) return json({ error: 'url required' }, 400)

  const guard = ssrfCheck(url)
  if (guard) return guard

  const testName = (body.testName ?? '').trim().slice(0, 80) || `Preview — ${hostOf(url)}`
  const previewId = crypto.randomUUID()

  // ── Schritt 1: Code extrahieren (SEQUENTIAL, kein Screenshot parallel) ──
  let page: ExtractedPage | null
  try {
    page = await extractPageCode(url)
  } catch (err) {
    safeError('preview-extract', err)
    page = null
  }

  // ── Branch A: Code-Fetch fehlgeschlagen → Screenshot + Vision (Fallback) ──
  if (!page) {
    if (!process.env.URLBOX_API_KEY) {
      safeError('preview-config', 'URLBOX_API_KEY missing in fallback path')
      return json({ error: 'config_missing', message: 'Server configuration error. Please try again later.' }, 500)
    }

    let shotResult: string
    try {
      const { png, blank } = await renderSettledScreenshot(url)
      if (blank) {
        return json({
          error: 'blank_page',
          message: "Your page appears blank to our browser — it may show a loading screen first or block automated visitors. Try a different page, like your homepage or pricing page.",
        }, 422)
      }
      shotResult = await uploadShot(`${previewId}/original.png`, png)
    } catch (err) {
      safeError('preview-screenshot-fallback', err)
      return json({ error: 'screenshot_failed', message: "We couldn't load that page. Check the URL and try again." }, 502)
    }

    let analysis
    try {
      analysis = await analyzePreview(url, shotResult, null)
    } catch (err) {
      safeError('preview-analyze-fallback', err)
      const msg = err instanceof Error && err.message === 'No candidate elements found on page'
        ? "We couldn't read any content from this page. Try a different URL — like your homepage or a landing page."
        : "We couldn't find enough elements to suggest changes on this page. Try a different page — like your homepage or a landing page with headlines and buttons."
      return json({ error: 'no_changes', message: msg }, 422)
    }

    // Variant-Screenshot im Fallback-Pfad (wie vorher)
    let variantShot: string
    try {
      const { png, blank } = await renderSettledScreenshot(url, { css: buildHighlightCss(analysis.changes) })
      if (blank) throw new Error('variant render blank')
      variantShot = await uploadShot(`${previewId}/variant.png`, png)
    } catch (err) {
      safeError('preview-variant-screenshot-fallback', err)
      return json({ error: 'screenshot_failed', message: "We rendered your page but couldn't render the variant. Try again." }, 502)
    }

    let session: { id: string; token: string }
    try {
      session = await ensureTempSession(body.temp_token)
    } catch {
      return json({ error: 'db error' }, 500)
    }

    const test = await insertTest({
      url,
      previewId,
      testName,
      session,
      analysis,
      originalUrl: shotResult,
      variantUrl: variantShot,
      selectorSource: 'screenshot-only',
    })

    return json({
      previewId,
      testId: test.id,
      tempToken: session.token,
      originalScreenshotUrl: shotResult,
      variantScreenshotUrl: variantShot,
      screenshotWidth: SHOT_WIDTH,
      screenshotHeight: SHOT_HEIGHT,
      changes: analysis.changes,
      injectedCss: analysis.injectedCss,
      summary: analysis.summary,
      degraded: "We couldn't read your page's code, so this is our best guess from the screenshot.",
    })
  }

  // ── Branch B: SPA → Screenshot für Display, Snippet-First ──
  if (page.isSpa) {
    if (!process.env.URLBOX_API_KEY) {
      safeError('preview-config', 'URLBOX_API_KEY missing in SPA path')
      return json({ error: 'config_missing', message: 'Server configuration error. Please try again later.' }, 500)
    }

    let shotResult: string
    try {
      const { png, blank } = await renderSettledScreenshot(url)
      if (blank) {
        return json({
          error: 'blank_page',
          message: "Your page appears blank to our browser — it may show a loading screen first or block automated visitors.",
        }, 422)
      }
      shotResult = await uploadShot(`${previewId}/original.png`, png)
    } catch (err) {
      safeError('preview-screenshot-spa', err)
      return json({ error: 'screenshot_failed', message: "We couldn't load that page. Check the URL and try again." }, 502)
    }

    return json({
      isSpa: true,
      spaType: page.spaType,
      originalScreenshotUrl: shotResult,
      screenshotWidth: SHOT_WIDTH,
      screenshotHeight: SHOT_HEIGHT,
      message: `Your site is built with ${spaLabel(page.spaType)}. Its content is rendered in the browser, so we can't read the real elements from the outside yet.`,
    })
  }

  // ── Branch C: ✨ FAST PATH — Code-Only, keine Screenshots ──
  let analysis
  try {
    analysis = await analyzeCodeOnly(url, page)
  } catch (err) {
    safeError('preview-analyze-code', err)
    const msg = err instanceof Error && err.message === 'No candidate elements found on page'
      ? "We couldn't read any content from this page. Try a different URL — like your homepage or a landing page."
      : "We couldn't find enough elements to suggest changes on this page. Try a different page — like your homepage or a landing page with headlines and buttons."
    return json({ error: 'no_changes', message: msg }, 422)
  }

  let session: { id: string; token: string }
  try {
    session = await ensureTempSession(body.temp_token)
  } catch {
    return json({ error: 'db error' }, 500)
  }

  const test = await insertTest({
    url,
    previewId,
    testName,
    session,
    analysis,
    selectorSource: 'code-analysis',
  })

  return json({
    previewId,
    testId: test.id,
    tempToken: session.token,
    screenshotsPending: true,
    screenshotWidth: SHOT_WIDTH,
    screenshotHeight: SHOT_HEIGHT,
    changes: analysis.changes,
    injectedCss: analysis.injectedCss,
    summary: analysis.summary,
  })
}

/* ── Helpers ── */

function json(payload: unknown, status = 200): Response {
  return Response.json(payload, { status, headers: corsHeaders('POST, OPTIONS') })
}

function normalizeUrl(raw: string | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null
  let url = raw.trim()
  if (!url) return null
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

function ssrfCheck(url: string): Response | null {
  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    return json({ error: 'Invalid URL' }, 400)
  }
  if (BLOCKED_HOSTS.test(hostname) || BLOCKED_HOSTNAMES.includes(hostname)) {
    return json({ error: 'Blocked host' }, 403)
  }
  return null
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'your site'
  }
}

function spaLabel(type: string | undefined): string {
  switch (type) {
    case 'react': return 'React'
    case 'next': return 'Next.js'
    case 'vue': return 'Vue'
    case 'angular': return 'Angular'
    default: return 'a JavaScript framework'
  }
}

interface InsertTestParams {
  url: string
  previewId: string
  testName: string
  session: { id: string; token: string }
  analysis: { changes: unknown; injectedCss: string; summary: string }
  originalUrl?: string | null
  variantUrl?: string | null
  selectorSource: string
}

async function insertTest(params: InsertTestParams): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('tests')
    .insert({
      name: params.testName,
      site_url: params.url,
      status: 'preview',
      temp_session_id: params.session.id,
      preview_original_screenshot_url: params.originalUrl ?? null,
      preview_variant_screenshot_url: params.variantUrl ?? null,
      preview_data: {
        previewId: params.previewId,
        previewedUrl: params.url,
        changes: params.analysis.changes,
        injectedCss: params.analysis.injectedCss,
        summary: params.analysis.summary,
        selectorSource: params.selectorSource,
      },
    })
    .select('id')
    .single()

  if (error) {
    safeError('preview-insert', error)
    throw new Error('DB insert failed')
  }
  return { id: data.id }
}

/**
 * Liefert die Temp-Session, an der der Preview-Test hängt — die vorhandene
 * (Figma-Plugin bringt beim Onboarding schon eine mit) oder eine neue.
 *
 * Abweichung vom Plan §7 Punkt 6 ("Temp-Session erst bei Go live, Preview ist
 * stateless"): Das Argument dort war weniger DB-Müll. Es trägt nicht mehr —
 * §3.1 Schritt 7 legt für JEDE Preview ohnehin eine tests-Row an, die Session
 * ist nur eine schmale Zeile mehr. Dafür bekommen wir den Claim geschenkt: der
 * Gate-Link ist /signup?temp_token=…&test_id=…, und app/auth/callback claimt
 * exakt so schon heute. Die Alternative (Session erst am Gate) hätte einen
 * zusätzlichen Attach-Endpoint gebraucht, der einen ungeclaimten Test einer
 * Session zuordnet — mehr Fläche, mehr Auth-Fragen, kein Gegenwert.
 * Aufgeräumt wird täglich per /api/cron/cleanup-previews (24h).
 */
async function ensureTempSession(token: string | undefined): Promise<{ id: string; token: string }> {
  if (token) {
    const { data } = await supabase
      .from('temp_sessions')
      .select('id, token')
      .eq('token', token)
      .maybeSingle()
    if (data) return { id: data.id, token: data.token }
  }

  const { data, error } = await supabase.from('temp_sessions').insert({}).select('id, token').single()
  if (error) {
    safeError('preview-temp-session', error)
    throw new Error('Failed to create session')
  }
  return { id: data.id, token: data.token }
}
