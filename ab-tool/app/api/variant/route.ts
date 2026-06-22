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

  const { data, error } = await supabase
    .from('tests')
    .select('variant_b_html')
    .eq('snippet_key', testId)
    .single()

  if (error || !data || !data.variant_b_html) {
    return Response.json({ error: 'not found' }, { status: 404, headers: corsHeaders('GET, OPTIONS') })
  }

  return Response.json({ html: data.variant_b_html }, { headers: corsHeaders('GET, OPTIONS') })
}
