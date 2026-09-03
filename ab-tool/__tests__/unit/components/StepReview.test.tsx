/**
 * Die Vorschau im Wizard hat Buttons im Browser-Default gerendert: der Picker
 * schickte die Styles der Zielseite gar nicht zurueck, A bekam also kein CSS
 * und B nur sein eigenes Delta. Diese Tests halten beide Haelften der Loesung
 * fest — echtes Rendern, wo die Styles da sind, und der ehrliche Textvergleich,
 * wo sie fehlen (AI-Scan, manueller Modus).
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StepReview } from '@/app/dashboard/components/new-test/StepReview'
import type { ElementSelection, VariantResult, GoalSelection } from '@/app/dashboard/components/NewTestDrawer'
import type { VariantChangeSet } from '@/app/dashboard/components/new-test/types'

const SITE_CSS = '.cta { background-color: rgb(255, 0, 0); border-radius: 8px; }'

function element(overrides: Partial<ElementSelection> = {}): ElementSelection {
  return {
    selector: '.cta',
    originalHtml: '<button class="cta">Get started</button>',
    originalCss: SITE_CSS,
    elementType: 'button',
    elementName: 'Get started',
    ...overrides,
  }
}

const variant: VariantResult = {
  variant: 'Start free trial',
  variant_html: '<button class="cta">Start free trial</button>',
  variant_css: '.cta { background-color: rgb(0, 128, 0); }',
  explanation: 'Konkreter Nutzen statt generischem CTA.',
}

/** Die Änderungsliste zum Fixture — dieselbe Quelle wie im Wizard. */
const changes: VariantChangeSet = {
  mode: 'inherit',
  baseline: { bgColor: '#ff0000' },
  entries: [
    { id: 't', property: 'text', before: 'Get started', after: 'Start free trial', source: 'manual', status: 'applied' },
    { id: 'c', property: 'bgColor', before: '#ff0000', after: '#008000', source: 'ai', status: 'applied' },
  ],
}

const goal: GoalSelection = { type: 'click', selector: '.cta', label: 'Click .cta', source: 'picker' }

/** Text der Vergleichsspalte unter dem gegebenen Label. */
function paneValue(label: string): string {
  const heading = screen.getByText(label)
  return heading.nextElementSibling?.textContent?.trim() ?? ''
}

function renderStep(
  el: ElementSelection,
  v: VariantResult | null = variant,
  ch: VariantChangeSet = changes,
) {
  return render(
    <StepReview
      url="https://example.com/pricing"
      element={el}
      variantResult={v}
      changes={ch}
      goal={goal}
      testName="Hero CTA"
      onTestNameChange={() => {}}
      hasDomain
    />,
  )
}

describe('StepReview — Vorschau', () => {
  it('rendert A und B als iframe, wenn die Styles der Zielseite vorliegen', () => {
    const { container } = renderStep(element())
    const frames = container.querySelectorAll('iframe')
    expect(frames).toHaveLength(2)

    const [a, b] = Array.from(frames).map((f) => f.getAttribute('srcdoc') ?? '')
    // Beide Seiten teilen die Basis — sonst ist der A/B-Vergleich verzerrt.
    expect(a).toContain('border-radius: 8px')
    expect(b).toContain('border-radius: 8px')
    // Nur B traegt das Delta, und es steht hinter der Basis.
    expect(a).not.toContain('rgb(0, 128, 0)')
    expect(b.indexOf('rgb(0, 128, 0)')).toBeGreaterThan(b.indexOf('rgb(255, 0, 0)'))
  })

  it('faellt auf den Textvergleich zurueck, wenn keine Styles erfasst wurden', () => {
    const { container } = renderStep(element({ originalCss: '' }))
    expect(container.querySelectorAll('iframe')).toHaveLength(0)
    expect(screen.getByText(/Text-only preview/)).toBeInTheDocument()
    // "Get started" steht auch in der Summary-Zeile "Element" — hier zaehlt
    // die Spalte des Vergleichs, deshalb ueber deren Label gesucht.
    expect(paneValue('Original (A)')).toBe('Get started')
    expect(paneValue('Variant (B)')).toBe('Start free trial')
  })

  // AI-Scan liefert gar kein Markup — ein iframe waere dort komplett leer.
  it('faellt auch ohne originalHtml auf den Textvergleich zurueck', () => {
    const { container } = renderStep(element({ originalHtml: '', originalCss: '' }))
    expect(container.querySelectorAll('iframe')).toHaveLength(0)
    // Ohne Markup bleibt der Elementname die beste verfuegbare Auskunft.
    expect(paneValue('Original (A)')).toBe('Get started')
  })

  it('zeigt gar keine Vorschau, solange keine Variante existiert', () => {
    const { container } = renderStep(element(), null)
    expect(container.querySelectorAll('iframe')).toHaveLength(0)
    expect(screen.queryByText(/Text-only preview/)).not.toBeInTheDocument()
  })
})

describe('StepReview — read-only Änderungsliste', () => {
  it('ersetzt den CSS-Dump durch Zeilen ohne Aktionen', () => {
    renderStep(element())
    // Zeilen sichtbar: Vorher→Nachher-Pfeil und der neue Text.
    expect(screen.getByText('Changes')).toBeInTheDocument()
    expect(screen.getAllByText('→').length).toBeGreaterThan(0)
    expect(screen.getByText('Start free trial')).toBeInTheDocument()
    // Read-only: keine Edit-/Remove-/Accept-Aktionen in der Liste.
    expect(screen.queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Accept/ })).not.toBeInTheDocument()
    // Der alte CSS-Dump ist weg.
    expect(screen.queryByText('CSS Changes')).not.toBeInTheDocument()
  })

  it('ohne angewandte Zeilen erscheint keine Liste', () => {
    renderStep(element(), variant, { mode: 'inherit', entries: [], baseline: null })
    expect(screen.queryByText('Changes')).not.toBeInTheDocument()
  })
})
