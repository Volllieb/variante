/**
 * Regressionstests für die Zahlen-Defekte, die die UI-Überarbeitung behoben hat.
 *
 * Diese Fälle sind bewusst als gerenderte Komponenten geprüft und nicht nur auf
 * Ebene von lib/formatNumber: die Bugs entstanden erst im Zusammenspiel aus
 * Formatierung und Layout — eine korrekt formatierte Zahl in einem zu engen,
 * abschneidenden Container ist immer noch unlesbar.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlanUsageBar } from '@/app/dashboard/components/PlanUsageBar'
import { DecisionList } from '@/app/dashboard/components/DecisionList'
import { TrendChart } from '@/app/dashboard/components/TrendChart'
import type { Decision } from '@/lib/decisions'

describe('PlanUsageBar: feste Breite lief bei ungedeckeltem Verbrauch aus', () => {
  it('schneidet einen herabgestuften Account nicht ab', () => {
    // `used` ist ungedeckelt: wer von Pro auf Free faellt, kann 12 aktive
    // Tests bei einem Limit von 1 haben. Vorher stand das in einem w-[36px]
    // ohne shrink-0.
    const { container } = render(
      <PlanUsageBar plan="free" activeTests={12} domainCount={1} aiScansUsed={0} />
    )
    expect(screen.getByText('12/1')).toBeInTheDocument()

    const cell = screen.getByText('12/1')
    expect(cell.className).toContain('shrink-0')
    expect(cell.className).toContain('whitespace-nowrap')
    // min-w statt der fixen Breite: die Zelle darf wachsen. Auf Wortgrenze
    // geprueft, weil 'min-w-[36px]' den Substring 'w-[36px]' enthaelt.
    expect(cell.className.split(/\s+/)).not.toContain('w-[36px]')
    expect(cell.className.split(/\s+/)).toContain('min-w-[36px]')
    expect(container).not.toBeEmptyDOMElement()
  })
})

describe('DecisionList: truncate schnitt die Zahl ab', () => {
  const decision: Decision = {
    testId: 'test-1',
    testName: 'Pricing headline',
    kind: 'ready',
    severity: 'ok',
    headline: 'Ready to call — variant B is ahead at 97% confidence',
    action: { label: 'Review', href: '/dashboard/results/test-1' },
  }

  it('macht die abgeschnittene Konfidenz per title wieder lesbar', () => {
    render(<DecisionList decisions={[decision]} />)
    const line = screen.getByText(/Ready to call/)
    // Die Zahl steht am Stringende und ist damit das Erste, was truncate
    // frisst. Ohne title war sie unwiederbringlich weg.
    expect(line).toHaveAttribute('title', decision.headline)
    expect(line.getAttribute('title')).toContain('97%')
  })
})

describe('TrendChart: leere Datenreihe', () => {
  it('rendert ohne Daten, statt zu werfen', () => {
    const { container } = render(<TrendChart data={[]} label="Last 7 days" />)
    expect(container).not.toBeEmptyDOMElement()
    // aria-label bleibt konsistent formatiert, auch bei 0.
    expect(screen.getByLabelText(/0 visitors, 0 conversions/)).toBeInTheDocument()
  })

  it('formatiert grosse Summen mit Trennern im aria-label', () => {
    const data = [
      { date: '2026-08-01', visitors: 1234567, conversions: 4321 },
      { date: '2026-08-02', visitors: 1000000, conversions: 1000 },
    ]
    render(<TrendChart data={data} label="Last 7 days" />)
    expect(screen.getByLabelText(/2,234,567 visitors, 5,321 conversions/)).toBeInTheDocument()
  })
})
