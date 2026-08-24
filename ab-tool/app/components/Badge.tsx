'use client'

import type { ReactNode } from 'react'

type BadgeTone = 'ok' | 'pro' | 'err' | 'neutral'

interface BadgeProps {
  tone: BadgeTone
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
  children: ReactNode
}

const toneClasses: Record<BadgeTone, string> = {
  ok: 'bg-ok/10 text-ok',
  pro: 'bg-pro/10 text-pro',
  err: 'bg-err/10 text-err',
  neutral: 'bg-bg-2 text-text-2',
}

const dotClasses: Record<BadgeTone, string> = {
  ok: 'bg-ok',
  pro: 'bg-pro',
  err: 'bg-err',
  neutral: 'bg-text-3',
}

const sizeClasses: Record<string, string> = {
  sm: 'px-1.5 py-0.5 text-[9px]',
  md: 'px-2 py-0.5 text-[11px]',
}

export function Badge({ tone, size = 'md', dot = false, className = '', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses[size]} ${toneClasses[tone]} ${className}`}>
      {dot && <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotClasses[tone]}`} />}
      {children}
    </span>
  )
}
