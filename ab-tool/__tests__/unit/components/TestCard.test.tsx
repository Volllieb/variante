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
  it('rechnet das Tempo in Tage um', () => {
    // 1000 Besucher in 10 Tagen → 100/Tag; es fehlen 1000 → ~10 Tage.
    render(<TestCard t={test({ visitors_a: 400, visitors_b: 600 })} />)
    expect(screen.getByText('~10d to decision')).toBeInTheDocument()
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
