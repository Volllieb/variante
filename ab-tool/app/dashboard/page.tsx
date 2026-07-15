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
      .select('id, name, site_url, status, health_status, health_issues, visitors_a, visitors_b, conversions_a, conversions_b, winner, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('domains')
      .select('url, verified')
      .eq('user_id', user.id)
      .limit(5),
  ])

  const profile = profileRes.data
  const tests = testsRes.data
  const domains = domainsRes.data ?? []
  const hasVerifiedDomain = domains.some((d) => d.verified)
  const primaryDomain = domains.find((d) => d.verified)?.url ?? domains[0]?.url ?? null

  // Fallback: Fehlt der profiles-Eintrag (Trigger-Race bei OAuth)
  if (!profile) {
    await ensureProfile(user.id)
    return <DashboardClient plan="free" apiToken="" tests={[]} hasFigmaPlugin={false} hasVerifiedDomain={false} primaryDomain={null} highlightNew={searchParams.new === '1'} upgraded={false} email={user.email ?? ''} />
  }

  return (
    <DashboardClient
      plan={profile.plan ?? 'free'}
      apiToken={profile.api_token ?? ''}
      tests={tests ?? []}
      hasFigmaPlugin={profile.has_figma_plugin ?? false}
      hasVerifiedDomain={hasVerifiedDomain}
      primaryDomain={primaryDomain}
      highlightNew={searchParams.new === '1'}
      upgraded={searchParams.upgraded === '1'}
      openNewTest={searchParams.newTest === '1'}
      email={user.email ?? ''}
    />
  )
}
