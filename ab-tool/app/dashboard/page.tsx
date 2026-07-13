import { getSessionUser } from '@/lib/supabaseServer'
import { ensureProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCachedProfile, getCachedTests, getCachedDomains } from '@/lib/cachedQueries'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage(props: { searchParams: Promise<Record<string, string>> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const searchParams = await props.searchParams

  // Parallel cached queries (30s TTL, per-user cache keys)
  const [profile, tests, domains] = await Promise.all([
    getCachedProfile(user.id),
    getCachedTests(user.id),
    getCachedDomains(user.id),
  ])

  const hasVerifiedDomain = domains?.some((d) => d.verified) ?? false
  const primaryDomain = domains?.find((d) => d.verified)?.url ?? domains?.[0]?.url ?? null

  // Fallback: Fehlt der profiles-Eintrag (Trigger-Race bei OAuth)
  if (!profile) {
    await ensureProfile(user.id)
    return <DashboardClient plan="free" apiToken="" tests={[]} hasFigmaPlugin={false} hasVerifiedDomain={false} primaryDomain={null} highlightNew={searchParams.new === '1'} upgraded={false} />
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
    />
  )
}
