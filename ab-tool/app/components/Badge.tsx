'use client'

/**
 * Badge / Pill (brandguidelines v3 §6.2).
 *
 * Phase 1: war `rounded-full` + `font-medium`, und `size="sm"` rendrte 9px —
 * im Dashboard sind 10px und kleiner verboten (§3). Jetzt eine Größe
 * (`text-meta`), `rounded-sm`, `font-semibold`. Tönungen kommen aus den
 * `-bg`-Tokens statt aus eigenen `/10`-Opacities, damit Badge und Banner-Card
 * dieselbe Fläche zeigen.
 */

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type BadgeTone = 'ok' | 'pro' | 'err' | 'neutral'

interface BadgeProps {
  tone: BadgeTone
  dot?: boolean
  className?: string
  children: ReactNode
}

const toneClasses: Record<BadgeTone, string> = {
  ok: 'bg-ok-bg text-ok',
  pro: 'bg-pro-bg text-pro',
  err: 'bg-err-bg text-err',
  neutral: 'bg-bg-2 text-text-2',
}

const dotClasses: Record<BadgeTone, string> = {
  ok: 'bg-ok',
  pro: 'bg-pro',
  err: 'bg-err',
  neutral: 'bg-text-3',
}

export function Badge({ tone, dot = false, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-tight rounded-sm px-1.5 py-0.5 text-meta font-semibold',
        toneClasses[tone],
        className,
      )}
    >
      {dot && <span className={cn('inline-block h-1.5 w-1.5 rounded-full', dotClasses[tone])} />}
      {children}
    </span>
  )
}
