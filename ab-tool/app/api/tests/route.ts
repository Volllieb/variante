import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized, paymentRequired } from '@/lib/auth'

export async function OPTIONS() {
  return preflight('GET, POST, OPTIONS')
}

export async function GET(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('GET, POST, OPTIONS')

  const { data, error } = await supabase
    .from('tests')
    .select(
      'id, name, site_url, status, visitors_a, visitors_b, conversions_a, conversions_b, significance, winner, min_visitors, min_uplift, created_at'
    )
    .eq('user_id', user.userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[tests] list error:', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('GET, POST, OPTIONS') })
  }

  return Response.json({ tests: data ?? [] }, { headers: corsHeaders('GET, POST, OPTIONS') })
}

export async function POST(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('POST, OPTIONS')

  let body: {
    name?: string
    site_url?: string
    selector?: string
    goal?: string
    traffic_split?: number
    min_visitors?: number
    min_uplift?: number
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const { name, site_url, selector, goal, traffic_split, min_visitors, min_uplift } = body

  if (!name) {
    return Response.json({ error: 'name ist Pflicht' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  // Gating: Free-Tier erlaubt nur 1 laufenden Test (status != 'done').
  if (user.plan === 'free') {
    const { count } = await supabase
      .from('tests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.userId)
      .neq('status', 'done')
    if ((count ?? 0) >= 1) {
      return paymentRequired(
        'POST, OPTIONS',
        'Der Free-Tarif erlaubt 1 aktives Experiment. Upgrade auf Pro für unbegrenzte Tests.'
      )
    }
  }

  const insert: Record<string, unknown> = {
    name,
    site_url,
    selector,
    goal,
    traffic_split,
    user_id: user.userId,
  }
  if (typeof min_visitors === 'number') insert.min_visitors = min_visitors
  if (typeof min_uplift === 'number') insert.min_uplift = min_uplift

  const { data, error } = await supabase
    .from('tests')
    .insert(insert)
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
