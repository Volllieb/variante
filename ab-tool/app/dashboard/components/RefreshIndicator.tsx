'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Check } from 'lucide-react'

/**
 * Sichtbare Reload-Rückmeldung — eine Lösung für alle Dashboard-Seiten.
 *
 * Vorher tauschten sich die Daten stillschweigend aus: `router.refresh()`
 * nach AI-Streaming oder Domain-Verifikation lief ohne jede Rückmeldung, und
 * auf der Results-Seite drehte sich nur ein kleines Icon im Kopf. Dieselbe
 * Pille erscheint jetzt überall unten links, egal ob der Refresh vom Router
 * (Overview, Tests-Liste) oder von einem Client-Fetch (Results, Realtime)
 * kommt — die Quelle liefert nur den Boolean.
 *
 * Bewusst fixed statt inline: eine Einblendung im Fluss würde den Inhalt
 * verschieben, genau in dem Moment, in dem der Nutzer Zahlen liest.
 * `prefers-reduced-motion` ist global geregelt (globals.css): Transitionen
 * werden dort sofort, das Spinner-Rad dreht nicht — die Pille bleibt als
 * Textsignal erhalten.
 */

/** Mindestsichtbarkeit, damit schnelle Refreshes nicht nur aufblitzen. */
const MIN_VISIBLE_MS = 500
/** Wie lange die „Updated"-Bestätigung steht, bevor sie ausfadet. */
const DONE_VISIBLE_MS = 900

export function RefreshIndicator({ active }: { active: boolean }) {
  // „Updating…" wird aus `active` ABGELEITET, nicht gespeichert — sonst müsste
  // der Effect synchron setState rufen (react-hooks/set-state-in-effect).
  // Gespeichert wird nur die Bestätigungsphase nach dem Ende des Refreshes;
  // das passiert ausschließlich asynchron in Timer-Callbacks.
  const [storedPhase, setStoredPhase] = useState<'idle' | 'done'>('idle')
  const shownAt = useRef(0)
  const minTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (active) {
      // Neuer Refresh: sofort sichtbar (abgeleitet). Ein laufender min-/done-
      // Timer wird abgebrochen — der neue Refresh beginnt wieder bei
      // „Updating…", die Bestätigung wird erst nach dessen Ende gezeigt.
      shownAt.current = Date.now()
      if (minTimer.current) clearTimeout(minTimer.current)
      if (doneTimer.current) clearTimeout(doneTimer.current)
      return
    }
    // active fiel auf false: erst die Mindestsichtbarkeit abwarten, dann
    // kurz „Updated" bestätigen und ausfaden. shownAt === 0 heißt: es wurde
    // nie etwas angezeigt, dann gibt es auch nichts zu bestätigen.
    if (shownAt.current === 0) return
    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt.current))
    minTimer.current = setTimeout(() => {
      minTimer.current = null
      shownAt.current = 0
      setStoredPhase('done')
      doneTimer.current = setTimeout(() => {
        doneTimer.current = null
        setStoredPhase('idle')
      }, DONE_VISIBLE_MS)
    }, wait)
  }, [active])

  // Timer aufräumen, falls die Seite mitten in einer Phase verlassen wird.
  useEffect(() => () => {
    if (minTimer.current) clearTimeout(minTimer.current)
    if (doneTimer.current) clearTimeout(doneTimer.current)
  }, [])

  const phase: 'idle' | 'updating' | 'done' = active ? 'updating' : storedPhase
  const visible = phase !== 'idle'

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed bottom-4 left-4 z-[9998] md:left-[236px] flex items-center gap-1.5 rounded-full border border-border bg-bg-2 px-3 py-1.5 text-[11px] text-text-2 shadow-lg transition-opacity ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      {phase === 'updating' && (
        <>
          <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
          Updating…
        </>
      )}
      {phase === 'done' && (
        <>
          <Check className="h-3 w-3 text-ok" aria-hidden="true" />
          Updated
        </>
      )}
    </div>
  )
}

/**
 * `router.refresh()` mit Sichtbarkeit: der Refresh läuft in einer Transition,
 * `isPending` bleibt true, bis der Server-Payload angewendet ist — genau die
 * Zeitspanne, in der der RefreshIndicator „Updating…" zeigen soll.
 * Dokumentiertes Next-Pattern für Ladezustände um router.refresh().
 */
export function useRefreshTransition() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const refresh = useCallback(
    () => startTransition(() => { router.refresh() }),
    [router, startTransition]
  )
  return { refresh, isPending }
}
