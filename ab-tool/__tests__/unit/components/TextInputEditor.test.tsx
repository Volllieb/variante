/**
 * TextInputEditor — Delta-Modell für Text/Headline-Elemente.
 *
 * - `inherit` (Default): A's Markup bleibt (Tag, Klassen, Attribute), nur der
 *   Text ändert sich — kein CSS nötig, A's Kaskade gilt weiter.
 * - `scratch`: Neubau als <span class="ab-variant-b"> mit transition.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TextInputEditor } from '@/app/dashboard/components/new-test/TextInputEditor'
import type { ElementSelection } from '@/app/dashboard/components/NewTestDrawer'

const ELEMENT: ElementSelection = {
  selector: '#hero-headline',
  originalHtml: '<h1 id="hero-headline" class="hero-title">Sync your files</h1>',
  originalCss: '',
  elementType: 'headline',
  elementName: 'Headline',
  styleContext: {
    css: '.hero-title { font-size: 48px; }',
    computed: { 'font-size': '48px', color: 'rgb(26, 26, 46)' },
  },
}

function renderEditor() {
  const onApply = vi.fn<(html: string, css: string) => void>()
  render(
    <TextInputEditor
      element={ELEMENT}
      originalHtml={ELEMENT.originalHtml}
      onApply={onApply}
      onCancel={() => {}}
    />
  )
  return { onApply }
}

describe('TextInputEditor — inherit-Modus (Default)', () => {
  it('erhält A\'s Markup inkl. Klassen, entfernt die id und ändert nur den Text', () => {
    const { onApply } = renderEditor()
    fireEvent.change(screen.getByPlaceholderText('Enter text'), { target: { value: 'Stop the chaos' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    const [html, css] = onApply.mock.calls[0]
    expect(html).toBe('<h1 class="hero-title">Stop the chaos</h1>')
    expect(css).toBe('')
  })
})

describe('TextInputEditor — scratch-Modus', () => {
  it('erzeugt weiterhin <span class="ab-variant-b"> mit transition-CSS', () => {
    const { onApply } = renderEditor()
    fireEvent.click(screen.getByRole('button', { name: 'From scratch' }))
    fireEvent.change(screen.getByPlaceholderText('Enter text'), { target: { value: 'Stop the chaos' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    const [html, css] = onApply.mock.calls[0]
    expect(html).toBe('<span class="ab-variant-b">Stop the chaos</span>')
    expect(css).toContain('#hero-headline {')
    expect(css).toContain('transition: all 0.2s ease;')
  })
})
