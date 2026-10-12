'use client'

import { calcSignificance } from '@/lib/significance'
import { formatDayLabel, type AnalyticsData } from '@/lib/resultsHelpers'
import { Target, BarChart3, TrendingUp } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/app/components/ui/chart'
import { chartMargin, gridProps, lineProps, xAxisProps, yAxisProps, SERIES } from '@/app/dashboard/components/chartTheme'
import { formatCount, formatPercent } from '@/lib/formatNumber'
import { OK, PRO, visitorsConfig, conversionsConfig, significanceConfig, percentAxisProps } from './chartConfigs'

/** Zeitreihen: Besucher pro Tag, kumulierte Conversions, Signifikanz über die Zeit. */
export function TrendCharts({
  analytics,
  analyticsLoaded,
  totalVisitors,
  totalConversions,
  significance,
  significanceLevel,
}: {
  analytics: AnalyticsData | null
  analyticsLoaded: boolean
  totalVisitors: number
  totalConversions: number
  significance: number
  significanceLevel: number
}) {
  return (
    <>
      {/* ── Charts Row: Visitors + Conversions side-by-side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Visitors over time — available for all plans */}
      {analytics && analytics.daily.length >= 2 ? (
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-3.5 w-3.5 text-text-3" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">
              Visitors per Day
            </span>
          </div>
          <ChartContainer
            config={visitorsConfig}
            showLegend
            className="h-[180px] w-full"
            role="img"
            aria-label={`Visitors per day for ${analytics.daily.length} days, ${formatCount(totalVisitors)} in total`}
          >
            <LineChart
              data={analytics.daily.map((d) => ({
                date: formatDayLabel(d.date),
                A: d.visitors_a,
                B: d.visitors_b,
              }))}
              margin={chartMargin}
            >
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="date" {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <ChartTooltip content={<ChartTooltipContent valueFormatter={(v) => formatCount(v)} />} />
              <Line dataKey="A" stroke={SERIES.neutral} {...lineProps} />
              <Line dataKey="B" stroke={PRO} {...lineProps} />
            </LineChart>
          </ChartContainer>
        </div>
      ) : analyticsLoaded ? (
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-text-3" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">
              Visitors per Day
            </span>
            <span className="ml-auto text-[11px] text-text-3">Not enough data yet</span>
          </div>
        </div>
      ) : null}

      {/* ── Cumulative Conversions over Time ── */}
      {analytics && analytics.daily.length >= 2 ? (
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-3.5 w-3.5 text-text-3" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">
              Cumulative Conversions
            </span>
          </div>
          <ChartContainer
            config={conversionsConfig}
            showLegend
            className="h-[180px] w-full"
            role="img"
            aria-label={`Cumulative conversions: ${formatCount(totalConversions)} total conversions over ${analytics.daily.length} days`}
          >
            <LineChart
              data={(() => {
                let cumA = 0, cumB = 0
                return analytics.daily.map((d) => {
                  cumA += d.conversions_a
                  cumB += d.conversions_b
                  return {
                    date: formatDayLabel(d.date),
                    A: cumA,
                    B: cumB,
                  }
                })
              })()}
              margin={chartMargin}
            >
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="date" {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <ChartTooltip content={<ChartTooltipContent valueFormatter={(v) => formatCount(v)} />} />
              <Line dataKey="A" stroke={SERIES.neutral} {...lineProps} />
              <Line dataKey="B" stroke={OK} {...lineProps} />
            </LineChart>
          </ChartContainer>
        </div>
      ) : analyticsLoaded ? (
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
          <div className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-text-3" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">
              Cumulative Conversions
            </span>
            <span className="ml-auto text-[11px] text-text-3">Not enough data yet</span>
          </div>
        </div>
      ) : null}
      </div>{/* end charts grid */}

      {/* ── Significance over Time ── */}
      {analytics && analytics.daily.length >= 2 ? (
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-3.5 w-3.5 text-text-3" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">
              Significance over Time
            </span>
          </div>
          <ChartContainer
            config={significanceConfig}
            className="h-[180px] w-full"
            role="img"
            aria-label={`Significance over time: currently ${Math.round(significance * 100)}% confidence over ${analytics.daily.length} days`}
          >
            <LineChart
              data={(() => {
                let cumVA = 0, cumCA = 0, cumVB = 0, cumCB = 0
                return analytics.daily.map((d) => {
                  cumVA += d.visitors_a; cumCA += d.conversions_a
                  cumVB += d.visitors_b; cumCB += d.conversions_b
                  const sig = calcSignificance(cumVA, cumCA, cumVB, cumCB)
                  return {
                    date: formatDayLabel(d.date),
                    significance: Math.round(sig * 100),
                  }
                })
              })()}
              margin={chartMargin}
            >
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="date" {...xAxisProps} />
              <YAxis domain={[0, 100]} {...percentAxisProps} />
              <ChartTooltip
                content={<ChartTooltipContent valueFormatter={(v) => formatPercent(v)} />}
              />
              {/* 95% significance threshold */}
              <ReferenceLine
                y={Math.round(significanceLevel * 100)}
                stroke={SERIES.muted}
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <Line dataKey="significance" stroke={OK} {...lineProps} />
            </LineChart>
          </ChartContainer>
          <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-text-3">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: OK }} /> Confidence
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-0.5 w-4 rounded-full border-t border-dashed border-border-strong" />{' '}
              {Math.round(significanceLevel * 100)}% threshold
            </span>
          </div>
        </div>
      ) : analyticsLoaded ? (
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-text-3" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">
              Significance over Time
            </span>
            <span className="ml-auto text-[11px] text-text-3">Not enough data yet</span>
          </div>
        </div>
      ) : null}
    </>
  )
}
