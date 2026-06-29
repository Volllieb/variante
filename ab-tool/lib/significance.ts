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
