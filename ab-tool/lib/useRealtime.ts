'use client'

import { useEffect, useRef } from 'react'
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
 */
export function useTestsInsert(userId: string | null, onInsert: (name: string) => void) {
  const onInsertRef = useLatest(onInsert)

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
        if (status === 'CHANNEL_ERROR') {
          console.warn('[realtime] tests insert channel error')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, onInsertRef])
}

/**
 * Hook: Reagiert auf UPDATEs eines einzelnen Tests.
 * Ersetzt Polling in ResultsClient.
 */
export function useTestUpdate(testId: string, onUpdate: () => void) {
  const onUpdateRef = useLatest(onUpdate)

  useEffect(() => {
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
        if (status === 'CHANNEL_ERROR') {
          console.warn('[realtime] test update channel error for', testId)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [testId, onUpdateRef])
}
