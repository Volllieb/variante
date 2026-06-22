import { getExperimentStats } from '@/lib/getExperimentStats'
import { corsHeaders, preflight } from '@/lib/cors'

export async function OPTIONS() {
  return preflight('GET, OPTIONS')
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getExperimentStats(id)
  if (!data) return Response.json({ error: 'not found' }, { status: 404, headers: corsHeaders('GET, OPTIONS') })
  return Response.json(data, { headers: corsHeaders('GET, OPTIONS') })
}
