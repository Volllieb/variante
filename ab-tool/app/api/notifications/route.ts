import { getSessionUser } from '@/lib/supabaseServer'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/notifications — Holt Notifications des eingeloggten Users.
 * Query-Params:
 *   ?unread=1    Nur ungelesene
 *   ?limit=50    Max Anzahl (Default 50)
 *   ?since=<ISO> Nur Notifications neuer als dieser Timestamp (für Polling)
 *
 * PATCH /api/notifications — Markiert Notifications als gelesen.
 * Body: { ids?: string[] } — wenn leer, markiert ALLE als gelesen.
 */
export async function GET(req: Request) {
  const user = await getSessionUser()
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const unreadOnly = url.searchParams.get('unread') === '1'
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200)
  const since = url.searchParams.get('since')

  let query = supabase
    .from('notifications')
    .select('id, type, title, body, href, read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unreadOnly) {
    query = query.eq('read', false)
  }

  if (since) {
    query = query.gt('created_at', since)
  }

  const { data, error } = await query

  if (error) {
    return Response.json({ error: 'db error' }, { status: 500 })
  }

  return Response.json({ notifications: data ?? [] })
}

export async function PATCH(req: Request) {
  const user = await getSessionUser()
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { ids?: string[] }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 })
  }

  let query = supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)

  if (body.ids && body.ids.length > 0) {
    query = query.in('id', body.ids)
  }

  const { error } = await query

  if (error) {
    return Response.json({ error: 'db error' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
