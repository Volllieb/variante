import { supabase } from '@/lib/supabase'
import { corsHeadersPublic, preflightPublic } from '@/lib/cors'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { safeError } from '@/lib/safeLog'
import { createHmac } from 'crypto'

// Security: UUID v4 Format-Validierung für snippet_key
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Plan DATA-01: Signiertes Assignment-Token, damit Conversions nicht
// unauthentifiziert fälschbar sind. Ohne Token kann jeder mit dem öffentlichen
// snippet_key Conversions für jeden Test melden. Mit Token muss /api/event den
// Besitz des Tokens nachweisen, den nur /api/assign ausstellt.
const ASSIGN_SECRET = process.env.ASSIGN_SECRET || 'variante-assign-dev'
const TOKEN_TTL_MS = 30 * 60_000 // 30 Minuten

function signToken(snippetKey: string, variant: string): string {
  const exp = Date.now() + TOKEN_TTL_MS
  const payload = `${snippetKey}.${variant}.${exp}`
  const sig = createHmac('sha256', ASSIGN_SECRET).update(payload).digest('hex').slice(0, 16)
  return `${payload}.${sig}`
}

export async function OPTIONS() {
  return preflightPublic('GET, OPTIONS')
}

export async function GET(req: Request) {
  // Security: Rate-Limiting — maximal 600 Assign-Calls pro Minute pro IP
  const ip = getClientIp(req)
  if (!await checkRateLimit(`assign:${ip}`, 600, 60_000)) {
    return Response.json({ error: 'too many requests' }, { status: 429, headers: { ...corsHeadersPublic('GET, OPTIONS'), 'Retry-After': '60' } })
  }

  const testId = new URL(req.url).searchParams.get('testId') ?? ''
  // Security: UUID-Validierung verhindert SQL-Injection-ähnliche Pattern in RPC-Parametern
  if (!testId || !UUID_RE.test(testId)) {
    return Response.json({ error: 'testId required (UUID)' }, { status: 400, headers: corsHeadersPublic('GET, OPTIONS') })
  }

  const { data, error } = await supabase.rpc('ab_assign', { p_key: testId })

  if (error) {
    safeError('assign', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeadersPublic('GET, OPTIONS') })
  }

  if (data !== 'A' && data !== 'B') {
    return Response.json({ error: 'not found' }, { status: 404, headers: corsHeadersPublic('GET, OPTIONS') })
  }

  return Response.json({
    variant: data,
    token: signToken(testId, data),
  }, { headers: corsHeadersPublic('GET, OPTIONS') })
}
