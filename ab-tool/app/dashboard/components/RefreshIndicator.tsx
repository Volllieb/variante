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
  // Drei Phasen als echter State, damit die Mindestsichtbarkeit wirklich
  // greift: „Updating…" bleibt stehen, bis MIN_VISIBLE_MS um ist — nicht nur
  // bis active auf false fällt (dann wären schnelle Refreshes ein Blitz von
  // wenigen Millisekunden).
  const [phase, setPhase] = useState<'idle' | 'updating' | 'done'>('idle')
  const prevActive = useRef(false)
  const shownAt = useRef(0)
  const latchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const minTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (active) {
      // Nur die ECHTE Aktivierungskante darf Zeitbasis und Timer anfassen.
      // Der Effect läuft wegen des phase-Dependencies auch nach dem Latch
      // erneut (active unverändert true) — ohne diese Kante setzte dieser
      // Durchlauf shownAt zurück, und die Mindestsichtbarkeit würde ab Latch
      // statt ab Aktivierung messen.
      if (!prevActive.current) {
        shownAt.current = Date.now()
        if (latchTimer.current) clearTimeout(latchTimer.current)
        if (minTimer.current) clearTimeout(minTimer.current)
        if (doneTimer.current) clearTimeout(doneTimer.current)
        // 'updating' betritt den State asynchron: react-hooks/set-state-in-effect
        // verbietet setState direkt im Effect-Body (vgl. ResultsClient, wo `now`
        // aus demselben Grund in .finally() gesetzt wird). Ein 0-ms-Timer feuert
        // vor jedem echten active→false-Render — jede Refresh-Quelle endet erst
        // in einem späteren Task — und ist unter Fake-Timern deterministisch.
        latchTimer.current = setTimeout(() => {
          latchTimer.current = null
          setPhase('updating')
        }, 0)
      }
    } else if (phase === 'updating') {
      // active fiel auf false: erst die Mindestsichtbarkeit abwarten, dann
      // kurz „Updated" bestätigen und ausfaden. Nur aus der Updating-Phase
      // heraus gibt es etwas zu bestätigen. (Fiel active vor dem Latch ab,
      // feuert der Latch trotzdem, und der Effect läuft durch den
      // phase-Dependency erneut hier durch.)
      const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt.current))
      minTimer.current = setTimeout(() => {
        minTimer.current = null
        setPhase('done')
        doneTimer.current = setTimeout(() => {
          doneTimer.current = null
          setPhase('idle')
        }, DONE_VISIBLE_MS)
      }, wait)
    }
    prevActive.current = active
  }, [active, phase])

  // Timer aufräumen, falls die Seite mitten in einer Phase verlassen wird.
  useEffect(() => () => {
    if (latchTimer.current) clearTimeout(latchTimer.current)
    if (minTimer.current) clearTimeout(minTimer.current)
    if (doneTimer.current) clearTimeout(doneTimer.current)
  }, [])

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
    // router.refresh() liefert void (kein Promise): ein .catch wäre toter Code
    // und scheitert am Typecheck. Fehler schluckt Next.js intern; die alten
    // Inline-Callsites hatten dasselbe Verhalten.
    () => startTransition(() => { router.refresh() }),
    [router, startTransition]
  )
  return { refresh, isPending }
}
