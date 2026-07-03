import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { safeError } from '@/lib/safeLog'

// Security: UUID v4 Format-Validierung für snippet_key
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function OPTIONS() {
  return preflight('GET, OPTIONS')
}

export async function GET(req: Request) {
  // Security: Rate-Limiting — maximal 60 Assign-Calls pro Minute pro IP
  const ip = getClientIp(req)
  if (!checkRateLimit(`assign:${ip}`, 60, 60_000)) {
    return Response.json({ error: 'too many requests' }, { status: 429, headers: corsHeaders('GET, OPTIONS') })
  }

  const testId = new URL(req.url).searchParams.get('testId') ?? ''
  // Security: UUID-Validierung verhindert SQL-Injection-ähnliche Pattern in RPC-Parametern
  if (!testId || !UUID_RE.test(testId)) {
    return Response.json({ error: 'testId required (UUID)' }, { status: 400, headers: corsHeaders('GET, OPTIONS') })
  }

  const { data, error } = await supabase.rpc('ab_assign', { p_key: testId })

  if (error) {
    safeError('assign', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('GET, OPTIONS') })
  }

  if (data !== 'A' && data !== 'B') {
    return Response.json({ error: 'not found' }, { status: 404, headers: corsHeaders('GET, OPTIONS') })
  }

  return Response.json({ variant: data }, { headers: corsHeaders('GET, OPTIONS') })
}
