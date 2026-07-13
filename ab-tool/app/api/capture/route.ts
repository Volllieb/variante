import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

export async function POST(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('POST, OPTIONS')

  let body: {
    testId?: string
    selector?: string
    original_html?: string
    site_css?: string
    framework?: string
    goal_candidates?: { selector: string; text: string }[]
    reorder_selector?: string
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const { testId, selector, original_html, site_css, framework, goal_candidates, reorder_selector } = body

  if (!testId || !selector) {
    return Response.json(
      { error: 'testId and selector are required' },
      { status: 400, headers: corsHeaders('POST, OPTIONS') }
    )
  }

  const { data: updated, error } = await supabase
    .from('tests')
    .update({
      selector,
      original_html,
      site_css,
      framework,
      ...(goal_candidates !== undefined ? { goal_candidates } : {}),
      ...(reorder_selector !== undefined ? { reorder_selector } : {}),
    })
    .eq('id', testId)
    .eq('user_id', user.userId)
    .select('id')

  if (error) {
    safeError('capture', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }
  if (!updated || updated.length === 0) {
    return Response.json({ error: 'not found' }, { status: 404, headers: corsHeaders('POST, OPTIONS') })
  }

  // Plugin-Sync-Timestamp + Flag aktualisieren (Integration-Status).
  // Nur schreiben wenn das Flag noch false ist — vermeidet redundante Writes.
  await supabase
    .from('profiles')
    .update({ last_plugin_sync_at: new Date().toISOString(), has_figma_plugin: true })
    .eq('user_id', user.userId)
    .eq('has_figma_plugin', false)

  return Response.json({ ok: true }, { headers: corsHeaders('POST, OPTIONS') })
}
