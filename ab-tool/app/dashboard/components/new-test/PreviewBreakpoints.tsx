'use client'

/**
 * Breakpoint-Umschalter für die A/B-Vorschau — geteilt zwischen StepChange
 * (Step 2) und StepReview (Step 3). Vorher in StepReview definiert; der
 * Umbau von Step 2 zur Live-Vorschau braucht denselben Umschalter dort.
 *
 * Umgesetzt über die ECHTE iframe-Breite (transform: scale löst keine
 * Media-Queries aus). Desktop ist breiter als der Drawer — der Container
 * scrollt dann horizontal.
 */

export type Breakpoint = 375 | 768 | 'desktop'

export const BREAKPOINTS: Array<{ value: Breakpoint; label: string; width: number }> = [
  { value: 375, label: 'Mobile', width: 375 },
  { value: 768, label: 'Tablet', width: 768 },
  { value: 'desktop', label: 'Desktop', width: 1024 },
]

export function BreakpointSwitcher({
  value,
  onChange,
}: {
  value: Breakpoint
  onChange: (next: Breakpoint) => void
}) {
  return (
    <div className="flex rounded-[var(--radius-sm)] border border-border bg-bg-0 p-0.5">
      {BREAKPOINTS.map((bp) => (
        <button
          key={bp.value}
          type="button"
          onClick={() => onChange(bp.value)}
          className={`rounded-[var(--radius-sm)] px-2 py-0.5 text-[10px] font-medium transition-colors cursor-pointer ${
            value === bp.value
              ? 'bg-fill-invert text-text-on-invert'
              : 'text-text-3 hover:text-text'
          }`}
        >
          {bp.label}
        </button>
      ))}
    </div>
  )
}
