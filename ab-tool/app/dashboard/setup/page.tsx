import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { ensureProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SetupClient } from './SetupClient'

export type SetupData = {
  plan: string
  apiToken: string
  hasFigmaPlugin: boolean
  siteUrl: string | null
  testCount: number
}

export default async function SetupPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const [profileRes, testsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('plan, api_token, has_figma_plugin, onboarded')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('tests')
      .select('site_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  const profile = profileRes.data

  if (!profile) {
    await ensureProfile(user.id)
    return <SetupClient data={{ plan: 'free', apiToken: '', hasFigmaPlugin: false, siteUrl: null, testCount: 0 }} />
  }

  const siteUrl = testsRes.data?.[0]?.site_url ?? null

  return (
    <SetupClient
      data={{
        plan: profile.plan ?? 'free',
        apiToken: profile.api_token ?? '',
        hasFigmaPlugin: profile.has_figma_plugin ?? false,
        siteUrl,
        testCount: testsRes.data?.length ?? 0,
      }}
    />
  )
}
