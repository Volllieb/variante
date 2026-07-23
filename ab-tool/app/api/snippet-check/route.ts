import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { checkSnippet } from '@/lib/snippetCheck'
import { getApiUser } from '@/lib/auth'

/**
 * POST /api/snippet-check
 *
 * Reiner DIAGNOSE-Endpunkt: prüft, ob das variante-Snippet auf einer Seite
 * installiert ist, und gibt das Ergebnis zurück. Er persistiert nichts.
 *
 * Die Verifikation einer Domain läuft ausschließlich über /api/domains/verify —
 * dort prüft der Server selbst und schreibt selbst. Vorher entschied der Client
 * anhand DIESER Antwort, ob er verify aufruft (Plan SEC-03).
 *
 * ponytail: Der Endpunkt war unauthentifiziert. Damit konnte jeder Anonyme
 * unsere Server beliebige fremde URLs fetchen lassen — ein Traffic-Amplifier
 * auf unsere Rechnung und unsere IP-Reputation (Plan SEC-08).
 *
 * Body: { site_url: string }
 * Response: { detected: boolean, checked_url: string, reason?: string }
 */
export async function POST(req: NextRequest) {
  const user = await getApiUser(req)
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!(await checkRateLimit(`snippet-check:${user.userId}`, 10, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let siteUrl: unknown
  try {
    const body = await req.json()
    siteUrl = body?.site_url
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!siteUrl || typeof siteUrl !== 'string') {
    return NextResponse.json({ error: 'Missing site_url' }, { status: 400 })
  }

  const result = await checkSnippet(siteUrl)

  return NextResponse.json({
    detected: result.detected,
    checked_url: result.checkedUrl,
    ...(result.reason ? { reason: result.reason } : {}),
  })
}
