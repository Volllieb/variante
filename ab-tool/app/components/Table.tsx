'use client'

/**
 * Tabelle (brandguidelines v3 §6.9).
 *
 * Phase 1: Vorbild war die Rohdaten-Tabelle in `ResultsClient.tsx`, die als
 * einzige die Regeln einhielt. Die Subkomponenten tragen nur die Klassen —
 * `<thead>`/`<tbody>` bleiben echte Tabellen-Elemente, damit Screenreader
 * Spalten und Zeilen behalten.
 *
 * `numeric` setzt rechtsbündig; `tabular-nums` kommt global aus
 * `app/dashboard/layout.tsx`. `mono` ist für IDs und URLs (§3).
 */

import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

/** Scroll-Container: Tabellen scrollen in ihrer Card, nicht die Seite (§5.2). */
export function TableWrap({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('overflow-x-auto', className)} {...props} />
}

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return <table className={cn('w-full text-small', className)} {...props} />
}

export function TableHead({ className, ...props }: ComponentProps<'thead'>) {
  return <thead className={cn('border-b border-border', className)} {...props} />
}

export function TableBody(props: ComponentProps<'tbody'>) {
  return <tbody {...props} />
}

interface TableRowProps extends ComponentProps<'tr'> {
  interactive?: boolean
}

export function TableRow({ className, interactive = false, ...props }: TableRowProps) {
  return (
    <tr
      className={cn(
        'border-b border-border last:border-0',
        interactive && 'cursor-pointer transition-colors hover:bg-bg-2',
        className,
      )}
      {...props}
    />
  )
}

interface TableCellProps extends ComponentProps<'td'> {
  numeric?: boolean
  mono?: boolean
}

export function TableHeaderCell({ className, numeric = false, ...props }: ComponentProps<'th'> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        'pb-2 pr-base text-left text-meta font-medium text-text-3 last:pr-0',
        numeric && 'text-right',
        className,
      )}
      {...props}
    />
  )
}

export function TableCell({ className, numeric = false, mono = false, ...props }: TableCellProps) {
  return (
    <td
      className={cn('py-2 pr-base text-text-2 last:pr-0', numeric && 'text-right', mono && 'font-mono', className)}
      {...props}
    />
  )
}
