/** Chunk-Ladefehler → einmal neu laden, nie in Schleife (lib/chunkReload.ts). */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isChunkLoadError, reloadOnChunkError } from '@/lib/chunkReload'

const reload = vi.fn()

beforeEach(() => {
  reload.mockReset()
  window.sessionStorage.clear()
  Object.defineProperty(window, 'location', { value: { ...window.location, reload }, writable: true })
})

describe('chunkReload', () => {
  it('erkennt Chunk-Fehler, nicht aber normale Fehler', () => {
    expect(isChunkLoadError(Object.assign(new Error('Failed to load chunk /_next/static/chunks/x.js'), { name: 'ChunkLoadError' }))).toBe(true)
    expect(isChunkLoadError(new Error('Cannot read properties of null'))).toBe(false)
  })

  it('lädt einmal neu und dann 30 s lang nicht wieder', () => {
    const err = Object.assign(new Error('Loading chunk 123 failed'), { name: 'ChunkLoadError' })
    expect(reloadOnChunkError(err)).toBe(true)
    expect(reloadOnChunkError(err)).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('lädt bei normalen Fehlern nicht neu', () => {
    expect(reloadOnChunkError(new Error('boom'))).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })
})
