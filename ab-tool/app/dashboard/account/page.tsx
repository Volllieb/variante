import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { AccountClient } from './AccountClient'

export default async function AccountPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const { data: domains } = await supabase
    .from('domains')
    .select('id, url, verified, verified_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_url, plan')
    .eq('user_id', user.id)
    .single()

  return <AccountClient email={user.email ?? ''} domains={domains ?? []} avatarUrl={profile?.avatar_url ?? null} plan={profile?.plan ?? 'free'} />
}
