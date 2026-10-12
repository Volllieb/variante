// Serienfarben, Chart-Konfigurationen und Prozent-Achse der Results-Charts.

import type { ChartConfig } from '@/app/components/ui/chart'
import { yAxisProps, SERIES } from '@/app/dashboard/components/chartTheme'
import { formatPercent } from '@/lib/formatNumber'

// CSS custom property helpers — SVGs support var() natively
export const OK = SERIES.ok
export const PRO = SERIES.pro

/* Chart-Konfigurationen. Vorher standen Serienfarben und Legenden-Labels an
   jedem Chart einzeln — die Legenden waren handgebaute divs mit eigenen
   Farbwerten, die von den Linienfarben abweichen konnten. */
export const visitorsConfig = {
  B: { label: 'Variant B', color: SERIES.pro },
  A: { label: 'Variant A', color: SERIES.neutral },
} satisfies ChartConfig

export const conversionsConfig = {
  B: { label: 'Variant B', color: SERIES.ok },
  A: { label: 'Variant A', color: SERIES.neutral },
} satisfies ChartConfig

export const significanceConfig = {
  significance: { label: 'Confidence', color: SERIES.ok },
} satisfies ChartConfig

export const barConfig = {
  value: { label: 'Value', color: SERIES.neutral },
} satisfies ChartConfig

/* Prozent-Achse mit fester 0-100-Domain; der kompakte Formatter der geteilten
   Achse wäre hier irreführend. Über formatPercent statt roher Interpolation:
   die CR-Balkenwerte kommen seit dem Metrik-Fix ungerundet an und hingen sonst
   mit allen Nachkommastellen auf der Achse. */
export const percentAxisProps = { ...yAxisProps, tickFormatter: (v: number) => formatPercent(v), width: 48 }
