/**
 * Reine Hilfsfunktionen für die Results-Seite.
 * Extrahiert aus ResultsClient.tsx (vorher 1499 Zeilen Monolith).
 * Keine React-Abhängigkeiten.
 */

export type DailyRow = {
  date: string
  visitors_a: number
  visitors_b: number
  conversions_a: number
  conversions_b: number
}

export type AnalyticsData = {
  current: {
    visitors_a: number
    visitors_b: number
    conversions_a: number
    conversions_b: number
    significance: number
    winner: string | null
  }
  daily: DailyRow[]
}

export function formatCreatedAt(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  if (m > 0) return `${m}m ago`
  return 'just now'
}

/** CSV-Download via Blob (browser-only). */
export function exportCsv(daily: DailyRow[], testName: string): void {
  const rows = [['Date', 'Visitors A', 'Visitors B', 'Conversions A', 'Conversions B', 'CR A', 'CR B', 'Lift']]
  for (const d of daily) {
    const crA = d.visitors_a > 0 ? ((d.conversions_a / d.visitors_a) * 100).toFixed(1) : '—'
    const crB = d.visitors_b > 0 ? ((d.conversions_b / d.visitors_b) * 100).toFixed(1) : '—'
    const lift = d.visitors_a > 0 && d.conversions_a > 0 && d.visitors_b > 0
      ? (((d.conversions_b / d.visitors_b) - (d.conversions_a / d.visitors_a)) / (d.conversions_a / d.visitors_a) * 100).toFixed(1)
      : '—'
    rows.push([
      new Date(d.date).toISOString().slice(0, 10),
      String(d.visitors_a),
      String(d.visitors_b),
      String(d.conversions_a),
      String(d.conversions_b),
      crA,
      crB,
      lift,
    ])
  }
  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${testName.replace(/[^a-zA-Z0-9]/g, '_')}_data.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Time-to-significance Schätzung: wie viele Tage bis zur Ziel-Signifikanz. */
export function estimateDaysToSignificance(
  totalVisitors: number,
  significance: number,
  createdAt: string,
  targetSignificance: number,
  nowTs: number
): number | null {
  if (significance <= 0 || significance >= targetSignificance) return null
  if (totalVisitors < 100) return null

  const daysRunning = Math.max(1, (nowTs - new Date(createdAt).getTime()) / 86_400_000)

  const zNow = zForSig(significance)
  const zTarget = zForSig(targetSignificance)
  if (zNow <= 0) return null

  const ratio = (zTarget / zNow) ** 2
  const additionalVisitorsNeeded = totalVisitors * (ratio - 1)
  const dailyTraffic = totalVisitors / daysRunning

  if (dailyTraffic <= 0) return null
  const daysEstimate = Math.ceil(additionalVisitorsNeeded / dailyTraffic)
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

export function progressPct(current: number, target: number): number {
  return Math.min(100, Math.round((current / Math.max(1, target)) * 100))
}

/** Parse DB goal format into UI state. */
export function parseGoal(dbGoal: string | null): { type: 'element' | 'click' | 'url'; value: string } {
  if (!dbGoal) return { type: 'element', value: '' }
  if (dbGoal.startsWith('click:')) return { type: 'click', value: dbGoal.slice(6) }
  if (dbGoal.startsWith('url:')) return { type: 'url', value: dbGoal.slice(4) }
  return { type: 'element', value: dbGoal }
}

export type GoalType = 'element' | 'click' | 'url'

export type GoalDescription = {
  type: GoalType
  /** Einzeiler für die Testkarte — schon vollständig, ohne Markup. */
  short: string
  /** Fließtext für die Results-Seite; `code` ist der hervorgehobene Teil. */
  label: string
  /** Selektor bzw. URL, oder null wenn kein Ziel gesetzt ist. */
  code: string | null
}

/**
 * Ein Conversion-Ziel in Klartext.
 *
 * Lag vorher nur als JSX-Kaskade auf der Results-Seite. Die Testkarte braucht
 * dieselbe Zuordnung — zweimal getippt hätte sie garantiert auseinandergelebt,
 * und zwei Antworten auf "was zählt hier als Conversion" sind eine zu viel.
 */
export function describeGoal(type: GoalType, value: string, selector?: string | null): GoalDescription {
  if (type === 'click') {
    return { type, short: `Click: ${value}`, label: 'Clicks on', code: value }
  }
  if (type === 'url') {
    return { type, short: `Page view: ${value}`, label: 'Page view:', code: value }
  }
  if (selector) {
    return {
      type,
      short: `Click: ${selector}`,
      label: 'Clicks on the replaced element',
      code: selector,
    }
  }
  return {
    type,
    short: 'No conversion goal',
    label: 'No conversion goal set — conversions can’t be tracked yet.',
    code: null,
  }
}

/** Wie describeGoal, aber direkt aus dem DB-Wert. */
export function describeDbGoal(dbGoal: string | null, selector?: string | null): GoalDescription {
  const { type, value } = parseGoal(dbGoal)
  return describeGoal(type, value, selector)
}

/** Format UI state back into DB goal format. */
export function formatGoal(type: 'element' | 'click' | 'url', value: string): string | null {
  if (type === 'element') return null
  if (type === 'click') return value ? `click:${value}` : null
  if (type === 'url') return value ? `url:${value}` : null
  return null
}

// ────────────────────────────────────────────────────────────────────────────
// Readiness: was fehlt dem Test noch zur Entscheidung
//
// Die Hero-Card hat drei Zahlen nebeneinander gezeigt, die drei verschiedene
// Aggregationen desselben Tests waren, ohne das zu sagen: "83 visitors so far"
// (Summe beider Arme), "Visitors/arm 30 / 1.000" (Minimum der Arme) und
// "Conversions/arm 6 / 25" (Minimum der Arme — aber ein anderer Arm als der
// mit den 30 Besuchern). Drei korrekte Zahlen, die zusammen wie ein Rechenfehler
// aussehen. Die Kriterien liefern jetzt beide Arme mit, damit die Oberfläche
// zeigen kann, worauf der Fortschritt sich bezieht.
// ────────────────────────────────────────────────────────────────────────────

export type ArmCounts = { views: number; conversions: number }

export type ArmCriterion = {
  /** Wert von Variante A. */
  a: number
  /** Wert von Variante B. */
  b: number
  /** Der Wert, an dem die Freigabe hängt — der schwächere der beiden Arme. */
  lagging: number
  /** Welcher Arm bremst. null bei Gleichstand. */
  laggingArm: 'A' | 'B' | null
  target: number
  /** Fortschritt des schwächeren Arms, 0–100. */
  pct: number
  met: boolean
}

/**
 * Ein Schwellwert, der PRO ARM gelten muss (so prüft evaluateWinner).
 * Der Fortschritt folgt dem schwächeren Arm — er entscheidet, wann der Test
 * auswertbar ist.
 */
export function armCriterion(a: number, b: number, target: number): ArmCriterion {
  const lagging = Math.min(a, b)
  return {
    a,
    b,
    lagging,
    laggingArm: a === b ? null : a < b ? 'A' : 'B',
    target,
    pct: gatePct(lagging, target),
    met: lagging >= target,
  }
}

/**
 * Fortschritt eines Gates in Prozent.
 *
 * Anders als progressPct wird abgerundet und bei 99 gedeckelt, solange die
 * Schwelle nicht erreicht ist: 999 von 1.000 Besuchern ergaben sonst einen
 * vollen Balken mit "100 %" neben einem offenen ○ — der Test wartet aber
 * weiter. Ein Zähler darf nie mehr behaupten, als tatsächlich erreicht wurde.
 */
export function gatePct(current: number, target: number): number {
  if (target <= 0 || current >= target) return 100
  return Math.max(0, Math.min(99, Math.floor((current / target) * 100)))
}

/** Conversion Rate in Prozent — ungerundet, damit Folgerechnungen stimmen. */
export function conversionRate(views: number, conversions: number): number {
  return views > 0 ? (conversions / views) * 100 : 0
}

/**
 * Uplift von B gegenüber A in Prozent.
 *
 * ponytail: Die Oberfläche rechnete `(b.cr - a.cr) / a.cr` mit den bereits auf
 * eine Nachkommastelle gerundeten Conversion Rates aus getExperimentStats.
 * Bei den kleinen Raten, um die es im CRO geht, ist das kein Rundungsfehler
 * mehr, sondern eine andere Zahl: 0,44 % vs. 0,52 % wird gerundet zu 0,4 % vs.
 * 0,5 % und damit als "+25 %" angezeigt statt als "+18 %". Der Kunde rollt
 * Varianten anhand dieser Zahl aus, also wird sie aus den Rohzählern gerechnet.
 */
export function calcUplift(a: ArmCounts, b: ArmCounts): number | null {
  if (a.views <= 0 || b.views <= 0 || a.conversions <= 0) return null
  const crA = a.conversions / a.views
  const crB = b.conversions / b.views
  return ((crB - crA) / crA) * 100
}

export type Readiness = {
  visitors: ArmCriterion
  conversions: ArmCriterion
  runtime: { days: number; target: number; pct: number; met: boolean }
  /** Alle drei Schwellen erreicht — es fehlt höchstens noch die Konfidenz. */
  allMet: boolean
}

/**
 * Spiegelt die Schwellen aus evaluateWinner() für die Anzeige.
 * `minVisitorsPerArm` ist bereits der effektive Wert (DB-Wert vs. Systemboden).
 */
export function computeReadiness(params: {
  a: ArmCounts
  b: ArmCounts
  minVisitorsPerArm: number
  minConversionsPerArm: number
  minRuntimeDays: number
  createdAt: string
  now: number
}): Readiness {
  const { a, b, minVisitorsPerArm, minConversionsPerArm, minRuntimeDays, createdAt, now } = params
  const visitors = armCriterion(a.views, b.views, minVisitorsPerArm)
  const conversions = armCriterion(a.conversions, b.conversions, minConversionsPerArm)
  const days = daysSince(createdAt, now)
  const runtime = {
    days,
    target: minRuntimeDays,
    pct: gatePct(days, minRuntimeDays),
    met: days >= minRuntimeDays,
  }
  return { visitors, conversions, runtime, allMet: visitors.met && conversions.met && runtime.met }
}

/** Laufzeit in Tagen, nie negativ; 0 wenn created_at unbrauchbar ist. */
export function daysSince(createdAt: string, now: number): number {
  const started = new Date(createdAt).getTime()
  if (!Number.isFinite(started)) return 0
  return Math.max(0, (now - started) / 86_400_000)
}

/**
 * Wie viele Tage, bis der Test überhaupt entscheidbar ist.
 *
 * ponytail: Vorher schätzte die Karte nur die Zeit bis zur Signifikanz und
 * schrieb "~2 days to 95% confidence" — während derselbe Test im Feld daneben
 * 30 von 1.000 Besuchern pro Arm stehen hatte und damit frühestens in Wochen
 * einen Gewinner bekommen konnte. Die Schätzung ist jetzt das Maximum über
 * alle Bedingungen, die evaluateWinner tatsächlich prüft.
 *
 * Rückgabe ist ein frühestmöglicher Termin, keine Zusage: Traffic und
 * Conversion Rate werden aus dem bisherigen Verlauf fortgeschrieben.
 * null = nicht schätzbar (zu wenig Daten oder ein Arm ohne Conversions).
 */
export function estimateDaysToReady(params: {
  a: ArmCounts
  b: ArmCounts
  significance: number
  significanceLevel: number
  minVisitorsPerArm: number
  minConversionsPerArm: number
  minRuntimeDays: number
  createdAt: string
  now: number
}): number | null {
  const {
    a, b, significance, significanceLevel,
    minVisitorsPerArm, minConversionsPerArm, minRuntimeDays, createdAt, now,
  } = params

  const elapsed = daysSince(createdAt, now)
  // Untergrenze 1 Tag wie in estimateDaysToSignificance: in der ersten Stunde
  // eines Tests ist die Hochrechnung "5 Besucher in 6 Minuten = 1.200/Tag"
  // reine Fantasie. Lieber konservativ schätzen als zu früh Hoffnung machen.
  const rateDays = Math.max(1, elapsed)

  /** Tage, bis `have` per linearer Fortschreibung `target` erreicht. */
  function daysUntil(have: number, target: number): number | null {
    if (have >= target) return 0
    if (have <= 0) return null // ohne einen einzigen Datenpunkt keine Rate
    return (target - have) / (have / rateDays)
  }

  const parts: number[] = [Math.max(0, minRuntimeDays - elapsed)]

  for (const arm of [a, b]) {
    const v = daysUntil(arm.views, minVisitorsPerArm)
    const c = daysUntil(arm.conversions, minConversionsPerArm)
    if (v === null || c === null) return null
    parts.push(v, c)
  }

  if (significance < significanceLevel) {
    const sig = estimateDaysToSignificance(
      a.views + b.views, significance, createdAt, significanceLevel, now
    )
    // null heißt hier "noch nicht schätzbar", nicht "nicht nötig" — dann bleibt
    // die Ausgabe die Untergrenze aus den übrigen Bedingungen.
    if (sig !== null) parts.push(sig)
  }

  const days = Math.max(...parts)
  if (!Number.isFinite(days) || days <= 0) return null
  return Math.max(1, Math.ceil(days))
}
