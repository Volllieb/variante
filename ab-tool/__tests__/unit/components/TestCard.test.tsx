/**
 * Stufe 3 des Overview-Umbaus: die Karte sagt, worauf der Test wartet.
 * Beide Aussagen — Conversion-Ziel und Restweg — wirken auch auf
 * /dashboard/tests, deshalb hier gegen die Komponente selbst.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TestCard, type TestRow } from '@/app/dashboard/components/TestCard'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

const DAY = 86_400_000

function test(overrides: Partial<TestRow> = {}): TestRow {
  return {
    id: 't1',
    name: 'Pricing headline',
    site_url: 'example.com',
    status: 'active',
    visitors_a: 0,
    visitors_b: 0,
    conversions_a: 0,
    conversions_b: 0,
    winner: null,
    created_at: new Date(Date.now() - 10 * DAY).toISOString(),
    ...overrides,
  }
}

describe('TestCard — Conversion-Ziel', () => {
  it('zeigt den ersetzten Elementklick mit Selektor', () => {
    render(<TestCard t={test({ selector: '.hero .cta' })} />)
    expect(screen.getByText('Click: .hero .cta')).toBeInTheDocument()
  })

  it('zeigt ein URL-Ziel als Page view', () => {
    render(<TestCard t={test({ goal: 'url:/thanks' })} />)
    expect(screen.getByText('Page view: /thanks')).toBeInTheDocument()
  })

  it('benennt ein fehlendes Ziel, statt die Zeile wegzulassen', () => {
    render(<TestCard t={test({ goal: null, selector: null })} />)
    expect(screen.getByText('No conversion goal')).toBeInTheDocument()
  })

  it('lässt Drafts aus — dort führt der Wizard durch das Ziel', () => {
    render(<TestCard t={test({ status: 'draft', goal: null, selector: null })} />)
    expect(screen.queryByText('No conversion goal')).toBeNull()
  })
})

describe('TestCard — Restweg bis zur Entscheidung', () => {
  it('rechnet das Tempo pro Arm in Tage um', () => {
    // A: 400 in 10 Tagen → 40/Tag, es fehlen 600 → 15 Tage. B waere nach 7 Tagen
    // durch. Beide Arme muessen die Schwelle reissen, also zaehlt der langsamere.
    // (Vorher stand hier "~10d": fehlende Besucher beider Arme durch das
    // Gesamttempo — eine Zahl, die nur bei gleichmaessiger Verteilung stimmt.)
    render(<TestCard t={test({ visitors_a: 400, visitors_b: 600 })} />)
    expect(screen.getByText('~15d to decision')).toBeInTheDocument()
  })

  it('folgt nach einem Traffic-Sprung den letzten Tagen', () => {
    const dateAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10)
    const daily = [
      ...[10, 9, 8, 7, 6, 5, 4].map((d) => ({
        test_id: 't1', date: dateAgo(d), visitors_a: 10, visitors_b: 10, conversions_a: 0, conversions_b: 0,
      })),
      ...[3, 2, 1].map((d) => ({
        test_id: 't1', date: dateAgo(d), visitors_a: 150, visitors_b: 150, conversions_a: 5, conversions_b: 5,
      })),
    ]
    const t = test({
      visitors_a: 520,
      visitors_b: 520,
      created_at: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    })
    render(<TestCard t={t} daily={daily} />)
    expect(screen.getByText('~4d to decision')).toBeInTheDocument()
  })

  it('nennt fehlende Besucher, solange kein Tempo messbar ist', () => {
    render(<TestCard t={test({ created_at: new Date(Date.now() - 3600_000).toISOString() })} />)
    // Tausendertrennzeichen kommt aus toLocaleString und haengt an der Umgebung.
    expect(screen.getByText(/^~2[.,]000 visitors to go$/)).toBeInTheDocument()
  })

  it('schweigt, sobald die Stichprobe reicht — dann entscheidet die Statistik', () => {
    render(<TestCard t={test({ visitors_a: 1200, visitors_b: 1100 })} />)
    expect(screen.queryByText(/to decision|visitors to go/)).toBeNull()
  })

  it('schweigt bei entschiedenen Tests', () => {
    render(<TestCard t={test({ status: 'done', winner: 'B' })} />)
    expect(screen.queryByText(/to decision|visitors to go/)).toBeNull()
  })
})
