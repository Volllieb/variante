import { NextRequest, NextResponse } from 'next/server'
import { BLOCKED_HOSTS, BLOCKED_HOSTNAMES } from '@/lib/ssrf'

/**
 * POST /api/snippet-check
 * Prüft ob das variante-Snippet auf einer externen Seite installiert ist.
 * Server-seitiger Fetch (SSRF-geschützt), sucht nach ab.js / __ab_hide.
 *
 * Body: { site_url: string }
 * Response: { detected: boolean, checked_url: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { site_url } = await req.json()

    if (!site_url || typeof site_url !== 'string') {
      return NextResponse.json({ error: 'Missing site_url' }, { status: 400 })
    }

    // Normalize: ensure protocol
    let url = site_url.trim()
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`
    }

    // SSRF-Guard: validate hostname
    let hostname: string
    try {
      hostname = new URL(url).hostname
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    if (BLOCKED_HOSTS.test(hostname) || BLOCKED_HOSTNAMES.includes(hostname)) {
      return NextResponse.json({ error: 'Blocked host' }, { status: 403 })
    }

    // Fetch the page with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    let html = ''
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'variante-snippet-check/1.0',
          'Accept': 'text/html',
        },
        redirect: 'follow',
      })
      // Only check first 200KB — snippet is in <head>
      html = await res.text()
    } catch {
      return NextResponse.json({
        detected: false,
        checked_url: url,
        reason: 'Site unreachable or timed out',
      })
    } finally {
      clearTimeout(timeout)
    }

    // Check for snippet signatures
    const hasAbJs = /ab\.js/.test(html) || /getvariante\.com\/ab\.js/.test(html)
    const hasHideStyle = /__ab_hide/.test(html)
    const hasPendingClass = /__ab_pending/.test(html)

    const detected = hasAbJs || hasHideStyle || hasPendingClass

    return NextResponse.json({ detected, checked_url: url })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
