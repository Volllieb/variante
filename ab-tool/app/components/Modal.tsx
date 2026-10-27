'use client'

/**
 * Modal und ConfirmDialog (brandguidelines v3 §6.6).
 *
 * Phase 1: beides fehlte, Bestätigungen liefen über `window.confirm` oder
 * inline aufgeklappte Karten. Modal ist absichtlich knapp gehalten — nach
 * §6.6 trägt es genau eine Frage, und nach §7 nie ein Upsell.
 */

import type { ReactNode } from 'react'

import { Button } from './Button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from './ui/dialog'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Aktionen rechtsbündig; ohne sie zeigt das Modal nur einen Close-Button. */
  footer?: ReactNode
  children?: ReactNode
}

export function Modal({ open, onOpenChange, title, description, footer, children }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="center" className="gap-base">
        <div className="flex flex-col gap-tight">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </div>
        {children}
        <div className="flex items-center justify-end gap-snug">
          {footer ?? (
            <DialogClose asChild>
              <Button variant="secondary">Close</Button>
            </DialogClose>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel: string
  cancelLabel?: string
  /** `danger` für Löschen/Abbrechen von Tests, sonst Primär. */
  tone?: 'primary' | 'danger'
  loading?: boolean
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'primary',
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <DialogClose asChild>
            <Button variant="ghost" disabled={loading}>
              {cancelLabel}
            </Button>
          </DialogClose>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  )
}
