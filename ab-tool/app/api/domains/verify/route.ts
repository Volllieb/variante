import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'
import { BLOCKED_HOSTS, BLOCKED_HOSTNAMES } from '@/lib/ssrf'

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

// POST /api/domains/verify — Prüft ob ab.js auf einer Domain lädt
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

  // Domain des Users laden
  const { data: domain } = await supabase
    .from('domains')
    .select('url, verified')
    .eq('id', domainId)
    .eq('user_id', user.userId)
    .single()

  if (!domain) {
    return Response.json({ error: 'not found' }, { status: 404, headers: corsHeaders('POST, OPTIONS') })
  }

  // SSRF-Schutz: keine privaten/reserved Hosts
  const hostname = domain.url.split(':')[0]
  if (BLOCKED_HOSTS.test(hostname) || BLOCKED_HOSTNAMES.includes(hostname)) {
    return Response.json({ error: 'invalid domain' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  // Prüfen ob ab.js auf der Domain existiert (HEAD-Request auf /ab.js)
  let verified = false
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(`https://${domain.url}/ab.js`, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'Variante/1.0 (Domain-Verification)' },
    })
    clearTimeout(timeout)

    // ab.js muss 200 liefern und ~5 KB groß sein
    const contentLength = res.headers.get('content-length')
    const size = contentLength ? parseInt(contentLength, 10) : 0
    verified = res.ok && size > 1000 && size < 10000
  } catch {
    verified = false
  }

  // Verifizierungsstatus persistieren
  const { error } = await supabase
    .from('domains')
    .update({
      verified,
      verified_at: verified ? new Date().toISOString() : null,
    })
    .eq('id', domainId)

  if (error) {
    safeError('domains:verify', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }

  return Response.json({ verified }, { headers: corsHeaders('POST, OPTIONS') })
}
