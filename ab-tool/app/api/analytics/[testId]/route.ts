import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'

export async function OPTIONS() {
  return preflight('GET, OPTIONS')
}

// GET /api/analytics/:testId — Zeitreihen-Daten (alle Pläne)
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

  // Snapshot des aktuellen Stands für heute (idempotent, überschreibt die
  // heutige Zeile bei jedem Aufruf — siehe Migration 039). p_date bleibt
  // ungesetzt: "heute" bestimmt die DB, damit App- und DB-Zeitzone nicht
  // auseinanderlaufen.
  await supabase.rpc('snapshot_daily_stats', { p_test_id: testId })

  // Zeitreihe der letzten 90 Tage.
  //
  // ponytail: Hier stand `.order('date', { ascending: true }).limit(90)` — das
  // liefert die ÄLTESTEN 90 Zeilen, nicht die jüngsten. Bei einem Test, der
  // länger als 90 Tage läuft, froren damit sämtliche Zeitreihen auf Tag 90 ein:
  // die Charts hörten mitten im laufenden Test auf, und die kumulierten
  // Conversions widersprachen der Gesamtzahl in der Hero-Card, weil die letzten
  // Tage schlicht fehlten. Jetzt wird über das Datum gefiltert und absteigend
  // begrenzt; die Sortierung für die Anzeige stellt der Aufrufer wieder her.
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)
  const { data: stats, error } = await supabase
    .from('daily_stats')
    .select('date, visitors_a, visitors_b, conversions_a, conversions_b')
    .eq('test_id', testId)
    .gte('date', since)
    .order('date', { ascending: false })
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
    daily: (stats ?? []).slice().reverse(),
  }, { headers: { ...corsHeaders('GET, OPTIONS'), 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' } })
}
