import { getExperimentStats } from '@/lib/getExperimentStats'
import { getSessionUser } from '@/lib/supabaseServer'
import { getServerSupabase } from '@/lib/supabaseServer'
import { ResultsClient } from './ResultsClient'
import { notFound, redirect } from 'next/navigation'

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const data = await getExperimentStats(id)
  if (!data || data.userId !== user.id) notFound()

  // Pro-Flag für Gating (Raw Data + Auto-Winner)
  const supabase = await getServerSupabase()
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('user_id', user.id)
    .single()
  const pro = profile?.plan === 'pro' || profile?.plan === 'agency'

  return <ResultsClient initial={data} experimentId={id} pro={pro} />
}
