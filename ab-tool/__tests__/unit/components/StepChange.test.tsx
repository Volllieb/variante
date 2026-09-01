/**
 * StepChange — der neue Step 2: Manual-first, KI als Vorschlagsquelle.
 *
 * Die beiden entscheidenden Regressionen, die der Umbau schliesst:
 * 1. KEIN Auto-Trigger der KI beim Betreten (vorher feuerte /api/test-wizard/
 *    generate sofort beim Mount).
 * 2. Ein Fehler-/429-Banner der KI lässt die manuelle Liste bedienbar —
 *    die KI ist Zusatz, nicht Blockade.
 */

import { useState } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StepChange } from '@/app/dashboard/components/new-test/StepChange'
import type { ElementSelection } from '@/app/dashboard/components/NewTestDrawer'
import type { VariantChangeSet } from '@/app/dashboard/components/new-test/types'

const ELEMENT: ElementSelection = {
  selector: '.cta',
  originalHtml: '<button class="cta">Old text</button>',
  originalCss: '.cta { background-color: rgb(37, 99, 235); }',
  elementType: 'button',
  elementName: 'CTA',
  styleContext: {
    css: '.cta { background-color: rgb(37, 99, 235); }',
    computed: {
      'background-color': 'rgb(37, 99, 235)',
      color: 'rgb(255, 255, 255)',
      'font-size': '16px',
      'font-weight': '600',
      'border-radius': '8px',
      padding: '12px 24px',
    },
  },
}

const EMPTY_CHANGES: VariantChangeSet = { mode: 'inherit', entries: [], baseline: null }

const fetchMock = vi.fn<typeof fetch>()

/** Stateful-Harness: onChanges aktualisiert das Change-Set wie der Drawer. */
function renderStep(changes: VariantChangeSet = EMPTY_CHANGES) {
  const onChanges = vi.fn<(next: VariantChangeSet) => void>()
  function Host() {
    const [current, setCurrent] = useState(changes)
    return (
      <StepChange
        element={ELEMENT}
        changes={current}
        onChanges={(next) => {
          onChanges(next)
          setCurrent(next)
        }}
      />
    )
  }
  render(<Host />)
  return { onChanges }
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('StepChange — Manual-first', () => {
  it('triggert KEINE KI-Generierung beim Mount', () => {
    renderStep()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText(/Variant B is your original plus the changes below/)).toBeInTheDocument()
    expect(screen.getByText(/No changes yet/)).toBeInTheDocument()
  })

  it('fügt eine manuelle Zeile über das Add-Menü hinzu und öffnet sie inline', () => {
    const { onChanges } = renderStep()
    fireEvent.click(screen.getByRole('button', { name: 'Add change' }))
    fireEvent.click(screen.getByRole('button', { name: 'Text' }))
    // Neue Zeile ist direkt im Edit-Modus — Input trägt den Originaltext.
    expect(screen.getByPlaceholderText('Text')).toHaveValue('Old text')
    // Und landet als applied-manual-Zeile im Change-Set.
    expect(onChanges).toHaveBeenCalled()
    const next = onChanges.mock.calls[0][0]
    expect(next.entries).toHaveLength(1)
    expect(next.entries[0]).toMatchObject({ property: 'text', source: 'manual', status: 'applied' })
  })

  it('Padding erzeugt zwei Zeilen (horizontal + vertikal)', () => {
    const { onChanges } = renderStep()
    fireEvent.click(screen.getByRole('button', { name: 'Add change' }))
    fireEvent.click(screen.getByRole('button', { name: 'Padding' }))
    const next = onChanges.mock.calls[0][0]
    const props = next.entries.map((e) => e.property).sort()
    expect(props).toEqual(['paddingX', 'paddingY'])
  })
})

describe('StepChange — Suggest changes', () => {
  it('ruft den Endpoint erst auf Klick und übernimmt die Antwort als suggested-Zeilen', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        variant: 'Start now',
        variant_html: '<button class="cta">Start now</button>',
        variant_css: '.cta { background-color: rgb(255, 0, 0); letter-spacing: 0.5px; }',
        explanation: 'Dringlichkeit statt Generik.',
      }),
    } as Response)

    const { onChanges } = renderStep()
    expect(fetchMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Suggest changes' }))
    await waitFor(() => expect(onChanges).toHaveBeenCalled())

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(String((init as RequestInit).body))
    expect(body.element).toBe('CTA')
    expect(body.pageContext).toBe(ELEMENT.styleContext?.css)

    const next = onChanges.mock.calls[0][0]
    const suggested = next.entries.filter((e) => e.status === 'suggested')
    expect(suggested.some((e) => e.property === 'text' && e.after === 'Start now')).toBe(true)
    expect(suggested.some((e) => e.property === 'bgColor')).toBe(true)
    // letter-spacing ist nicht abbildbar → eine other-Zeile.
    expect(suggested.some((e) => e.property === 'other' && e.rawCss?.includes('letter-spacing'))).toBe(true)
    // Explanation hängt an der Text-Zeile.
    const text = suggested.find((e) => e.property === 'text')
    expect(text?.explanation).toBe('Dringlichkeit statt Generik.')
  })

  it('zeigt bei 429 ein Banner und lässt die Liste bedienbar', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ message: 'Max 10 variant generations per minute.' }),
    } as Response)

    const { onChanges } = renderStep()
    fireEvent.click(screen.getByRole('button', { name: 'Suggest changes' }))
    await waitFor(() => expect(screen.getByText(/AI suggestions failed/)).toBeInTheDocument())
    expect(screen.getByText('Max 10 variant generations per minute.')).toBeInTheDocument()

    // Die Liste bleibt bedienbar: manuelle Zeile geht trotz Fehler-Banner.
    fireEvent.click(screen.getByRole('button', { name: 'Add change' }))
    fireEvent.click(screen.getByRole('button', { name: 'Background' }))
    expect(onChanges).toHaveBeenCalled()
    expect(onChanges.mock.calls[0][0].entries[0]).toMatchObject({ property: 'bgColor', status: 'applied' })
  })

  it('Regenerate ersetzt nur suggested-Zeilen — manuelle bleiben', async () => {
    const withManual: VariantChangeSet = {
      mode: 'inherit',
      baseline: null,
      entries: [
        { id: 'm1', property: 'text', before: 'Old text', after: 'Handwritten', source: 'manual', status: 'applied' },
        { id: 's-old', property: 'bgColor', before: '', after: '#00ff00', source: 'ai', status: 'suggested' },
      ],
    }
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        variant: 'New',
        variant_html: '<button class="cta">New</button>',
        variant_css: '.cta { background-color: rgb(0, 0, 255); }',
        explanation: '',
      }),
    } as Response)

    const { onChanges } = renderStep(withManual)
    fireEvent.click(screen.getByRole('button', { name: 'Suggest changes' }))
    await waitFor(() => expect(onChanges).toHaveBeenCalled())

    const next = onChanges.mock.calls[0][0]
    expect(next.entries.find((e) => e.id === 'm1')).toBeDefined()
    expect(next.entries.some((e) => e.id === 's-old')).toBe(false)
    expect(next.entries.filter((e) => e.status === 'suggested').length).toBeGreaterThan(0)
  })
})

describe('StepChange — Advanced / Scratch', () => {
  it('zeigt die Warnung und den Scratch-Editor erst nach dem Aufklappen', () => {
    renderStep()
    expect(screen.queryByText(/gets its own markup/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Advanced: start from scratch/ }))
    expect(screen.getByText(/gets its own markup/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open scratch editor' }))
    // Unveränderter ButtonEditor, aber ohne Mode-Umschalter.
    expect(screen.getByPlaceholderText('Button text')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Inherit from A' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'From scratch' })).not.toBeInTheDocument()
  })

  it('Apply im Scratch-Editor ersetzt das Change-Set (B replaces A completely)', () => {
    const { onChanges } = renderStep()
    fireEvent.click(screen.getByRole('button', { name: /Advanced: start from scratch/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Open scratch editor' }))
    fireEvent.change(screen.getByPlaceholderText('Button text'), { target: { value: 'Rebuilt' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    const next = onChanges.mock.calls[0][0]
    expect(next.mode).toBe('scratch')
    expect(next.entries.some((e) => e.status === 'applied')).toBe(true)
    expect(screen.getByText('B replaces A completely')).toBeInTheDocument()
    // Im Scratch-Zustand gibt es keine Delta-Aktionen — kein gemischtes Modell.
    expect(screen.queryByRole('button', { name: 'Add change' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Suggest changes' })).not.toBeInTheDocument()
  })

  it('"Back to change list" verwirft Scratch und kehrt zur leeren Liste zurück', () => {
    const { onChanges } = renderStep({ mode: 'scratch', entries: [], baseline: null })
    fireEvent.click(screen.getByRole('button', { name: 'Back to change list' }))
    const next = onChanges.mock.calls[0][0]
    expect(next.mode).toBe('inherit')
    expect(next.entries).toHaveLength(0)
    expect(screen.getByText(/No changes yet/)).toBeInTheDocument()
  })
})
