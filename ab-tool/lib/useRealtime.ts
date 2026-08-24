'use client'

import { useEffect, useRef, useCallback } from 'react'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'

// ponytail: Die Callback-Refs wurden vorher WÄHREND des Renders geschrieben
// (`onInsertRef.current = onInsert`). Das ist ein Seiteneffekt im Render-Pfad —
// unter React 19 Concurrent Rendering kann derselbe Render mehrfach laufen oder
// verworfen werden, und der Ref hält dann einen Callback aus einem Render, der
// nie committed wurde. Der dokumentierte Weg ist ein Effect ohne Dependency-Array:
// er läuft nach JEDEM committeten Render und hält den Ref zuverlässig aktuell.
// Zweck bleibt derselbe: die Subscription soll nicht bei jeder neuen
// Callback-Identität neu aufgebaut werden.
function useLatest<T>(value: T) {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  })
  return ref
}

/**
 * Hook: Reagiert auf neue Test-INSERTs für den aktuellen User.
 * Ersetzt Polling in NewTestFlow.
 *
 * @param userId — Supabase user ID (null = nicht eingeloggt, kein Subscribe)
 * @param onInsert — Callback bei neuem Test
 * @param opts.onError — optionaler Callback bei Channel-Fehlern
 */
export function useTestsInsert(
  userId: string | null,
  onInsert: (name: string) => void,
  opts?: { onError?: (status: string) => void }
) {
  const onInsertRef = useLatest(onInsert)
  const onErrorRef = useLatest(opts?.onError)

  useEffect(() => {
    if (!userId) return

    const supabase = getBrowserSupabase()
    const channel = supabase
      .channel(`tests-insert-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tests', filter: `user_id=eq.${userId}` },
        (payload) => {
          onInsertRef.current(
            (payload.new as { name?: string } | null)?.name ?? 'New test'
          )
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
          console.warn('[realtime] tests insert channel error:', status)
          onErrorRef.current?.(status)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, onInsertRef, onErrorRef])
}

/**
 * Hook: Reagiert auf UPDATEs eines einzelnen Tests.
 * Ersetzt Polling in ResultsClient.
 *
 * @param testId — Test-ID zum Überwachen
 * @param onUpdate — Callback bei Test-Update
 * @param opts.onError — optionaler Callback bei Channel-Fehlern
 * @param opts.pollFallbackMs — wenn gesetzt, startet ein Polling-Intervall bei Disconnect (z.B. 15000)
 */
export function useTestUpdate(
  testId: string,
  onUpdate: () => void,
  opts?: { onError?: (status: string) => void; pollFallbackMs?: number }
) {
  const onUpdateRef = useLatest(onUpdate)
  const onErrorRef = useLatest(opts?.onError)
  const fallbackRef = useLatest(opts?.pollFallbackMs)
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Polling-Fallback: wird nur aktiviert, wenn der Channel disconnected und pollFallbackMs gesetzt ist
  const clearFallback = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearInterval(fallbackTimerRef.current)
      fallbackTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    clearFallback()
    const supabase = getBrowserSupabase()
    const channel = supabase
      .channel(`test-update-${testId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tests', filter: `id=eq.${testId}` },
        () => {
          onUpdateRef.current()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearFallback() // WebSocket aktiv → Polling stoppen
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
          console.warn('[realtime] test update channel error for', testId, ':', status)
          onErrorRef.current?.(status)
          // Polling-Fallback starten, wenn konfiguriert
          if (fallbackRef.current && !fallbackTimerRef.current) {
            fallbackTimerRef.current = setInterval(() => {
              onUpdateRef.current()
            }, fallbackRef.current)
          }
        }
      })

    return () => {
      supabase.removeChannel(channel)
      clearFallback()
    }
  }, [testId, onUpdateRef, onErrorRef, fallbackRef, clearFallback])
}
