import { supabase } from '@/lib/supabase'

// ponytail: original_html/variant_b_html/site_css werden mitgeliefert
// für die Preview-Komponente auf der Results-Seite. Kein Extra-Request nötig.
// Kein Winner-Update mehr beim Lesen — Winner werden im Cron-Job (stündlich)
// und in der Event-Route (real-time) gesetzt. GET ist read-only.

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
  userId: string | null
  pro: boolean // false → Free-Tier: Signifikanz + Auto-Gewinner gesperrt
  variants: VariantStats[]
  originalHtml: string | null
  variantBHtml: string | null
  siteCss: string | null
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
      'id, name, site_url, status, created_at, significance, winner, visitors_a, visitors_b, conversions_a, conversions_b, min_visitors, min_uplift, user_id, original_html, variant_b_html, site_css'
    )
    .eq('id', id)
    .single()

  if (!test) return null

  // Plan des Besitzers: Signifikanz + Auto-Gewinner sind Pro-Features.
  let pro = false
  if (test.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('user_id', test.user_id)
      .single()
    pro = profile?.plan === 'pro' || profile?.plan === 'agency'
  }

  const userId: string | null = test.user_id || null
  const minVisitors = test.min_visitors ?? 100
  const minUplift = test.min_uplift ?? 0.05
  const status = test.status
  const winner: string | null = test.winner ?? null

  return {
    id: test.id,
    name: test.name,
    site_url: test.site_url,
    status,
    created_at: test.created_at,
    significance: pro ? test.significance ?? 0 : 0,
    winner,
    minVisitors,
    minUplift,
    userId,
    pro,
    originalHtml: test.original_html ?? null,
    variantBHtml: test.variant_b_html ?? null,
    siteCss: test.site_css ?? null,
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
