// Chi-Square-Approximation der statistischen Signifikanz eines A/B-Tests.
// Rückgabe: 0.0–1.0 (Konfidenz, dass der Unterschied nicht zufällig ist).
// Gewinner-Regel: significance > 0.95 UND mindestens 100 Conversions gesamt.

export function calcSignificance(vA: number, cA: number, vB: number, cB: number): number {
  if (vA === 0 || vB === 0 || cA + cB === 0) return 0
  const n = vA + vB
  const c = cA + cB
  const eA = (vA / n) * c
  const eB = (vB / n) * c
  if (eA === 0 || eB === 0) return 0
  const chi = (cA - eA) ** 2 / eA + (cB - eB) ** 2 / eB
  return 1 - Math.exp(-chi / 2)
}

export const WINNER_MIN_SIGNIFICANCE = 0.95
export const DEFAULT_MIN_VISITORS = 100
export const DEFAULT_MIN_UPLIFT = 0.05

// Ermittelt, ob Variante B den Test gewinnt. B gewinnt, wenn ALLE Bedingungen
// erfüllt sind:
//   1. Mindest-Besucherzahl (A+B) erreicht                  (minVisitors)
//   2. relativer Uplift von B gegenüber A >= Schwelle       (minUplift)
//   3. statistische Signifikanz >= 95% (Sicherheitsguard)
// Gibt 'B' zurück, sonst null (A-Sieg = kein Handlungsbedarf, Original bleibt).
export function determineWinner(
  significance: number,
  cA: number,
  cB: number,
  vA: number,
  vB: number,
  minVisitors: number = DEFAULT_MIN_VISITORS,
  minUplift: number = DEFAULT_MIN_UPLIFT
): string | null {
  if (vA + vB < minVisitors) return null
  if (significance < WINNER_MIN_SIGNIFICANCE) return null
  const crA = vA > 0 ? cA / vA : 0
  const crB = vB > 0 ? cB / vB : 0
  if (crB <= crA) return null
  const uplift = crA > 0 ? (crB - crA) / crA : Infinity // crA=0 & crB>0 → unendlicher Uplift
  if (uplift < minUplift) return null
  return 'B'
}
