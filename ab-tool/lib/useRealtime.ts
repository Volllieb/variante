'use client'

import { useEffect, useRef } from 'react'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Hook: Reagiert auf neue Test-INSERTs für den aktuellen User.
 * Ersetzt Polling in NewTestFlow.
 */
export function useTestsInsert(userId: string | null, onInsert: (name: string) => void) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const onInsertRef = useRef(onInsert)
  onInsertRef.current = onInsert

  useEffect(() => {
    if (!userId) return

    const supabase = getBrowserSupabase()
    const channel = supabase
      .channel(`tests-insert-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tests', filter: `user_id=eq.${userId}` },
        (payload) => {
          onInsertRef.current(payload.new?.name ?? 'New test')
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[realtime] tests insert channel error, falling back to polling not implemented')
        }
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])
}

/**
 * Hook: Reagiert auf UPDATEs eines einzelnen Tests.
 * Ersetzt Polling in ResultsClient.
 */
export function useTestUpdate(testId: string, onUpdate: () => void) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

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

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [testId])
}
