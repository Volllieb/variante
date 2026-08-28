'use client'

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { TrendingUp } from 'lucide-react'
import type { TrendPoint } from '@/lib/dashboardStats'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/app/components/ui/chart'
import { chartMargin, gridProps, lineProps, xAxisProps, yAxisProps, SERIES } from './chartTheme'
import { formatCount } from '@/lib/formatNumber'

/**
 * Trend über den gewählten Zeitraum: Besucher und Conversions.
 *
 * Zwei Y-Achsen, weil Conversions ein bis zwei Größenordnungen unter den
 * Besuchern liegen: auf einer gemeinsamen Achse wäre die Conversion-Linie eine
 * Gerade auf dem Nullpunkt.
 */

const chartConfig = {
  Visitors: { label: 'Visitors', color: SERIES.neutral },
  Conversions: { label: 'Conversions', color: SERIES.ok },
} satisfies ChartConfig

export function TrendChart({ data, label }: { data: TrendPoint[]; label: string }) {
  const totalVisitors = data.reduce((s, d) => s + d.visitors, 0)
  const totalConversions = data.reduce((s, d) => s + d.conversions, 0)

  const chartData = data.map((d) => ({
    date: new Date(`${d.date}T00:00:00Z`).toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'UTC',
    }),
    Visitors: d.visitors,
    Conversions: d.conversions,
  }))

  return (
    <div className="mb-6 rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-text-3" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-text-3">
            Traffic &amp; conversions
          </span>
        </div>
        <span className="text-[11px] text-text-3">{label}</span>
      </div>

      <ChartContainer
        config={chartConfig}
        showLegend
        className="h-[180px] w-full"
        role="img"
        aria-label={`Trend over ${data.length} days: ${formatCount(totalVisitors)} visitors, ${formatCount(totalConversions)} conversions`}
      >
        <LineChart data={chartData} margin={chartMargin}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="date" {...xAxisProps} />
          <YAxis yAxisId="visitors" {...yAxisProps} />
          <YAxis yAxisId="conversions" orientation="right" {...yAxisProps} />
          <ChartTooltip
            content={<ChartTooltipContent valueFormatter={(v) => formatCount(v)} />}
          />
          <Line
            yAxisId="visitors"
            dataKey="Visitors"
            stroke={SERIES.neutral}
            {...lineProps}
          />
          <Line
            yAxisId="conversions"
            dataKey="Conversions"
            stroke={SERIES.ok}
            {...lineProps}
          />
        </LineChart>
      </ChartContainer>
    </div>
  )
}
