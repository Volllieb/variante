// Hochrechnung: wann kann dieser Test frühestens einen Gewinner bekommen?
//
// ============================================================================
// Warum die alte Antwort nicht gut genug war
// ============================================================================
// Es gab zwei getrennte Hochrechnungen für dieselbe Frage — eine auf der
// Results-Seite ("~N days until a winner can be called") und eine auf der
// Overview ("at this pace it needs ~N more days"). Beide teilten dieselbe
// Schwäche und die Overview zusätzlich einen Rechenfehler:
//
//   1. Beide rechneten mit dem LEBENSZEIT-MITTEL: Zähler geteilt durch die
//      bisherige Laufzeit. Für einen Test, der 30 Tage bei 20 Besuchern lag und
//      seit gestern 2.000 pro Tag bekommt (Launch, Kampagne, Newsletter), ist
//      das Mittel 86/Tag — die Prognose liegt um den Faktor 20 daneben und
//      erholt sich erst über Wochen. Andersherum genauso: nach einer Kampagne
//      versprechen die alten Zahlen wochenlang Traffic, der nicht mehr kommt.
//   2. Die Overview summierte die FEHLENDEN BESUCHER BEIDER ARME und teilte
//      durch das GESAMTTEMPO. Das stimmt nur, wenn Rückstand und Tempo
//      zufällig gleich verteilt sind. Bei einem 90/10-Split (A=5.000, B=200
//      nach 10 Tagen) fehlen 800 Besucher in B, das Gesamttempo ist 520/Tag —
//      die Overview meldete "~2 Tage", während B mit 20/Tag noch 40 Tage
//      braucht. Arme füllen sich parallel, jeder mit seinem eigenen Tempo:
//      maßgeblich ist der langsamere, nicht die Summe.
//
// Diese Datei ersetzt beide. Sie ist rein (keine DB, kein React), damit sie als
// Node-Test läuft, und sie ist die einzige Stelle, die "wann?" beantwortet.
//
// Kernidee: Das Tempo wird aus den Tagesdeltas in `daily_stats` gemessen, nicht
// aus dem Lebenszeit-Mittel — mit einem Fenster, das sich an die Datenlage
// anpasst:
//
//   • < 3 abgeschlossene Tage  → Lebenszeit-Mittel (mehr ist nicht da)
//   • sonst                    → Mittel der letzten 7 vollständigen Tage
//   • Sprung erkannt           → Mittel der letzten 3 Tage
//
// Ein "Sprung" ist eine Verdopplung oder Halbierung der Besucherzahl gegenüber
// den Tagen davor. Genau dann ist der ältere Teil des Fensters kein Hinweis auf
// morgen mehr, sondern Ballast.

import { DEFAULT_MIN_UPLIFT, MIN_VISITORS_PER_ARM } from './significance'
import { dayKey, lastCompleteDay, shiftDay } from './dashboardStats'
import { daysSince, type ArmCounts } from './resultsHelpers'

/**
 * Eine Tageszeile aus `daily_stats`, so locker typisiert, dass sowohl die
 * Results-Seite (DailyRow) als auch die Overview (DailyStatRow, nullable
 * Spalten) sie ohne Umbau übergeben können.
 */
export type DailyPoint = {
  /** ISO-Datum, YYYY-MM-DD. */
  date: string
  visitors_a?: number | null
  visitors_b?: number | null
  conversions_a?: number | null
  conversions_b?: number | null
}

/** Tageszeile mit Testzuordnung — die Form, in der die Overview sie lädt. */
export type DailyPointByTest = DailyPoint & { test_id: string }

/* ── Stellschrauben ── */

/** Regelfenster: ein voller Wochenzyklus, damit Wochenenden nicht durchschlagen. */
export const RECENT_WINDOW_DAYS = 7

/** Fenster nach einem erkannten Sprung — kurz genug, um dem neuen Niveau zu folgen. */
export const SHIFT_WINDOW_DAYS = 3

/** Darunter gibt es kein belastbares Tagesmittel; dann zählt die Lebenszeit. */
export const MIN_DAYS_FOR_RECENT = 3

/** Ab dieser Verdopplung bzw. Halbierung gilt das Tempo als gesprungen. */
export const SHIFT_FACTOR_UP = 2
export const SHIFT_FACTOR_DOWN = 0.5

/**
 * Weiter als drei Monate wird nicht prognostiziert.
 *
 * Nicht aus Bequemlichkeit: Die Hochrechnung schreibt das heutige Tempo linear
 * fort. Über ein Quartal hinaus ist diese Annahme nichts wert, und "~412 Tage"
 * wäre eine Präzision, die die Methode nicht hergibt. Jenseits davon ist die
 * ehrliche Aussage "so wird das nichts", nicht eine Zahl.
 */
export const FORECAST_HORIZON_DAYS = 90

/* ── Tempo-Messung ── */

export type RateBasis =
  /** Zähler durch Laufzeit — für junge Tests ohne genug Tageszeilen. */
  | 'lifetime'
  /** Mittel der letzten vollständigen Tage (Regelfall). */
  | 'recent'
  /** Mittel nach einem erkannten Sprung — die Tage davor zählen nicht mehr. */
  | 'shift'

export type TrafficRate = {
  /** Besucher pro Tag, Arm A. */
  visitorsA: number
  /** Besucher pro Tag, Arm B. */
  visitorsB: number
  /** Conversions pro Tag, Arm A. */
  conversionsA: number
  /** Conversions pro Tag, Arm B. */
  conversionsB: number
  basis: RateBasis
  /** Über wie viele Tage gemittelt wurde. Bei 'lifetime' die Laufzeit. */
  windowDays: number
  /**
   * Verhältnis des jüngsten Tempos zu dem davor. 1 = unverändert, 3 = verdreifacht,
   * 0.2 = auf ein Fünftel gefallen. null = kein Vergleich möglich.
   */
  changeFactor: number | null
}

type Sums = { va: number; vb: number; ca: number; cb: number }

function countRange(rows: DailyPoint[], from: string, to: string): number {
  let n = 0
  for (const r of rows) {
    const d = r.date.slice(0, 10)
    if (d >= from && d <= to) n++
  }
  return n
}

function sumRange(rows: DailyPoint[], from: string, to: string): Sums {
  const out: Sums = { va: 0, vb: 0, ca: 0, cb: 0 }
  for (const r of rows) {
    const d = r.date.slice(0, 10)
    if (d < from || d > to) continue
    out.va += r.visitors_a ?? 0
    out.vb += r.visitors_b ?? 0
    out.ca += r.conversions_a ?? 0
    out.cb += r.conversions_b ?? 0
  }
  return out
}

/**
 * Besucher- und Conversion-Tempo pro Arm und Tag.
 *
 * `daily` sind Tagesdeltas (seit Migration 039). Der heutige Tag wird
 * ausgeschlossen: seine Zeile ist ein angefangener Tag und würde das Tempo je
 * nach Uhrzeit beliebig nach unten ziehen — dieselbe Begründung, aus der die
 * Overview-Zeiträume gestern enden.
 */
export function measureTrafficRate(params: {
  daily: DailyPoint[]
  a: ArmCounts
  b: ArmCounts
  createdAt: string
  now: number
}): TrafficRate {
  const { daily, a, b, createdAt, now } = params

  const elapsed = Math.max(daysSince(createdAt, now), 0)
  const lifetimeDays = Math.max(1, elapsed)
  const lifetimeRate: TrafficRate = {
    visitorsA: a.views / lifetimeDays,
    visitorsB: b.views / lifetimeDays,
    conversionsA: a.conversions / lifetimeDays,
    conversionsB: b.conversions / lifetimeDays,
    basis: 'lifetime',
    windowDays: lifetimeDays,
    changeFactor: null,
  }

  const today = dayKey(now)
  const complete = daily.filter((r) => r.date.slice(0, 10) < today)
  // Ein Test, der seit zwei Tagen läuft, darf nicht durch sieben geteilt werden.
  const completeDays = complete.length > 0 ? Math.floor(elapsed) : 0
  if (completeDays < MIN_DAYS_FOR_RECENT) return lifetimeRate

  const end = lastCompleteDay(now)

  /** Mittel über die `days` Tage, die auf `endDay` enden. */
  function rateOver(days: number, endDay = end): TrafficRate {
    const from = shiftDay(endDay, -(days - 1))
    const s = sumRange(complete, from, endDay)
    // Nur über die Tage mitteln, die wirklich geschrieben wurden: fehlende
    // Zeilen sind eine Aussage über die Datenlage, nicht über den Traffic
    // (Begründung unten). Sonst macht ein ausgefallener Cron aus zwei Zeilen
    // à 1.000 Besuchern eine Rate von 285/Tag und die Prognose wird 3,5×
    // pessimistischer.
    const rows = countRange(complete, from, endDay)
    const divisor = rows > 0 ? rows : days
    return {
      visitorsA: s.va / divisor,
      visitorsB: s.vb / divisor,
      conversionsA: s.ca / divisor,
      conversionsB: s.cb / divisor,
      basis: 'recent',
      windowDays: days,
      changeFactor: null,
    }
  }

  const recentDays = Math.min(RECENT_WINDOW_DAYS, completeDays)

  // Fehlende Zeilen im Fenster sind eine Aussage über die Datenlage, nicht über
  // den Traffic: eine Zeile mit 0 heißt "kein Besucher", gar keine Zeile heißt
  // "nicht geschrieben". Nur im ersten Fall darf die Prognose "kein Tempo"
  // schließen — sonst macht ein ausgefallener Cron aus einem laufenden Test
  // einen toten.
  const rowsInWindow = countRange(complete, shiftDay(end, -(recentDays - 1)), end)
  if (rowsInWindow === 0) return lifetimeRate

  const recent = rateOver(recentDays)

  // Sprung-Erkennung braucht zwei Fenster: die jüngsten Tage gegen die davor.
  // Ohne genug Historie bleibt es beim Regelfenster.
  if (completeDays < SHIFT_WINDOW_DAYS * 2) return recent

  const shiftFrom = shiftDay(end, -(SHIFT_WINDOW_DAYS - 1))
  const priorEnd = shiftDay(shiftFrom, -1)
  const priorDays = Math.min(RECENT_WINDOW_DAYS - SHIFT_WINDOW_DAYS, completeDays - SHIFT_WINDOW_DAYS)
  const late = sumRange(complete, shiftFrom, end)
  const early = sumRange(complete, shiftDay(priorEnd, -(priorDays - 1)), priorEnd)

  // Fehlende Zeilen in einem der beiden Vergleichsfenster sind kein Beweis für
  // einen Einbruch — ohne Zeilen lässt sich kein Verhältnis anstellen, es
  // bleibt beim Regelfenster.
  const lateRows = countRange(complete, shiftFrom, end)
  const earlyRows = countRange(complete, shiftDay(priorEnd, -(priorDays - 1)), priorEnd)
  if (lateRows === 0 || earlyRows === 0) return { ...recent, changeFactor: null }

  const latePerDay = (late.va + late.vb) / lateRows
  const earlyPerDay = (early.va + early.vb) / earlyRows

  const changeFactor =
    earlyPerDay > 0 ? latePerDay / earlyPerDay : latePerDay > 0 ? Infinity : null

  if (changeFactor !== null && (changeFactor >= SHIFT_FACTOR_UP || changeFactor <= SHIFT_FACTOR_DOWN)) {
    return { ...rateOver(SHIFT_WINDOW_DAYS), basis: 'shift', changeFactor }
  }

  return { ...recent, changeFactor }
}

/* ── Prognose ── */

export type ForecastLimit =
  | 'visitors'
  | 'conversions'
  | 'runtime'
  | 'significance'
  /** Der bremsende Arm bekommt gerade gar nichts — es gibt nichts fortzuschreiben. */
  | 'no-traffic'
  /** Der bremsende Arm misst keine Conversions — das Goal feuert nicht. */
  | 'no-conversions'
  /** Noch keine Datenbasis (frischer Test) — es gibt nichts hochzurechnen. */
  | 'insufficient-data'
  /** Alle Bedingungen sind bereits erfüllt — sofort entscheidbar, keine Schätzung. */
  | 'ready'
  /**
   * B liegt vorn, aber unter der Mindest-Uplift-Schwelle. Unter der linearen
   * Fortschreibung bleibt der Uplift konstant — der Test wird in diesem Modell
   * nie entscheidbar, also gibt es keinen Termin zu schätzen.
   */
  | 'uplift'
  /** Weiter als der Horizont; eine Zahl wäre Erfindung. */
  | 'beyond-horizon'

export type Forecast = {
  /** Tage bis frühestens entscheidbar. null = keine seriöse Zahl (siehe `limitedBy`). */
  days: number | null
  /** Was den Termin bestimmt bzw. warum es keinen gibt. */
  limitedBy: ForecastLimit
  /**
   * true = mindestens eine Bedingung war nicht schätzbar, `days` ist eine
   * Untergrenze. Tritt auf, solange die Signifikanz noch nicht hochrechenbar ist.
   */
  lowerBound: boolean
  rate: TrafficRate
}

/**
 * Frühestmöglicher Zeitpunkt für eine Gewinner-Entscheidung.
 *
 * Spiegelt die Bedingungen aus evaluateWinner(): Besucher UND Conversions PRO
 * ARM, Mindestlaufzeit, Konfidenz. Das Ergebnis ist das Maximum — die letzte
 * Bedingung, die fällt, bestimmt den Termin.
 */
export function forecastDecision(params: {
  a: ArmCounts
  b: ArmCounts
  significance: number
  significanceLevel: number
  minVisitorsPerArm: number
  minConversionsPerArm: number
  minRuntimeDays: number
  /** Fraktion (0.05 = 5 %), wie evaluateWinner() sie liest. */
  minUplift?: number
  createdAt: string
  now: number
  /** Tagesdeltas. Leer = Hochrechnung aus dem Lebenszeit-Mittel. */
  daily?: DailyPoint[]
}): Forecast {
  const {
    a, b, significance, significanceLevel,
    minVisitorsPerArm, minConversionsPerArm, minRuntimeDays,
    minUplift = DEFAULT_MIN_UPLIFT,
    createdAt, now, daily = [],
  } = params

  const rate = measureTrafficRate({ daily, a, b, createdAt, now })

  const elapsed = daysSince(createdAt, now)
  let days = Math.max(0, minRuntimeDays - elapsed)
  let limitedBy: ForecastLimit = 'runtime'
  let lowerBound = false

  /** Tage, bis `have` mit `perDay` das Ziel erreicht. null = kein Tempo. */
  function daysUntil(have: number, target: number, perDay: number): number | null {
    if (have >= target) return 0
    if (perDay <= 0) return null
    return (target - have) / perDay
  }

  // Tempo im Messfenster (7 bzw. 3 Tage) kann 0 sein, obwohl der Arm insgesamt
  // längst konvertiert hat — die Conversions lagen einfach außerhalb des
  // Fensters (Schub am Anfang, seither Flaute). Das ist ein Aussage über die
  // jüngste Dynamik, kein Beweis für ein kaputtes Goal: "no-conversions" soll
  // nur bei einem Arm feuern, der NOCH NIE konvertiert hat. Hat er das schon,
  // fällt die Prognose auf den Lebenszeit-Schnitt zurück — ehrlich vorsichtig,
  // statt fälschlich Alarm zu schlagen.
  const lifetimeDaysForRate = Math.max(1, elapsed)
  function conversionRateFor(have: number, measured: number): number {
    if (measured > 0 || have === 0) return measured
    return have / lifetimeDaysForRate
  }

  const legs: [number | null, ForecastLimit][] = [
    [daysUntil(a.views, minVisitorsPerArm, rate.visitorsA), 'visitors'],
    [daysUntil(b.views, minVisitorsPerArm, rate.visitorsB), 'visitors'],
    [daysUntil(a.conversions, minConversionsPerArm, conversionRateFor(a.conversions, rate.conversionsA)), 'conversions'],
    [daysUntil(b.conversions, minConversionsPerArm, conversionRateFor(b.conversions, rate.conversionsB)), 'conversions'],
  ]

  for (const [value, limit] of legs) {
    // Ein Arm ohne Tempo blockiert alles: sein Rückstand wird nie kleiner.
    if (value === null) {
      if (limit === 'conversions') {
        // Kein Conversion-Tempo bei vorhandenem Traffic ist ein Goal-Problem,
        // kein Traffic-Problem: das Goal zählt nichts (kaputtes Tracking,
        // url:-Goal). "One variant is getting no traffic" wäre hier die
        // falsche Diagnose und lenkt den Blick vom Goal weg.
        return { days: null, limitedBy: 'no-conversions', lowerBound: false, rate }
      }
      // Visitors-Tempo 0: hat der Test überhaupt je Besucher bekommen? Ein
      // frischer Test hat schlicht noch keine Datenbasis — das ist kein
      // Alarm. Erst wenn es Traffic gab und das Tempo trotzdem 0 ist, ist
      // der Test wirklich versiegt.
      if (a.views + b.views === 0) {
        return { days: null, limitedBy: 'insufficient-data', lowerBound: false, rate }
      }
      return { days: null, limitedBy: 'no-traffic', lowerBound: false, rate }
    }
    if (value > days) {
      days = value
      limitedBy = limit
    }
  }

  if (significance < significanceLevel) {
    const sig = estimateDaysToSignificance(
      a.views + b.views, significance, createdAt, significanceLevel, now,
      rate.visitorsA + rate.visitorsB
    )
    if (sig === null) {
      // Noch nicht hochrechenbar (zu wenig Daten oder kein messbarer
      // Unterschied). Der Termin kann dadurch nur später werden, nie früher.
      lowerBound = true
    } else if (sig > days) {
      days = sig
      limitedBy = 'significance'
    }
  }

  // Uplift-Gate aus evaluateWinner() (nach Konfidenz geprüft): B ist vorn,
  // aber der Vorsprung liegt unter der Mindest-Schwelle. Unter der linearen
  // Fortschreibung bleibt der Uplift konstant — "~N days until a winner can
  // be called" wäre hier eine Lüge, der Cron antwortet auf ewig
  // 'below-min-uplift' und deklariert nie. Erst wenn der Abstand wächst, gibt
  // es wieder einen Termin; das kann diese Rechnung nicht vorhersagen.
  // Liegt B NICHT vorn (crB <= crA), blockiert der Gate nicht: dann kann A
  // gewinnen, sobald alles andere steht.
  if (a.views > 0 && b.views > 0 && a.conversions > 0 && b.conversions > 0) {
    const crA = a.conversions / a.views
    const crB = b.conversions / b.views
    const uplift = (crB - crA) / crA
    if (uplift > 0 && uplift < minUplift) {
      return { days: null, limitedBy: 'uplift', lowerBound: false, rate }
    }
  }

  if (days > FORECAST_HORIZON_DAYS) {
    return { days: null, limitedBy: 'beyond-horizon', lowerBound, rate }
  }

  // Alle Bedingungen erfüllt (und keine unschätzbare offen): sofort
  // entscheidbar. "~1 day until a winner can be called" wäre hier eine Lüge —
  // die alte estimateDaysToReady gab für genau diesen Fall null.
  if (days <= 0 && !lowerBound) {
    return { days: null, limitedBy: 'ready', lowerBound, rate }
  }

  return { days: Math.max(1, Math.ceil(Number(days.toFixed(4)))), limitedBy, lowerBound, rate }
}

/**
 * Tage als Zeitraum in Worten.
 *
 * "~65 days" ist Scheingenauigkeit: die Zahl stammt aus einer linearen
 * Fortschreibung des aktuellen Tempos, die auf zwei Monate hinaus keine
 * einzelnen Tage auflösen kann. Nah dran wird in Tagen gerechnet, weiter weg in
 * Wochen und Monaten — grob genug, um nicht zu lügen.
 */
export function formatHorizon(days: number): string {
  if (days <= 14) return `~${days} day${days === 1 ? '' : 's'}`
  if (days <= 60) return `~${Math.round(days / 7)} weeks`
  const months = Math.round(days / 30)
  return `~${months} month${months === 1 ? '' : 's'}`
}

/* ── Signifikanz-Hochrechnung ── */

/**
 * Time-to-significance: wie viele Tage bis zur Ziel-Konfidenz.
 *
 * Skaliert die Stichprobe mit (z_ziel / z_jetzt)² — gültig, solange der
 * beobachtete Unterschied ungefähr bestehen bleibt. Ist er sehr klein, wächst
 * die nötige Stichprobe ins Absurde; das fängt der Horizont in
 * forecastDecision() ab.
 */
export function estimateDaysToSignificance(
  totalVisitors: number,
  significance: number,
  createdAt: string,
  targetSignificance: number,
  nowTs: number,
  /**
   * Gemessenes Tages-Tempo (aus measureTrafficRate). Fehlt es, fällt die
   * Funktion auf das Lebenszeit-Mittel zurück — der direkte Aufruf bleibt
   * unverändert, die Prognose bekommt aber dasselbe Tempo wie ihre anderen
   * Beine.
   */
  dailyTraffic?: number
): number | null {
  if (significance <= 0 || significance >= targetSignificance) return null
  if (totalVisitors < 100) return null

  const daysRunning = Math.max(1, daysSince(createdAt, nowTs))

  const zNow = zForSig(significance)
  const zTarget = zForSig(targetSignificance)
  if (zNow <= 0) return null

  const ratio = (zTarget / zNow) ** 2
  const additionalVisitorsNeeded = totalVisitors * (ratio - 1)
  // Das Lebenszeit-Mittel ist die Quelle der Faktor-20-Fehler aus dem
  // Kopfkommentar: nach einem Traffic-Sprung extrapoliert es wochenlang das
  // falsche Tempo. Die Prognose übergibt deshalb das gemessene Tages-Tempo.
  const perDay = dailyTraffic ?? totalVisitors / daysRunning

  if (perDay <= 0) return null
  const daysEstimate = Math.ceil(additionalVisitorsNeeded / perDay)
  return Math.max(1, daysEstimate)
}

function zForSig(s: number): number {
  const pairs = [
    [0.50, 0.0], [0.60, 0.253], [0.70, 0.524], [0.75, 0.674],
    [0.80, 0.842], [0.85, 1.036], [0.90, 1.282], [0.92, 1.405],
    [0.95, 1.645], [0.98, 2.054], [0.99, 2.326],
  ]
  for (let i = 0; i < pairs.length - 1; i++) {
    if (s <= pairs[i + 1][0]) {
      const t = (s - pairs[i][0]) / (pairs[i + 1][0] - pairs[i][0])
      return Number(pairs[i][1]) + t * (Number(pairs[i + 1][1]) - Number(pairs[i][1]))
    }
  }
  return 2.5
}

/* ── Overview: fehlende Besucher ── */

export type VisitorGap = {
  /** Fehlende Besucher über beide Arme summiert — nur zur Anzeige. */
  visitorsNeeded: number
  /** Tage bis beide Arme die Schwelle haben. null = ein Arm bekommt nichts. */
  daysNeeded: number | null
}

/**
 * Wie lange, bis BEIDE Arme die Besucher-Schwelle haben.
 *
 * Bewusst getrennt von forecastDecision(): die Overview-Zeile spricht nur über
 * Besucher ("almost no traffic is reaching it"), nicht über Conversions oder
 * Konfidenz. Das Tempo kommt aus derselben Messung.
 */
export function estimateVisitorGap(params: {
  a: ArmCounts
  b: ArmCounts
  minVisitorsPerArm?: number | null
  createdAt: string
  now: number
  daily?: DailyPoint[]
}): VisitorGap {
  const { a, b, createdAt, now, daily = [] } = params
  const target = Math.max(params.minVisitorsPerArm ?? 0, MIN_VISITORS_PER_ARM)
  const visitorsNeeded = Math.max(0, target - a.views) + Math.max(0, target - b.views)
  if (visitorsNeeded === 0) return { visitorsNeeded: 0, daysNeeded: 0 }

  const elapsed = daysSince(createdAt, now)
  if (!Number.isFinite(elapsed) || elapsed < 0.5 || a.views + b.views <= 0) {
    return { visitorsNeeded, daysNeeded: null }
  }

  const rate = measureTrafficRate({ daily, a, b, createdAt, now })
  const perArm = [
    [target - a.views, rate.visitorsA],
    [target - b.views, rate.visitorsB],
  ] as const

  let days = 0
  for (const [missing, perDay] of perArm) {
    if (missing <= 0) continue
    if (perDay <= 0) return { visitorsNeeded, daysNeeded: null }
    days = Math.max(days, missing / perDay)
  }

  // Vor dem Aufrunden auf vier Nachkommastellen kürzen. Ohne das macht
  // Math.ceil() aus 10.0000000058 Tagen "~11d" — die paar Millisekunden
  // zwischen created_at und dem Render entscheiden dann über einen ganzen Tag.
  return { visitorsNeeded, daysNeeded: Math.max(1, Math.ceil(Number(days.toFixed(4)))) }
}
