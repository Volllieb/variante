import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { DashboardShell } from './DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, onboarded')
    .eq('user_id', user.id)
    .single()

  if (profile && !profile.onboarded) redirect('/onboarding')

  return (
    <DashboardShell email={user.email ?? ''} plan={profile?.plan ?? 'free'} newTestHref="/dashboard?newTest=1">
      {children}
    </DashboardShell>
  )
}
