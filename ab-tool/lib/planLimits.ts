/**
 * Plan-basierte Limits für Domains, Tests, AI-Features und Gen-Cost.
 * Single Source of Truth — sowohl API als auch Frontend nutzen diese Werte.
 *
 * AI-Limits verhindern Missbrauch und schützen die OpenAI-Kosten.
 * Jedes Limit wird eigenständig in den API-Routen geprüft.
 */

export const PLAN_LIMITS = {
  free:  {
    domains: 1,
    activeTests: 1,
    aiScans: 1,          // CRO-Analysen pro Monat (fetchSite + analyzeCRO)
    aiVariantGens: 1,    // Varianten-Generationen pro Monat (generateVariant / generateVariantText)
    aiAgentRuns: 0,      // Vollautomatische Agent-Runs pro Monat (nur Pro+)
    aiMonthlyBudget: 5,  // $ OpenAI-Monatsbudget
  },
  pro:   {
    domains: 5,
    activeTests: Infinity,
    aiScans: 10,
    aiVariantGens: 30,
    aiAgentRuns: 5,
    aiMonthlyBudget: 20,
  },
  agency:{
    domains: 100,
    activeTests: Infinity,
    aiScans: Infinity,
    aiVariantGens: Infinity,
    aiAgentRuns: 50,
    aiMonthlyBudget: 60,
  },
} as const

export type Plan = keyof typeof PLAN_LIMITS

export function getDomainLimit(plan: string): number {
  return PLAN_LIMITS[plan as Plan]?.domains ?? PLAN_LIMITS.free.domains
}

export function getActiveTestLimit(plan: string): number {
  return PLAN_LIMITS[plan as Plan]?.activeTests ?? PLAN_LIMITS.free.activeTests
}

/** Anzahl erlaubter CRO-Scans pro Monat. */
export function getAIScanLimit(plan: string): number {
  return PLAN_LIMITS[plan as Plan]?.aiScans ?? PLAN_LIMITS.free.aiScans
}

/** Anzahl erlaubter Variant-Generierungen pro Monat. */
export function getAIVariantGenLimit(plan: string): number {
  return PLAN_LIMITS[plan as Plan]?.aiVariantGens ?? PLAN_LIMITS.free.aiVariantGens
}

/** Anzahl erlaubter vollautomatischer Agent-Runs pro Monat. */
export function getAIAgentRunLimit(plan: string): number {
  return PLAN_LIMITS[plan as Plan]?.aiAgentRuns ?? PLAN_LIMITS.free.aiAgentRuns
}

/** OpenAI-Monatsbudget in USD. */
export function getAIMonthlyBudget(plan: string): number {
  return PLAN_LIMITS[plan as Plan]?.aiMonthlyBudget ?? PLAN_LIMITS.free.aiMonthlyBudget
}

// ─── Contextual Upgrade Messages ───

/** User-facing error when the domain limit is hit, with a plan-specific upgrade path. */
export function getDomainLimitMessage(plan: string): string {
  const limit = getDomainLimit(plan)
  if (plan === 'free') {
    return `Free accounts include ${limit} website. Upgrade to Pro for up to ${PLAN_LIMITS.pro.domains} websites.`
  }
  return `Your ${plan} plan allows up to ${limit} website${limit !== 1 ? 's' : ''}.`
}

// ─── Hilfstyp für API-Routen: alle AI-Limits auf einen Blick ───

export interface PlanAiLimits {
  scans: number
  variantGens: number
  agentRuns: number
  monthlyBudget: number
}

export function getPlanAiLimits(plan: string): PlanAiLimits {
  const p = (PLAN_LIMITS[plan as Plan] ?? PLAN_LIMITS.free) as typeof PLAN_LIMITS[keyof typeof PLAN_LIMITS]
  return {
    scans: p.aiScans,
    variantGens: p.aiVariantGens,
    agentRuns: p.aiAgentRuns,
    monthlyBudget: p.aiMonthlyBudget,
  }
}
