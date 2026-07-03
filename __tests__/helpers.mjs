// Gemeinsame Test-Helfer: normCDF + calcSignificance.
// Importiert von beiden Test-Dateien, damit Bugfixes nicht dupliziert werden.
// Keine Abhängigkeiten außer Node.js stdlib.

/** Abramowitz-Approximation der Standard-Normalverteilungs-CDF. */
export function normCDF(x) {
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

/** z-Test für zwei Proportionen (gepoolter SE, zweiseitig). 0–1. */
export function calcSignificance(vA, cA, vB, cB) {
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
