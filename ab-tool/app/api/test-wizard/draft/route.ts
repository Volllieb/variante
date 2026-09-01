/**
 * GET/PUT/DELETE /api/test-wizard/draft
 *
 * CRUD für Wizard-Drafts. Speichert partiellen Wizard-Fortschritt,
 * damit User nach Tab-Schließen weitermachen können.
 *
 * Auth: Supabase-Session (Cookie) — nur eingeloggte User.
 */

import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getSessionUser } from '@/lib/supabaseServer'
import { safeError } from '@/lib/safeLog'
import { checkRateLimit } from '@/lib/rateLimit'
import { parseChangesJson } from '@/lib/validation'

// ─── Types ───

interface WizardDraftBody {
  step?: number
  url?: string | null
  selector?: string | null
  original_html?: string | null
  /** Styles der Zielseite vom Picker — Basis der Vorschau (lib/previewDoc.ts). */
  site_css?: string | null
  variant_b_html?: string | null
  variant_b_css?: string | null
  variant_text?: string | null
  goal?: string | null
  goal_selector?: string | null
  auto_name?: string | null
  /** Änderungsliste des Wizard (Delta-Modell) — reist als JSON-String. */
  variant_b_changes?: string | null
  element_type?: string | null
  element_name?: string | null
}

// ─── Route ───

export async function OPTIONS() {
  return preflight('GET, PUT, DELETE, OPTIONS')
}

export async function GET() {
  const headers = corsHeaders('GET, PUT, DELETE, OPTIONS')

  const user = await getSessionUser()
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401, headers })
  }

  const { data, error } = await supabase
    .from('wizard_drafts')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    safeError('wizard-draft-get', error)
    return Response.json({ error: 'db error' }, { status: 500, headers })
  }

  return Response.json({ draft: data ?? null }, { headers })
}

export async function PUT(req: Request) {
  const headers = corsHeaders('GET, PUT, DELETE, OPTIONS')

  const user = await getSessionUser()
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401, headers })
  }

  if (!(await checkRateLimit(`draft:${user.id}`, 30, 60_000))) {
    return Response.json({ error: 'rate limit' }, { status: 429, headers })
  }

  let body: WizardDraftBody
  try { body = await req.json() } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers })
  }

  // Sanity-Checks für Längen (nur wenn gesetzt)
  if (body.url && body.url.length > 2048) return Response.json({ error: 'url too long' }, { status: 400, headers })
  if (body.selector && body.selector.length > 512) return Response.json({ error: 'selector too long' }, { status: 400, headers })
  if (body.original_html && body.original_html.length > 50000) return Response.json({ error: 'original_html too long' }, { status: 400, headers })
  if (body.site_css && body.site_css.length > 50000) return Response.json({ error: 'site_css too long' }, { status: 400, headers })
  if (body.variant_b_html && body.variant_b_html.length > 50000) return Response.json({ error: 'variant_b_html too long' }, { status: 400, headers })
  if (body.variant_b_css && body.variant_b_css.length > 50000) return Response.json({ error: 'variant_b_css too long' }, { status: 400, headers })
  // Cap analog site_css: die Zeilenliste enthält Roh-CSS und Erklärungen.
  if (body.variant_b_changes && body.variant_b_changes.length > 50000) return Response.json({ error: 'variant_b_changes too long' }, { status: 400, headers })
  if (body.element_type && body.element_type.length > 64) return Response.json({ error: 'element_type too long' }, { status: 400, headers })
  if (body.element_name && body.element_name.length > 256) return Response.json({ error: 'element_name too long' }, { status: 400, headers })

  const upsertData: Record<string, unknown> = { user_id: user.id }
  // Nur gesetzte Felder übernehmen (partieller Update)
  if (body.step !== undefined) upsertData.step = body.step
  if (body.url !== undefined) upsertData.url = body.url
  if (body.selector !== undefined) upsertData.selector = body.selector
  if (body.original_html !== undefined) upsertData.original_html = body.original_html
  if (body.site_css !== undefined) upsertData.site_css = body.site_css
  if (body.variant_b_html !== undefined) upsertData.variant_b_html = body.variant_b_html
  if (body.variant_b_css !== undefined) upsertData.variant_b_css = body.variant_b_css
  if (body.variant_text !== undefined) upsertData.variant_text = body.variant_text
  if (body.goal !== undefined) upsertData.goal = body.goal
  if (body.goal_selector !== undefined) upsertData.goal_selector = body.goal_selector
  if (body.auto_name !== undefined) upsertData.auto_name = body.auto_name
  // Änderungsliste → jsonb: als Objekt, nicht als String (PostgREST wirft
  // text → jsonb sonst mit einem Cast-Fehler ab).
  if (body.variant_b_changes !== undefined) {
    upsertData.variant_b_changes = parseChangesJson(body.variant_b_changes)
  }
  if (body.element_type !== undefined) upsertData.element_type = body.element_type
  if (body.element_name !== undefined) upsertData.element_name = body.element_name

  const { error } = await supabase
    .from('wizard_drafts')
    .upsert(upsertData, { onConflict: 'user_id' })

  if (error) {
    safeError('wizard-draft-put', error)
    return Response.json({ error: 'db error' }, { status: 500, headers })
  }

  return Response.json({ ok: true }, { headers })
}

export async function DELETE() {
  const headers = corsHeaders('GET, PUT, DELETE, OPTIONS')

  const user = await getSessionUser()
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401, headers })
  }

  const { error } = await supabase
    .from('wizard_drafts')
    .delete()
    .eq('user_id', user.id)

  if (error) {
    safeError('wizard-draft-delete', error)
    return Response.json({ error: 'db error' }, { status: 500, headers })
  }

  return Response.json({ ok: true }, { headers })
}
