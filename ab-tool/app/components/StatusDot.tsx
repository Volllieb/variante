'use client'

/**
 * Status-Indikator (brandguidelines v3 §6.4).
 *
 * Phase 1: dieselben vier Zustände waren in TestCard, DecisionList,
 * Activity-Feed und im Plugin je inline gebaut — mit abweichenden Größen und
 * Farben. `draft` ist bewusst ein gestrichelter Ring, kein gefüllter Punkt:
 * „noch nichts passiert" soll sich optisch von „läuft" und „pausiert"
 * unterscheiden, ohne eine vierte Funktionsfarbe einzuführen.
 */

import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export type Status = 'live' | 'draft' | 'paused' | 'error'

const statusClasses: Record<Status, string> = {
  live: 'bg-ok',
  draft: 'border border-dashed border-text-3',
  paused: 'bg-text-3',
  error: 'bg-err',
}

const statusLabels: Record<Status, string> = {
  live: 'Live',
  draft: 'Draft',
  paused: 'Paused',
  error: 'Error',
}

interface StatusDotProps extends ComponentProps<'span'> {
  status: Status
  /** Ohne Label daneben: Dot trägt die Bedeutung und braucht einen Namen. */
  label?: string
}

export function StatusDot({ status, label, className, ...rest }: StatusDotProps) {
  // Steht der Dot neben seinem Label (Badge, Legende), ist er Dekoration und
  // soll nicht doppelt vorgelesen werden: dann `aria-hidden` mitgeben.
  return (
    <span
      role="img"
      aria-label={label ?? statusLabels[status]}
      className={cn('inline-block h-2 w-2 shrink-0 rounded-full', statusClasses[status], className)}
      {...rest}
    />
  )
}
