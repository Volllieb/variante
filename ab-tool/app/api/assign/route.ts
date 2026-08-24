import { supabase } from '@/lib/supabase'
import { corsHeadersPublic, preflightPublic } from '@/lib/cors'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { safeError } from '@/lib/safeLog'
import { signAssignToken } from '@/lib/assignToken'
import { testId as testIdSchema } from '@/lib/validation'

// Plan DATA-01: Signiertes Assignment-Token, damit Conversions nicht
// unauthentifiziert fälschbar sind. Ohne Token kann jeder mit dem öffentlichen
// snippet_key Conversions für jeden Test melden. Mit Token muss /api/event den
// Besitz des Tokens nachweisen, den nur /api/assign ausstellt.
// Ausstellung + Prüfung + Secret leben zentral in lib/assignToken.ts.

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
  if (!testIdSchema.safeParse(testId).success) {
    return Response.json({ error: 'testId required (UUID)' }, { status: 400, headers: corsHeadersPublic('GET, OPTIONS') })
  }

  try {
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
      token: signAssignToken(testId, data),
    }, { headers: corsHeadersPublic('GET, OPTIONS') })
  } catch (err) {
    safeError('assign', err instanceof Error ? err : new Error(String(err)))
    return Response.json({ error: 'service unavailable' }, { status: 503, headers: corsHeadersPublic('GET, OPTIONS') })
  }
}
