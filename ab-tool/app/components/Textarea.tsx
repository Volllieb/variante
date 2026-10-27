'use client'

/**
 * Textarea (brandguidelines v3 §6.5).
 *
 * Gleiche Fläche wie <Input>, aber mit `py-2` und Mindesthöhe statt fester
 * 36px — sonst schneidet die erste Zeile oben an.
 */

import type { TextareaHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'
import { controlClasses } from './Input'
import { useFieldControl } from './Field'

export function Textarea({ className, rows = 3, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const field = useFieldControl()

  return (
    <textarea
      id={props.id ?? field?.controlId}
      aria-describedby={props['aria-describedby'] ?? field?.describedById}
      aria-invalid={props['aria-invalid'] ?? field?.invalid}
      rows={rows}
      className={cn(controlClasses, 'min-h-9 resize-y py-2 leading-relaxed', className)}
      {...props}
    />
  )
}
