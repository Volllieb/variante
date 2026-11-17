/**
 * POST /api/landing-demo
 *
 * Try-Flow der Landingpage („Show me a better version"): Besucher gibt seine
 * URL ein und sieht VOR dem Signup echte KI-Varianten für Headline und
 * Haupt-Button seiner Seite — dieselbe Pipeline wie im Wizard
 * (lib/generateCopyVariants.ts, Eval scripts/copy-eval/).
 *
 * Vorher (bis 16.11.2026): eigener gpt-4o-mini-Prompt, ungeschützter fetch,
 * und in der Praxis nur eine Elementzählung („10 Buttons, 10 Headlines").
 *
 * Cookies (24 h, für den Claim beim Signup — lib/demoClaim.ts):
 *   variante_demo_url   Host/Pfad der Seite
 *   variante_demo_pick  Headline/Button mit Selektor, Original und Varianten
 *                       (base64url-JSON; die Auswahl des Besuchers setzt
 *                       LandingTrySite clientseitig in variante_demo_choice)
 *
 * Auth: keine (öffentlich). Kosten-Schutz: 3/10 min und 8/Tag pro IP,
 * global 300/Tag — die Route ist sonst ein freier Copywriter für jede Seite.
 */

import { corsHeaders, preflight } from '@/lib/cors'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { isBlockedHost } from '@/lib/ssrf'
import { safeError } from '@/lib/safeLog'
import { CopyGenError, fetchPageHtml, findHeroElements, generateCopyVariants, type CopyVariant, type HeroElement } from '@/lib/generateCopyVariants'
import { encodeDemoPick, type DemoPick } from '@/lib/demoClaim'

export const maxDuration = 60

const METHODS = 'POST, OPTIONS'

export async function OPTIONS() {
  return preflight(METHODS)
}

type ElementResult = { original: string; selector: string; tag: string; variants: CopyVariant[] }

export async function POST(req: Request) {
  const headers = corsHeaders(METHODS)

  const ip = getClientIp(req)
  if (!(await checkRateLimit(`landing-demo:${ip}`, 3, 10 * 60_000)) || !(await checkRateLimit(`landing-demo-day:${ip}`, 8, 24 * 60 * 60_000))) {
    return Response.json({ error: 'You tried a lot of pages — sign up free to keep going.' }, { status: 429, headers })
  }

  let body: { url?: string }
  try { body = await req.json() } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers })
  }
  const raw = body.url?.trim()
  if (!raw) return Response.json({ error: 'Enter your site URL.' }, { status: 400, headers })

  const normalized = raw.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  const hostname = normalized.split('/')[0].split(':')[0].toLowerCase()
  if (!hostname.includes('.') || normalized.length < 3 || normalized.length > 300) {
    return Response.json({ error: "That URL doesn't look right. Try something like yoursite.com" }, { status: 400, headers })
  }
  if (isBlockedHost(hostname)) {
    return Response.json({ error: 'This URL cannot be analyzed.' }, { status: 400, headers })
  }
  const pageUrl = `https://${normalized}`

  // Cookie für den Claim wird in jedem Fall gesetzt — auch wenn die Analyse
  // scheitert, soll die Seite nach dem Signup mit dem Account verbunden sein.
  const responseHeaders = new Headers(headers)
  responseHeaders.append('Set-Cookie', `variante_demo_url=${encodeURIComponent(normalized)}; Path=/; Max-Age=86400; SameSite=Lax; Secure`)

  // Globale Kostenbremse erst nach den billigen Prüfungen
  if (!(await checkRateLimit('landing-demo:global', 300, 24 * 60 * 60_000))) {
    return Response.json({ ok: true, url: normalized, reason: 'busy' }, { headers: responseHeaders })
  }

  let html: string
  try {
    html = await fetchPageHtml(pageUrl)
  } catch (err) {
    safeError('landing-demo-fetch', err)
    return Response.json({ ok: true, url: normalized, reason: 'fetch_failed' }, { headers: responseHeaders })
  }

  const hero = findHeroElements(html)
  if (!hero.headline && !hero.cta) {
    return Response.json({ ok: true, url: normalized, title: hero.title, reason: 'no_elements' }, { headers: responseHeaders })
  }

  const run = async (el: HeroElement | null, kind: 'headline' | 'cta'): Promise<ElementResult | null> => {
    if (!el) return null
    try {
      const r = await generateCopyVariants({ url: pageUrl, original: el.text, kind, selector: el.selector, html })
      return r.variants.length ? { original: el.text, selector: el.selector, tag: el.tag, variants: r.variants } : null
    } catch (err) {
      safeError('landing-demo-generate', { message: err instanceof CopyGenError ? err.code : String(err).slice(0, 200) })
      return null
    }
  }
  const [headline, cta] = await Promise.all([run(hero.headline, 'headline'), run(hero.cta, 'cta')])

  if (headline || cta) {
    const toPick = (r: ElementResult | null, el: HeroElement | null): DemoPick['h'] =>
      r && el ? { s: el.selector, o: el.text, t: el.tag, x: el.html.length <= 700 ? el.html : undefined, v: r.variants.map((v) => [v.text, v.lever]) } : undefined
    const pick: DemoPick = { u: normalized, h: toPick(headline, hero.headline), c: toPick(cta, hero.cta) }
    const encoded = encodeDemoPick(pick)
    if (encoded.length < 3500) {
      responseHeaders.append('Set-Cookie', `variante_demo_pick=${encoded}; Path=/; Max-Age=86400; SameSite=Lax; Secure`)
    }
  }

  return Response.json({
    ok: true,
    url: normalized,
    title: hero.title,
    headline,
    cta,
    ...(headline || cta ? {} : { reason: 'ai_failed' }),
  }, { headers: responseHeaders })
}
