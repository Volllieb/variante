import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'

export async function OPTIONS() {
  return preflight('GET, OPTIONS')
}

// GET /api/analytics/:testId — Zeitreihen-Daten (Pro-gated)
export async function GET(req: Request, { params }: { params: Promise<{ testId: string }> }) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('GET, OPTIONS')

  const { testId } = await params

  // Security: nur eigene Tests
  const { data: test } = await supabase
    .from('tests')
    .select('user_id, visitors_a, visitors_b, conversions_a, conversions_b, significance, winner, created_at')
    .eq('id', testId)
    .single()

  if (!test || test.user_id !== user.userId) {
    return Response.json({ error: 'not found' }, { status: 404, headers: corsHeaders('GET, OPTIONS') })
  }

  // Snapshot des aktuellen Stands für heute (idempotent)
  await supabase.rpc('snapshot_daily_stats', { p_test_id: testId })

  // Zeitreihe der letzten 90 Tage
  const { data: stats, error } = await supabase
    .from('daily_stats')
    .select('date, visitors_a, visitors_b, conversions_a, conversions_b')
    .eq('test_id', testId)
    .order('date', { ascending: true })
    .limit(90)

  if (error) {
    safeError('analytics', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('GET, OPTIONS') })
  }

  return Response.json({
    testId,
    current: {
      visitors_a: test.visitors_a,
      visitors_b: test.visitors_b,
      conversions_a: test.conversions_a,
      conversions_b: test.conversions_b,
      significance: test.significance,
      winner: test.winner,
    },
    daily: stats ?? [],
  }, { headers: corsHeaders('GET, OPTIONS') })
}
