import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { ensureProfile } from '@/lib/auth'
import { claimDemoUrlForUser } from '@/lib/demoClaim'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { DashboardClient } from './DashboardClient'
import { statsWindowStart, type DailyStatRow } from '@/lib/dashboardStats'
import { startOfBillingMonth } from '@/lib/planLimits'

export default async function DashboardPage(props: { searchParams: Promise<Record<string, string>> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const searchParams = await props.searchParams

  // 60 Tage, damit der 30-Tage-Zeitraum eine vollständige Vorperiode zum
  // Vergleich hat. Das Embedding über tests!inner spart den zweiten Roundtrip
  // — die Test-IDs stehen erst nach der Test-Query fest.
  const statsSince = statsWindowStart()

  // Parallel: Profile + Tests + Domains + Tagesstatistik (kein Waterfall)
  const [profileRes, testsRes, domainsRes, dailyRes, aiScanRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('api_token, plan, has_figma_plugin')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('tests')
      .select('id, name, site_url, status, health_status, health_issues, selector, original_html, site_css, goal, variant_b_html, variant_b_css, variant_b_changes, element_type, visitors_a, visitors_b, conversions_a, conversions_b, winner, created_at, preview_variant_screenshot_url, traffic_split, min_visitors, min_uplift')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('domains')
      .select('url, verified, verified_at')
      .eq('user_id', user.id)
      .limit(5),
    supabase
      .from('daily_stats')
      .select('test_id, date, visitors_a, visitors_b, conversions_a, conversions_b, tests!inner(user_id)')
      .eq('tests.user_id', user.id)
      .gte('date', statsSince),
    // AI-Scan-Verbrauch für die PlanUsageBar. Gezählt wird genau das, was
    // /api/test-wizard/scan durchsetzt: site_insights-Zeilen dieses Monats.
    // head:true überträgt keine Zeilen, nur den Zähler.
    supabase
      .from('site_insights')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('analyzed_at', startOfBillingMonth().toISOString()),
  ])

  const profile = profileRes.data
  const tests = testsRes.data ?? []
  const domains = domainsRes.data ?? []
  // Das eingebettete `tests`-Objekt dient nur dem Filter und gehört nicht in
  // den Client-Payload.
  const dailyStats: DailyStatRow[] = (dailyRes.data ?? []).map((r) => ({
    test_id: r.test_id,
    date: r.date,
    visitors_a: r.visitors_a,
    visitors_b: r.visitors_b,
    conversions_a: r.conversions_a,
    conversions_b: r.conversions_b,
  }))
  // Bei einem Fehler in der Count-Query bleibt es bei 0 — dieselbe Annahme,
  // unter der /api/test-wizard/scan den Request dann durchlaesst.
  const aiScansUsed = aiScanRes.count ?? 0
  const hasVerifiedDomain = domains.some((d) => d.verified)
  const primaryDomain = domains.find((d) => d.verified)?.url ?? domains[0]?.url ?? null
  const verifiedAt = domains.find((d) => d.verified)?.verified_at ?? null
  const allVerifiedDomains = domains.filter((d) => d.verified).map((d) => ({ url: d.url, verifiedAt: d.verified_at }))

  // ── Demo → Account: Landing-Demo-URL direkt mit dem Account verbinden ──
  // Fallback für den Direct-Session-Signup-Pfad (ohne Auth-Callback). Der
  // Callback claimed normalerweise schon beim Signup/Login — dann ist der
  // Cookie bereits gelöscht und hier passiert nichts.
  let demoCreated = false
  try {
    const cookieStore = await cookies()
    const demoUrlCookie = cookieStore.get('variante_demo_url')
    if (demoUrlCookie?.value) {
      const demoUrl = decodeURIComponent(demoUrlCookie.value)
      if (demoUrl.includes('.')) {
        demoCreated = await claimDemoUrlForUser(user.id, demoUrl)
        // Re-fetch tests to include the new draft
        if (demoCreated) {
          const { data: freshTests } = await supabase
            .from('tests')
            .select('id, name, site_url, status, health_status, health_issues, selector, original_html, site_css, goal, variant_b_html, variant_b_css, variant_b_changes, element_type, visitors_a, visitors_b, conversions_a, conversions_b, winner, created_at, preview_variant_screenshot_url, traffic_split, min_visitors, min_uplift')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
          if (freshTests) tests.push(...freshTests.filter((t) => !tests.find((e) => e.id === t.id)))
        }
      }
    }
  } catch { /* Cookie-Read ist Best-Effort */ }

  // Fallback: Fehlt der profiles-Eintrag (Trigger-Race bei OAuth)
  if (!profile) {
    await ensureProfile(user.id)
    return <DashboardClient plan="free" tests={[]} dailyStats={[]} aiScansUsed={0} hasVerifiedDomain={false} primaryDomain={null} verifiedAt={null} allVerifiedDomains={[]} domainCount={0} highlightNew={searchParams.new === '1'} upgraded={false} openNewTest={false} userId={user.id} />
  }

  return (
    <DashboardClient
      plan={profile.plan ?? 'free'}
      tests={tests}
      dailyStats={dailyStats}
      aiScansUsed={aiScansUsed}
      hasVerifiedDomain={hasVerifiedDomain}
      primaryDomain={primaryDomain}
      verifiedAt={verifiedAt}
      allVerifiedDomains={allVerifiedDomains}
      domainCount={domains.length}
      highlightNew={demoCreated || searchParams.new === '1'}
      upgraded={searchParams.upgraded === '1'}
      openNewTest={searchParams.newTest === '1'}
      userId={user.id}
    />
  )
}
