// z-Test für zwei Proportionen (gepoolter Standardfehler, zweiseitig).
// Rückgabe: 0.0–1.0 (Konfidenz, dass der Unterschied nicht zufällig ist).
// Gewinner-Regel: significance > 0.95 UND mindestens 100 Conversions gesamt.

function normCDF(x: number): number {
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  const sign = x < 0 ? -1 : 1
  const absScaled = Math.abs(x) / Math.sqrt(2)
  const t = 1.0 / (1.0 + p * absScaled)
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absScaled * absScaled)
  return 0.5 * (1.0 + sign * y)
}

export function calcSignificance(vA: number, cA: number, vB: number, cB: number): number {
  if (vA === 0 || vB === 0 || cA + cB === 0) return 0
  const pA = cA / vA
  const pB = cB / vB
  const pPooled = (cA + cB) / (vA + vB)
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / vA + 1 / vB))
  if (se === 0) return 0
  const z = (pB - pA) / se
  const pValue = 2 * (1 - normCDF(Math.abs(z)))
  return 1 - pValue
}

const WINNER_MIN_SIGNIFICANCE = 0.95
const DEFAULT_MIN_VISITORS = 100
const DEFAULT_MIN_UPLIFT = 0.05

// Ermittelt den Test-Gewinner. Rückgabe:
//   'B'    – B hat signifikant und praktisch besser abgeschnitten → B served to all
//   'A'    – Signifikante Datenlage, aber A ist besser oder gleich → Test kann enden
//   null   – Noch nicht genug Daten (Besucher/Signifikanz) oder B steigt noch Richtung Schwelle
//
// ponytail: null ≠ 'A'. Wenn B knapp unter minUplift liegt, läuft der Test weiter.
// Erst wenn klar ist dass B NICHT besser ist (crB ≤ crA), wird A deklariert.
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
  if (crB <= crA) return 'A' // B ist nicht besser (oder gleich) → A gewinnt
  const uplift = crA > 0 ? (crB - crA) / crA : Infinity
  if (uplift < minUplift) return null // B ist besser aber unter Schwelle → weiterlaufen lassen
  return 'B'
}
