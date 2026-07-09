import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { DashboardShell } from './DashboardShell'
import { DomainGate } from './components/DomainGate'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const [profileRes, domainsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('plan')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('domains')
      .select('verified')
      .eq('user_id', user.id)
      .limit(1),
  ])

  const plan = profileRes.data?.plan ?? 'free'
  const hasVerifiedDomain = (domainsRes.data ?? []).some((d) => d.verified)

  // Domain-Gate: Kein Zugang zum Dashboard ohne verifizierte Website.
  if (!hasVerifiedDomain) {
    return <DomainGate plan={plan} />
  }

  return (
    <DashboardShell email={user.email ?? ''} plan={plan}>
      {children}
    </DashboardShell>
  )
}
