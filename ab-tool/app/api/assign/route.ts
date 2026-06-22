import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'

export async function OPTIONS() {
  return preflight('GET, OPTIONS')
}

export async function GET(req: Request) {
  const testId = new URL(req.url).searchParams.get('testId') ?? ''
  if (!testId) {
    return Response.json({ error: 'testId fehlt' }, { status: 400, headers: corsHeaders('GET, OPTIONS') })
  }

  const { data, error } = await supabase.rpc('ab_assign', { p_key: testId })

  if (error) {
    console.error('[assign] rpc error:', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('GET, OPTIONS') })
  }

  if (data !== 'A' && data !== 'B') {
    return Response.json({ error: 'not found' }, { status: 404, headers: corsHeaders('GET, OPTIONS') })
  }

  return Response.json({ variant: data }, { headers: corsHeaders('GET, OPTIONS') })
}
