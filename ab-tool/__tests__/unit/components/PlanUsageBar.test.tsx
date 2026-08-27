/**
 * Der Verbrauchsbalken existiert, um das Limit spürbar zu machen, BEVOR der
 * User dagegen läuft (brandguidelines §6: Beschränkung sichtbar, nie als
 * Überraschung). Solange er AI-Scans fest mit 0 auswies, tat er das Gegenteil:
 * er versicherte "noch nichts verbraucht" und der nächste Scan lief in den 429
 * aus /api/test-wizard/scan.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlanUsageBar } from '@/app/dashboard/components/PlanUsageBar'
import { PLAN_LIMITS } from '@/lib/planLimits'

function renderBar(props: Partial<Parameters<typeof PlanUsageBar>[0]> = {}) {
  return render(
    <PlanUsageBar plan="free" activeTests={0} domainCount={0} aiScansUsed={0} {...props} />
  )
}

describe('PlanUsageBar', () => {
  it('zeigt den tatsächlichen AI-Scan-Verbrauch', () => {
    renderBar({ aiScansUsed: 1 })
    expect(screen.getByText(`1/${PLAN_LIMITS.free.aiScans}`)).toBeInTheDocument()
  })

  it('meldet ein erreichtes Scan-Limit, bevor der Scan abgelehnt wird', () => {
    const { container } = renderBar({ aiScansUsed: PLAN_LIMITS.free.aiScans })
    // Am Limit färbt sich die Zeile — dieselbe Grenze, ab der die API 429 gibt.
    const atLimit = container.querySelectorAll('.text-pro')
    expect(atLimit.length).toBeGreaterThan(0)
  })

  it('behauptet nicht mehr pauschal 0 Scans', () => {
    renderBar({ aiScansUsed: 3, activeTests: 1, domainCount: 1 })
    expect(screen.queryByText(`0/${PLAN_LIMITS.free.aiScans}`)).toBeNull()
    expect(screen.getByText(`3/${PLAN_LIMITS.free.aiScans}`)).toBeInTheDocument()
  })

  it('bleibt für zahlende Pläne unsichtbar', () => {
    const { container } = renderBar({ plan: 'pro', aiScansUsed: 4 })
    expect(container).toBeEmptyDOMElement()
  })
})
