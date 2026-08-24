'use client'

import type { ReactNode } from 'react'

type CardVariant = 'default' | 'lift' | 'banner' | 'dashed'
type CardTone = 'ok' | 'pro' | 'err' | 'neutral'
type CardPadding = 'sm' | 'md' | 'lg'

interface CardProps {
  variant?: CardVariant
  tone?: CardTone
  padding?: CardPadding
  className?: string
  children: ReactNode
}

const paddingMap: Record<CardPadding, string> = {
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
  className = '',
  children,
}: CardProps) {
  const base = 'rounded-[var(--radius-lg)] border'
  const p = paddingMap[padding]

  const variantClasses: Record<CardVariant, string> = {
    default: `${base} ${toneBorderMap[tone]} ${toneBgMap[tone]} ${p}`,
    lift: `${base} ${toneBorderMap[tone]} ${toneBgMap[tone]} ${p} card-lift`,
    banner: `${base} ${toneBorderMap[tone]} ${toneBgMap[tone]} ${p}`,
    dashed: `${base} border-dashed ${toneBorderMap[tone]} ${toneBgMap[tone]} ${p}`,
  }

  return (
    <div className={`${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  )
}
