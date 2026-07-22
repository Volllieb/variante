import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'
import { checkSnippet } from '@/lib/snippetCheck'
import { checkRateLimit } from '@/lib/rateLimit'

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

// POST /api/domains/verify — prüft das Snippet auf der Domain und persistiert
// das Ergebnis.
//
// ============================================================================
// KRITISCH GEÄNDERT (Plan SEC-03).
// ============================================================================
// Vorher prüfte dieser Endpunkt NICHTS. Er setzte `verified = true` auf einer
// beliebigen Domain-ID des Users; die eigentliche Prüfung lief in
// /api/snippet-check, und ob deren Ergebnis zur verify-Anfrage passte, entschied
// allein der Client (AccountClient.tsx, SnippetStatusBadge.tsx).
//
// Zwei triviale Umgehungen waren damit möglich:
//   1. `POST /api/domains/verify {domainId}` direkt aus der Konsole — der
//      Snippet-Check wurde nie aufgerufen.
//   2. Domain `fremde-firma.de` anlegen, den Snippet-Check gegen die EIGENE
//      Seite laufen lassen, dann verify mit der ID von `fremde-firma.de`
//      aufrufen — verify kannte die geprüfte URL gar nicht.
//
// Damit war der Domain-Gate in /api/tests und /api/test-wizard/create
// wirkungslos: jeder konnte sich eine fremde Domain als "verifiziert" eintragen
// und anschließend Varianten dorthin ausliefern.
//
// Jetzt: der Server holt die Domain-URL selbst aus der DB (Besitz geprüft),
// fetcht sie selbst und entscheidet selbst. Der Client kann nur noch anstoßen.
//
// Hinweis zur Härtung: Snippet-Erkennung per Regex ist ein schwacher
// Eigentumsnachweis — sie belegt, dass jemand den String auf der Seite platzieren
// konnte. Für Domains, unter denen fremder Code ausgeliefert wird, ist ein
// DNS-TXT-Record der belastbare Standard. Siehe Plan SEC-03, "Härtung darüber
// hinaus".
export async function POST(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('POST, OPTIONS')

  // Der Endpunkt löst einen ausgehenden Fetch aus — pro User begrenzen.
  if (!(await checkRateLimit(`domain-verify:${user.userId}`, 10, 60_000))) {
    return Response.json(
      { error: 'Too many verification attempts. Please wait a minute.' },
      { status: 429, headers: corsHeaders('POST, OPTIONS') }
    )
  }

  let body: { domainId?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const { domainId } = body
  if (!domainId) {
    return Response.json({ error: 'domainId is required' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  // Besitz prüfen UND die zu prüfende URL aus der DB holen — nicht vom Client.
  const { data: domain } = await supabase
    .from('domains')
    .select('id, url')
    .eq('id', domainId)
    .eq('user_id', user.userId)
    .single()

  if (!domain) {
    return Response.json({ error: 'not found' }, { status: 404, headers: corsHeaders('POST, OPTIONS') })
  }

  // Die eigentliche Prüfung. Läuft auf genau der Domain, die verifiziert wird.
  const result = await checkSnippet(domain.url)

  if (!result.detected) {
    return Response.json(
      {
        verified: false,
        checked_url: result.checkedUrl,
        reason: result.reason ?? 'Snippet not found.',
      },
      { status: 422, headers: corsHeaders('POST, OPTIONS') }
    )
  }

  const verifiedAt = new Date().toISOString()
  const { error } = await supabase
    .from('domains')
    .update({ verified: true, verified_at: verifiedAt })
    .eq('id', domainId)
    .eq('user_id', user.userId)

  if (error) {
    safeError('domains:verify', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }

  return Response.json(
    { verified: true, verified_at: verifiedAt, checked_url: result.checkedUrl },
    { headers: corsHeaders('POST, OPTIONS') }
  )
}
