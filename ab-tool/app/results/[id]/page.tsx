import { getExperimentStats } from '@/lib/getExperimentStats'
import { getSessionUser } from '@/lib/supabaseServer'
import { ResultsClient } from './ResultsClient'
import { notFound, redirect } from 'next/navigation'

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const data = await getExperimentStats(id)
  if (!data || data.userId !== user.id) notFound()

  return <ResultsClient initial={data} experimentId={id} />
}
