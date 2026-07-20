/**
 * POST /api/test-wizard/create
 *
 * Erstellt einen Test aus dem Wizard-State. Generiert KI-Namen, prüft Plan-Limits,
 * löscht den Wizard-Draft nach erfolgreichem Create.
 *
 * Auth: Supabase-Session (Cookie) — nur eingeloggte User.
 */

import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getSessionUser } from '@/lib/supabaseServer'
import { safeError } from '@/lib/safeLog'
import { getPlanAiLimits } from '@/lib/planLimits'
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
}

// ─── Helpers ───

const AUTO_NAME_SYSTEM = `Du bist ein Namensgenerator für A/B-Tests.
Erstelle einen kurzen, deskriptiven Namen (max 80 Zeichen) aus den Test-Details.
Format: "Element: Änderung" oder "Seite — Was getestet wird".
Beispiele:
- "Hero-CTA: Ghost zu Solid Button"
- "Pricing — Jährlich als Default"
- "Headline: Nutzenorientiert statt generisch"
- "Checkout-Button: Blau zu Orange"
Kein Marketing-Sprech. Sachlich, kurz, eindeutig.`

async function generateAutoName(ctx: {
  element?: string
  variantText?: string
  goal: string
  siteUrl: string
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return `Test on ${ctx.siteUrl}` // Fallback ohne API-Key

  const prompt = [
    `Site: ${ctx.siteUrl}`,
    `Goal: ${ctx.goal}`,
    ctx.element ? `Element: ${ctx.element}` : '',
    ctx.variantText ? `Variant: ${ctx.variantText}` : '',
    '',
    'Generiere einen kurzen, eindeutigen Test-Namen.',
  ].filter(Boolean).join('\n')

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: AUTO_NAME_SYSTEM },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 80,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) return `Test on ${ctx.siteUrl}`

    const json = await res.json() as { choices: Array<{ message: { content: string } }> }
    const raw = json.choices?.[0]?.message?.content?.trim() ?? ''
    const parsed = JSON.parse(raw) as { name?: string }
    const name = (parsed.name ?? '').trim().slice(0, 80)
    return name || `Test on ${ctx.siteUrl}`
  } catch {
    return `Test on ${ctx.siteUrl}`
  }
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

  const { site_url, selector, goal, goal_selector, variant_b_html, variant_b_css, variant_text, original_html, status } = body

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

  // ─── Auto-Name generieren ───
  const autoName = await generateAutoName({
    element: normalizedSelector ?? undefined,
    variantText: normalizedVariantText ?? undefined,
    goal,
    siteUrl: site_url,
  })

  // ─── Test erstellen ───
  const testRow = {
    user_id: user.id,
    name: autoName,
    auto_generated_name: autoName,
    site_url,
    selector: normalizedSelector,
    goal,
    goal_selector: normalizedGoalSelector,
    variant_b_html: normalizedVariantHtml,
    variant_b_css: normalizedVariantCss,
    variant_text: normalizedVariantText,
    original_html: normalizedOriginalHtml,
    status,
    traffic_split: 50,
  }

  const { data: test, error: insertErr } = await supabase
    .from('tests')
    .insert(testRow)
    .select('id, name, auto_generated_name, status, site_url, snippet_key, created_at')
    .single()

  if (insertErr || !test) {
    safeError('test-wizard-create-failed', insertErr)
    return Response.json({ error: 'Failed to create test' }, { status: 500, headers })
  }

  // ─── Wizard-Draft löschen ───
  await supabase
    .from('wizard_drafts')
    .delete()
    .eq('user_id', user.id)

  return Response.json({ test }, { status: 201, headers })
}
