'use client'

import * as React from 'react'
import * as Recharts from 'recharts'
import { cn } from '@/lib/utils'

/**
 * Chart-Primitives nach dem shadcn/ui-Muster, aber gegen die Projekt-Tokens
 * gefärbt statt gegen --background/--foreground.
 *
 * Der Grund für diese Schicht: vorher hatte jedes der sechs Charts sein
 * eigenes Tooltip-Verhalten. Auf der Results-Seite allein zeigten vier Charts
 * drei verschiedene Varianten — eines ohne Wert-Formatter, eines mit
 * `${value}%`, eines mit toLocaleString. Dazu standen dort `#1a1a1a` und
 * `rgba(255,255,255,0.3)` hartcodiert im contentStyle, während TrendChart
 * dieselben Flächen über Tokens auflöste. Zwei Farbsysteme für dieselbe Art
 * Chart.
 *
 * Bewusst nicht per `npx shadcn add chart` gezogen: dessen init-Schritt legt
 * ein eigenes Token-Set in globals.css an und überschreibt damit die dort
 * dokumentierte WCAG-Arbeit an --color-text-3.
 */

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    color?: string
  }
>

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null)

function useChart() {
  const ctx = React.useContext(ChartContext)
  if (!ctx) throw new Error('useChart muss innerhalb von <ChartContainer> genutzt werden')
  return ctx
}

/**
 * Rahmen um ResponsiveContainer.
 *
 * Die Achsen-, Grid- und Cursor-Farben werden hier einmal per CSS auf die
 * Recharts-Klassen gelegt, statt sie an jedem <XAxis>/<CartesianGrid> als
 * Prop zu wiederholen. Recharts rendert SVG, und SVG löst var() nativ auf.
 */
export function ChartContainer({
  config,
  className,
  children,
  showLegend = false,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig
  children: React.ComponentProps<typeof Recharts.ResponsiveContainer>['children']
  /**
   * Legende unter dem Chart. Als Prop statt als Geschwister-Element, weil
   * ChartLegend die ChartConfig aus dem Context liest — außerhalb des
   * Providers wirft sie.
   */
  showLegend?: boolean
}) {
  return (
    <ChartContext.Provider value={{ config }}>
      <div
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-text-3",
          '[&_.recharts-cartesian-grid_line]:stroke-border',
          '[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border-strong',
          '[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-bg-2',
          '[&_.recharts-reference-line_line]:stroke-border-strong',
          '[&_.recharts-surface]:outline-none',
          className,
        )}
        {...props}
      >
        <Recharts.ResponsiveContainer width="100%" height="100%">
          {children}
        </Recharts.ResponsiveContainer>
      </div>
      {showLegend && <ChartLegend />}
    </ChartContext.Provider>
  )
}

export const ChartTooltip = Recharts.Tooltip

type TooltipEntry = {
  dataKey?: string | number
  name?: string | number
  value?: number | string
  color?: string
  payload?: Record<string, unknown>
}

/**
 * Tooltip-Inhalt als echte Komponente statt als contentStyle-Objekt.
 *
 * contentStyle konnte nur die Hülle einfärben — Layout, Reihenfolge und
 * Zahlenformat blieben pro Chart handgebaut und liefen deshalb auseinander.
 */
export function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  hideLabel = false,
  className,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: React.ReactNode
  labelFormatter?: (label: unknown) => React.ReactNode
  valueFormatter?: (value: number, key: string) => React.ReactNode
  hideLabel?: boolean
  className?: string
}) {
  const { config } = useChart()

  if (!active || !payload?.length) return null

  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-border bg-bg-2 px-2.5 py-2',
        'text-[12px] shadow-lg shadow-black/40',
        className,
      )}
    >
      {!hideLabel && label != null && (
        <div className="mb-1.5 text-[11px] text-text-3">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      <div className="grid gap-1">
        {payload.map((entry, i) => {
          const key = String(entry.dataKey ?? entry.name ?? i)
          const itemConfig = config[key]
          const numeric = typeof entry.value === 'number' ? entry.value : Number(entry.value ?? 0)

          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-text-2">
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ background: itemConfig?.color ?? entry.color }}
                />
                {itemConfig?.label ?? key}
              </span>
              <span className="font-medium tabular-nums text-text">
                {valueFormatter ? valueFormatter(numeric, key) : numeric.toLocaleString('en-US')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Legende aus der ChartConfig.
 *
 * Ersetzt die handgebauten Legenden-divs, die unter jedem Chart einzeln
 * standen und jeweils eigene Farbwerte und Textgrößen mitbrachten.
 */
export function ChartLegend({ className }: { className?: string }) {
  const { config } = useChart()
  const items = Object.entries(config).filter(([, v]) => v.label)

  if (!items.length) return null

  return (
    <div className={cn('mt-2 flex flex-wrap items-center justify-center gap-4 text-[11px] text-text-3', className)}>
      {items.map(([key, item]) => (
        <span key={key} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  )
}
