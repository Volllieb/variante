import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'

export async function OPTIONS() {
  return preflight('GET, PATCH, OPTIONS')
}

// GET /api/profile — Profil-Daten (inkl. notify_on_winner, last_plugin_sync_at)
export async function GET(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('GET, PATCH, OPTIONS')

  const { data, error } = await supabase
    .from('profiles')
    .select('plan, plan_status, onboarded, notify_on_winner, last_plugin_sync_at, created_at')
    .eq('user_id', user.userId)
    .single()

  if (error || !data) {
    safeError('profile', error)
    return Response.json({ error: 'not found' }, { status: 404, headers: corsHeaders('GET, PATCH, OPTIONS') })
  }

  return Response.json(data, { headers: corsHeaders('GET, PATCH, OPTIONS') })
}

// PATCH /api/profile — Profil-Einstellungen aktualisieren
export async function PATCH(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('PATCH, OPTIONS')

  let body: { notify_on_winner?: boolean }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('PATCH, OPTIONS') })
  }

  const patch: Record<string, unknown> = {}
  if (typeof body.notify_on_winner === 'boolean') patch.notify_on_winner = body.notify_on_winner

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: 'nothing to update' }, { status: 400, headers: corsHeaders('PATCH, OPTIONS') })
  }

  const { error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('user_id', user.userId)

  if (error) {
    safeError('profile:patch', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('PATCH, OPTIONS') })
  }

  return Response.json({ ok: true }, { headers: corsHeaders('PATCH, OPTIONS') })
}
