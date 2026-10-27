'use client'

import { type ReactNode } from 'react'

import { cn } from '@/lib/utils'

type TooltipProps = {
  content: string
  children: ReactNode
  /** top (default), bottom, left, right */
  side?: 'top' | 'bottom' | 'left' | 'right'
  /** max width of tooltip, default 200px */
  maxWidth?: number
  /** Für die Hülle, z. B. `flex-1`, wenn das Kind sich Breite teilen soll. */
  className?: string
}

const sideClasses: Record<string, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
  left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
  right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
}

/**
 * CSS-only Tooltip (brandguidelines v3 §6.10). Beliebiges Element umschließen.
 *
 * Phase 1: `shadow-lg` entfernt (§12 — Tiefe kommt aus Hairline + Fill-Stufe,
 * hier `bg-bg-2` auf `border-border-strong`), Größe auf `text-meta` gezogen.
 * Und er zeigt sich jetzt auch bei Tastatur-Fokus: vorher hing er allein an
 * `group-hover`, war per Tab also nicht erreichbar.
 */
export function Tooltip({ content, children, side = 'top', maxWidth = 200, className }: TooltipProps) {
  return (
    <span className={cn('group/tip relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-border-strong bg-bg-2 px-2.5 py-1.5 text-meta leading-relaxed text-text/90',
          'opacity-0 transition-opacity',
          'group-hover/tip:opacity-100 group-hover/tip:delay-300',
          'group-focus-within/tip:opacity-100 group-focus-within/tip:delay-300',
          sideClasses[side],
        )}
        style={{ maxWidth: `${maxWidth}px` }}
      >
        {content}
        {/* Arrow for top/bottom */}
        {side === 'top' && (
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-[5px] border-transparent border-t-bg-2" />
        )}
        {side === 'bottom' && (
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-b-bg-2" />
        )}
      </span>
    </span>
  )
}
