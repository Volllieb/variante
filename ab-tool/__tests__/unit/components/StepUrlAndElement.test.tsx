/**
 * StepUrlAndElement — Step 0: die Seite wird ausgewaehlt, nicht getippt.
 *
 * Regression: Ein Test laeuft auf genau der verbundenen Seite, deren Snippet
 * geprueft wurde. Es darf deshalb weder ein Pfad-Feld (Unterseite) noch eine
 * freie "Other domain"-URL geben — beides versprach Tests, die nichts zaehlen.
 */

import { useState } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepUrlAndElement } from '@/app/dashboard/components/new-test/StepUrlAndElement'
import type { ElementSelection } from '@/app/dashboard/components/NewTestDrawer'

const DOMAINS = [
  { url: 'example.com', verifiedAt: '2026-08-01T00:00:00Z' },
  { url: 'shop.example.org', verifiedAt: '2026-08-02T00:00:00Z' },
]

function renderStep(opts: {
  url?: string
  domains?: { url: string; verifiedAt: string | null }[]
  element?: ElementSelection | null
  onElementSelected?: (el: ElementSelection) => void
} = {}) {
  const onUrlChange = vi.fn<(url: string) => void>()
  const onConnectDomain = vi.fn<(hostname: string) => void>()

  function Host() {
    const [url, setUrl] = useState(opts.url ?? '')
    return (
      <StepUrlAndElement
        url={url}
        onUrlChange={(next) => { onUrlChange(next); setUrl(next) }}
        selectedElement={opts.element ?? null}
        onElementSelected={opts.onElementSelected ?? (() => {})}
        onConfirm={() => {}}
        verifiedDomains={opts.domains ?? DOMAINS}
        domainConnectState="idle"
        domainConnectError=""
        connectingDomain=""
        onConnectDomain={onConnectDomain}
      />
    )
  }
  render(<Host />)
  return { onUrlChange, onConnectDomain }
}

describe('StepUrlAndElement — Seitenauswahl', () => {
  it('bietet nur verbundene Domains an — kein "Other domain", kein Pfad-Feld', () => {
    renderStep()
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect([...select.options].map((o) => o.value)).toEqual(['example.com', 'shop.example.org'])
    expect(screen.queryByPlaceholderText('/pricing')).not.toBeInTheDocument()
    expect(screen.queryByText(/Other domain/)).not.toBeInTheDocument()
  })

  it('waehlt ohne URL die erste verbundene Domain als Wurzel vor', () => {
    const { onUrlChange } = renderStep({ url: '' })
    expect(onUrlChange).toHaveBeenCalledWith('https://example.com/')
  })

  it('zieht eine Alt-URL mit Pfad auf die verbundene Wurzel zurueck', () => {
    const { onUrlChange } = renderStep({ url: 'https://example.com/pricing' })
    expect(onUrlChange).toHaveBeenCalledWith('https://example.com/')
  })

  it('ersetzt eine nie verbundene Domain durch die erste verbundene', () => {
    const { onUrlChange } = renderStep({ url: 'https://fremd.example.net/' })
    expect(onUrlChange).toHaveBeenCalledWith('https://example.com/')
  })

  it('schreibt beim Domainwechsel immer die Wurzel', () => {
    const { onUrlChange } = renderStep({ url: 'https://example.com/' })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'shop.example.org' } })
    expect(onUrlChange).toHaveBeenLastCalledWith('https://shop.example.org/')
  })

  it('zeigt ohne verbundene Domain genau ein Feld — den zu verbindenden Host', () => {
    const { onConnectDomain } = renderStep({ url: '', domains: [] })
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    const input = screen.getByPlaceholderText('yoursite.com')
    fireEvent.change(input, { target: { value: 'meine-seite.de' } })
    fireEvent.click(screen.getByRole('button', { name: /Connect meine-seite\.de/ }))
    expect(onConnectDomain).toHaveBeenCalledWith('meine-seite.de')
  })
})

describe('StepUrlAndElement — KI-Vorschläge', () => {
  const SCAN = {
    primarySuggestion: { element: 'Hero CTA', selector: '.hero .cta', rationale: 'Most clicked element above the fold' },
    suggestions: [
      { element: 'Pricing button', selector: '.pricing .btn', rationale: 'Second most clicked' },
    ],
  }

  function mockScan() {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => SCAN,
    } as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('rendert jede Empfehlung als OptionCard — Aktion, keine Auswahl', async () => {
    mockScan()
    renderStep({ url: 'https://example.com/' })
    fireEvent.click(screen.getByRole('button', { name: /Let AI suggest one/ }))

    const primary = await screen.findByRole('button', { name: /Hero CTA/ })
    // Vorschlaege fuehren etwas aus, sie sind keine Radio-Gruppe: kein
    // aria-checked, sonst verspraeche die Liste einen Auswahlzustand.
    expect(primary).not.toHaveAttribute('aria-checked')
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    expect(screen.getByText('Best pick')).toBeInTheDocument()
    expect(screen.getByText('Most clicked element above the fold')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pricing button/ })).toBeInTheDocument()
  })

  it('uebernimmt den angeklickten Vorschlag als Element', async () => {
    mockScan()
    const onElementSelected = vi.fn()
    renderStep({ url: 'https://example.com/', onElementSelected })
    fireEvent.click(screen.getByRole('button', { name: /Let AI suggest one/ }))

    fireEvent.click(await screen.findByRole('button', { name: /Hero CTA/ }))
    expect(onElementSelected).toHaveBeenCalledWith(
      expect.objectContaining({ selector: '.hero .cta' }),
    )
  })
})
