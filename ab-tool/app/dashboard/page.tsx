import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage(props: { searchParams: Promise<Record<string, string>> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // DEBUG: Force-reveal what we got
  const debugToken = profile?.api_token ?? (profile ? 'PROFILE-NO-TOKEN' : 'NO-PROFILE')

  // Zustandsbasiertes Onboarding-Gate: greift unabhängig davon, über welchen
  // Pfad der User zum ersten Mal eingeloggt ist (Signup-Sofort-Session,
  // E-Mail-Bestätigung, Google-OAuth, …).
  if (profile && !profile.onboarded) redirect('/onboarding')

  const { data: tests } = await supabase
    .from('tests')
    .select('id, name, site_url, status, visitors_a, visitors_b, conversions_a, conversions_b, winner, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <DashboardClient
      email={user.email ?? ''}
      plan={profile?.plan ?? 'free'}
        apiToken={debugToken}
      tests={tests ?? []}
    />
  )
}
