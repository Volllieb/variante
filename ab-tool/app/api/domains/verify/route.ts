import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

// POST /api/domains/verify — Markiert eine Domain als verifiziert.
// Der eigentliche Snippet-Check passiert in /api/snippet-check.
// Dieser Endpoint persistiert nur das Ergebnis.
export async function POST(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('POST, OPTIONS')

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

  // Domain existiert und gehört dem User?
  const { data: domain } = await supabase
    .from('domains')
    .select('id')
    .eq('id', domainId)
    .eq('user_id', user.userId)
    .single()

  if (!domain) {
    return Response.json({ error: 'not found' }, { status: 404, headers: corsHeaders('POST, OPTIONS') })
  }

  // Snippet-Check hat das Snippet gefunden → verified setzen
  const verifiedAt = new Date().toISOString()
  const { error } = await supabase
    .from('domains')
    .update({ verified: true, verified_at: verifiedAt })
    .eq('id', domainId)

  if (error) {
    safeError('domains:verify', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }

  return Response.json({ verified: true, verified_at: verifiedAt }, { headers: corsHeaders('POST, OPTIONS') })
}
