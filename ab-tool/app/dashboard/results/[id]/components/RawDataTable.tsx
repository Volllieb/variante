'use client'

import { formatDayLabel, exportCsv, conversionRate, dailyLift, MIN_CONV_FOR_UPLIFT, type DailyRow, type AnalyticsData } from '@/lib/resultsHelpers'
import { Table2, Download } from 'lucide-react'
import { formatCount, formatPercent, formatDelta } from '@/lib/formatNumber'
import type { Dispatch, SetStateAction } from 'react'

/** Aufklappbare Tagestabelle mit CSV-Export. */
export function RawDataTable({
  analytics,
  showRawData,
  setShowRawData,
  name,
}: {
  analytics: AnalyticsData | null
  showRawData: boolean
  setShowRawData: Dispatch<SetStateAction<boolean>>
  name: string
}) {
  return (
    <>
      {/* Raw data table */}
      {analytics && analytics.daily.length > 0 && (
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRawData(!showRawData)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Table2 className="h-3.5 w-3.5 text-text-3" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">
                Raw Data
              </span>
            </button>
            <span className="text-[11px] text-text-3">
              · {analytics.daily.length} days
            </span>
            <button
              onClick={() => exportCsv(analytics!.daily, name)}
              className="ml-auto flex cursor-pointer items-center gap-1 rounded-[var(--radius-md)] border border-border px-2.5 py-1 text-[10px] text-text-3 transition-colors hover:border-white/[0.18] hover:text-text"
            >
              <Download className="h-3 w-3" /> CSV
            </button>
          </div>
          {showRawData && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-text-3">
                    <th className="pb-2 pr-3 font-medium">Date</th>
                    <th className="pb-2 pr-3 font-medium text-right">Vis A</th>
                    <th className="pb-2 pr-3 font-medium text-right">Vis B</th>
                    {/* Ohne die Conversions ist die CR-Spalte nicht
                        nachrechenbar — "0.0%" konnte null Conversions oder
                        eine sehr kleine Rate heissen. Der CSV-Export lieferte
                        sie laengst, die Tabelle nicht. */}
                    <th className="pb-2 pr-3 font-medium text-right">Conv A</th>
                    <th className="pb-2 pr-3 font-medium text-right">Conv B</th>
                    <th className="pb-2 pr-3 font-medium text-right">CR A</th>
                    <th className="pb-2 pr-3 font-medium text-right">CR B</th>
                    <th className="pb-2 font-medium text-right">Lift</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.daily.map((row: DailyRow) => {
                    // "—%" stand vorher an jedem Tag ohne Besucher in dem Arm:
                    // der Gedankenstrich kam aus dem Fallback, das Prozent-
                    // zeichen aus dem Markup daneben.
                    const crA = row.visitors_a > 0 ? formatPercent(conversionRate(row.visitors_a, row.conversions_a)) : '—'
                    const crB = row.visitors_b > 0 ? formatPercent(conversionRate(row.visitors_b, row.conversions_b)) : '—'
                    const rowLift = dailyLift(row)
                    return (
                      <tr key={row.date} className="border-b border-border text-text-3 transition-colors duration-[var(--duration-fast)] ease-out hover:bg-bg-2 hover:text-text-2">
                        <td className="py-1.5 pr-3">{formatDayLabel(row.date)}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{formatCount(row.visitors_a)}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{formatCount(row.visitors_b)}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{formatCount(row.conversions_a)}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{formatCount(row.conversions_b)}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{crA}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{crB}</td>
                        <td className={`py-1.5 text-right tabular-nums ${rowLift !== null ? (rowLift > 0 ? 'text-ok' : rowLift < 0 ? 'text-err' : '') : ''}`}>
                          {rowLift !== null ? formatDelta(rowLift) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="mt-2 text-[10px] text-text-3">
                Daily values, not cumulative. Lift stays empty until a day has at least{' '}
                {MIN_CONV_FOR_UPLIFT} conversions in both variants — below that it is noise.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  )
}
