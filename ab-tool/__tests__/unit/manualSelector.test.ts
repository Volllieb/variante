import { describe, it, expect } from 'vitest'
import { validateManualSelector } from '@/lib/manualSelector'

/**
 * validateManualSelector — manuelles Selektor-Feld (StepUrlAndElement,
 * StepGoal). Der Picker baut Selektoren mit `parts.join(' > ')` — das Feld
 * wies genau diese Form zurück, weil `>` in der Injection-Zeichenklasse
 * stand. `>` ist im Selektor-Kontext kein Risiko; `querySelector` prüft die
 * Parsbarkeit ohnehin.
 */
describe('validateManualSelector', () => {
  it('nimmt Picker-Selektoren mit > an', () => {
    const result = validateManualSelector('.hero > .cta')
    expect(result.ok).toBe(true)
    expect(result.selector).toBe('.hero > .cta')
  })

  it('nimmt :nth-of-type-Ketten an', () => {
    const result = validateManualSelector('nav > a:nth-of-type(2) > span')
    expect(result.ok).toBe(true)
    expect(result.selector).toBe('nav > a:nth-of-type(2) > span')
  })

  it('lehnt weiterhin Markup-Injection mit < ab', () => {
    expect(validateManualSelector('.cta < img').ok).toBe(false)
  })

  it('lehnt weiterhin geschweifte Klammern und Semikolon ab', () => {
    expect(validateManualSelector('.cta { color: red; }').ok).toBe(false)
    expect(validateManualSelector('.cta; img').ok).toBe(false)
  })
})
