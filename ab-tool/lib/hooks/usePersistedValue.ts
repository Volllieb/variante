'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'

/**
 * Ein localStorage-Wert, der die Hydration überlebt.
 *
 * ponytail: Vorher lasen Scope- und Zeitraum-Selektor localStorage direkt im
 * `useState`-Initializer. Auf dem Server gibt es kein localStorage — steht dort
 * ein anderer Wert als der Default, rendert der Server "last 30 days" und die
 * Hydration im Browser "last 7 days". React wirft dann einen Hydration-Fehler,
 * verwirft das komplette Server-HTML und rendert den Teilbaum neu: ein Fehler
 * in der Konsole des Kunden und ein sichtbarer Neuaufbau der Seite.
 *
 * useSyncExternalStore ist genau dafür da: die Hydration nutzt den
 * Server-Snapshot (null), unmittelbar danach rendert React mit dem echten
 * Wert nach. Der abgeleitete Wert entsteht weiterhin im Render — kein Effect,
 * kein zweiter Zustand, der auseinanderlaufen kann.
 */

const listeners = new Map<string, Set<() => void>>()

function subscriberFor(key: string) {
  return (onChange: () => void) => {
    let set = listeners.get(key)
    if (!set) {
      set = new Set()
      listeners.set(key, set)
    }
    set.add(onChange)
    return () => {
      set?.delete(onChange)
      if (set?.size === 0) listeners.delete(key)
    }
  }
}

function readKey(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    // Private Mode / blockierte Site-Daten: der Default ist die richtige Antwort.
    return null
  }
}

export function usePersistedValue(key: string): [string | null, (value: string) => void] {
  const subscribe = useMemo(() => subscriberFor(key), [key])
  const value = useSyncExternalStore(
    subscribe,
    () => readKey(key),
    () => null
  )

  const setValue = useCallback((next: string) => {
    try {
      localStorage.setItem(key, next)
    } catch { /* noop */ }
    listeners.get(key)?.forEach((l) => l())
  }, [key])

  return [value, setValue]
}
