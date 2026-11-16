/**
 * StepChange — „Suggest copy" (KI-Textvarianten, seit 16.11.2026).
 *
 * Die KI schreibt nur Text für Headline und Button. Geprüft wird der Weg
 * Klick → /api/test-wizard/copy → Karten → Übernahme als Text-Zeile, plus die
 * Fälle ohne Seite (kein Button) und Monatslimit (Upgrade statt Retry).
 */

import { useState } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StepChange } from '@/app/dashboard/components/new-test/StepChange'
import type { ElementSelection } from '@/app/dashboard/components/NewTestDrawer'
import type { VariantChangeSet } from '@/app/dashboard/components/new-test/types'

const BUTTON: ElementSelection = {
  selector: '.cta',
  originalHtml: '<a class="cta" href="#signup">Start free trial →</a>',
  originalCss: '',
  elementType: 'link',
  elementName: 'CTA',
}

const HEADLINE: ElementSelection = {
  selector: 'h1',
  originalHtml: '<h1>Sync your files without the chaos</h1>',
  originalCss: '',
  elementType: 'headline',
  elementName: 'Headline',
}

const EMPTY: VariantChangeSet = { mode: 'inherit', entries: [], baseline: null }

const SUGGESTIONS = {
  variants: [
    { text: 'Create free account →', lever: 'c_specific_step', why: 'Names the exact next step.' },
    { text: 'Free trial, no card →', lever: 'c_risk', why: 'Removes the payment worry.' },
    { text: 'Start my free trial →', lever: 'c_first_person', why: 'Makes the click personal.' },
  ],
  dropped: 0,
  language: 'English',
}

const fetchMock = vi.fn<typeof fetch>()

function renderStep(element: ElementSelection, pageUrl?: string) {
  const onChanges = vi.fn<(next: VariantChangeSet) => void>()
  function Host() {
    const [current, setCurrent] = useState(EMPTY)
    return (
      <StepChange
        element={element}
        changes={current}
        pageUrl={pageUrl}
        onChanges={(next) => { onChanges(next); setCurrent(next) }}
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
afterEach(() => vi.unstubAllGlobals())

describe('StepChange — Suggest copy', () => {
  it('zeigt ohne Seite keinen Vorschlags-Button und ruft nichts auf', () => {
    renderStep(BUTTON)
    expect(screen.queryByRole('button', { name: /Suggest/ })).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fragt erst auf Klick, mit Seite, Originaltext und Rolle', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(SUGGESTIONS), { status: 200 }))
    renderStep(BUTTON, 'https://example.com/')
    expect(fetchMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /Suggest button text/ }))
    await screen.findByText('Create free account →')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/test-wizard/copy')
    expect(JSON.parse(String(init?.body))).toEqual({
      url: 'https://example.com/', original: 'Start free trial →', kind: 'cta', selector: '.cta',
    })
    expect(screen.getByText('Removes risk')).toBeInTheDocument()
  })

  it('übernimmt eine Karte als KI-Textzeile mit Hebel — genau eine Textzeile', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(SUGGESTIONS), { status: 200 }))
    const { onChanges } = renderStep(BUTTON, 'https://example.com/')
    fireEvent.click(screen.getByRole('button', { name: /Suggest button text/ }))
    fireEvent.click(await screen.findByText('Free trial, no card →'))
    fireEvent.click(screen.getByText('Start my free trial →'))

    const last = onChanges.mock.calls.at(-1)![0]
    const texts = last.entries.filter((e) => e.property === 'text')
    expect(texts).toHaveLength(1)
    expect(texts[0]).toMatchObject({
      before: 'Start free trial →', after: 'Start my free trial →', source: 'ai', status: 'applied', lever: 'c_first_person',
    })
  })

  it('Headlines bekommen die Headline-Rolle', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(SUGGESTIONS), { status: 200 }))
    renderStep(HEADLINE, 'https://example.com/')
    fireEvent.click(screen.getByRole('button', { name: /Suggest headline/ }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).kind).toBe('headline')
  })

  it('Monatslimit: Upgrade-Link statt "Try again"', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      error: 'limit reached', message: "You've used all 20 AI suggestions for this month on the free plan.",
    }), { status: 429 }))
    renderStep(BUTTON, 'https://example.com/')
    fireEvent.click(screen.getByRole('button', { name: /Suggest button text/ }))
    expect(await screen.findByText(/used all 20 AI suggestions/)).toBeInTheDocument()
    expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument()
    expect(screen.queryByText('Try again')).not.toBeInTheDocument()
  })
})
