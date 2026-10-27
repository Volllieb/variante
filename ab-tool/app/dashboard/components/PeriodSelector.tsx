'use client'

import { SegmentedControl } from '@/app/components'

export type Period = 7 | 30 | 'all'

const OPTIONS: { value: Period; label: string }[] = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 'all', label: 'All time' },
]

export function isPeriod(value: unknown): value is Period {
  return value === 7 || value === 30 || value === 'all'
}

/** localStorage-Wert → gültiger Zeitraum. Fällt auf 30 Tage zurück. */
export function parsePeriod(raw: string | null): Period {
  if (raw === 'all') return 'all'
  const n = Number(raw)
  return isPeriod(n) ? n : 30
}

export function periodLabel(period: Period): string {
  return period === 'all' ? 'all time' : `last ${period} days`
}

/**
 * Der Zusatz zum Zeitraum. `daily_stats` wird nachts abgeschlossen, die
 * Zeiträume enden deshalb gestern — das gehört an die Zahl, nicht ins
 * Kleingedruckte. "All time" liest die Zähler aus `tests` und ist aktuell.
 */
export function periodNote(period: Period): string | undefined {
  if (period === 'all') return undefined
  return 'Complete days only — today is counted after the nightly snapshot.'
}

/** Zeitraum-Beschriftung für den Trend-Chart. */
export function trendLabel(period: Period): string {
  return period === 'all' ? 'all time · through yesterday' : `last ${period} days · through yesterday`
}

export function PeriodSelector({
  period,
  onChange,
}: {
  period: Period
  onChange: (next: Period) => void
}) {
  // Phase 2: das Control selbst ist jetzt <SegmentedControl> (§6.7). Hier
  // bleibt nur noch, was den Zeitraum ausmacht — Optionen und Bedeutung.
  return (
    <SegmentedControl label="Time range" value={period} onChange={onChange} options={OPTIONS} />
  )
}
