import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { DashboardShell } from './DashboardShell'

async function getCachedProfile(userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('api_token, plan, onboarded')
    .eq('user_id', userId)
    .single()
  return profile
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const profile = await getCachedProfile(user.id)

  if (profile && !profile.onboarded) redirect('/onboarding')

  return (
    <DashboardShell email={user.email ?? ''} plan={profile?.plan ?? 'free'}>
      {children}
    </DashboardShell>
  )
}
