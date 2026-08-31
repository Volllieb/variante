import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { ensureProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TestsClient } from './TestsClient'
import { statsWindowStart, type DailyStatRow } from '@/lib/dashboardStats'

export default async function TestsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  // Parallel: Profile + Tests + Domains + Tagesstatistik (kein Waterfall)
  const [profileRes, testsRes, domainsRes, dailyRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('plan, has_figma_plugin, api_token')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('tests')
      .select('id, name, site_url, status, health_status, health_issues, selector, original_html, site_css, goal, variant_b_html, variant_b_css, visitors_a, visitors_b, conversions_a, conversions_b, winner, created_at, traffic_split, min_visitors, min_uplift')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('domains')
      .select('url, verified_at')
      .eq('user_id', user.id)
      .eq('verified', true),
    // Dieselben Tageszeilen wie die Overview: Die Testkarte zeigt auf beiden
    // Seiten denselben Restweg ("at this pace…") — ohne die Zeilen rechnete
    // /dashboard/tests mit dem Lebenszeit-Mittel und die Overview mit dem
    // Tempo der letzten Tage. Zwei Zahlen für denselben Test sind eine zu viel.
    supabase
      .from('daily_stats')
      .select('test_id, date, visitors_a, visitors_b, conversions_a, conversions_b, tests!inner(user_id)')
      .eq('tests.user_id', user.id)
      .gte('date', statsWindowStart()),
  ])

  const profile = profileRes.data
  const tests = testsRes.data
  const verifiedDomains = (domainsRes.data ?? []).map((d) => ({
    url: d.url,
    verifiedAt: d.verified_at,
  }))
  const dailyStats: DailyStatRow[] = (dailyRes.data ?? []).map((r) => ({
    test_id: r.test_id,
    date: r.date,
    visitors_a: r.visitors_a,
    visitors_b: r.visitors_b,
    conversions_a: r.conversions_a,
    conversions_b: r.conversions_b,
  }))

  if (!profile) {
    await ensureProfile(user.id)
    return <TestsClient tests={[]} dailyStats={[]} hasFigmaPlugin={false} userId={user.id} verifiedDomains={[]} />
  }

  return (
    <TestsClient
      tests={tests ?? []}
      dailyStats={dailyStats}
      hasFigmaPlugin={profile.has_figma_plugin ?? false}
      userId={user.id}
      verifiedDomains={verifiedDomains}
    />
  )
}
