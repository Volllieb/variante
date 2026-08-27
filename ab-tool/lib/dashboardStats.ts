// Zeitraum-Aggregation für die Dashboard-Overview.
//
// Datenquelle ist `daily_stats`. Seit Migration 039 hält die Tabelle echte
// Tagesdeltas — vorher standen dort eingefrorene Kumulativstände, mit denen
// jeder Zeitraum-Vergleich Unsinn ergeben hätte.
//
// Rein und ohne DB-Zugriff, damit die Arithmetik als Node-Test läuft
// (__tests__/dashboard-stats.mjs).
//
// Alle Tagesgrenzen sind UTC — dieselbe Zeitbasis, in der der Cron die Zeilen
// schreibt. Eine lokale Zeitzone würde je nach Browser einen Tag verschieben.
//
// Die Zeiträume enden GESTERN, nicht heute. Geschrieben wird `daily_stats` nur
// von finalize_daily_stats() um Mitternacht — und das schließt den VORTAG ab
// (Migration 039). Für heute existiert im Normalfall gar keine Zeile;
// snapshot_daily_stats(heute) läuft nur, wenn jemand zufällig die
// Results-Seite eines Tests öffnet. Heute mitzuzählen hieße also: der Trend
// fällt am rechten Rand jeden Tag auf null, und "letzte 7 Tage" wäre je nach
// Zufall mal mit und mal ohne heutigen Traffic. Lieber sieben vollständige
// Tage als acht, von denen einer gelogen ist.

export type DailyStatRow = {
  test_id: string
  /** ISO-Datum, YYYY-MM-DD. */
  date: string
  visitors_a?: number | null
  visitors_b?: number | null
  conversions_a?: number | null
  conversions_b?: number | null
}

export type PeriodTotals = {
  visitors: number
  conversions: number
  /** Conversion Rate in Prozent. */
  cr: number
}

export type PeriodComparison = {
  current: PeriodTotals
  previous: PeriodTotals
  delta: {
    /** Veränderung in Prozent; null, wenn die Vorperiode leer war. */
    visitors: number | null
    conversions: number | null
    /** Veränderung der Conversion Rate in PROZENTPUNKTEN, nicht in Prozent. */
    crPoints: number | null
  }
}

export type TrendPoint = {
  date: string
  visitors: number
  conversions: number
}

/* ── Tages-Arithmetik auf ISO-Strings ── */

export function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function shiftDay(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number)
  return dayKey(Date.UTC(y, m - 1, d) + days * 86_400_000)
}

/** Letzter Tag, für den `daily_stats` vollständig ist: gestern (UTC). */
export function lastCompleteDay(now: number = Date.now()): string {
  return shiftDay(dayKey(now), -1)
}

/**
 * Startdatum des Ladefensters für `daily_stats` (YYYY-MM-DD).
 *
 * Liegt hier und nicht in der Page: der React Compiler verbietet Date.now()
 * im Rumpf einer Komponente (react-hooks/purity), und die Fensterlänge gehört
 * ohnehin zur Zeitraum-Logik.
 */
export function statsWindowStart(days = 60, now: number = Date.now()): string {
  return dayKey(now - days * 86_400_000)
}

function emptyTotals(): PeriodTotals {
  return { visitors: 0, conversions: 0, cr: 0 }
}

function sumRange(
  rows: DailyStatRow[],
  ids: Set<string>,
  from: string,
  to: string
): PeriodTotals {
  let visitors = 0
  let conversions = 0
  for (const r of rows) {
    if (!ids.has(r.test_id)) continue
    if (r.date < from || r.date > to) continue
    visitors += (r.visitors_a ?? 0) + (r.visitors_b ?? 0)
    conversions += (r.conversions_a ?? 0) + (r.conversions_b ?? 0)
  }
  return { visitors, conversions, cr: visitors > 0 ? (conversions / visitors) * 100 : 0 }
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return ((current - previous) / previous) * 100
}

/**
 * Summiert den Zeitraum der letzten `days` Tage (heute eingeschlossen) und
 * die unmittelbar davorliegende Periode gleicher Länge.
 *
 * Deshalb lädt die Seite 60 Tage: ein 30-Tage-Zeitraum braucht eine
 * vollständige Vorperiode, sonst vergleicht das Δ gegen abgeschnittene Daten.
 */
export function aggregatePeriod(
  rows: DailyStatRow[],
  testIds: string[],
  days: number,
  now: number = Date.now()
): PeriodComparison {
  const ids = new Set(testIds)
  if (ids.size === 0 || days <= 0) {
    return {
      current: emptyTotals(),
      previous: emptyTotals(),
      delta: { visitors: null, conversions: null, crPoints: null },
    }
  }

  // Fenster endet gestern (siehe Kopfkommentar). Für days=30 reicht die
  // Vorperiode bis gestern−59 = heute−60 zurück — genau das Ladefenster aus
  // statsWindowStart().
  const end = lastCompleteDay(now)
  const currentFrom = shiftDay(end, -(days - 1))
  const previousTo = shiftDay(end, -days)
  const previousFrom = shiftDay(end, -(2 * days - 1))

  const current = sumRange(rows, ids, currentFrom, end)
  const previous = sumRange(rows, ids, previousFrom, previousTo)

  return {
    current,
    previous,
    delta: {
      visitors: pctChange(current.visitors, previous.visitors),
      conversions: pctChange(current.conversions, previous.conversions),
      crPoints: previous.visitors > 0 ? current.cr - previous.cr : null,
    },
  }
}

/**
 * Tagesreihe für den Trend-Chart, aufsteigend und lückenlos: Tage ohne Zeile
 * werden als 0 ausgegeben. Ohne die Auffüllung würde eine Verkehrsflaute im
 * Chart als gerade Linie erscheinen statt als Einbruch.
 */
export function buildTrend(
  rows: DailyStatRow[],
  testIds: string[],
  days: number,
  now: number = Date.now()
): TrendPoint[] {
  const ids = new Set(testIds)
  if (ids.size === 0 || days <= 0) return []

  const end = lastCompleteDay(now)
  const series = new Map<string, TrendPoint>()
  for (let i = days - 1; i >= 0; i--) {
    const date = shiftDay(end, -i)
    series.set(date, { date, visitors: 0, conversions: 0 })
  }

  for (const r of rows) {
    if (!ids.has(r.test_id)) continue
    const point = series.get(r.date)
    if (!point) continue
    point.visitors += (r.visitors_a ?? 0) + (r.visitors_b ?? 0)
    point.conversions += (r.conversions_a ?? 0) + (r.conversions_b ?? 0)
  }

  return [...series.values()]
}
