'use client'

/**
 * Tabs (brandguidelines v3 §6.7) — Text-Tabs mit 2px-Unterstrich.
 *
 * Basis ist Radix (`radix-ui`), damit Rollen, `aria-selected` und die
 * Pfeiltasten-Navigation nicht selbst gebaut werden müssen. Die von
 * `shadcn add tabs` generierte Fassung kam mit ihren eigenen Tokens
 * (`bg-muted`, `text-foreground`, `shadow-sm`) — die existieren hier nicht
 * und `shadow-*` ist nach §12 verboten. Struktur (Subkomponenten +
 * `data-slot`) bleibt wie bei shadcn, damit spätere `shadcn add`-Läufe
 * weiter passen; nur die Klassen sind auf unsere Tokens gezogen.
 */

import * as React from 'react'
import { Tabs as TabsPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-loose', className)}
      {...props}
    />
  )
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn('flex items-center gap-loose border-b border-border', className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'relative -mb-px cursor-pointer border-b-2 border-transparent pb-2 text-body text-text-2',
        'transition-colors hover:text-text',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0',
        'disabled:pointer-events-none disabled:opacity-40',
        'data-[state=active]:border-text data-[state=active]:font-medium data-[state=active]:text-text',
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
