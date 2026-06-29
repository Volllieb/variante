import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage(props: { searchParams: Promise<Record<string, string>> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('api_token, plan, plan_status')
    .eq('user_id', user.id)
    .single()

  const { data: tests } = await supabase
    .from('tests')
    .select('id, name, site_url, status, visitors_a, visitors_b, conversions_a, conversions_b, winner')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <DashboardClient
      email={user.email ?? ''}
      plan={profile?.plan ?? 'free'}
      apiToken={profile?.api_token ?? ''}
      tests={tests ?? []}
    />
  )
}
