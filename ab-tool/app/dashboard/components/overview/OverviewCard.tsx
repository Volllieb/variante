'use client'

import { formatDelta } from '@/lib/formatNumber'

// ponytail: Die `icon`-Prop wurde durchgereicht, aber im Markup nie gerendert.
export function OverviewCard({
  label,
  value,
  hint,
  hintTitle,
  delta,
  tone,
}: {
  label: string
  value: string
  hint?: string
  /** Erklärung zum Zeitbezug, als title auf der Hint-Zeile. */
  hintTitle?: string
  /** Veränderung zur Vorperiode. `value: null` = keine Vorperiode zum Vergleichen. */
  delta?: { value: number | null; unit: '%' | 'pp' }
  tone?: 'ok' | 'pro' | 'err'
}) {
  const colorClass = tone === 'ok' ? 'text-ok' : tone === 'pro' ? 'text-pro' : tone === 'err' ? 'text-err' : 'text-text'
  const bgTint = tone === 'ok' ? 'bg-ok/[0.04]' : tone === 'err' ? 'bg-err/[0.04]' : ''

  // Ein Δ von exakt 0 ist eine Aussage ("unverändert"), null dagegen heißt:
  // die Vorperiode war leer — dann ist jede Prozentangabe erfunden.
  const d = delta?.value ?? null
  const deltaClass = d === null || Math.abs(d) < 0.05 ? 'text-text-3' : d > 0 ? 'text-ok' : 'text-err'

  return (
    <div className={`relative min-w-0 rounded-[var(--radius-lg)] border border-border bg-bg-1 p-4 ${bgTint}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-text-3">{label}</span>
      </div>
      <p
        className={`truncate text-[24px] font-semibold tabular-nums leading-none tracking-tight ${colorClass}`}
        title={value}
      >
        {value}
      </p>
      {(hint || delta) && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-text-3">
          {delta && (
            <span className={`tabular-nums font-medium ${deltaClass}`}>
              {d === null ? '—' : `${formatDelta(d).replace('%', '')}${delta.unit}`}
            </span>
          )}
          {hint && <span className="truncate" title={hintTitle}>{hint}</span>}
        </p>
      )}
    </div>
  )
}
