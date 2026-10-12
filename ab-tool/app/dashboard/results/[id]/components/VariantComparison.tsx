'use client'

import { BarChart3 } from 'lucide-react'
import { YAxis, CartesianGrid, BarChart, Bar } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/app/components/ui/chart'
import { barMargin, gridProps, yAxisProps, SERIES } from '@/app/dashboard/components/chartTheme'
import { formatCount, formatPercent, formatCompact } from '@/lib/formatNumber'
import type { VariantStats } from '@/lib/getExperimentStats'
import { PRO, barConfig, percentAxisProps } from './chartConfigs'

/** Balkenvergleich A/B: Besucher und Conversion-Rate. */
export function VariantComparison({
  a,
  b,
}: {
  a: VariantStats
  b: VariantStats
}) {
  return (
    <>
      {/* Variant comparison bar chart — available for all plans */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-3.5 w-3.5 text-text-3" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">
            Variant Comparison
          </span>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Visitors bar chart */}
          <div>
            <p className="mb-2 text-[10px] font-medium text-text-3" id="visitors-bar-label">Visitors</p>
            <ChartContainer
              config={barConfig}
              className="h-[140px] w-full"
              role="img"
              aria-labelledby="visitors-bar-label"
              aria-label={`Variant A ${formatCount(a.views)} visitors, Variant B ${formatCount(b.views)} visitors`}
            >
              <BarChart
                data={[
                  { variant: 'A', value: a.views },
                  { variant: 'B', value: b.views },
                ]}
                margin={barMargin}
              >
                <CartesianGrid {...gridProps} />
                <YAxis {...yAxisProps} />
                <ChartTooltip
                  content={<ChartTooltipContent hideLabel valueFormatter={(v) => formatCount(v)} />}
                />
                <Bar
                  dataKey="value"
                  radius={[4, 4, 0, 0]}
                  fill={SERIES.neutral}
                  fillOpacity={0.35}
                  maxBarSize={48}
                  label={{ position: 'top', fill: 'var(--color-text-3)', fontSize: 10, formatter: (v: unknown) => (typeof v === 'number' ? formatCompact(v) : String(v ?? '')) }}
                />
              </BarChart>
            </ChartContainer>
          </div>
          {/* Conversion rate bar chart */}
          <div>
            <p className="mb-2 text-[10px] font-medium text-text-3">Conversion Rate</p>
            <ChartContainer
              config={barConfig}
              className="h-[140px] w-full"
              role="img"
              aria-label={`Conversion rate: Variant A ${formatPercent(a.cr)}, Variant B ${formatPercent(b.cr)}`}
            >
              <BarChart
                data={[
                  { variant: 'A', value: a.cr },
                  { variant: 'B', value: b.cr },
                ]}
                margin={barMargin}
              >
                <CartesianGrid {...gridProps} />
                <YAxis {...percentAxisProps} />
                <ChartTooltip
                  content={<ChartTooltipContent hideLabel valueFormatter={(v) => formatPercent(v)} />}
                />
                <Bar
                  dataKey="value"
                  radius={[4, 4, 0, 0]}
                  fill={PRO}
                  maxBarSize={48}
                  label={{ position: 'top', fill: 'var(--color-text-3)', fontSize: 10, formatter: (v: unknown) => (typeof v === 'number' ? formatPercent(v) : String(v ?? '')) }}
                />
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      </div>
    </>
  )
}
