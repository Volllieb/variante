import { supabase } from '@/lib/supabase'
import { corsHeadersPublic, preflightPublic } from '@/lib/cors'
import { checkRateLimit, getClientIp, markOnce } from '@/lib/rateLimit'
import { visitorIdentity, VISITOR_DEDUP_TTL_SECONDS } from '@/lib/assignBucket'
import { safeError } from '@/lib/safeLog'
import { signAssignToken } from '@/lib/assignToken'
import { testId as testIdSchema } from '@/lib/validation'

// Sticky Assignment: Die Variante wird deterministisch aus einem gesalzenen
// Request-Hash abgeleitet (lib/assignBucket.ts), nicht mehr pro Call gewuerfelt.
// Derselbe Besucher bekommt ueber Page-Views hinweg dieselbe Variante, auch im
// cookieless Default-Modus von ab.js, in dem der Client nichts speichern darf.
// Gezaehlt wird nur der erste Kontakt — sonst wuerde deterministisches
// Bucketing die Zahlen sogar staerker verzerren als der alte Muenzwurf, weil
// dann ALLE Page-Views eines Besuchers garantiert in denselben Arm fallen.
//
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

  // Bucket + Dedup-Id aus dem Request ableiten. null = keine Client-IP
  // ermittelbar -> die DB faellt auf random() zurueck und wir zaehlen, wie
  // bisher, jeden Call (ohne Identitaet gibt es nichts zu deduplizieren).
  const identity = visitorIdentity(testId, req)
  const isFirstContact = identity
    ? await markOnce(`assign:once:${identity.visitorId}`, VISITOR_DEDUP_TTL_SECONDS)
    : true

  try {
    const { data, error } = await supabase.rpc('ab_assign_v2', {
      p_key: testId,
      p_bucket: identity ? identity.bucket : null,
      p_count: isFirstContact,
    })

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
