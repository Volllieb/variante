'use client'

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

export function PeriodSelector({
  period,
  onChange,
}: {
  period: Period
  onChange: (next: Period) => void
}) {
  return (
    <div
      role="group"
      aria-label="Time range"
      className="flex shrink-0 items-center gap-0.5 rounded-[var(--radius-md)] border border-border bg-bg-1 p-0.5"
    >
      {OPTIONS.map((o) => {
        const active = o.value === period
        return (
          <button
            key={String(o.value)}
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={`cursor-pointer rounded-[var(--radius-sm)] px-2 py-1 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-text/20 focus-visible:outline-none ${
              active ? 'bg-bg-2 text-text' : 'text-text-3 hover:text-text-2'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
