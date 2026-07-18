/**
 * POST /api/test-wizard/generate
 *
 * Generiert eine Variante für ein Element (Text, Farbe, CSS, Layout).
 * Genutzt von TestCreationPanel Step 2 ("Create Variant").
 *
 * Auth: Supabase-Session (Cookie) — nur eingeloggte User.
 * Limits: aiVariantGens pro Monat + OpenAI-Monatsbudget.
 */

import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getSessionUser } from '@/lib/supabaseServer'
import { safeError } from '@/lib/safeLog'
import { getPlanAiLimits } from '@/lib/planLimits'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { generateVariantText, generateBestPracticeVariant, type VariantType, type GenerateVariantInput } from '@/lib/generateVariantText'

export const maxDuration = 30

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
  if (!(await checkRateLimit(`gen:${user.id}`, 10, 60_000))) {
    return Response.json({ error: 'rate limit', message: 'Max 10 variant generations per minute.' }, { status: 429, headers })
  }

  // ─── Body + Validate ───
  let body: GenerateVariantInput & { elementType?: string }
  try { body = await req.json() } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers })
  }

  const { element, original, variantDescription, type, pageContext, selector, elementType } = body
  if (!element || !original) {
    return Response.json({ error: 'element and original are required' }, { status: 400, headers })
  }
  // variantDescription ist jetzt optional — wenn undefined, AI-generierte Best-Practice-Variante
  if (variantDescription !== undefined && typeof variantDescription !== 'string') {
    return Response.json({ error: 'variantDescription must be a string' }, { status: 400, headers })
  }
  // type ist optional wenn kein variantDescription (best-practice mode)
  if (variantDescription !== undefined && !type) {
    return Response.json({ error: 'type required when variantDescription is provided' }, { status: 400, headers })
  }
  if (type && !['text', 'color', 'css', 'layout'].includes(type)) {
    return Response.json({ error: 'type must be text, color, css, or layout' }, { status: 400, headers })
  }
  // Sanity-Check: keine überlangen Inputs
  if (element.length > 500 || (variantDescription && variantDescription.length > 2000) || original.length > 3000) {
    return Response.json({ error: 'input too long' }, { status: 400, headers })
  }

  // ─── Plan-Limit: AI Variant Gens ───
  const plan = user.user_metadata?.plan ?? 'free'
  const limits = getPlanAiLimits(plan)

  if (limits.variantGens !== Infinity) {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // Zähle Variant-Generierungen diesen Monat (agent_runs mit diesem User)
    const { count, error: countErr } = await supabase
      .from('agent_runs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString())

    if (!countErr && count !== null && count >= limits.variantGens) {
      return Response.json({
        error: 'variant gen limit reached',
        message: `${limits.variantGens} variant generations/month on ${plan} plan. Upgrade for more.`,
        limit: limits.variantGens,
        used: count,
      }, { status: 429, headers })
    }
  }

  // ─── Budget-Check ───
  const { data: withinBudget, error: budgetErr } = await supabase.rpc('increment_gen_cost', {
    p_user_id: user.id,
    p_amount: 0.005, // ~$0.005 pro Generation
    p_limit: limits.monthlyBudget,
  })
  if (budgetErr || withinBudget === false) {
    return Response.json({
      error: 'monthly budget exhausted',
      message: `$${limits.monthlyBudget}/mo OpenAI budget reached. Resets on the 1st.`,
    }, { status: 429, headers })
  }

  // ─── Generate ───
  try {
    let result: { variant: string; variant_html?: string; variant_css?: string; explanation: string }

    if (variantDescription !== undefined) {
      // User-driven mode: User beschreibt die gewünschte Änderung
      result = await generateVariantText({
        element,
        original,
        variantDescription,
        type: type as VariantType,
        pageContext,
        selector,
      })
    } else {
      // Best-practice mode: AI entscheidet autonom
      result = await generateBestPracticeVariant({
        element,
        original,
        elementType: elementType ?? 'element',
        selector,
        pageContext,
      })
    }

    return Response.json(result, { headers })
  } catch (err) {
    safeError('variant-gen-failed', err)
    return Response.json({
      error: 'generation failed',
      message: 'Could not generate variant. Try a different description.',
    }, { status: 502, headers })
  }
}
