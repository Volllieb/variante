import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DecisionList } from '@/app/dashboard/components/DecisionList'
import type { Decision } from '@/lib/decisions'

function decision(overrides: Partial<Decision> = {}): Decision {
  return {
    testId: 't1',
    testName: 'Pricing headline',
    kind: 'ready',
    severity: 'ok',
    headline: 'Ready to call — variant B is ahead at 98% confidence',
    action: { label: 'Declare winner', href: '/dashboard/results/t1' },
    ...overrides,
  }
}

describe('DecisionList', () => {
  it('rendert gar nichts, wenn nichts ansteht', () => {
    // Ein "nichts zu tun"-Kasten wäre Rauschen an der prominentesten Stelle.
    const { container } = render(<DecisionList decisions={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('zeigt Testname und Grund im Klartext', () => {
    render(<DecisionList decisions={[decision()]} />)
    expect(screen.getByText('Pricing headline')).toBeInTheDocument()
    expect(screen.getByText(/Ready to call/)).toBeInTheDocument()
  })

  it('verlinkt auf die Results-Seite des Tests', () => {
    render(<DecisionList decisions={[decision()]} />)
    expect(screen.getByRole('link', { name: /Declare winner/ }))
      .toHaveAttribute('href', '/dashboard/results/t1')
  })

  it('öffnet bei Drafts den Wizard statt der leeren Results-Seite', () => {
    const onFinishDraft = vi.fn()
    const draft = decision({
      testId: 'draft-1',
      kind: 'draft',
      severity: 'pro',
      headline: 'Draft — 2 steps left before it can go live',
      action: { label: 'Finish setup', href: null },
    })
    render(<DecisionList decisions={[draft]} onFinishDraft={onFinishDraft} />)

    expect(screen.queryByRole('link', { name: /Finish setup/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Finish setup/ }))
    expect(onFinishDraft).toHaveBeenCalledWith('draft-1')
  })

  it('kürzt lange Listen und verweist auf die vollständige Liste', () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      decision({ testId: `t${i}`, testName: `Test ${i}` })
    )
    render(<DecisionList decisions={many} />)

    expect(screen.getByText('Test 0')).toBeInTheDocument()
    expect(screen.queryByText('Test 5')).toBeNull()
    expect(screen.getByRole('link', { name: /3 more waiting/ }))
      .toHaveAttribute('href', '/dashboard/tests')
  })

  it('nennt die Zahl der offenen Entscheidungen im Kopf', () => {
    const two = [decision({ testId: 'a' }), decision({ testId: 'b' })]
    render(<DecisionList decisions={two} />)
    const section = screen.getByRole('region', { name: /Needs your decision/i })
    expect(section).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
