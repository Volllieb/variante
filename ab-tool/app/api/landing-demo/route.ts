/**
 * POST /api/landing-demo
 *
 * Speichert die URL in einem Cookie für Post-Signup-Draft-Erstellung UND
 * analysiert die Seite sofort, um einen "Aha-Moment" auf der Landing Page
 * zu zeigen. Der User sieht ECHTE Ergebnisse VOR dem Signup.
 *
 * Auth: None (public). Rate-limited per IP.
 */

import { corsHeaders, preflight } from '@/lib/cors'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { isBlockedHost } from '@/lib/ssrf'

export const maxDuration = 15

/** Extrahiert den <title> und zählt typische CRO-relevante Elemente. */
function analyzeHtml(html: string): {
  title: string
  elementCounts: { buttons: number; headings: number; links: number; images: number }
} {
  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : ''

  // Element counts (simple regex — good enough for a demo preview)
  const buttons = (html.match(/<button[\s>]/gi) || []).length +
    (html.match(/<input[^>]+type=["'](?:submit|button)["']/gi) || []).length +
    (html.match(/<a[^>]+class="[^"]*\bbtn\b/gi) || []).length
  const headings = (html.match(/<h[1-6][\s>]/gi) || []).length
  const links = (html.match(/<a[\s>]/gi) || []).length
  const images = (html.match(/<img[\s>]/gi) || []).length

  return { title, elementCounts: { buttons, headings, links, images } }
}

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

export async function POST(req: Request) {
  const headers = corsHeaders('POST, OPTIONS')

  // Rate limit: 5 demo requests per IP per minute
  const ip = getClientIp(req)
  if (!(await checkRateLimit(`landing-demo:${ip}`, 5, 60_000))) {
    return Response.json({ error: 'rate limit' }, { status: 429, headers })
  }

  let body: { url?: string }
  try { body = await req.json() } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers })
  }

  const url = body.url?.trim()
  if (!url) {
    return Response.json({ error: 'url is required' }, { status: 400, headers })
  }

  // Basic validation
  const normalized = url.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  if (!normalized.includes('.') || normalized.length < 3) {
    return Response.json({ error: 'invalid url' }, { status: 400, headers })
  }

  // SSRF check
  const hostname = normalized.split('/')[0].split(':')[0]
  if (isBlockedHost(hostname)) {
    return Response.json({ error: 'This URL cannot be analyzed.' }, { status: 400, headers })
  }

  // ─── Fetch & analyze the page (best-effort) ───
  let preview: {
    title: string
    elementCounts: { buttons: number; headings: number; links: number; images: number }
  } | null = null

  try {
    const targetUrl = url.startsWith('http') ? url : `https://${url}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Variante/1.0 (A/B-Testing Demo; +https://www.getvariante.com)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    })
    clearTimeout(timeout)

    if (res.ok) {
      const html = await res.text()
      preview = analyzeHtml(html)
    }
  } catch {
    // Best-effort: preview kann fehlschlagen, Cookie wird trotzdem gesetzt
  }

  // ─── Set cookie (30 min TTL) ───
  const cookieValue = encodeURIComponent(normalized)
  const responseHeaders = new Headers(headers)
  responseHeaders.set(
    'Set-Cookie',
    `variante_demo_url=${cookieValue}; Path=/; Max-Age=1800; SameSite=Lax; Secure`
  )

  return Response.json(
    { ok: true, url: normalized, preview },
    { status: 200, headers: responseHeaders }
  )
}
