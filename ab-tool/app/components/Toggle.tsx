'use client'

/**
 * Toggle-Switch (brandguidelines v3 §6.5).
 *
 * Stand als lokale Komponente in `AccountClient.tsx` — dort gut gebaut
 * (`role="switch"` + `aria-checked`, Plan A11Y-01; sichtbarer Focus-Ring statt
 * `outline-none` ohne Ersatz, Plan A11Y-03), aber nur dort verfügbar. Phase 2
 * hebt sie zu den Primitives, damit der nächste Schalter nicht wieder
 * nachgebaut wird.
 *
 * Die Pixelwerte sind Geometrie des Schalters, kein Layout-Spacing: 38×22 mit
 * 16px-Knopf ist die kleinste Größe, bei der der Zustand auf einen Blick
 * lesbar bleibt.
 */

import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  /** Pflicht: der Schalter trägt seine Bedeutung nicht im Text. */
  label: string
  id?: string
  disabled?: boolean
  className?: string
}

export function Toggle({ checked, onChange, label, id, disabled, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-[22px] w-[38px] shrink-0 cursor-pointer rounded-full border transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0',
        'disabled:cursor-not-allowed disabled:opacity-40',
        checked ? 'border-transparent bg-fill-invert' : 'border-border bg-bg-2',
        className,
      )}
    >
      <span
        className={cn(
          'absolute top-1/2 h-[16px] w-[16px] -translate-y-1/2 rounded-full transition-[left,background-color]',
          checked ? 'left-[19px] bg-text-on-invert' : 'left-[2px] bg-text-3',
        )}
      />
    </button>
  )
}
