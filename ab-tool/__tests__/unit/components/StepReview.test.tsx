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

const goal: GoalSelection = { type: 'click', selector: '.cta', label: 'Click .cta' }

/** Text der Vergleichsspalte unter dem gegebenen Label. */
function paneValue(label: string): string {
  const heading = screen.getByText(label)
  return heading.nextElementSibling?.textContent?.trim() ?? ''
}

function renderStep(el: ElementSelection, v: VariantResult | null = variant) {
  return render(
    <StepReview
      url="https://example.com/pricing"
      element={el}
      variantResult={v}
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
