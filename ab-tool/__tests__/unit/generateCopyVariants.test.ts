/**
 * Harte Regeln der KI-Textvarianten (lib/generateCopyVariants.ts).
 * Jeder Fall stammt aus einem echten Fehler im Eval (scripts/copy-eval/, 16.11.2026).
 */
import { describe, it, expect } from 'vitest'
import { applyFormat, brandIssues, droppedSellingPoints, formatOf, leversFor, limitsFor, tooClose, variantConflict } from '@/lib/generateCopyVariants'

describe('Ein Hebel pro Variante', () => {
  const wuerzburg = { text: 'Würzburg To New Zealand', lever: 'h_specific' as const, why: '' }
  it('zweimal derselbe Hebel ist ein Konflikt (vallisride.com, 17.11.2026)', () => {
    expect(variantConflict({ text: 'Germany To New Zealand', lever: 'h_specific', why: '' }, [wuerzburg])).toMatch(/h_specific/)
  })
  it('anderer Hebel, anderer Text ist ok', () => {
    expect(variantConflict({ text: 'Bikepacking to the other side of the world', lever: 'h_story', why: '' }, [wuerzburg])).toBeNull()
  })
  it('fast gleicher Text mit anderem Hebel ist trotzdem ein Konflikt', () => {
    expect(variantConflict({ text: 'From Würzburg To New Zealand', lever: 'h_story', why: '' }, [wuerzburg])).toMatch(/too similar/)
  })
  it('Headline bekommt nur Headline-Hebel, CTA nur CTA-Hebel', () => {
    expect(leversFor('headline').every((l) => l.startsWith('h_'))).toBe(true)
    expect(leversFor('cta').every((l) => l.startsWith('c_'))).toBe(true)
  })
})

describe('Marke', () => {
  it('„variants" neben der Marke „Variante" ist ein Fehler (Runde 3)', () => {
    expect(brandIssues('Convert more with better variants', ['Variante'], '')).not.toHaveLength(0)
  })
  it('die korrekt geschriebene Marke ist ok', () => {
    expect(brandIssues('A/B tests with Variante', ['Variante'], '')).toHaveLength(0)
  })
  it('Schreibweisen, die die Seite selbst nutzt, sind ok (moin.ai / moinAI)', () => {
    expect(brandIssues('moinAI live erleben', ['moin.ai'], 'Mit moinAI und moin.ai')).toHaveLength(0)
  })
})

describe('Breit testen', () => {
  it('„Start your trial" ist eine Paraphrase von „Start free trial" und verliert „free"', () => {
    expect(droppedSellingPoints('Start your trial', 'Start free trial')).toEqual(['free'])
  })
  it('„Create free account" behält „free" — legitimer Tausch', () => {
    expect(droppedSellingPoints('Create free account', 'Start free trial')).toEqual([])
  })
  it('Wortgleiche Umstellungen gelten als zu nah', () => {
    expect(tooClose('Black Cyber Deal starten', 'Black Cyber Deal sichern')).toBe(true)
    expect(tooClose('60% Deal sichern', 'Black Cyber Deal sichern')).toBe(false)
  })
})

describe('Schreibweise', () => {
  it('ALL CAPS bleibt ALL CAPS', () => {
    expect(applyFormat('Browse men’s sale', formatOf('SHOP MEN', 'English'), [])).toBe('BROWSE MEN’S SALE')
  })
  it('Pfeil am Ende bleibt erhalten', () => {
    expect(applyFormat('Create free account', formatOf('Start free trial →', 'English'), [])).toBe('Create free account →')
  })
  it('Kleinschreibung behält das englische „I" groß', () => {
    expect(applyFormat("I'll fuel a day", formatOf('make it possible', 'English'), [])).toBe("I'll fuel a day")
  })
  it('Deutsch bekommt nie Title Case (Runde 5: „Passform, Die Du Spürst")', () => {
    expect(formatOf('Socken Adventskalender 2026', 'German').caseStyle).toBe('sentence')
    expect(formatOf('To The Other Side', 'English').caseStyle).toBe('title')
  })
})

describe('Länge', () => {
  it('CTA: höchstens ein Wort mehr als das Original, mindestens 3', () => {
    expect(limitsFor('cta', 'SHOP MEN')).toEqual({ maxChars: 18, maxWords: 3 })
  })
})
