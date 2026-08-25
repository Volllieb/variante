import { corsHeaders, preflight } from '@/lib/cors'
import { checkRateLimit } from '@/lib/rateLimit'
import { checkSnippet } from '@/lib/snippetCheck'
import { getApiUser, unauthorized } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'
import { parseBody } from '@/lib/apiHelpers'
import { snippetCheckBody } from '@/lib/validation'

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
 */

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

export async function POST(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('POST, OPTIONS')

  if (!(await checkRateLimit(`snippet-check:${user.userId}`, 10, 60_000))) {
    return Response.json(
      { error: 'Too many requests' },
      { status: 429, headers: corsHeaders('POST, OPTIONS') }
    )
  }

  const parsed = await parseBody(req, snippetCheckBody, 'POST, OPTIONS')
  if (!parsed.ok) return parsed.response

  try {
    const result = await checkSnippet(parsed.data.site_url)
    return Response.json(
      {
        detected: result.detected,
        checked_url: result.checkedUrl,
        ...(result.outdated ? { outdated: true } : {}),
        ...(result.reason ? { reason: result.reason } : {}),
      },
      { headers: corsHeaders('POST, OPTIONS') }
    )
  } catch (err) {
    safeError('snippet-check', err)
    return Response.json(
      { error: 'check failed' },
      { status: 500, headers: corsHeaders('POST, OPTIONS') }
    )
  }
}
