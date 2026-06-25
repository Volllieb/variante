import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'

export async function OPTIONS() {
  return preflight('GET, PATCH, DELETE, OPTIONS')
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('GET, PATCH, DELETE, OPTIONS')
  const { id } = await params

  let body: {
    goal?: string
    status?: string
    selector?: string | null
    min_visitors?: number
    min_uplift?: number
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('GET, PATCH, DELETE, OPTIONS') })
  }

  const patch: {
    goal?: string
    status?: string
    selector?: string | null
    min_visitors?: number
    min_uplift?: number
  } = {}
  if (typeof body.goal === 'string') patch.goal = body.goal
  if (body.status === 'draft' || body.status === 'active' || body.status === 'done' || body.status === 'paused') patch.status = body.status
  if (typeof body.selector === 'string' || body.selector === null) patch.selector = body.selector
  if (typeof body.min_visitors === 'number') patch.min_visitors = body.min_visitors
  if (typeof body.min_uplift === 'number') patch.min_uplift = body.min_uplift

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: 'nichts zu aktualisieren' }, { status: 400, headers: corsHeaders('GET, PATCH, DELETE, OPTIONS') })
  }

  // Besitz-Scope: nur eigene Tests aktualisierbar.
  const { data: updated, error } = await supabase
    .from('tests')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.userId)
    .select('id')
  if (error) {
    console.error('[tests:patch] update error:', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('GET, PATCH, DELETE, OPTIONS') })
  }
  if (!updated || updated.length === 0) {
    return Response.json({ error: 'not found' }, { status: 404, headers: corsHeaders('GET, PATCH, DELETE, OPTIONS') })
  }

  return Response.json({ ok: true }, { headers: corsHeaders('GET, PATCH, DELETE, OPTIONS') })
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('GET, PATCH, DELETE, OPTIONS')
  const { id } = await params

  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.userId)
    .single()

  if (error || !data) {
    return Response.json({ error: 'not found' }, { status: 404, headers: corsHeaders('GET, OPTIONS') })
  }

  return Response.json(data, { headers: corsHeaders('GET, OPTIONS') })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('GET, PATCH, DELETE, OPTIONS')
  const { id } = await params
  try {
    const url = new URL(req.url)
    const confirm = url.searchParams.get('confirm')
    if (confirm !== 'true') {
      return Response.json({ error: 'confirm=true fehlt' }, { status: 400, headers: corsHeaders('DELETE, OPTIONS') })
    }
  } catch (_) {
    return Response.json({ error: 'invalid request' }, { status: 400, headers: corsHeaders('DELETE, OPTIONS') })
  }

  const { error } = await supabase.from('tests').delete().eq('id', id).eq('user_id', user.userId)
  if (error) {
    console.error('[tests:delete] delete error:', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('DELETE, OPTIONS') })
  }

  return Response.json({ ok: true }, { headers: corsHeaders('DELETE, OPTIONS') })
}
