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

import { SegmentedControl } from '@/app/components'

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
  // Phase 2: war ein eigener Umschalter mit invertiertem Aktiv-Zustand.
  // Nach §6.7 ist aktiv `bg-bg-2 text-text` — invertiert bleibt dem
  // Primär-Button vorbehalten.
  return (
    <SegmentedControl
      label="Preview width"
      value={value}
      onChange={onChange}
      options={BREAKPOINTS.map((bp) => ({ value: bp.value, label: bp.label }))}
    />
  )
}
