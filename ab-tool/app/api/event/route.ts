import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { calcSignificance, determineWinner } from '@/lib/significance'

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
}

export async function POST(req: Request) {
  let body: { testId?: string; variant?: string; event?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const { testId, variant, event } = body

  if (!testId || (variant !== 'A' && variant !== 'B') || event !== 'conversion') {
    return Response.json(
      { error: 'testId, variant (A|B) and event=conversion are required' },
      { status: 400, headers: corsHeaders('POST, OPTIONS') }
    )
  }

  // Guard: Conversions auf pausierten ODER abgeschlossenen Tests nicht zählen.
  // (done kann über alte localStorage-Caches noch Klicks senden.)
  const { data: testMeta } = await supabase
    .from('tests')
    .select('status')
    .eq('snippet_key', testId)
    .single()

  if (testMeta?.status === 'paused' || testMeta?.status === 'done') {
    return Response.json({ error: 'test is not active' }, { status: 409, headers: corsHeaders('POST, OPTIONS') })
  }

  const { data, error } = await supabase.rpc('ab_convert', { p_key: testId, p_variant: variant })

  if (error) {
    console.error('[event] rpc error:', error)
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
    row.min_uplift
  )

  const { error: updateError } = await supabase
    .from('tests')
    .update({ significance, winner, status: winner ? 'done' : undefined })
    .eq('id', row.id)

  if (updateError) {
    console.error('[event] significance update error:', updateError)
  }

  return Response.json({ ok: true }, { headers: corsHeaders('POST, OPTIONS') })
}
