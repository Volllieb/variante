'use client'

import type { ReactNode, ButtonHTMLAttributes } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  href?: string
  children: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-fill-invert text-text-on-invert font-semibold hover:opacity-90',
  secondary: 'border border-border text-text-2 font-medium hover:border-border-strong hover:text-text',
  danger: 'bg-err-bg text-err font-semibold hover:bg-err/15',
  ghost: 'text-text-3 font-medium hover:text-text hover:bg-bg-2',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-[11px] gap-1.5',
  md: 'px-4 py-2 text-[12px] gap-1.5',
  lg: 'px-6 py-3 text-[14px] gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  href,
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const cls = `inline-flex items-center justify-center rounded-[var(--radius-md)] transition-colors active:scale-[0.98] disabled:pointer-events-none cursor-pointer ${variantClasses[variant]} ${sizeClasses[size]} ${className}`

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    )
  }

  return (
    <button
      disabled={disabled || loading}
      className={`${cls} ${(disabled || loading) ? 'opacity-40' : ''}`}
      {...rest}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  )
}
