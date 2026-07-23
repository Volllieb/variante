import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'
import { revalidatePath } from 'next/cache'

export async function OPTIONS() {
  return preflight('GET, PATCH, DELETE, OPTIONS')
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('GET, PATCH, DELETE, OPTIONS')
  const { id } = await params
  const isTemp = user.plan === 'temp'

  let body: {
    name?: string
    goal?: string
    status?: string
    selector?: string | null
    traffic_split?: number
    min_visitors?: number
    min_uplift?: number
    significance_level?: number
    variant_b_html?: string | null
    variant_b_css?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('GET, PATCH, DELETE, OPTIONS') })
  }

  const patch: {
    name?: string
    goal?: string
    status?: string
    selector?: string | null
    traffic_split?: number
    min_visitors?: number
    min_uplift?: number
    significance_level?: number
    variant_b_html?: string | null
    variant_b_css?: string | null
  } = {}
  if (typeof body.name === 'string' && body.name.trim().length > 0 && body.name.trim().length <= 256) patch.name = body.name.trim()
  if (typeof body.goal === 'string') {
    // Validate: click-goals must have a selector (see test-wizard/create).
    if (body.goal === 'click' || body.goal === 'click:') {
      return Response.json({ error: 'Click goal requires a CSS selector (e.g. click:#my-button).' }, { status: 400, headers: corsHeaders('GET, PATCH, DELETE, OPTIONS') })
    }
    patch.goal = body.goal
  }
  if (body.status === 'draft' || body.status === 'active' || body.status === 'done' || body.status === 'paused') patch.status = body.status
  if (typeof body.selector === 'string' || body.selector === null) patch.selector = body.selector
  if (typeof body.traffic_split === 'number' && Number.isFinite(body.traffic_split) && body.traffic_split >= 0 && body.traffic_split <= 100) patch.traffic_split = body.traffic_split
  if (typeof body.min_visitors === 'number' && body.min_visitors >= 0) patch.min_visitors = body.min_visitors
  if (typeof body.min_uplift === 'number' && body.min_uplift >= 0 && body.min_uplift <= 100) patch.min_uplift = body.min_uplift
  if (typeof body.significance_level === 'number' && [0.9, 0.95, 0.99].includes(body.significance_level)) patch.significance_level = body.significance_level
  if (typeof body.variant_b_html === 'string' || body.variant_b_html === null) patch.variant_b_html = body.variant_b_html
  if (typeof body.variant_b_css === 'string' || body.variant_b_css === null) patch.variant_b_css = body.variant_b_css

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: 'nothing to update' }, { status: 400, headers: corsHeaders('GET, PATCH, DELETE, OPTIONS') })
  }

  // Besitz-Scope: nur eigene Tests aktualisierbar.
  // Vor dem Update den alten Status für Event-Logging sichern.
  const ownerCol = isTemp ? 'temp_session_id' : 'user_id'
  const { data: oldTest } = await supabase
    .from('tests')
    .select('status, name')
    .eq('id', id)
    .eq(ownerCol, user.userId)
    .single()

  const { data: updated, error } = await supabase
    .from('tests')
    .update(patch)
    .eq('id', id)
    .eq(ownerCol, user.userId)
    .select('id')
  if (error) {
    safeError('tests:patch', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('GET, PATCH, DELETE, OPTIONS') })
  }
  if (!updated || updated.length === 0) {
    return Response.json({ error: 'not found' }, { status: 404, headers: corsHeaders('GET, PATCH, DELETE, OPTIONS') })
  }

  // Event-Logging bei Status-Änderungen (nur für echte User)
  if (!isTemp) {
    const oldStatus = oldTest?.status
    const newStatus = patch.status
    if (newStatus && newStatus !== oldStatus) {
      const eventType =
        newStatus === 'active' ? 'started' :
        newStatus === 'paused' ? 'paused' :
        newStatus === 'done' ? 'done' :
        newStatus === 'draft' && oldStatus === 'paused' ? 'resumed' :
        null
      if (eventType) {
        await supabase.rpc('log_event', {
          p_test_id: id,
          p_user_id: user.userId,
          p_type: eventType,
          p_message: `Test "${oldTest?.name || id}" ${oldStatus} → ${newStatus}`,
        })
      }
    }
  }

  revalidatePath('/dashboard')
  return Response.json({ ok: true }, { headers: corsHeaders('GET, PATCH, DELETE, OPTIONS') })
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('GET, PATCH, DELETE, OPTIONS')
  const { id } = await params
  const isTemp = user.plan === 'temp'
  const ownerCol = isTemp ? 'temp_session_id' : 'user_id'

  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .eq('id', id)
    .eq(ownerCol, user.userId)
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
  const isTemp = user.plan === 'temp'
  const ownerCol = isTemp ? 'temp_session_id' : 'user_id'
  try {
    const url = new URL(req.url)
    const confirm = url.searchParams.get('confirm')
    if (confirm !== 'true') {
      return Response.json({ error: 'confirm=true required' }, { status: 400, headers: corsHeaders('DELETE, OPTIONS') })
    }
  } catch (_) {
    return Response.json({ error: 'invalid request' }, { status: 400, headers: corsHeaders('DELETE, OPTIONS') })
  }

  const { error } = await supabase.from('tests').delete().eq('id', id).eq(ownerCol, user.userId)
  if (error) {
    safeError('tests:delete', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('DELETE, OPTIONS') })
  }

  revalidatePath('/dashboard')
  return Response.json({ ok: true }, { headers: corsHeaders('DELETE, OPTIONS') })
}
