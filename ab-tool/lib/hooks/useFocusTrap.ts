'use client'

import { useEffect, useRef } from 'react'

// Focus-Management für modale Overlays (Plan A11Y-02).
//
// Der NewTestDrawer — der zentrale Erstellungs-Flow — hatte weder Focus-Trap
// noch Escape-Handling noch Focus-Restore noch Scroll-Lock. Ein Tastaturnutzer
// öffnete den Wizard und tabbte sofort wieder in den dahinterliegenden
// Dashboard-Content, ohne zu bemerken, dass der Fokus das Modal verlassen hat.
//
// Deckt WCAG 2.1.2 (No Keyboard Trap, korrekt umgesetzt), 2.4.3 (Focus Order)
// und 2.1.1 (Keyboard) ab.

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useFocusTrap<T extends HTMLElement>(
  isOpen: boolean,
  onClose: () => void
) {
  const containerRef = useRef<T | null>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!isOpen) return

    const container = containerRef.current
    const previouslyFocused = document.activeElement as HTMLElement | null

    // Hintergrund nicht mitscrollen lassen.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Ersten sinnvollen Fokus setzen. Ohne das bleibt der Fokus auf dem Button,
    // der das Modal geöffnet hat — also außerhalb.
    const focusFirst = () => {
      if (!container) return
      const first = container.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? container).focus()
    }
    const focusTimer = setTimeout(focusFirst, 0)

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !container) return

      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      )
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      } else if (!container.contains(document.activeElement)) {
        // Fokus ist z. B. per Klick nach außen gewandert — zurückholen.
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown, true)
      document.body.style.overflow = prevOverflow
      // Fokus dorthin zurück, wo der Nutzer war.
      previouslyFocused?.focus?.()
    }
  }, [isOpen])

  return containerRef
}
