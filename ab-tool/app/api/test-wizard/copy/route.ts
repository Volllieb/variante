/**
 * POST /api/test-wizard/copy
 *
 * KI-Textvarianten für Headline oder Haupt-Button eines Elements
 * (Wizard Schritt „Change“ → „Suggest copy“). Pipeline: lib/generateCopyVariants.ts.
 *
 * Auth: Supabase-Session (Cookie) — nur eingeloggte User.
 * Gate: Seite muss zu einer verifizierten Domain des Users gehören (sonst
 *       wäre die Route ein frei nutzbarer Copywriter für fremde Seiten).
 * Limits: aiVariantGens pro Monat (Upstash-Zähler) + OpenAI-Monatsbudget (DB-RPC).
 */
import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getSessionUser } from '@/lib/supabaseServer'
import { getPlanForUser } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'
import { getPlanAiLimits, startOfBillingMonth } from '@/lib/planLimits'
import { checkRateLimit } from '@/lib/rateLimit'
import { parseBody } from '@/lib/apiHelpers'
import { copyVariantsBody } from '@/lib/validation'
import { assertOwnedDomain } from '@/lib/domainGate'
import { generateCopyVariants } from '@/lib/generateCopyVariants'

export const maxDuration = 60

const METHODS = 'POST, OPTIONS'

export async function OPTIONS() {
  return preflight(METHODS)
}

export async function POST(req: Request) {
  const headers = corsHeaders(METHODS)

  const user = await getSessionUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401, headers })

  if (!(await checkRateLimit(`copy:${user.id}`, 6, 60_000))) {
    return Response.json({ error: 'rate limit', message: 'Too many requests. Wait a minute and try again.' }, { status: 429, headers })
  }

  const body = await parseBody(req, copyVariantsBody, METHODS)
  if (!body.ok) return body.response
  const { url, original, kind, selector } = body.data

  const gate = await assertOwnedDomain(user.id, url)
  if (!gate.ok) return Response.json({ error: 'domain not verified', message: gate.error }, { status: gate.status, headers })
  const pageUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`

  // ─── Monatslimit (Anzahl Vorschlags-Runden) ───
  const plan = await getPlanForUser(user.id)
  const limits = getPlanAiLimits(plan)
  if (limits.variantGens !== Infinity) {
    const month = startOfBillingMonth().toISOString().slice(0, 7)
    const windowMs = 32 * 24 * 60 * 60_000
    if (!(await checkRateLimit(`copygen:${user.id}:${month}`, limits.variantGens, windowMs))) {
      return Response.json({
        error: 'limit reached',
        message: `You've used all ${limits.variantGens} AI suggestions for this month on the ${plan} plan. Upgrade to Pro for more.`,
        limit: limits.variantGens,
      }, { status: 429, headers })
    }
  }

  // ─── Budget (Kostenbremse, unabhängig vom Zähler) ───
  const { data: withinBudget, error: budgetErr } = await supabase.rpc('increment_gen_cost', {
    p_user_id: user.id,
    p_amount: 0.01, // Briefing + bis zu 3 Aufrufe gpt-5.4-mini, großzügig geschätzt
    p_limit: limits.monthlyBudget,
  })
  if (budgetErr || withinBudget === false) {
    return Response.json({
      error: 'monthly budget exhausted',
      message: 'Your AI budget for this month is used up. It resets on the 1st.',
    }, { status: 429, headers })
  }

  try {
    const result = await generateCopyVariants({ url: pageUrl, original, kind, selector })
    if (!result.variants.length) {
      return Response.json({
        error: 'no usable suggestions',
        message: 'The AI could not write variants that pass our checks for this element. Try again or write your own.',
      }, { status: 422, headers })
    }
    return Response.json(result, { headers })
  } catch (err) {
    safeError('copy-variants-failed', err)
    const msg = err instanceof Error && err.message.startsWith('page fetch failed')
      ? 'We could not read your page. Check that it is online and try again.'
      : 'AI suggestions are temporarily unavailable. Try again in a moment or write your own.'
    return Response.json({ error: 'generation failed', message: msg }, { status: 502, headers })
  }
}
