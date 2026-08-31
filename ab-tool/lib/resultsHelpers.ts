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

/**
 * 'YYYY-MM-DD' als Datums-Label, ohne Zeitzonen-Kippe.
 *
 * `new Date('YYYY-MM-DD')` parst UTC-Mitternacht — `toLocaleDateString`
 * zeigt in Zeitzonen westlich von UTC (ganz Amerika) den VORHERIGEN Tag an.
 * Lokal geparst (y, m, d als Argumente) bleibt der Tag der, den die DB
 * geschrieben hat. Chart-Achsen und Tagestabelle liefen sonst einen Tag
 * hinter dem CSV-Export her, der per toISOString (UTC) korrekt bleibt.
 */
export function formatDayLabel(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
  if (!m) return date
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (Number.isNaN(d.getTime())) return date.slice(0, 10)
  return d.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' })
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

/**
 * Mindest-Conversions pro Arm, ab denen ein Uplift überhaupt eine Aussage ist.
 * Dieselbe Schwelle, mit der die Hero-Card den Uplift zurückhält.
 */
export const MIN_CONV_FOR_UPLIFT = 10

/**
 * Uplift einer Tageszeile — oder null, wenn der Tag zu dünn dafür ist.
 *
 * ponytail: Die Tagestabelle und der CSV-Export rechneten den Uplift für jede
 * Zeile bedingungslos aus. Bei Tageswerten von 1 gegen 4 Conversions steht dort
 * dann "+300 %" — dieselbe Zahl, die die Hero-Card zwei Boxen weiter oben
 * bewusst zurückhält, weil sie bei so wenigen Conversions Rauschen ist. Eine
 * Tabelle, die dieselbe Groesse ungefiltert zeigt, hebelt die Sperre aus.
 */
export function dailyLift(d: DailyRow): number | null {
  if (d.conversions_a < MIN_CONV_FOR_UPLIFT || d.conversions_b < MIN_CONV_FOR_UPLIFT) return null
  return calcUplift(
    { views: d.visitors_a, conversions: d.conversions_a },
    { views: d.visitors_b, conversions: d.conversions_b }
  )
}

/** CSV-Download via Blob (browser-only). */
export function exportCsv(daily: DailyRow[], testName: string): void {
  const rows = [['Date', 'Visitors A', 'Visitors B', 'Conversions A', 'Conversions B', 'CR A', 'CR B', 'Lift']]
  for (const d of daily) {
    const crA = d.visitors_a > 0 ? ((d.conversions_a / d.visitors_a) * 100).toFixed(1) : ''
    const crB = d.visitors_b > 0 ? ((d.conversions_b / d.visitors_b) * 100).toFixed(1) : ''
    const lift = dailyLift(d)
    rows.push([
      new Date(d.date).toISOString().slice(0, 10),
      String(d.visitors_a),
      String(d.visitors_b),
      String(d.conversions_a),
      String(d.conversions_b),
      crA,
      crB,
      // Leer statt "—": ein Gedankenstrich in einer Zahlenspalte macht die
      // Datei in Excel zu Text und die Spalte unbrauchbar.
      lift === null ? '' : lift.toFixed(1),
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
// estimateDaysToSignificance() und die Restlaufzeit-Hochrechnung sind nach
// lib/forecast.ts gezogen — dort liegt jetzt die gesamte Zeitprognose,
// gemeinsam für Results-Seite und Dashboard-Overview.

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

export type UpliftCriterion = {
  /** Aktueller Uplift von B gegenüber A in Prozent; null = zu wenig Daten. */
  lift: number | null
  /** Mindest-Uplift in Prozent (aus min_uplift, Fraktion → Prozent). */
  target: number
  pct: number
  /**
   * Erfüllt, wenn der Gate aus evaluateWinner() nicht blockiert: B liegt über
   * der Schwelle — ODER B liegt nicht vorn (dann gewinnt A, sobald alles
   * andere steht, und der Gate greift gar nicht erst).
   */
  met: boolean
}

export type Readiness = {
  visitors: ArmCriterion
  conversions: ArmCriterion
  runtime: { days: number; target: number; pct: number; met: boolean }
  /** Min-Uplift-Gate aus evaluateWinner() — kein Pro-Arm-Kriterium. */
  uplift: UpliftCriterion
  /** Alle vier Schwellen erreicht — es fehlt höchstens noch die Konfidenz. */
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
  /** Fraktion (0.05 = 5 %), wie evaluateWinner() sie liest. */
  minUplift?: number
  createdAt: string
  now: number
}): Readiness {
  const { a, b, minVisitorsPerArm, minConversionsPerArm, minRuntimeDays, minUplift = 0.05, createdAt, now } = params
  const visitors = armCriterion(a.views, b.views, minVisitorsPerArm)
  const conversions = armCriterion(a.conversions, b.conversions, minConversionsPerArm)
  const days = daysSince(createdAt, now)
  const runtime = {
    days,
    target: minRuntimeDays,
    pct: gatePct(days, minRuntimeDays),
    met: days >= minRuntimeDays,
  }
  // Uplift-Gate wie evaluateWinner() (`(crB - crA) / crA < minUplift` blockiert
  // die Entscheidung). Dieselbe Datenschwelle wie die Hero-Card: unter
  // MIN_CONV_FOR_UPLIFT pro Arm ist die Schätzung Rauschen und der Gate nicht
  // bewerbar — die Zahl würde eine Zuversicht vortäuschen, die sie nicht hat.
  const lift = conversions.lagging >= MIN_CONV_FOR_UPLIFT ? calcUplift(a, b) : null
  const target = minUplift * 100
  const uplift: UpliftCriterion = {
    lift,
    target,
    pct: lift === null ? 0 : lift <= 0 ? 100 : gatePct(lift, target),
    met: lift !== null && (lift >= target || lift <= 0),
  }
  return {
    visitors,
    conversions,
    runtime,
    uplift,
    allMet: visitors.met && conversions.met && runtime.met && uplift.met,
  }
}

/** Laufzeit in Tagen, nie negativ; 0 wenn created_at unbrauchbar ist. */
export function daysSince(createdAt: string, now: number): number {
  const started = new Date(createdAt).getTime()
  if (!Number.isFinite(started)) return 0
  return Math.max(0, (now - started) / 86_400_000)
}
