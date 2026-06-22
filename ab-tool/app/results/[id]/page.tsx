import { getExperimentStats } from '@/lib/getExperimentStats'
import { ResultsClient } from './ResultsClient'
import { notFound } from 'next/navigation'

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getExperimentStats(id)
  if (!data) notFound()

  return <ResultsClient initial={data} experimentId={id} />
}
