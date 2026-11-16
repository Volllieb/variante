'use client'

import { useEffect } from 'react'

/**
 * Lädt die Seite einmal neu, wenn ein Programm-Chunk nicht geladen werden konnte.
 *
 * Passiert, wenn jemand genau während eines Deployments lädt: Die Seite
 * verweist auf Chunks der neuen Version, die noch nicht überall ausgeliefert
 * werden (oder umgekehrt). Ein Neuladen holt eine konsistente Version.
 * Vorher sah der Nutzer „500 Something went wrong" (Live-Test 16.11.2026).
 *
 * Schutz gegen Endlosschleifen: höchstens ein Reload pro 30 Sekunden
 * (sessionStorage). Klappt der Reload nicht, bleibt die Fehlerseite stehen.
 */
const KEY = 'variante:chunk-reload-at'
const CHUNK_ERROR = /ChunkLoadError|Loading chunk [\w-]+ failed|Failed to load chunk|Importing a module script failed|error loading dynamically imported module/i

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false
  const e = error as { name?: string; message?: string }
  return CHUNK_ERROR.test(`${e.name ?? ''} ${e.message ?? ''}`)
}

/** true, wenn ein Reload ausgelöst wurde. */
export function reloadOnChunkError(error: unknown): boolean {
  if (typeof window === 'undefined' || !isChunkLoadError(error)) return false
  try {
    const last = Number(window.sessionStorage.getItem(KEY) ?? 0)
    if (Date.now() - last < 30_000) return false
    window.sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    // Ohne sessionStorage kein Schleifenschutz → lieber nicht automatisch neu laden
    return false
  }
  window.location.reload()
  return true
}

/** Für Error-Boundaries: bei Chunk-Fehlern einmal still neu laden. */
export function useChunkErrorReload(error: unknown): void {
  useEffect(() => {
    reloadOnChunkError(error)
  }, [error])
}
