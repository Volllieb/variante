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

/** Format UI state back into DB goal format. */
export function formatGoal(type: 'element' | 'click' | 'url', value: string): string | null {
  if (type === 'element') return null
  if (type === 'click') return value ? `click:${value}` : null
  if (type === 'url') return value ? `url:${value}` : null
  return null
}
