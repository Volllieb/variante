import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'
import { revalidatePath } from 'next/cache'
import { parseBody } from '@/lib/apiHelpers'
import { updateTestBody } from '@/lib/validation'

export async function OPTIONS() {
  return preflight('GET, PATCH, DELETE, OPTIONS')
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('GET, PATCH, DELETE, OPTIONS')
  const { id } = await params
  const isTemp = user.plan === 'temp'

  const parsed = await parseBody(req, updateTestBody, 'GET, PATCH, DELETE, OPTIONS')
  if (!parsed.ok) return parsed.response
  const patch = { ...parsed.data }
  if (patch.name) patch.name = patch.name.trim()
  if (patch.site_url) patch.site_url = patch.site_url.trim()

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
