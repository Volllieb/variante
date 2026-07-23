import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { AccountClient } from './AccountClient'

export default async function AccountPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  // Plan CODE-06: Parallele Queries statt sequenziellem Wasserfall.
  // domains und profile sind unabhängig voneinander.
  const [domainsRes, profileRes] = await Promise.all([
    supabase
      .from('domains')
      .select('id, url, verified, verified_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('avatar_url, plan')
      .eq('user_id', user.id)
      .single(),
  ])

  return <AccountClient email={user.email ?? ''} domains={domainsRes.data ?? []} avatarUrl={profileRes.data?.avatar_url ?? null} plan={profileRes.data?.plan ?? 'free'} />
}
