'use client'

import { type ReactNode } from 'react'

type TooltipProps = {
  content: string
  children: ReactNode
  /** top (default), bottom, left, right */
  side?: 'top' | 'bottom' | 'left' | 'right'
  /** max width of tooltip, default 200px */
  maxWidth?: number
}

const sideClasses: Record<string, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
  left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
  right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
}

/**
 * Simple CSS-only tooltip. Wrap any element.
 * Shows on hover after a short delay via CSS transition.
 */
export function Tooltip({ content, children, side = 'top', maxWidth = 200 }: TooltipProps) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 ${sideClasses[side]} rounded-[6px] border border-white/[0.14] bg-[#1a1a1a] px-2.5 py-1.5 text-[11px] leading-relaxed text-[#ededed]/90 opacity-0 transition-opacity duration-150 group-hover/tip:opacity-100 group-hover/tip:delay-300 whitespace-nowrap shadow-lg`}
        style={{ maxWidth: `${maxWidth}px` }}
      >
        {content}
        {/* Arrow for top/bottom */}
        {side === 'top' && (
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-[5px] border-transparent border-t-[#1a1a1a]" />
        )}
        {side === 'bottom' && (
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-b-[#1a1a1a]" />
        )}
      </span>
    </span>
  )
}
