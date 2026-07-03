import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage(props: { searchParams: Promise<Record<string, string>> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  // DEBUG: Token-Flow nachvollziehen
  console.log('[DASHBOARD] user.id:', user.id)

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('api_token, plan, plan_status, onboarded')
    .eq('user_id', user.id)
    .single()

  console.log('[DASHBOARD] profile query error:', profileErr?.message || 'none')
  console.log('[DASHBOARD] profile keys:', Object.keys(profile ?? {}))
  console.log('[DASHBOARD] profile.api_token:', profile?.api_token?.substring(0, 12) ?? 'NULL')

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
      apiToken={profile?.api_token ?? 'NO-TOKEN-' + (profile ? 'HAS-PROFILE' : 'NO-PROFILE')}
      tests={tests ?? []}
    />
  )
}
