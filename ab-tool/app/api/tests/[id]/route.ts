import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'

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
    variant_b_html?: string | null
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
    variant_b_html?: string | null
  } = {}
  if (typeof body.goal === 'string') patch.goal = body.goal
  if (body.status === 'draft' || body.status === 'active' || body.status === 'done' || body.status === 'paused') patch.status = body.status
  if (typeof body.selector === 'string' || body.selector === null) patch.selector = body.selector
  if (typeof body.min_visitors === 'number') patch.min_visitors = body.min_visitors
  if (typeof body.min_uplift === 'number') patch.min_uplift = body.min_uplift
  if (typeof body.variant_b_html === 'string' || body.variant_b_html === null) patch.variant_b_html = body.variant_b_html

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: 'nothing to update' }, { status: 400, headers: corsHeaders('GET, PATCH, DELETE, OPTIONS') })
  }

  // Besitz-Scope: nur eigene Tests aktualisierbar.
  const { data: updated, error } = await supabase
    .from('tests')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.userId)
    .select('id')
  if (error) {
    safeError('tests:patch', error)
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
      return Response.json({ error: 'confirm=true required' }, { status: 400, headers: corsHeaders('DELETE, OPTIONS') })
    }
  } catch (_) {
    return Response.json({ error: 'invalid request' }, { status: 400, headers: corsHeaders('DELETE, OPTIONS') })
  }

  const { error } = await supabase.from('tests').delete().eq('id', id).eq('user_id', user.userId)
  if (error) {
    safeError('tests:delete', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('DELETE, OPTIONS') })
  }

  return Response.json({ ok: true }, { headers: corsHeaders('DELETE, OPTIONS') })
}
