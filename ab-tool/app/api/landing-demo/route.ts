/**
 * POST /api/landing-demo
 *
 * Stores a URL from the landing page demo so it can be converted into a
 * draft test after the user signs up. Uses a short-lived cookie (not a
 * DB temp session) — simpler, no cleanup needed.
 *
 * Auth: None (public). Rate-limited per IP.
 */

import { corsHeaders, preflight } from '@/lib/cors'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

export const maxDuration = 10

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

  // Basic validation — must look like a domain
  const normalized = url.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  if (!normalized.includes('.') || normalized.length < 3) {
    return Response.json({ error: 'invalid url' }, { status: 400, headers })
  }

  // Store the demo URL in a short-lived cookie (30 min).
  // The signup/onboarding flow reads this cookie and creates a draft test.
  const cookieValue = encodeURIComponent(normalized)
  const responseHeaders = new Headers(headers)
  responseHeaders.set(
    'Set-Cookie',
    `variante_demo_url=${cookieValue}; Path=/; Max-Age=1800; SameSite=Lax; Secure`
  )

  return Response.json({ ok: true, url: normalized }, { status: 200, headers: responseHeaders })
}
