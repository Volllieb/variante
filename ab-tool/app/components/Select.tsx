'use client'

/**
 * Select (brandguidelines v3 §6.5).
 *
 * Bewusst das native <select>, kein Radix-Listbox: ein Select im Formular hat
 * hier nie mehr als eine Handvoll Optionen, und native Selects bringen auf
 * Mobil das Systemrad mit. Für Menüs mit Icons, Gruppen oder Check-Zuständen
 * ist <DropdownMenu> (§6.8) zuständig, nicht dieses Feld.
 *
 * `appearance-none` + eigenes Chevron, weil der Systempfeil unter dark-only
 * auf manchen Plattformen schwarz auf schwarz steht.
 */

import type { SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { controlClasses } from './Input'
import { useFieldControl } from './Field'

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const field = useFieldControl()

  return (
    <div className="relative">
      <select
        id={props.id ?? field?.controlId}
        aria-describedby={props['aria-describedby'] ?? field?.describedById}
        aria-invalid={props['aria-invalid'] ?? field?.invalid}
        className={cn(controlClasses, 'h-9 cursor-pointer appearance-none pr-9', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3"
        aria-hidden
      />
    </div>
  )
}
