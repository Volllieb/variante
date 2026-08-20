/**
 * POST /api/landing-demo
 *
 * Speichert die URL in einem Cookie — der Auth-Callback verbindet sie beim
 * Signup/Login direkt mit dem Account (Draft-Test + Domain, lib/demoClaim).
 * Analysiert die Seite außerdem sofort, um einen "Aha-Moment" auf der Landing Page
 * zu zeigen: Extrahiert die H1-Headline der User-Seite und schlägt eine
 * KI-verbesserte Version vor — konkret, persönlich, kein generisches Demo.
 *
 * Auth: None (public). Rate-limited per IP.
 */

import { corsHeaders, preflight } from '@/lib/cors'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { isBlockedHost } from '@/lib/ssrf'
import { safeError } from '@/lib/safeLog'

export const maxDuration = 15

interface HeadlineSuggestion {
  original: string
  improved: string
  why: string
}

/** Extrahiert den <title>, das erste <h1> und zählt typische CRO-relevante Elemente. */
function analyzeHtml(html: string): {
  title: string
  h1: string
  elementCounts: { buttons: number; headings: number; links: number; images: number }
} {
  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : ''

  // First H1 — strip inner HTML tags (spans, br, etc.) for clean text
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const h1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : ''

  // Element counts (simple regex — good enough for a demo preview)
  const buttons = (html.match(/<button[\s>]/gi) || []).length +
    (html.match(/<input[^>]+type=["'](?:submit|button)["']/gi) || []).length +
    (html.match(/<a[^>]+class="[^"]*\bbtn\b/gi) || []).length
  const headings = (html.match(/<h[1-6][\s>]/gi) || []).length
  const links = (html.match(/<a[\s>]/gi) || []).length
  const images = (html.match(/<img[\s>]/gi) || []).length

  return { title, h1, elementCounts: { buttons, headings, links, images } }
}

/** Schlägt eine CRO-optimierte Version der Headline vor. */
async function suggestHeadline(
  headline: string,
  title: string,
  url: string,
): Promise<HeadlineSuggestion | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    safeError('landing-demo-no-openai-key', { message: 'OPENAI_API_KEY missing' })
    return null
  }

  const prompt = [
    'A website has this headline:',
    headline || title,
    '',
    headline ? `Page title: ${title}` : '',
    `URL: ${url}`,
    '',
    'Suggest ONE improved headline that would convert better. Then explain WHY in one short sentence — plain English, no jargon, no marketing-speak. Write like you\'re explaining to a friend.',
    '',
    'Return ONLY valid JSON: {"improved":"...", "why":"..."}',
  ].filter(Boolean).join('\n')

  try {
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(12_000),
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a CRO (conversion rate optimization) expert. Suggest one improved headline. Be specific, benefit-driven, and concise. Never use jargon like "CTR", "uplift", "conversion rate" in your explanation. Write plainly.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 256,
        response_format: { type: 'json_object' },
      }),
    })

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => '')
      safeError('landing-demo-openai-error', { message: `status ${aiRes.status}: ${errText.slice(0, 200)}` })
      return null
    }

    const json = await aiRes.json() as { choices: Array<{ message: { content: string } }> }
    const raw = json.choices?.[0]?.message?.content
    if (!raw) return null

    const parsed = JSON.parse(raw) as { improved?: string; why?: string }
    if (!parsed.improved) return null

    return {
      original: headline || title,
      improved: parsed.improved,
      why: parsed.why || 'A more specific headline tells visitors exactly what they\'ll get.',
    }
  } catch (err) {
    safeError('landing-demo-headline-suggestion', { message: String(err).slice(0, 300) })
    return null
  }
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
    h1: string
    elementCounts: { buttons: number; headings: number; links: number; images: number }
  } | null = null
  let headlineSuggestion: HeadlineSuggestion | null = null

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

      // Suggest an improved headline (best-effort, non-blocking)
      const headline = preview.h1 || preview.title
      if (headline && headline.length > 3) {
        headlineSuggestion = await suggestHeadline(headline, preview.title, normalized)
      }
    }
  } catch {
    // Best-effort: preview kann fehlschlagen, Cookie wird trotzdem gesetzt
  }

  // ─── Set cookie (24h TTL — deckt auch den Email-Confirmation-Flow ab) ───
  // Geclaimt wird im Auth-Callback (direkt beim Signup/Login) bzw. als
  // Fallback im Dashboard (lib/demoClaim).
  const cookieValue = encodeURIComponent(normalized)
  const responseHeaders = new Headers(headers)
  responseHeaders.set(
    'Set-Cookie',
    `variante_demo_url=${cookieValue}; Path=/; Max-Age=86400; SameSite=Lax; Secure`
  )

  return Response.json(
    { ok: true, url: normalized, preview, headlineSuggestion },
    { status: 200, headers: responseHeaders }
  )
}
