'use client'

/**
 * Segmented Control (brandguidelines v3 §6.7) für 2–4 Optionen.
 *
 * Phase 1: dasselbe Control stand zweimal im Code — `PeriodSelector.tsx`
 * (aktiv = `bg-bg-2`) und `new-test/PreviewStateToggle.tsx` (aktiv =
 * `bg-fill-invert`). Zwei Lesarten für denselben Zustand: §6.7 legt
 * `bg-bg-2 text-text` fest, invertiert ist dem Primär-Button vorbehalten.
 *
 * `aria-pressed` statt `role="radiogroup"`: die Optionen schalten eine Ansicht
 * um, sie sind keine Formulareingabe.
 */

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { Tooltip } from './Tooltip'

export interface SegmentedOption<T> {
  value: T
  /** Darf ein Icon mitbringen; dann gehört der Name in `title` oder `aria`. */
  label: ReactNode
  disabled?: boolean
  /** Tooltip-Text, z. B. warum eine Option gesperrt ist. */
  title?: string
}

interface SegmentedControlProps<T> {
  /** Für `aria-label` der Gruppe — ohne sie ist die Auswahl namenlos. */
  label: string
  value: T
  onChange: (next: T) => void
  options: readonly SegmentedOption<T>[]
  /** Optionen teilen sich die volle Breite — für Modus-Umschalter über einem Panel. */
  grow?: boolean
  className?: string
}

export function SegmentedControl<T extends string | number>({
  label,
  value,
  onChange,
  options,
  grow = false,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'flex items-center gap-0.5 rounded-md border border-border bg-bg-1 p-0.5',
        grow ? 'w-full' : 'shrink-0',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        const button = (
          <button
            key={String(option.value)}
            type="button"
            // `aria-disabled` statt `disabled`: ein deaktivierter Button
            // feuert in Firefox kein :hover und zeigt sein `title` nicht an —
            // genau deshalb stand um die gesperrte Option in StepGoal vorher
            // ein Wrapper-<div> mit eigenem Tooltip. So bleibt die Option
            // fokussierbar und erklärt sich selbst.
            aria-disabled={option.disabled || undefined}
            aria-pressed={active}
            onClick={() => { if (!option.disabled) onChange(option.value) }}
            className={cn(
              'rounded-sm px-2.5 py-1 text-meta font-medium transition-colors',
              'inline-flex items-center justify-center gap-1.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30',
              // Mit Tooltip traegt die Huelle das flex-1, der Button fuellt sie.
              grow && (option.title ? 'w-full' : 'flex-1'),
              option.disabled
                ? 'cursor-not-allowed opacity-40'
                : 'cursor-pointer',
              active ? 'bg-bg-2 text-text' : 'text-text-3 hover:text-text-2',
            )}
          >
            {option.label}
          </button>
        )

        // Der Grund fuer eine gesperrte Option gehoert sichtbar daneben, nicht
        // in einen nativen title-Tooltip: <Tooltip> ist dieselbe Hilfe-Blase
        // wie ueberall sonst (§6.10) und zeigt sich auch bei Tastatur-Fokus.
        return option.title ? (
          <Tooltip
            key={String(option.value)}
            content={option.title}
            side="bottom"
            className={grow ? 'flex-1' : undefined}
          >
            {button}
          </Tooltip>
        ) : (
          button
        )
      })}
    </div>
  )
}
