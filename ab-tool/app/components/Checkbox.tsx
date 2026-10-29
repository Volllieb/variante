'use client'

/**
 * Checkbox (brandguidelines v3 §6.5) — `rounded-sm`, Label rechts, klickbar.
 *
 * Bewusst die native Checkbox mit `accent-color` statt einer nachgebauten:
 * sie bringt Tastatur, Indeterminate-Zustand und die Vorlese-Semantik mit,
 * und `accent-[var(--color-text)]` reicht aus, um sie monochrom zu halten.
 *
 * Das Label gehört zum Treffer-Bereich: wer „Terms of Service" liest, soll
 * auch darauf klicken können, nicht nur auf das 16px-Kästchen.
 *
 * `rounded-sm` steht hier der Regel wegen (§6.5), wirkt auf dem nativen
 * Kästchen aber nicht: mit `appearance: auto` zeichnet der Browser selbst und
 * ignoriert den Radius. Das zu erzwingen hiesse `appearance-none` plus
 * eigenes Häkchen — den Tausch ist die Rundung nicht wert.
 */

import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Steht rechts neben dem Kästchen und ist mit-klickbar. */
  label: ReactNode
  /** Für die Hülle, z. B. Abstand nach oben. */
  wrapperClassName?: string
}

export function Checkbox({ label, wrapperClassName, className, id, ...props }: CheckboxProps) {
  const generated = useId()
  const controlId = id ?? generated

  return (
    <div className={cn('flex items-start gap-snug', wrapperClassName)}>
      <input
        type="checkbox"
        id={controlId}
        className={cn(
          'mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-sm border-border bg-bg-1',
          'accent-[var(--color-text)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30',
          'disabled:cursor-not-allowed disabled:opacity-40',
          className,
        )}
        {...props}
      />
      <label
        htmlFor={controlId}
        className="cursor-pointer select-none text-small leading-relaxed text-text-3"
      >
        {label}
      </label>
    </div>
  )
}
