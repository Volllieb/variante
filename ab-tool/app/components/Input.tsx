'use client'

/**
 * Input (brandguidelines v3 §6.5) — 36px hoch, `text-body`.
 *
 * Löst 35 rohe <input> im Dashboard ab, die sich in Höhe, Radius und
 * Focus-Ring unterschieden. IDs und aria-Attribute kommen aus <Field>,
 * lassen sich per Prop aber überschreiben.
 */

import type { InputHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'
import { useFieldControl } from './Field'

export const controlClasses = cn(
  'w-full rounded-md border border-border bg-bg-1 px-3 text-body text-text placeholder:text-text-3',
  'transition-colors hover:border-border-strong',
  'focus-visible:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0',
  'disabled:cursor-not-allowed disabled:opacity-40',
  'aria-[invalid=true]:border-err',
)

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const field = useFieldControl()

  return (
    <input
      id={props.id ?? field?.controlId}
      aria-describedby={props['aria-describedby'] ?? field?.describedById}
      aria-invalid={props['aria-invalid'] ?? field?.invalid}
      className={cn(controlClasses, 'h-9', className)}
      {...props}
    />
  )
}
