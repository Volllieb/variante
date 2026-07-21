/**
 * POST /api/test-wizard/create
 *
 * Erstellt einen Test aus dem Wizard-State. Kein KI-Auto-Name mehr —
 * der Name wird vom Client geliefert (manuelle Eingabe im Review-Step).
 *
 * Auth: Supabase-Session (Cookie) — nur eingeloggte User.
 */

import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getSessionUser } from '@/lib/supabaseServer'
import { safeError } from '@/lib/safeLog'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

export const maxDuration = 30

// ─── Request/Response Types ───

interface CreateTestBody {
  site_url: string
  selector?: string
  goal: string
  goal_selector?: string
  variant_b_html?: string
  variant_b_css?: string
  variant_text?: string
  original_html?: string
  status: 'active' | 'paused'
  name?: string
}

// ─── Route ───

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

export async function POST(req: Request) {
  const headers = corsHeaders('POST, OPTIONS')

  // ─── Auth ───
  const user = await getSessionUser()
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401, headers })
  }

  // ─── Rate-Limit ───
  const ip = getClientIp(req)
  if (!(await checkRateLimit(`create-test:${user.id}`, 5, 60_000))) {
    return Response.json({ error: 'rate limit', message: 'Max 5 test creations per minute.' }, { status: 429, headers })
  }

  // ─── Body ───
  let body: CreateTestBody
  try { body = await req.json() } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers })
  }

  const { site_url, selector, goal, goal_selector, variant_b_html, variant_b_css, variant_text, original_html, status, name } = body

  if (!site_url || !goal) {
    return Response.json({ error: 'site_url and goal are required' }, { status: 400, headers })
  }
  if (!['active', 'paused'].includes(status)) {
    return Response.json({ error: 'status must be active or paused' }, { status: 400, headers })
  }

  // Input-Längenlimits
  if (site_url.length > 2048) return Response.json({ error: 'site_url too long (max 2048)' }, { status: 400, headers })
  if (goal.length > 256) return Response.json({ error: 'goal too long' }, { status: 400, headers })
  if (goal_selector && goal_selector.length > 512) return Response.json({ error: 'goal_selector too long' }, { status: 400, headers })

  // Normalize: empty string → null for optional fields
  const normalizedSelector = selector?.trim() || null
  const normalizedGoalSelector = goal_selector?.trim() || null
  const normalizedVariantHtml = variant_b_html?.trim() || null
  const normalizedVariantCss = variant_b_css?.trim() || null
  const normalizedVariantText = variant_text?.trim() || null
  const normalizedOriginalHtml = original_html?.trim() || null
  const normalizedName = name?.trim() || null

  // Validate: if selector is provided, it must be a valid CSS selector (basic check)
  if (normalizedSelector && normalizedSelector.length > 512) {
    return Response.json({ error: 'selector too long' }, { status: 400, headers })
  }

  // ─── Plan-Limit: Active Tests (Free = 1) ───
  const plan = (user.user_metadata?.plan as string) ?? 'free'
  if (plan === 'free') {
    const { count } = await supabase
      .from('tests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('status', 'done')
    if ((count ?? 0) >= 1) {
      return Response.json({
        error: 'limit reached',
        message: 'Free plan allows 1 active experiment. Upgrade to Pro for unlimited tests.',
      }, { status: 402, headers })
    }
  }

  // ─── Test erstellen (Name vom Client, kein KI-Auto-Name) ───
  const testName = normalizedName || `Test on ${site_url.replace(/^https?:\/\//, '').slice(0, 60)}`

  // ponytail: Nur Spalten inserted, die in der DB existieren.
  // goal_selector und variant_text wurden nie per Migration angelegt.
  const testRow: Record<string, unknown> = {
    user_id: user.id,
    name: testName,
    site_url,
    selector: normalizedSelector,
    goal,
    variant_b_html: normalizedVariantHtml,
    variant_b_css: normalizedVariantCss,
    original_html: normalizedOriginalHtml,
    status,
    traffic_split: 50,
  }

  const { data: test, error: insertErr } = await supabase
    .from('tests')
    .insert(testRow)
    .select('id, name, status, site_url, snippet_key, created_at')
    .single()

  if (insertErr || !test) {
    safeError('test-wizard-create-failed', insertErr)
    const message = insertErr?.message ?? 'Unknown database error'
    const code = insertErr?.code ?? null
    return Response.json({
      error: 'Failed to create test',
      detail: message,
      code,
    }, { status: 500, headers })
  }

  // ─── Wizard-Draft löschen ───
  await supabase
    .from('wizard_drafts')
    .delete()
    .eq('user_id', user.id)

  return Response.json({ test }, { status: 201, headers })
}
