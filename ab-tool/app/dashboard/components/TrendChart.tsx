'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import type { TrendPoint } from '@/lib/dashboardStats'

/**
 * Trend über den gewählten Zeitraum: Besucher und Conversions.
 *
 * Achsen- und Tooltip-Styling stammen aus der Results-Seite, aber über die
 * Tokens statt über die dort hartcodierten #ededed-Werte — sonst hat das
 * Dashboard zwei Farbsysteme für dieselbe Art Chart.
 *
 * Zwei Y-Achsen, weil Conversions ein bis zwei Größenordnungen unter den
 * Besuchern liegen: auf einer gemeinsamen Achse wäre die Conversion-Linie eine
 * Gerade auf dem Nullpunkt.
 */
export function TrendChart({ data, label }: { data: TrendPoint[]; label: string }) {
  const totalVisitors = data.reduce((s, d) => s + d.visitors, 0)
  const totalConversions = data.reduce((s, d) => s + d.conversions, 0)

  const chartData = data.map((d) => ({
    date: new Date(`${d.date}T00:00:00Z`).toLocaleDateString(undefined, {
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

      <div
        className="h-[180px] w-full"
        role="img"
        aria-label={`Trend over ${data.length} days: ${totalVisitors.toLocaleString()} visitors, ${totalConversions.toLocaleString()} conversions`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--color-text-3)', fontSize: 10 }}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              yAxisId="visitors"
              tick={{ fill: 'var(--color-text-3)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <YAxis
              yAxisId="conversions"
              orientation="right"
              tick={{ fill: 'var(--color-text-3)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <RechartsTooltip
              contentStyle={{
                background: 'var(--color-bg-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--color-text)',
              }}
              labelStyle={{ color: 'var(--color-text-3)', marginBottom: 4 }}
            />
            <Line
              yAxisId="visitors"
              type="monotone"
              dataKey="Visitors"
              stroke="var(--color-text-2)"
              strokeWidth={1.5}
              dot={false}
            />
            <Line
              yAxisId="conversions"
              type="monotone"
              dataKey="Conversions"
              stroke="var(--color-ok)"
              strokeWidth={1.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
