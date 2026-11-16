'use client'

/**
 * Breakpoint-Umschalter für die A/B-Vorschau — geteilt zwischen StepChange
 * (Step 2) und StepReview (Step 3). Vorher in StepReview definiert; der
 * Umbau von Step 2 zur Live-Vorschau braucht denselben Umschalter dort.
 *
 * Umgesetzt über die ECHTE iframe-Breite (eine schmal skalierte Seite löst
 * keine Media-Queries aus), dargestellt über ScaledFrame (unten), damit
 * Tablet und Desktop in den Drawer passen.
 */

import { useEffect, useRef, useState } from 'react'
import { SegmentedControl } from '@/app/components'

/**
 * Vorschau-iframe mit ECHTER Breite (Media-Queries der Seite greifen), das
 * per transform auf die Breite des Rahmens verkleinert wird.
 *
 * Vorher: feste Breite in einem overflow-x-Container und feste Höhe von
 * 112–128 px. Tablet und Desktop liefen aus dem Drawer, Buttons wurden unten
 * abgeschnitten (Live-Test 16.11.2026). Skaliert wird nur die Darstellung —
 * der Viewport des iframes bleibt 375/768/1024 px breit.
 */
export function ScaledFrame({
  srcDoc, title, width, height = 220,
}: {
  srcDoc: string
  title: string
  /** Echte Viewport-Breite des iframes in px. */
  width: number
  /** Unskalierte Höhe in px. */
  height?: number
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [boxWidth, setBoxWidth] = useState<number | null>(null)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const update = () => setBoxWidth(el.clientWidth)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const scale = boxWidth ? Math.min(1, boxWidth / width) : 1
  return (
    <div ref={boxRef} className="w-full overflow-hidden" style={{ height: Math.ceil(height * scale) }}>
      <iframe
        srcDoc={srcDoc}
        sandbox=""
        title={title}
        style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      />
    </div>
  )
}

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
