import { supabase } from '@/lib/supabase'
import { corsHeadersPublic, preflightPublic } from '@/lib/cors'
import { getApiUser } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'

export async function OPTIONS() {
  return preflightPublic('POST, OPTIONS')
}

export async function POST(req: Request) {
  const user = await getApiUser(req)
  if (!user) {
    // Public CORS statt lib/auth.ts unauthorized() (die nur getvariante.com
    // erlaubt): der New-Test-Wizard oeffnet den Picker OHNE Token (das Element
    // kommt per postMessage, /api/capture ist hier nur ein Best-effort-Sync).
    // Mit der restriktiven CORS-Origin konnte der Browser die 401-Antwort auf
    // Kundendomains nicht lesen -> ab.js' fetch warf "Network error while
    // saving." statt sauber auf den postMessage-Fallback zurueckzufallen.
    return Response.json(
      { error: 'unauthorized', hint: 'API token missing or invalid — copy it from the dashboard.' },
      { status: 401, headers: corsHeadersPublic('POST, OPTIONS') }
    )
  }

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
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeadersPublic('POST, OPTIONS') })
  }

  const { testId, selector, original_html, site_css, framework, goal_candidates, reorder_selector } = body

  if (!testId || !selector) {
    return Response.json(
      { error: 'testId and selector are required' },
      { status: 400, headers: corsHeadersPublic('POST, OPTIONS') }
    )
  }

  // Längenlimits für HTML/CSS-Content (Plan DB-07). test-wizard/draft begrenzt
  // dieselben Felder auf 50 000 Zeichen. Ohne Limit landet beliebig große
  // Nutzereingabe in einer Tabelle mit replica identity full im Pageview-Hotpath.
  if (original_html && typeof original_html === 'string' && original_html.length > 50_000) {
    return Response.json({ error: 'original_html too long (max 50000)' }, { status: 400, headers: corsHeadersPublic('POST, OPTIONS') })
  }
  if (site_css && typeof site_css === 'string' && site_css.length > 50_000) {
    return Response.json({ error: 'site_css too long (max 50000)' }, { status: 400, headers: corsHeadersPublic('POST, OPTIONS') })
  }

  const isTemp = user.plan === 'temp'

  const updatePayload = {
    selector,
    original_html,
    site_css,
    framework,
    ...(goal_candidates !== undefined ? { goal_candidates } : {}),
    ...(reorder_selector !== undefined ? { reorder_selector } : {}),
  }

  // Temp-User: per temp_session_id, regulärer User: per user_id
  const { data: updated, error } = isTemp
    ? await supabase
        .from('tests')
        .update(updatePayload)
        .eq('id', testId)
        .eq('temp_session_id', user.userId)
        .select('id')
    : await supabase
        .from('tests')
        .update(updatePayload)
        .eq('id', testId)
        .eq('user_id', user.userId)
        .select('id')

  if (error) {
    safeError('capture', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeadersPublic('POST, OPTIONS') })
  }
  if (!updated || updated.length === 0) {
    return Response.json({ error: 'not found' }, { status: 404, headers: corsHeadersPublic('POST, OPTIONS') })
  }

  // Plugin-Sync-Timestamp + Flag aktualisieren (Integration-Status).
  // Nur für echte User, nicht für Temp-Sessions.
  if (!isTemp) {
    await supabase
      .from('profiles')
      .update({ last_plugin_sync_at: new Date().toISOString(), has_figma_plugin: true })
      .eq('user_id', user.userId)
      .eq('has_figma_plugin', false)
  }

  return Response.json({ ok: true }, { headers: corsHeadersPublic('POST, OPTIONS') })
}
