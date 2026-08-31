/**
 * State-Maschine der Reload-Pille.
 *
 * Die eigentliche Anforderung ist zeitbasiert und damit im Browser schwer zu
 * provozieren: ein schneller Refresh darf nicht nur aufblitzen, und nach dem
 * Ende muss die „Updated"-Bestätigung stehen bleiben, bevor sie ausfadet.
 * Fake Timer machen genau diese Verläufe deterministisch prüfbar.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { RefreshIndicator } from '@/app/dashboard/components/RefreshIndicator'

afterEach(() => {
  vi.useRealTimers()
})

describe('RefreshIndicator: Phasen und Mindestsichtbarkeit', () => {
  it('zeigt nichts, solange kein Refresh läuft', () => {
    render(<RefreshIndicator active={false} />)
    expect(screen.queryByText(/Updating/)).toBeNull()
    expect(screen.queryByText('Updated')).toBeNull()
  })

  it('zeigt Updating… während der Refresh läuft', async () => {
    render(<RefreshIndicator active />)
    // 'updating' betritt den State über den 0-ms-Latch (set-state-in-effect) —
    // mit echten Timern deshalb asynchron warten statt synchron abfragen.
    expect(await screen.findByText(/Updating/)).toBeInTheDocument()
  })

  it('bleibt mindestens MIN_VISIBLE_MS sichtbar, wenn der Refresh schnell endet', () => {
    vi.useFakeTimers()
    const { rerender } = render(<RefreshIndicator active />)

    // Latch feuern lassen, dann endet der Refresh nach 100 ms — unter der
    // Mindestsichtbarkeit von 500 ms.
    act(() => { vi.advanceTimersByTime(100) })
    rerender(<RefreshIndicator active={false} />)

    // Nach 300 ms (400 ms gesamt) ist die Mindestzeit noch nicht um:
    // es steht weiterhin Updating…, nicht etwa schon Updated.
    act(() => { vi.advanceTimersByTime(300) })
    expect(screen.getByText(/Updating/)).toBeInTheDocument()
    expect(screen.queryByText('Updated')).toBeNull()

    // Bei 500 ms Gesamtlaufzeit greift die Bestätigung.
    act(() => { vi.advanceTimersByTime(100) })
    expect(screen.getByText('Updated')).toBeInTheDocument()
  })

  it('fadet nach der Updated-Bestätigung aus', () => {
    vi.useFakeTimers()
    const { rerender } = render(<RefreshIndicator active />)
    act(() => { vi.advanceTimersByTime(100) })
    rerender(<RefreshIndicator active={false} />)

    act(() => { vi.advanceTimersByTime(400) })
    expect(screen.getByText('Updated')).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(900) })
    expect(screen.queryByText('Updated')).toBeNull()
    expect(screen.queryByText(/Updating/)).toBeNull()
  })

  it('beginnt bei einem neuen Refresh wieder bei Updating…, auch mitten in der Bestätigung', () => {
    vi.useFakeTimers()
    const { rerender } = render(<RefreshIndicator active />)
    act(() => { vi.advanceTimersByTime(100) })
    rerender(<RefreshIndicator active={false} />)
    act(() => { vi.advanceTimersByTime(400) })
    expect(screen.getByText('Updated')).toBeInTheDocument()

    // Neuer Refresh während „Updated" steht — Latch feuern, dann prüfen.
    rerender(<RefreshIndicator active />)
    act(() => { vi.advanceTimersByTime(0) })
    expect(screen.getByText(/Updating/)).toBeInTheDocument()
    expect(screen.queryByText('Updated')).toBeNull()
  })

  it('heilt sich selbst, wenn active vor dem Latch abfällt', () => {
    vi.useFakeTimers()
    const { rerender } = render(<RefreshIndicator active />)
    // Pathologischer Fall: active fällt im selben Task wieder ab, bevor der
    // 0-ms-Latch feuert. Der Latch feuert trotzdem, und der phase-Dependency
    // lässt den Effect erneut durchlaufen — die Mindestsichtbarkeit gilt.
    rerender(<RefreshIndicator active={false} />)
    act(() => { vi.advanceTimersByTime(0) })
    expect(screen.getByText(/Updating/)).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(500) })
    expect(screen.getByText('Updated')).toBeInTheDocument()
  })
})
