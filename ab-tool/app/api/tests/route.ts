import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'

export async function OPTIONS() {
  return preflight('GET, POST, OPTIONS')
}

export async function GET() {
  const { data, error } = await supabase
    .from('tests')
    .select(
      'id, name, site_url, status, visitors_a, visitors_b, conversions_a, conversions_b, significance, winner, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[tests] list error:', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('GET, POST, OPTIONS') })
  }

  return Response.json({ tests: data ?? [] }, { headers: corsHeaders('GET, POST, OPTIONS') })
}

export async function POST(req: Request) {
  let body: {
    name?: string
    site_url?: string
    selector?: string
    goal?: string
    traffic_split?: number
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const { name, site_url, selector, goal, traffic_split } = body

  if (!name) {
    return Response.json({ error: 'name ist Pflicht' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const { data, error } = await supabase
    .from('tests')
    .insert({ name, site_url, selector, goal, traffic_split })
    .select('id, snippet_key')
    .single()

  if (error || !data) {
    console.error('[tests] insert error:', error)
    return Response.json({ error: 'Fehler beim Anlegen' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }

  return Response.json(
    { id: data.id, snippet_key: data.snippet_key },
    { headers: corsHeaders('POST, OPTIONS') }
  )
}
