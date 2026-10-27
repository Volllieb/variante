'use client'

/**
 * Dialog-Basis (brandguidelines v3 §6.6) für <Modal> und <Drawer>.
 *
 * Radix bringt Fokus-Trap, `Esc`, `role="dialog" aria-modal`, Scroll-Lock und
 * die Fokus-Rückgabe an den Auslöser mit — in `NewTestDrawer.tsx` war davon
 * nur ein Teil handgebaut. Die shadcn-Fassung kam mit `bg-background`,
 * `shadow-lg` und einem eingebauten Close-Button; Tokens existieren hier
 * nicht, `shadow-*` ist nach §12 verboten, und der Close-Button gehört in die
 * Wrapper (<Modal>/<Drawer>), damit er unser <Button size="icon"> ist.
 *
 * `side` trennt die beiden Erscheinungsformen:
 *   center → Modal: max-w-md, bg-bg-1, rounded-lg, p-6
 *   right  → Drawer: < sm voll, ≥ sm 50vw, bg-bg-0, border-l
 */

import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn('fixed inset-0 z-50 bg-black/60', className)}
      {...props}
    />
  )
}

const dialogContentVariants = cva('fixed z-50 flex flex-col focus:outline-none', {
  variants: {
    side: {
      center:
        'left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-bg-1 p-6 animate-fade-in',
      right:
        'inset-y-0 right-0 w-full border-l border-border bg-bg-0 sm:w-[50vw] animate-slide-in-right',
    },
  },
  defaultVariants: { side: 'center' },
})

function DialogContent({
  className,
  side,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> &
  VariantProps<typeof dialogContentVariants>) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(dialogContentVariants({ side }), className)}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-title font-semibold text-text', className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-small text-text-2', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  dialogContentVariants,
}
