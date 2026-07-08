import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { ensureProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage(props: { searchParams: Promise<Record<string, string>> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const searchParams = await props.searchParams

  // Parallel: Profile + Tests gleichzeitig starten (kein Waterfall)
  const [profileRes, testsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('api_token, plan, onboarded, has_figma_plugin')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('tests')
      .select('id, name, site_url, status, visitors_a, visitors_b, conversions_a, conversions_b, winner, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const profile = profileRes.data
  const tests = testsRes.data

  // Fallback: Fehlt der profiles-Eintrag (Trigger-Race bei OAuth)
  if (!profile) {
    await ensureProfile(user.id)
    return <DashboardClient plan="free" apiToken="" tests={[]} hasFigmaPlugin={false} highlightNew={searchParams.new === '1'} upgraded={false} />
  }

  if (!profile.onboarded) redirect('/onboarding')

  return (
    <DashboardClient
      plan={profile.plan ?? 'free'}
      apiToken={profile.api_token ?? ''}
      tests={tests ?? []}
      hasFigmaPlugin={profile.has_figma_plugin ?? false}
      highlightNew={searchParams.new === '1'}
      upgraded={searchParams.upgraded === '1'}
      openNewTest={searchParams.newTest === '1'}
    />
  )
}
