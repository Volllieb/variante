import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { ensureProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage(props: { searchParams: Promise<Record<string, string>> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  // Fallback: Fehlt der profiles-Eintrag (Trigger-Race bei OAuth), jetzt anlegen
  await ensureProfile(user.id)

  const { data: profile } = await supabase
    .from('profiles')
    .select('api_token, plan, onboarded, has_figma_plugin')
    .eq('user_id', user.id)
    .single()

  if (profile && !profile.onboarded) redirect('/onboarding')

  const { data: tests } = await supabase
    .from('tests')
    .select('id, name, site_url, status, visitors_a, visitors_b, conversions_a, conversions_b, winner, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <DashboardClient
      plan={profile?.plan ?? 'free'}
      apiToken={profile?.api_token ?? ''}
      tests={tests ?? []}
      hasFigmaPlugin={profile?.has_figma_plugin ?? false}
    />
  )
}
