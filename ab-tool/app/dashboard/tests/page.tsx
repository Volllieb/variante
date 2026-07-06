import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { ensureProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TestsClient } from './TestsClient'

export default async function TestsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  await ensureProfile(user.id)

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, onboarded, has_figma_plugin, api_token')
    .eq('user_id', user.id)
    .single()

  if (profile && !profile.onboarded) redirect('/onboarding')

  const { data: tests } = await supabase
    .from('tests')
    .select('id, name, site_url, status, visitors_a, visitors_b, conversions_a, conversions_b, winner, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <TestsClient
      apiToken={profile?.api_token ?? ''}
      tests={tests ?? []}
      hasFigmaPlugin={profile?.has_figma_plugin ?? false}
    />
  )
}
