import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { OnboardingClient } from './OnboardingClient'

export default async function OnboardingPage(props: { searchParams: Promise<Record<string, string>> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const searchParams = await props.searchParams
  const source = searchParams.source || ''

  const { data: profile } = await supabase
    .from('profiles')
    .select('api_token, plan')
    .eq('user_id', user.id)
    .single()

  return (
    <OnboardingClient
      email={user.email ?? ''}
      apiToken={profile?.api_token ?? ''}
      plan={profile?.plan ?? 'free'}
      source={source}
    />
  )
}
