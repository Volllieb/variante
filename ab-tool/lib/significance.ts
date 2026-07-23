// Statistik für die Gewinner-Entscheidung.
//
// ============================================================================
// Wichtigste Änderung: Auto-Winner nicht mehr bei jeder Conversion (Plan STAT-01)
// ============================================================================
// determineWinner() wurde vorher in /api/event bei JEDER einzelnen Conversion
// aufgerufen und beendete den Test bei Erfolg sofort (status='done', danach
// bekommen alle Besucher B). Das ist wiederholtes Signifikanztesten auf
// akkumulierenden Daten bei freiem Stopp — "optional stopping". Ein auf α=0.05
// kalibrierter z-Test, der nach jeder Beobachtung ausgewertet wird, hat eine
// reale Falsch-Positiv-Rate in der Größenordnung von 20–30 %, nicht 5 %.
//
// Für ein CRO-Tool ist das kein Randfall: der Kunde rollt aufgrund eines
// falschen Signals eine Variante dauerhaft aus und schadet seiner Conversion
// Rate — im Vertrauen auf eine Zahl, die dieses Tool ihm angezeigt hat.
//
// Gegenmaßnahmen hier (Stufe 1 des Plans, ohne Umbau auf mSPRT/Bayes):
//   - Die Auswertung läuft nur noch im Tages-Cron, nicht mehr pro Conversion.
//   - Mindest-Stichprobe PRO ARM statt in Summe (vorher: 100 gesamt).
//   - Mindest-Conversions pro Arm — darunter ist der z-Test nicht anwendbar.
//   - Mindestlaufzeit, damit ein Test mindestens einen Wochenzyklus sieht.
//
// Stufe 2 (always-valid Inferenz) ist im Maßnahmenplan beschrieben und steht
// noch aus. Bis dahin sind die Schwellen bewusst konservativ.

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

/**
 * Zweiseitiger z-Test für zwei Proportionen (gepoolter Standardfehler).
 * Rückgabe: 0.0–1.0 = 1 − p-Wert.
 *
 * Achtung bei der Interpretation: evaluateWinner() entscheidet einseitig
 * (nur crB > crA gilt als Gewinn). Der hier gemeldete Wert ist die zweiseitige
 * Konfidenz; die effektive einseitige Irrtumswahrscheinlichkeit für "B ist
 * besser" ist halb so groß.
 */
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

const DEFAULT_SIGNIFICANCE_LEVEL = 0.95
const DEFAULT_MIN_UPLIFT = 0.05

/**
 * Mindest-Besucher PRO ARM.
 *
 * ponytail: Der alte Default war 100 — geprüft als `vA + vB < minVisitors`,
 * also 100 Besucher INSGESAMT, 50 pro Arm. Bei einer typischen Conversion Rate
 * von 2–3 % sind das ein bis zwei Conversions pro Arm; jede Aussage darüber ist
 * Rauschen. Der Wert aus der DB (tests.min_visitors) gilt jetzt pro Arm, und
 * dieser Boden greift zusätzlich.
 */
export const MIN_VISITORS_PER_ARM = 1000

/**
 * Mindest-Conversions pro Arm. Die Normalapproximation des z-Tests setzt
 * n·p ≥ 10 voraus — darunter ist der p-Wert schlicht nicht gültig.
 */
export const MIN_CONVERSIONS_PER_ARM = 25

/**
 * Mindestlaufzeit in Tagen. Ohne sie kann ein Test Dienstagvormittag starten
 * und Dienstagnachmittag "gewinnen", ohne je einen Wochentag-Zyklus oder ein
 * Wochenende gesehen zu haben.
 */
export const MIN_RUNTIME_DAYS = 7

export type WinnerReason =
  | 'decided'
  | 'not-enough-visitors'
  | 'not-enough-conversions'
  | 'too-early'
  | 'not-significant'
  | 'below-min-uplift'

export type WinnerVerdict = {
  /** 'A' | 'B' wenn entschieden, sonst null. */
  winner: string | null
  /** Warum (noch) nicht entschieden — für die Anzeige im Dashboard. */
  reason: WinnerReason
}

/**
 * Ermittelt den Test-Gewinner.
 *
 *   'B'  – B hat signifikant UND praktisch relevant besser abgeschnitten
 *   'A'  – Signifikante Datenlage, aber A ist besser oder gleich
 *   null – Noch nicht entscheidbar
 *
 * ponytail: null ≠ 'A'. Liegt B knapp unter minUplift, läuft der Test weiter.
 * Erst wenn klar ist, dass B NICHT besser ist (crB ≤ crA), wird A deklariert.
 */
export function evaluateWinner(params: {
  significance: number
  cA: number
  cB: number
  vA: number
  vB: number
  createdAt?: string | Date | null
  minVisitorsPerArm?: number
  minUplift?: number
  significanceLevel?: number
  now?: number
}): WinnerVerdict {
  const {
    significance,
    cA,
    cB,
    vA,
    vB,
    createdAt,
    minUplift = DEFAULT_MIN_UPLIFT,
    significanceLevel = DEFAULT_SIGNIFICANCE_LEVEL,
    now = Date.now(),
  } = params

  const minVisitors = Math.max(params.minVisitorsPerArm ?? 0, MIN_VISITORS_PER_ARM)

  // Stichprobe pro Arm, nicht in Summe: ein 90/10-Split mit 1000 Gesamtbesuchern
  // hat im kleinen Arm 100 — dort ist nichts messbar.
  if (vA < minVisitors || vB < minVisitors) {
    return { winner: null, reason: 'not-enough-visitors' }
  }

  if (cA < MIN_CONVERSIONS_PER_ARM || cB < MIN_CONVERSIONS_PER_ARM) {
    return { winner: null, reason: 'not-enough-conversions' }
  }

  if (createdAt) {
    const startedAt = new Date(createdAt).getTime()
    if (Number.isFinite(startedAt)) {
      const days = (now - startedAt) / 86_400_000
      if (days < MIN_RUNTIME_DAYS) return { winner: null, reason: 'too-early' }
    }
  }

  if (significance < significanceLevel) {
    return { winner: null, reason: 'not-significant' }
  }

  const crA = vA > 0 ? cA / vA : 0
  const crB = vB > 0 ? cB / vB : 0

  if (crB <= crA) return { winner: 'A', reason: 'decided' }

  const uplift = crA > 0 ? (crB - crA) / crA : Infinity
  if (uplift < minUplift) return { winner: null, reason: 'below-min-uplift' }

  return { winner: 'B', reason: 'decided' }
}

/**
 * Sample Ratio Mismatch: weicht die tatsächliche Traffic-Verteilung
 * signifikant von der konfigurierten ab, ist die Datenbasis kaputt
 * (Bot-Traffic, Caching, Adblocker, nicht mehr passender Selektor) und jede
 * Gewinner-Aussage wertlos.
 *
 * Chi-Quadrat mit einem Freiheitsgrad, Schwelle p < 0.001 (χ² > 10.83) —
 * bewusst streng, damit normale Schwankung keinen Alarm auslöst.
 */
export function hasSampleRatioMismatch(vA: number, vB: number, trafficSplit = 50): boolean {
  const total = vA + vB
  if (total < 200) return false // zu wenig Daten für die Aussage
  const expectedB = (total * trafficSplit) / 100
  const expectedA = total - expectedB
  if (expectedA <= 0 || expectedB <= 0) return false
  const chi2 = (vA - expectedA) ** 2 / expectedA + (vB - expectedB) ** 2 / expectedB
  return chi2 > 10.83
}

/**
 * Rückwärtskompatible Signatur für bestehende Aufrufer.
 *
 * ponytail: `minVisitors` wird jetzt PRO ARM interpretiert (vorher als Summe),
 * und `createdAt` ist neu. Aufrufer ohne createdAt überspringen nur die
 * Mindestlaufzeit-Prüfung — alle anderen Schwellen greifen.
 */
export function determineWinner(
  significance: number,
  cA: number,
  cB: number,
  vA: number,
  vB: number,
  minVisitors: number = MIN_VISITORS_PER_ARM,
  minUplift: number = DEFAULT_MIN_UPLIFT,
  significanceLevel: number = DEFAULT_SIGNIFICANCE_LEVEL,
  createdAt?: string | Date | null
): string | null {
  return evaluateWinner({
    significance,
    cA,
    cB,
    vA,
    vB,
    createdAt,
    minVisitorsPerArm: minVisitors,
    minUplift,
    significanceLevel,
  }).winner
}
