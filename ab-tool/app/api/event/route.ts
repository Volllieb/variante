import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { calcSignificance, determineWinner } from '@/lib/significance'
import { checkRateLimit, getClientIp, loadtestBypass } from '@/lib/rateLimit'
import { safeError } from '@/lib/safeLog'

// Security: UUID v4 Format-Validierung für snippet_key
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

type TestRow = {
  id: string
  visitors_a: number
  visitors_b: number
  conversions_a: number
  conversions_b: number
  min_visitors: number
  min_uplift: number
  significance_level: number
}

export async function POST(req: Request) {
  // Security: Rate-Limiting pro IP. Wie bei /api/resolve war 30/min zu eng
  // fuer geteilte IPs (Plan BUG-01b). Conversions sind zusaetzlich pro Session
  // dedupliziert (ab.js sendConversion), das Limit ist reiner Missbrauchsschutz.
  const ip = getClientIp(req)
  if (!loadtestBypass(req) && !await checkRateLimit(`event:${ip}`, 300, 60_000)) {
    return Response.json({ error: 'too many requests' }, { status: 429, headers: corsHeaders('POST, OPTIONS') })
  }

  let body: { testId?: string; variant?: string; event?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const { testId, variant, event } = body

  // Security: UUID-Validierung verhindert Malformed-Input in DB-Queries
  if (!testId || !UUID_RE.test(testId) || (variant !== 'A' && variant !== 'B') || event !== 'conversion') {
    return Response.json(
      { error: 'testId (UUID), variant (A|B) and event=conversion are required' },
      { status: 400, headers: corsHeaders('POST, OPTIONS') }
    )
  }

  // Guard: Conversions auf pausierten ODER abgeschlossenen Tests nicht zählen.
  // (done kann über alte localStorage-Caches noch Klicks senden.)
  const { data: testMeta, error: metaError } = await supabase
    .from('tests')
    .select('status')
    .eq('snippet_key', testId)
    .maybeSingle()

  if (metaError || !testMeta) {
    return Response.json({ error: 'not found' }, { status: 404, headers: corsHeaders('POST, OPTIONS') })
  }

  if (testMeta.status === 'paused' || testMeta.status === 'done') {
    return Response.json({ error: 'test is not active' }, { status: 409, headers: corsHeaders('POST, OPTIONS') })
  }

  const { data, error } = await supabase.rpc('ab_convert', { p_key: testId, p_variant: variant })

  if (error) {
    safeError('event', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }

  const row = data as TestRow | null
  if (!row || !row.id) {
    return Response.json({ error: 'not found' }, { status: 404, headers: corsHeaders('POST, OPTIONS') })
  }

  const significance = calcSignificance(
    row.visitors_a,
    row.conversions_a,
    row.visitors_b,
    row.conversions_b
  )
  const winner = determineWinner(
    significance,
    row.conversions_a,
    row.conversions_b,
    row.visitors_a,
    row.visitors_b,
    row.min_visitors,
    row.min_uplift,
    row.significance_level ?? 0.95
  )

  const { error: updateError } = await supabase
    .from('tests')
    .update({ significance, winner, status: winner ? 'done' : undefined })
    .eq('id', row.id)

  if (updateError) {
    safeError('event', updateError)
  }

  // Event: Winner erkannt
  if (winner) {
    const { data: testOwner } = await supabase
      .from('tests')
      .select('user_id, name')
      .eq('id', row.id)
      .single()

    await supabase.rpc('log_event', {
      p_test_id: row.id,
      p_user_id: testOwner?.user_id ?? null,
      p_type: 'winner_detected',
      p_message: `Winner ${winner} detected for "${testOwner?.name || row.id}" (sig=${significance.toFixed(4)})`,
    })
  }

  return Response.json({ ok: true }, { headers: corsHeaders('POST, OPTIONS') })
}
