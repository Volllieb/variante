// Hybrid-Onboarding: Value vor Snippet (Plan §3.1).
//
// URL rein → zwei echte Page-Renders raus: das Original und dieselbe Seite mit
// AI-generiertem CSS, das urlbox VOR dem Rendern injiziert. Kein Account, kein
// Snippet, kein Overlay-Gefrickel — der Client toggelt nur zwischen zwei <img>.
//
// Der erzeugte Test ist kein Wegwerf-Demo: er liegt als status='preview' in der
// DB, wird beim Sign-up geclaimt (→ 'draft') und geht nach Snippet-Verify live
// (→ 'active'), dann liefert das Snippet genau dieses injectedCss aus (Plan §3.6).

import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { BLOCKED_HOSTS, BLOCKED_HOSTNAMES } from '@/lib/ssrf'
import { safeError } from '@/lib/safeLog'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { extractPageCode, type ExtractedPage } from '@/lib/extractPageCode'
import { analyzePreview, buildHighlightCss } from '@/lib/previewAnalyze'
import { renderSettledScreenshot, uploadShot, SHOT_WIDTH, SHOT_HEIGHT } from '@/lib/screenshot'

// Zwei Screenshots (je bis 40s Render-Timeout + 2.5s Settle-Delay) + Vision-Call.
// Realistisch ~15-30s; 120s Headroom, damit langsame Kundenseiten nicht die
// Function killen statt sauber im Render-Timeout zu scheitern.
export const maxDuration = 120

// Kostenschutz: der Endpoint ist unauthentifiziert und gibt pro Call ~$0.02
// aus (2x urlbox + GPT-4o). Das Minuten-Limit bremst Bursts, die Tages-Limits
// deckeln den Schaden durch Bots/Scripted Abuse (Plan §5: Free-Tier ~10/Tag).
const DAILY_IP_LIMIT = Number(process.env.PREVIEW_DAILY_IP_LIMIT) || 10
const DAILY_GLOBAL_LIMIT = Number(process.env.PREVIEW_DAILY_GLOBAL_LIMIT) || 300
const DAY_MS = 86_400_000

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

export async function POST(req: Request) {
  const ip = getClientIp(req)
  if (!(await checkRateLimit(`preview:${ip}`, 5, 60_000))) {
    return json({ error: 'too many requests', message: 'Give it a minute — you can run 5 previews per minute.' }, 429)
  }
  if (!(await checkRateLimit(`preview:day:${ip}`, DAILY_IP_LIMIT, DAY_MS))) {
    return json({
      error: 'daily limit',
      message: `That's ${DAILY_IP_LIMIT} previews today — sign up to keep testing.`,
      signup_url: '/signup?source=demo-limit',
    }, 429)
  }
  if (!(await checkRateLimit('preview:day:global', DAILY_GLOBAL_LIMIT, DAY_MS))) {
    // Globale Notbremse gegen verteilte IPs. Bewusst generische Meldung —
    // ein Angreifer muss nicht wissen, dass er das globale Budget getroffen hat.
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

  // Schritt 1+2 parallel: der Screenshot ist der teure Pfad (~4-8s), der
  // HTML-Fetch der kurze (~1s). Nacheinander wären das 9s statt 8s (Plan §5).
  const previewId = crypto.randomUUID()
  const shotPromise = (async () => {
    const { png, blank } = await renderSettledScreenshot(url)
    if (blank) return 'blank' as const
    return uploadShot(`${previewId}/original.png`, png)
  })()
  const codePromise = extractPageCode(url).catch((err) => {
    // Plan §5: fetch schlägt fehl → Screenshot-only-Analyse, transparent an den
    // Client gemeldet. Lieber eine Preview mit geratenen Selektoren als keine.
    safeError('preview-extract', err)
    return null
  })

  const [shotResult, page] = await Promise.all([
    shotPromise.catch((err) => {
      safeError('preview-screenshot', err)
      return null
    }),
    codePromise,
  ])

  if (!shotResult) {
    return json({ error: 'screenshot_failed', message: "We couldn't load that page. Check the URL and try again." }, 502)
  }

  // Leer-Render: die Seite zeigt dem Headless-Browser nichts (Preloader-Overlay,
  // Bot-Wall, JS-gated Paint) — eine weiße Preview sähe aus wie ein kaputtes
  // Produkt. Lieber ehrlich ablehnen (Plan §7 Punkt 4 sinngemäß).
  if (shotResult === 'blank') {
    return json({
      error: 'blank_page',
      message: "Your page appears blank to our browser — it may show a loading screen first or block automated visitors. Try a different page, like your homepage or pricing page.",
    }, 422)
  }

  // SPA: fetch() sieht nur eine leere Shell, GPT hätte keine echten Selektoren.
  // Plan §0b Fallback 1 — erst Snippet, dann Preview mit echtem DOM.
  if (page?.isSpa) {
    return json({
      isSpa: true,
      spaType: page.spaType,
      originalScreenshotUrl: shotResult,
      screenshotWidth: SHOT_WIDTH,
      screenshotHeight: SHOT_HEIGHT,
      message: `Your site is built with ${spaLabel(page.spaType)}. Its content is rendered in the browser, so we can't read the real elements from the outside yet.`,
    })
  }

  // Schritt 4: Vision + Code → DOM-verifizierte Changes
  let analysis
  try {
    analysis = await analyzePreview(url, shotResult, page as ExtractedPage | null)
  } catch (err) {
    safeError('preview-analyze', err)
    // Plan §7 Punkt 4: leere/minimale Seiten geben nichts her.
    return json({
      error: 'no_changes',
      message: 'This page looks pretty minimal. Try a page with more content — like your homepage or pricing page.',
    }, 422)
  }

  // Schritt 5: Variant-Render mit injiziertem CSS + Highlight-Outlines.
  // Die Highlights sind NUR Preview-Deko und werden nicht gespeichert —
  // gespeichert wird analysis.injectedCss (sauber), das später live rausgeht.
  let variantShot: string
  try {
    const { png, blank } = await renderSettledScreenshot(url, { css: buildHighlightCss(analysis.changes) })
    if (blank) throw new Error('variant render blank')
    variantShot = await uploadShot(`${previewId}/variant.png`, png)
  } catch (err) {
    safeError('preview-variant-screenshot', err)
    return json({ error: 'screenshot_failed', message: "We rendered your page but couldn't render the variant. Try again." }, 502)
  }

  // Schritt 7: Test anlegen. user_id bleibt null bis zum Claim.
  // Kein selector/variant_b_css hier: /api/resolve verlangt selector != null,
  // ein Preview-Test darf also selbst dann nicht ausgeliefert werden, wenn
  // jemand das Snippet schon auf der Domain hat. Live geht er erst beim Claim.
  const testName = (body.testName ?? '').trim().slice(0, 80) || `Preview — ${hostOf(url)}`

  let session: { id: string; token: string }
  try {
    session = await ensureTempSession(body.temp_token)
  } catch {
    return json({ error: 'db error' }, 500)
  }

  const { data: test, error: dbError } = await supabase
    .from('tests')
    .insert({
      name: testName,
      site_url: url,
      status: 'preview',
      temp_session_id: session.id,
      preview_original_screenshot_url: shotResult,
      preview_variant_screenshot_url: variantShot,
      preview_data: {
        previewId,
        previewedUrl: url,
        changes: analysis.changes,
        injectedCss: analysis.injectedCss,
        summary: analysis.summary,
        selectorSource: page ? 'code-analysis' : 'screenshot-only',
      },
    })
    .select('id')
    .single()

  if (dbError) {
    safeError('preview-insert', dbError)
    return json({ error: 'db error' }, 500)
  }

  return json({
    previewId,
    testId: test.id,
    // Der Client hängt das an /signup — danach übernimmt der bestehende
    // Claim-Pfad (app/auth/callback + /api/claim-tests) den Test.
    tempToken: session.token,
    originalScreenshotUrl: shotResult,
    variantScreenshotUrl: variantShot,
    screenshotWidth: SHOT_WIDTH,
    screenshotHeight: SHOT_HEIGHT,
    changes: analysis.changes,
    injectedCss: analysis.injectedCss,
    summary: analysis.summary,
    // Plan §5: bei Screenshot-only-Analyse ehrlich sein, statt 99% zu suggerieren.
    degraded: page ? undefined : "We couldn't read your page's code, so this is our best guess from the screenshot.",
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
