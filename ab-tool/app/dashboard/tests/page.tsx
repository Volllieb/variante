import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { ensureProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TestsClient } from './TestsClient'

export default async function TestsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  // Parallel: Profile + Tests + Domains gleichzeitig starten
  const [profileRes, testsRes, domainsRes] = await Promise.all([
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
    supabase
      .from('domains')
      .select('url, verified_at')
      .eq('user_id', user.id)
      .eq('verified', true),
  ])

  const profile = profileRes.data
  const tests = testsRes.data
  const verifiedDomains = (domainsRes.data ?? []).map((d) => ({
    url: d.url,
    verifiedAt: d.verified_at,
  }))

  if (!profile) {
    await ensureProfile(user.id)
    return <TestsClient apiToken="" tests={[]} hasFigmaPlugin={false} userId={user.id} plan="free" verifiedDomains={[]} />
  }

  return (
    <TestsClient
      apiToken={profile.api_token ?? ''}
      tests={tests ?? []}
      hasFigmaPlugin={profile.has_figma_plugin ?? false}
      userId={user.id}
      plan={profile.plan ?? 'free'}
      verifiedDomains={verifiedDomains}
    />
  )
}
