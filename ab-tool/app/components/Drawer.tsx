'use client'

/**
 * Drawer (brandguidelines v3 §6.6) — rechts einfahrendes Panel für Wizard und
 * Detail-Ansichten.
 *
 * Phase 1: `NewTestDrawer.tsx` war die Referenz, brachte aber `shadow-2xl`
 * mit (§12 verboten) und baute Backdrop, Esc und Fokus selbst. Die a11y-Arbeit
 * macht jetzt Radix über <DialogContent side="right">: Fokus-Trap, Esc,
 * Scroll-Lock und Fokus-Rückgabe an den Auslöser.
 *
 * Kopf und Fuß sind sticky, der Inhalt scrollt dazwischen — ein langer Wizard
 * soll den Primär-Button nicht aus dem Bild schieben.
 */

import type { ReactNode } from 'react'
import { X } from 'lucide-react'

import { Button } from './Button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from './ui/dialog'

interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Aktionen im sticky Fuß, rechtsbündig: Primär rechts außen (§6.5). */
  footer?: ReactNode
  className?: string
  children: ReactNode
}

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  footer,
  className,
  children,
}: DrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="right" className={className}>
        <header className="flex shrink-0 items-start justify-between gap-base border-b border-border px-6 py-4">
          <div className="flex flex-col gap-tight">
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close">
              <X className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </DialogClose>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-loose">{children}</div>

        {footer && (
          <footer className="flex shrink-0 items-center justify-end gap-snug border-t border-border px-6 py-4">
            {footer}
          </footer>
        )}
      </DialogContent>
    </Dialog>
  )
}
