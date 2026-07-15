import { getExperimentStats } from '@/lib/getExperimentStats'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'

export async function OPTIONS() {
  return preflight('GET, OPTIONS')
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(_req)
  if (!user) return unauthorized('GET, OPTIONS')

  const { id } = await params
  const data = await getExperimentStats(id)
  if (!data) return Response.json({ error: 'not found' }, { status: 404, headers: corsHeaders('GET, OPTIONS') })

  // Security: nur Owner darf Results sehen
  if (data.userId !== user.userId) return unauthorized('GET, OPTIONS')

  const pro = user.plan === 'pro' || user.plan === 'agency'
  return Response.json({ ...data, pro }, { headers: corsHeaders('GET, OPTIONS') })
}
