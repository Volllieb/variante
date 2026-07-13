import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { DashboardShell } from './DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const profileRes = await supabase
    .from('profiles')
    .select('plan')
    .eq('user_id', user.id)
    .single()

  const plan = profileRes.data?.plan ?? 'free'

  return (
    <DashboardShell email={user.email ?? ''} plan={plan}>
      {children}
    </DashboardShell>
  )
}
