import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { ensureProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage(props: { searchParams: Promise<Record<string, string>> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const searchParams = await props.searchParams

  // Parallel: Profile + Tests + Domains gleichzeitig starten (kein Waterfall)
  const [profileRes, testsRes, domainsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('api_token, plan, has_figma_plugin')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('tests')
      .select('id, name, site_url, status, health_status, health_issues, visitors_a, visitors_b, conversions_a, conversions_b, winner, created_at, preview_variant_screenshot_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('domains')
      .select('url, verified, verified_at')
      .eq('user_id', user.id)
      .limit(5),
  ])

  const profile = profileRes.data
  const tests = testsRes.data
  const domains = domainsRes.data ?? []
  const hasVerifiedDomain = domains.some((d) => d.verified)
  const primaryDomain = domains.find((d) => d.verified)?.url ?? domains[0]?.url ?? null
  const verifiedAt = domains.find((d) => d.verified)?.verified_at ?? null
  const allVerifiedDomains = domains.filter((d) => d.verified).map((d) => ({ url: d.url, verifiedAt: d.verified_at }))

  // Fallback: Fehlt der profiles-Eintrag (Trigger-Race bei OAuth)
  if (!profile) {
    await ensureProfile(user.id)
    return <DashboardClient plan="free" tests={[]} hasVerifiedDomain={false} primaryDomain={null} verifiedAt={null} allVerifiedDomains={[]} highlightNew={searchParams.new === '1'} upgraded={false} openNewTest={false} userId={user.id} />
  }

  return (
    <DashboardClient
      plan={profile.plan ?? 'free'}
      tests={tests ?? []}
      hasVerifiedDomain={hasVerifiedDomain}
      primaryDomain={primaryDomain}
      verifiedAt={verifiedAt}
      allVerifiedDomains={allVerifiedDomains}
      highlightNew={searchParams.new === '1'}
      upgraded={searchParams.upgraded === '1'}
      openNewTest={searchParams.newTest === '1'}
      userId={user.id}
    />
  )
}
