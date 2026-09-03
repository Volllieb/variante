/**
 * StepChange — Step 2: die Änderungsliste entsteht rein manuell.
 *
 * Die Regression, die der Umbau schliesst: der KI-Pfad für Designvorschläge
 * ist raus. Weder beim Mount noch auf Klick darf /api/test-wizard/generate
 * feuern; bestehende `suggested`-Zeilen aus Alt-Drafts bleiben aber bedienbar.
 */

import { useState } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

describe('StepChange — kein KI-Vorschlagspfad', () => {
  it('bietet keine KI-Designvorschlaege an und ruft den Generate-Endpoint nie auf', () => {
    renderStep()
    expect(screen.queryByRole('button', { name: 'Suggest changes' })).not.toBeInTheDocument()
    expect(screen.queryByText(/AI suggestions/i)).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rendert bestehende suggested-Zeilen aus Alt-Drafts weiterhin annehmbar', () => {
    const withSuggested: VariantChangeSet = {
      mode: 'inherit',
      baseline: null,
      entries: [
        { id: 's-old', property: 'bgColor', before: '', after: '#00ff00', source: 'ai', status: 'suggested' },
      ],
    }
    const { onChanges } = renderStep(withSuggested)
    fireEvent.click(screen.getByRole('button', { name: /Accept .* suggestion/ }))
    const next = onChanges.mock.calls[0][0]
    expect(next.entries.find((e) => e.id === 's-old')).toMatchObject({ status: 'applied' })
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
