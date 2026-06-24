import { supabase } from '@/lib/supabase'
import { determineWinner } from '@/lib/significance'

export type VariantStats = {
  id: string
  label: string
  views: number
  conversions: number
  cr: number
}

export type ExperimentData = {
  id: string
  name: string
  site_url: string
  status: string
  created_at: string
  significance: number
  winner: string | null
  minVisitors: number
  minUplift: number
  variants: VariantStats[]
}

function cr(views: number, conversions: number): number {
  return views > 0 ? Math.round((conversions / views) * 1000) / 10 : 0
}

// Liest einen tests-Datensatz und mappt die Aggregat-Counter auf das
// Varianten-Format, das das Dashboard (ResultsClient) erwartet.
export async function getExperimentStats(id: string): Promise<ExperimentData | null> {
  const { data: test } = await supabase
    .from('tests')
    .select(
      'id, name, site_url, status, created_at, significance, winner, visitors_a, visitors_b, conversions_a, conversions_b, min_visitors, min_uplift'
    )
    .eq('id', id)
    .single()

  if (!test) return null

  const minVisitors = test.min_visitors ?? 100
  const minUplift = test.min_uplift ?? 0.05

  // Auto-Gewinner-Fallback: Wird die Besucher-Schwelle überschritten, ohne dass
  // eine weitere Conversion /api/event triggert, würde der Gewinner nie gesetzt.
  // Beim Dashboard-Poll daher erneut auswerten und ggf. einmalig persistieren.
  let status = test.status
  let winner: string | null = test.winner ?? null
  if (!winner) {
    const computed = determineWinner(
      test.significance ?? 0,
      test.conversions_a ?? 0,
      test.conversions_b ?? 0,
      test.visitors_a ?? 0,
      test.visitors_b ?? 0,
      minVisitors,
      minUplift
    )
    if (computed) {
      winner = computed
      status = 'done'
      await supabase.from('tests').update({ winner: computed, status: 'done' }).eq('id', test.id)
    }
  }

  return {
    id: test.id,
    name: test.name,
    site_url: test.site_url,
    status,
    created_at: test.created_at,
    significance: test.significance ?? 0,
    winner,
    minVisitors,
    minUplift,
    variants: [
      {
        id: 'A',
        label: 'A',
        views: test.visitors_a ?? 0,
        conversions: test.conversions_a ?? 0,
        cr: cr(test.visitors_a ?? 0, test.conversions_a ?? 0),
      },
      {
        id: 'B',
        label: 'B',
        views: test.visitors_b ?? 0,
        conversions: test.conversions_b ?? 0,
        cr: cr(test.visitors_b ?? 0, test.conversions_b ?? 0),
      },
    ],
  }
}
