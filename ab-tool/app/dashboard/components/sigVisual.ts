/**
 * Farbschwellen für die Signifikanz-Anzeige.
 *
 * Die Zuordnung "ab wann grün, ab wann gelb" stand doppelt im Code: einmal in
 * der SigPie der TestCard, einmal im Donut der Results-Seite. Beide zeichnen
 * dieselbe Metrik, konnten aber auseinanderlaufen — und tun das bereits:
 *
 * Die Results-Seite prüft gegen den am Test konfigurierten
 * `significance_level`, die TestCard gegen ein hartes 0.95, weil `TestRow` das
 * Feld nicht mitführt. Bei einem Test mit Level 0.90 zeigt die Karte also Gelb,
 * während die Detailseite Grün zeigt. Der Parameter hier macht das behebbar,
 * sobald das Feld durch die Test-Query gereicht wird; bis dahin ist der
 * Default identisch zum bisherigen Verhalten.
 */

export const SIG_NEAR = 0.7

export type SigTone = {
  /** Farbe des Fortschrittsbogens. */
  stroke: string
  /** Tailwind-Klasse für den Zahlenwert. */
  text: string
  /** Flächenfüllung hinter dem Bogen. */
  fill: string
}

export function significanceTone(significance: number, level = 0.95): SigTone {
  if (significance >= level) {
    return { stroke: 'var(--color-ok)', text: 'text-ok', fill: 'var(--color-ok-bg)' }
  }
  if (significance >= SIG_NEAR) {
    return { stroke: 'var(--color-pro)', text: 'text-pro', fill: 'var(--color-pro-bg)' }
  }
  return { stroke: 'var(--color-border-strong)', text: 'text-text-3', fill: 'var(--color-bg-2)' }
}
