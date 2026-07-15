/**
 * Plan-basierte Limits für Domains, Tests und andere Ressourcen.
 * Single Source of Truth — sowohl API als auch Frontend nutzen diese Werte.
 */

export const PLAN_LIMITS = {
  free:  { domains: 1,  activeTests: 1 },
  pro:   { domains: 5,  activeTests: Infinity },
  agency:{ domains: 100, activeTests: Infinity },
} as const

export type Plan = keyof typeof PLAN_LIMITS

export function getDomainLimit(plan: string): number {
  return PLAN_LIMITS[plan as Plan]?.domains ?? PLAN_LIMITS.free.domains
}

export function getActiveTestLimit(plan: string): number {
  return PLAN_LIMITS[plan as Plan]?.activeTests ?? PLAN_LIMITS.free.activeTests
}
