'use client'

/**
 * Card (brandguidelines v3 §6.3).
 *
 * Phase 1: Radius war `--radius-lg` (10px), laut §4.1 sind Cards `md` (6px) —
 * `lg` bleibt dem Modal vorbehalten. `variant="lift"` ist weg: Hover-Lift ist
 * Landing-only und heißt dort `.card-lift`. Dafür gibt es `interactive` für
 * klickbare Cards, das `.surface-interactive` setzt (Hover auf Border + Fill)
 * statt in jeder Datei eigene Hover-Klassen zu wiederholen.
 *
 * Restliche div-Props gehen durch: eine Card ist je nach Inhalt auch mal eine
 * Live-Region (<EmptyState>) oder klickbar, und beides soll ohne Wrapper-div
 * gehen, der die Fläche verdoppelt.
 */

import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/utils'

type CardVariant = 'default' | 'banner' | 'dashed'
type CardTone = 'ok' | 'pro' | 'err' | 'neutral'
type CardPadding = 'none' | 'sm' | 'md' | 'lg'

interface CardProps extends ComponentProps<'div'> {
  variant?: CardVariant
  tone?: CardTone
  padding?: CardPadding
  /** Klickbare Card: Hover auf border-border-strong + bg-bg-2. */
  interactive?: boolean
  children: ReactNode
}

const paddingMap: Record<CardPadding, string> = {
  /** Fuer Karten, die ihre Abschnitte selbst abpolstern (Listen mit Trennern). */
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

const toneBorderMap: Record<CardTone, string> = {
  ok: 'border-ok/20',
  pro: 'border-pro/25',
  err: 'border-err/20',
  neutral: 'border-border',
}

const toneBgMap: Record<CardTone, string> = {
  ok: 'bg-ok/[0.04]',
  pro: 'bg-pro/[0.04]',
  err: 'bg-err/[0.04]',
  neutral: 'bg-bg-1',
}

export function Card({
  variant = 'default',
  tone = 'neutral',
  padding = 'md',
  interactive = false,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-md border',
        toneBorderMap[tone],
        toneBgMap[tone],
        paddingMap[padding],
        variant === 'dashed' && 'border-dashed',
        interactive && 'surface-interactive cursor-pointer',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
