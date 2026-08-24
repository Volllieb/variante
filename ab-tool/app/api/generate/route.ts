import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'
import { scanPII, PII_PATTERNS } from '@/lib/pii'
import { getAIMonthlyBudget } from '@/lib/planLimits'
import { checkDailyGlobalLimit } from '@/lib/rateLimit'
import {
  ESTIMATED_COST_PER_GEN,
  TEMP_SESSION_GEN_LIMIT,
  MODEL,
} from '@/lib/generateConstants'
import {
  SYSTEM_PROMPT,
  REORDER_SYSTEM_PROMPT,
  FEW_SHOT_PROMPT,
  buildPrompt,
  buildRefinePrompt,
  buildReorderPrompt,
} from '@/lib/generatePrompts'
import {
  parseStructuredOutput,
  parseCssOutput,
  validateOutput,
} from '@/lib/generateHelpers'

export const maxDuration = 60

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

export async function POST(req: Request) {
  let body: {
    testId?: string
    frameContent?: unknown
    feedback?: string
    previousHtml?: string
    scope?: string
    userInstructions?: string
    mode?: string
    selector_b?: string
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const { testId, frameContent, feedback, previousHtml } = body
  const scope = body.scope === 'text' || body.scope === 'color' ? body.scope : 'all'
  const userInstructions = body.userInstructions || ''
  const mode = body.mode === 'reorder' || body.mode === 'both' ? body.mode : 'content'
  if (!testId) {
    return Response.json({ error: 'testId required' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const user = await getApiUser(req)
  if (!user) return unauthorized('POST, OPTIONS')
  const isTemp = user.plan === 'temp'

  const selectColumns = 'original_html, site_css, framework, selector, reorder_selector, variant_b_html'
  const ownerCol = isTemp ? 'temp_session_id' : 'user_id'
  const { data: test, error: fetchErr } = await supabase
    .from('tests')
    .select(selectColumns)
    .eq('id', testId)
    .eq(ownerCol, user.userId)
    .single()

  if (fetchErr || !test) {
    return Response.json({ error: 'test not found' }, { status: 404, headers: corsHeaders('POST, OPTIONS') })
  }

  // Temp-Sessions: hartes Budget pro SESSION (Plan SEC-06).
  // consume_temp_session_gen (Migration 031) prueft und bucht atomar.
  // Zusätzlich: globaler Tages-Circuit-Breaker (Plan NEW-01).
  if (isTemp) {
    if (!(await checkDailyGlobalLimit())) {
      return Response.json(
        { error: 'global_limit', message: 'Daily generation limit reached. Please try again tomorrow or sign up.' },
        { status: 429, headers: corsHeaders('POST, OPTIONS') }
      )
    }
    const { data: allowed } = await supabase.rpc('consume_temp_session_gen', {
      p_session_id: user.userId,
      p_limit: TEMP_SESSION_GEN_LIMIT,
    })
    if (allowed !== true) {
      return Response.json(
        {
          error: 'free_gen_limit',
          message: 'Sign up to generate more variants.',
          signup_url: '/signup?source=figma-plugin&temp_token=' + encodeURIComponent(user.userId),
        },
        { status: 402, headers: corsHeaders('POST, OPTIONS') }
      )
    }
  }

  // DSGVO: PII-Scan vor OpenAI-Sendung.
  // Reorder-Mode überspringt den Scan, weil kein original_html ans Modell geht.
  if (mode !== 'reorder') {
    const pii = scanPII(test.original_html)
    if (pii) {
      const fields = PII_PATTERNS.filter(p => pii[p.key]?.length).map(p => p.label)
      console.warn('[generate] PII detected in original_html, blocking OpenAI send:', fields)
      return Response.json(
        {
          error: 'PII detected in element content',
          message: `The selected element contains personal data (${fields.join(', ')}). Remove it from your page and try again.`,
          piiFields: fields,
        },
        { status: 422, headers: corsHeaders('POST,OPTIONS') }
      )
    }
  }

  // Usage-Limit: atomarer Check via RPC (Reset + Limit + Increment in einer Transaktion).
  // ponytaile: increment_gen_cost replaced manual check+reset to fix TOCTOU race.
  // Temp-User: überspringen (1-Free-Gen-Limit oben greift stattdessen).
  if (!isTemp) {
    const monthlyBudget = getAIMonthlyBudget(user.plan)
    const { data: withinLimit, error: limitErr } = await supabase.rpc('increment_gen_cost', {
      p_user_id: user.userId,
      p_amount: ESTIMATED_COST_PER_GEN,
      p_limit: monthlyBudget,
    })

    if (limitErr || withinLimit === false) {
      return Response.json(
        { error: 'monthly generation limit reached', message: `OpenAI budget exhausted ($${monthlyBudget}/mo). Resets on the 1st.` },
        { status: 429, headers: corsHeaders('POST, OPTIONS') }
      )
    }
  }

  // Mit Feedback + vorigem Output → Verfeinerung, sonst Erstgenerierung.
  // Reorder-Mode hat eigenen Prompt-Pfad.
  const isRefinement = !!(feedback && previousHtml) && mode !== 'reorder'
  let prompt: string
  let systemPrompt: string
  let temperature: number
  let variantHtml = ''
  let variantCss = ''

  if (mode === 'reorder') {
    // Reorder-Modus: generiere CSS, kein HTML.
    const reorderSelector = test.reorder_selector || body.selector_b || null
    if (!reorderSelector) {
      return Response.json(
        { error: 'selector_b or reorder_selector required for reorder mode' },
        { status: 400, headers: corsHeaders('POST, OPTIONS') }
      )
    }
    systemPrompt = REORDER_SYSTEM_PROMPT
    prompt = buildReorderPrompt(
      test.selector || body.selector_b || '',
      reorderSelector,
      test.site_css,
      userInstructions
    )
    temperature = 0.2 // deterministisch — CSS muss exakt sein
  } else {
    // Content-Modus: bestehender HTML-Flow
    systemPrompt = SYSTEM_PROMPT
    prompt = isRefinement
      ? buildRefinePrompt(previousHtml, feedback, scope, userInstructions)
      : FEW_SHOT_PROMPT + '\n\n' + buildPrompt(test.original_html, test.site_css, test.framework, frameContent, scope, userInstructions)
    temperature = scope === 'text' ? 0.6 : 0.3
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'OPENAI_API_KEY missing' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }

  let warnings: string[] = []
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature,
        max_tokens: 4096,
      }),
    })
    if (!res.ok) throw new Error(`openai ${res.status}`)
    const json = await res.json()
    const raw = json.choices?.[0]?.message?.content ?? ''

    if (mode === 'reorder') {
      variantCss = parseCssOutput(raw)
      if (!variantCss) throw new Error('empty CSS response')
    } else {
      variantHtml = parseStructuredOutput(raw)
      if (!variantHtml) throw new Error('empty response after stripFences')
      const check = validateOutput(variantHtml)
      warnings = check.warnings
    }
  } catch (e) {
    safeError('generate', e)
    return Response.json({ error: 'AI generation failed' }, { status: 502, headers: corsHeaders('POST, OPTIONS') })
  }

  if (warnings.length) {
    console.warn('[generate] validation warnings:', warnings)
  }

  const updatePayload: Record<string, string | null> = {}
  if (mode === 'reorder') {
    updatePayload.variant_b_css = variantCss
  } else {
    updatePayload.variant_b_html = variantHtml
  }

  const { error: updateErr } = await supabase
    .from('tests')
    .update(updatePayload)
    .eq('id', testId)
    .eq(ownerCol, user.userId)

  if (updateErr) {
    safeError('generate', updateErr)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }

  const response: Record<string, unknown> = {}
  if (mode === 'reorder') {
    response.css = variantCss
  } else {
    response.html = variantHtml
    response.siteCss = test.site_css || null
    if (warnings.length) response.warnings = warnings
    response.filtered_css = isRefinement ? undefined : true
  }
  return Response.json(response, { headers: corsHeaders('POST, OPTIONS') })
}
