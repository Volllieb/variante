import { formatCompact } from '@/lib/formatNumber'

/**
 * Geteilte Achsen- und Grid-Konfiguration für alle Dashboard-Charts.
 *
 * Vorher stand diese Konfiguration sechsmal im Code und lief auseinander:
 * TrendChart hatte minTickGap, die drei Line-Charts der Results-Seite nicht
 * (deren Datumslabels kollidieren dadurch auf 60-Tage-Ranges); die Linien
 * waren mal 1.5px, mal 2px stark; die YAxis war überall 40px breit, was bei
 * fontSize 10 etwa sieben Ziffern fasst — ein 1,000,000 lief an.
 */

/** Achsenbeschriftung. Farbe kommt aus ChartContainer via CSS, nicht als Prop. */
export const AXIS_TICK = { fontSize: 10 } as const

export const xAxisProps = {
  tick: AXIS_TICK,
  axisLine: false,
  tickLine: false,
  interval: 'preserveStartEnd',
  /* Ohne minTickGap setzt Recharts Ticks auch dann, wenn sie sich überlappen. */
  minTickGap: 24,
} as const

export const yAxisProps = {
  tick: AXIS_TICK,
  axisLine: false,
  tickLine: false,
  /* 48 statt 40: mit Tausendertrennern braucht "999.9k" mehr Platz als "1000". */
  width: 48,
  /* Kompakt statt roh — die Achse zeigt jetzt "1M" statt "1000000". */
  tickFormatter: (value: number) => formatCompact(value),
} as const

export const gridProps = {
  strokeDasharray: '3 3',
  vertical: false,
} as const

export const lineProps = {
  type: 'monotone',
  strokeWidth: 1.5,
  dot: false,
  activeDot: { r: 3 },
} as const

/**
 * Chart-Ränder. `top` ist bewusst nicht 0: Balken-Labels mit position="top"
 * werden sonst über der Plotfläche gezeichnet und abgeschnitten.
 */
export const chartMargin = { top: 16, right: 8, bottom: 4, left: 4 } as const

/** Serienfarben. Nur Tokens — "#1a1a1a" war nicht einmal eines. */
export const SERIES = {
  neutral: 'var(--color-text-2)',
  ok: 'var(--color-ok)',
  pro: 'var(--color-pro)',
  err: 'var(--color-err)',
  muted: 'var(--color-border-strong)',
} as const

/**
 * Ränder für die Balken-Charts.
 *
 * Der Kern des Clipping-Bugs: beide BarCharts standen auf `top: 0` bei
 * gleichzeitigem `label={{ position: 'top' }}`. Recharts zeichnet das Label
 * über den Balkenkopf — beim höchsten Balken also über die Plotfläche hinaus,
 * wo es beschnitten wurde. Genau die Zahl, die am meisten interessiert, war
 * die einzige unlesbare.
 *
 * `bottom: 0`, weil beide Charts gar keine XAxis haben; die bisherigen 20px
 * waren toter Raum, der der Plotfläche fehlte.
 */
export const barMargin = { top: 18, right: 4, bottom: 0, left: 4 } as const
