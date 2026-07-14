import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { ensureProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TestsClient } from './TestsClient'

export default async function TestsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  // Parallel: Profile + Tests gleichzeitig starten
  const [profileRes, testsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('plan, has_figma_plugin, api_token')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('tests')
      .select('id, name, site_url, status, health_status, health_issues, visitors_a, visitors_b, conversions_a, conversions_b, winner, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const profile = profileRes.data
  const tests = testsRes.data

  const isPro = profile?.plan === 'pro'

  if (!profile) {
    await ensureProfile(user.id)
    return <TestsClient apiToken="" tests={[]} hasFigmaPlugin={false} isAtFreeLimit={false} />
  }

  const activeTests = (tests ?? []).filter(t => t.status !== 'done').length

  return (
    <TestsClient
      apiToken={profile.api_token ?? ''}
      tests={tests ?? []}
      hasFigmaPlugin={profile.has_figma_plugin ?? false}
      isAtFreeLimit={!isPro && activeTests >= 1}
    />
  )
}
