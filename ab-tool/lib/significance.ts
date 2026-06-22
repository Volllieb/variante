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
export const WINNER_MIN_CONVERSIONS = 100

// Ermittelt den Gewinner anhand der harten Kriterien, sonst null.
export function determineWinner(
  significance: number,
  cA: number,
  cB: number,
  vA: number,
  vB: number
): string | null {
  if (significance <= WINNER_MIN_SIGNIFICANCE) return null
  if (cA + cB < WINNER_MIN_CONVERSIONS) return null
  const crA = vA > 0 ? cA / vA : 0
  const crB = vB > 0 ? cB / vB : 0
  return crB >= crA ? 'B' : 'A'
}
