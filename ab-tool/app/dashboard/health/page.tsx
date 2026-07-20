import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { ensureProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SetupClient } from './SetupClient'

export type SetupData = {
  plan: string
  apiToken: string
  hasFigmaPlugin: boolean
  siteUrl: string | null        // verified domain URL
  domainId: string | null       // for verify call
  hasAnyDomain: boolean         // whether user has saved a domain at all
  testCount: number
  verifiedAt: string | null     // when the domain was last verified
}

export default async function HealthPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const [profileRes, domainsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('plan, api_token, has_figma_plugin')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('domains')
      .select('id, url, verified, verified_at')
      .eq('user_id', user.id)
      .limit(5),
  ])

  const profile = profileRes.data
  const domains = domainsRes.data ?? []

  if (!profile) {
    await ensureProfile(user.id)
    return <SetupClient data={{ plan: 'free', apiToken: '', hasFigmaPlugin: false, siteUrl: null, domainId: null, hasAnyDomain: false, testCount: 0, verifiedAt: null }} />
  }

  const verifiedDomain = domains.find((d) => d.verified)
  const verifiedDomainId = verifiedDomain?.id ?? null
  const hasAnyDomain = domains.length > 0
  const testCount = domains.filter((d) => d.verified).length

  return (
    <SetupClient
      data={{
        plan: profile.plan ?? 'free',
        apiToken: profile.api_token ?? '',
        hasFigmaPlugin: profile.has_figma_plugin ?? false,
        siteUrl: verifiedDomain?.url ?? null,
        domainId: verifiedDomainId,
        hasAnyDomain,
        testCount,
        verifiedAt: verifiedDomain?.verified_at ?? null,
      }}
    />
  )
}
