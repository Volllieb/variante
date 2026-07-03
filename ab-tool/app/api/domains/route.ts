import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'

// Private/Reserved Hosts — SSRF-Schutz für Domain-Verification
const BLOCKED_HOSTS = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|0\.0\.0\.0|\[::1\]|[0-9a-f:]+:[0-9a-f:]*:[0-9a-f:]+)$/i
const BLOCKED_HOSTNAMES = ['metadata.google.internal', '169.254.169.254']

export async function OPTIONS() {
  return preflight('GET, POST, DELETE, OPTIONS')
}

// GET /api/domains — alle Domains des Users
export async function GET(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('GET, POST, DELETE, OPTIONS')

  const { data, error } = await supabase
    .from('domains')
    .select('id, url, verified, verified_at, created_at')
    .eq('user_id', user.userId)
    .order('created_at', { ascending: false })

  if (error) {
    safeError('domains', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('GET, POST, DELETE, OPTIONS') })
  }

  return Response.json({ domains: data ?? [] }, { headers: corsHeaders('GET, POST, DELETE, OPTIONS') })
}

// POST /api/domains — Domain anlegen
export async function POST(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('POST, OPTIONS')

  let body: { url?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const { url } = body
  if (!url || typeof url !== 'string') {
    return Response.json({ error: 'url is required' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  // Normalisieren: https:// entfernen, trailing slash weg
  const normalized = url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '')

  // SSRF-Schutz: keine privaten/reserved Hosts
  const hostname = normalized.split(':')[0] // Port entfernen falls vorhanden
  if (BLOCKED_HOSTS.test(hostname) || BLOCKED_HOSTNAMES.includes(hostname) || !hostname.includes('.')) {
    return Response.json({ error: 'invalid domain' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const { data, error } = await supabase
    .from('domains')
    .insert({ user_id: user.userId, url: normalized })
    .select('id, url, verified, verified_at, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return Response.json({ error: 'domain already exists' }, { status: 409, headers: corsHeaders('POST, OPTIONS') })
    }
    safeError('domains:insert', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }

  return Response.json(data, { status: 201, headers: corsHeaders('POST, OPTIONS') })
}

// DELETE /api/domains?id=<uuid> — Domain löschen
export async function DELETE(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('DELETE, OPTIONS')

  const id = new URL(req.url).searchParams.get('id')
  if (!id) {
    return Response.json({ error: 'id is required' }, { status: 400, headers: corsHeaders('DELETE, OPTIONS') })
  }

  const { error } = await supabase
    .from('domains')
    .delete()
    .eq('id', id)
    .eq('user_id', user.userId)

  if (error) {
    safeError('domains:delete', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('DELETE, OPTIONS') })
  }

  return Response.json({ ok: true }, { headers: corsHeaders('DELETE, OPTIONS') })
}
