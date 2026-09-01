/**
 * ButtonEditor — Delta-Modell (B erbt A statt A zu ersetzen).
 *
 * - `inherit` (Default): aus <a class="hover-btn …" href="/x"> wird wieder ein
 *   <a> mit denselben Klassen und href, nur mit neuem Text. Das CSS ist ein
 *   Delta gegen die gemessene Baseline — eine geänderte Farbe ergibt genau
 *   eine Deklaration.
 * - `scratch`: weiterhin <button class="ab-variant-b"> mit absolutem CSS.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ButtonEditor } from '@/app/dashboard/components/new-test/ButtonEditor'
import type { ElementSelection } from '@/app/dashboard/components/NewTestDrawer'

const ELEMENT: ElementSelection = {
  selector: '.cta',
  originalHtml: '<a class="hover-btn hover-btn--white" href="/x">Old text</a>',
  originalCss: '',
  elementType: 'link',
  elementName: 'Signup',
  styleContext: {
    css: '.hover-btn { color: #111; padding: 12px 24px; }',
    computed: {
      'background-color': 'rgb(255, 255, 255)',
      color: 'rgb(0, 0, 0)',
      'font-size': '16px',
      'font-weight': '600',
      'border-radius': '11px',
      'border-width': '2px',
      'border-style': 'solid',
      'border-color': 'rgb(0, 0, 0)',
      padding: '12px 24px',
    },
  },
}

function renderEditor(overrides: Partial<ElementSelection> = {}) {
  const onApply = vi.fn<(html: string, css: string) => void>()
  render(
    <ButtonEditor
      element={{ ...ELEMENT, ...overrides }}
      originalHtml={ELEMENT.originalHtml}
      onApply={onApply}
      onCancel={() => {}}
    />
  )
  return { onApply }
}

describe('ButtonEditor — inherit-Modus (Default)', () => {
  it('erzeugt wieder ein <a> mit denselben Klassen und href, nur mit neuem Text', () => {
    const { onApply } = renderEditor()
    fireEvent.change(screen.getByPlaceholderText('Button text'), { target: { value: 'Start free' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onApply).toHaveBeenCalledTimes(1)
    const [html] = onApply.mock.calls[0]
    expect(html).toBe('<a class="hover-btn hover-btn--white" href="/x">Start free</a>')
  })

  it('emittiert ein LEERES Delta, solange nichts geändert wurde', () => {
    const { onApply } = renderEditor()
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    const [, css] = onApply.mock.calls[0]
    expect(css).toBe('')
  })

  it('emittiert genau eine Deklaration, wenn nur die Hintergrundfarbe geändert wird', () => {
    const { onApply } = renderEditor()
    // Drei ColorPicker sitzen im Formular; der erste (Background) ist der oberste.
    const bgInput = screen.getAllByPlaceholderText('#000000')[0]
    fireEvent.change(bgInput, { target: { value: '#ff0000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    const [, css] = onApply.mock.calls[0]
    expect(css).toBe('.cta {\n  background-color: #ff0000;\n}')
  })

  it('"Reset to original" setzt auf die Baseline zurück (leeres Delta), nicht auf Default-Blau', () => {
    const { onApply } = renderEditor()
    fireEvent.click(screen.getByRole('button', { name: 'Reset to original' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    const [, css] = onApply.mock.calls[0]
    expect(css).toBe('')
  })

  it('ohne Style-Context degeneriert das Delta zum absoluten CSS (alte Semantik)', () => {
    const { onApply } = renderEditor({ styleContext: undefined })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    const [html, css] = onApply.mock.calls[0]
    expect(html).toContain('class="hover-btn hover-btn--white"')
    expect(css).toContain('padding: 12px 24px;')
  })
})

describe('ButtonEditor — scratch-Modus', () => {
  it('erzeugt weiterhin <button class="ab-variant-b"> mit absolutem CSS inkl. transition', () => {
    const { onApply } = renderEditor()
    fireEvent.click(screen.getByRole('button', { name: 'From scratch' }))
    fireEvent.change(screen.getByPlaceholderText('Button text'), { target: { value: 'Start free' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    const [html, css] = onApply.mock.calls[0]
    expect(html).toBe('<button class="ab-variant-b">Start free</button>')
    expect(css).toContain('transition: all 0.2s ease;')
  })
})
