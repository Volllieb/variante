/**
 * Die Zustände der Overview, die der Umbau-Plan zur Sichtprüfung vorsieht.
 *
 * Lokal ist keine echte Anmeldung möglich (Supabase-Platzhalter in .env.local),
 * und genau die Zustände — kein Domain, Draft, Gewinner, keine Tests — sind
 * die, in denen die Seite vorher zwei Banner stapelte oder gar nichts sagte.
 * Deshalb hier gegen Fixtures statt gegen eine Datenbank.
 *
 * Die schweren Kinder (Snippet-Flow, Wizard, Agent, AI-Vorschläge, Chart) sind
 * gestubbt: geprüft wird die Overview-Komposition, nicht deren Innenleben.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { TestRow } from '@/app/dashboard/components/TestCard'

const push = vi.fn()
const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}))

vi.mock('@/lib/supabaseBrowser', () => ({
  getBrowserSupabase: () => ({
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  }),
}))

vi.mock('@/app/dashboard/components/SnippetStatusBadge', () => ({
  SnippetStatusBadge: () => <div data-testid="snippet-status" />,
}))

vi.mock('@/app/dashboard/components/AgentPanel', () => ({
  AgentPanel: () => <div data-testid="agent-panel" />,
}))

vi.mock('@/app/dashboard/components/WhatToTestNext', () => ({
  WhatToTestNext: () => <div data-testid="what-to-test-next" />,
}))

vi.mock('@/app/dashboard/components/TrendChart', () => ({
  TrendChart: () => <div data-testid="trend-chart" />,
}))

vi.mock('@/app/dashboard/components/NewTestDrawer', () => ({
  NewTestDrawer: ({ isOpen, resumeTest }: { isOpen: boolean; resumeTest: TestRow | null }) => (
    <div data-testid="drawer" data-open={String(isOpen)} data-resume={resumeTest?.id ?? ''} />
  ),
}))

const { DashboardClient } = await import('@/app/dashboard/DashboardClient')

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

function renderDashboard(props: Partial<Parameters<typeof DashboardClient>[0]> = {}) {
  return render(
    <DashboardClient
      plan="pro"
      tests={[]}
      dailyStats={[]}
      hasVerifiedDomain
      primaryDomain="example.com"
      verifiedAt={null}
      allVerifiedDomains={[{ url: 'example.com', verifiedAt: null }]}
      domainCount={1}
      userId="u1"
      {...props}
    />
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('Overview — Ebene 1: genau ein Blocker', () => {
  it('Account ohne verifizierte Domain zeigt den Snippet-Blocker', () => {
    renderDashboard({ hasVerifiedDomain: false, primaryDomain: null, allVerifiedDomains: [], domainCount: 0 })
    expect(screen.getByTestId('snippet-status')).toBeInTheDocument()
    // Der alte GettingStartedBanner darf nicht zusätzlich darunter stehen.
    expect(screen.queryByText(/Add your domain to get started/i)).toBeNull()
  })

  it('Preview-Draft ersetzt den Snippet-Banner, statt sich darüberzustapeln', () => {
    renderDashboard({
      hasVerifiedDomain: false,
      primaryDomain: 'example.com',
      allVerifiedDomains: [],
      domainCount: 1,
      tests: [test({ status: 'draft', preview_variant_screenshot_url: 'https://img.example/x.png' })],
    })
    expect(screen.getByText(/Your variant is ready/i)).toBeInTheDocument()
    expect(screen.queryByTestId('snippet-status')).toBeNull()
  })

  it('verifizierte Domain lässt nur den kompakten Status übrig', () => {
    renderDashboard({ tests: [test()] })
    expect(screen.getByTestId('snippet-status')).toBeInTheDocument()
    expect(screen.queryByText(/Your variant is ready/i)).toBeNull()
  })
})

describe('Overview — Ebene 2: Entscheidungen', () => {
  it('Gewinner erscheint als Entscheidung, nicht mehr als Banner-Zeile', () => {
    renderDashboard({ tests: [test({ status: 'done', winner: 'B' })] })
    expect(screen.getByRole('region', { name: /Needs your decision/i })).toBeInTheDocument()
    expect(screen.getByText(/Variant B won/i)).toBeInTheDocument()
    // Alte Banner-Formulierung ("1 test has a winner").
    expect(screen.queryByText(/has? a winner/i)).toBeNull()
  })

  it('Draft öffnet über die Entscheidungs-Zeile den Wizard', () => {
    const draft = test({ id: 'draft-1', status: 'draft', health_issues: ['missing_goal'] })
    renderDashboard({ tests: [draft] })

    expect(screen.getByTestId('drawer')).toHaveAttribute('data-open', 'false')
    fireEvent.click(screen.getByRole('button', { name: /Finish setup/ }))

    const drawer = screen.getByTestId('drawer')
    expect(drawer).toHaveAttribute('data-open', 'true')
    expect(drawer).toHaveAttribute('data-resume', 'draft-1')
  })

  it('Health-Probleme ersetzen die pauschale Warnzeile', () => {
    renderDashboard({
      tests: [test({ health_status: 'issues', health_issues: ['missing_selector'] })],
    })
    expect(screen.getByText(/1 setup issue/i)).toBeInTheDocument()
    expect(screen.queryByText(/Check the test list below/i)).toBeNull()
  })

  it('ohne offene Entscheidung fehlt der Block ganz', () => {
    renderDashboard({ tests: [test()] })
    expect(screen.queryByRole('region', { name: /Needs your decision/i })).toBeNull()
  })
})

describe('Overview — Ebene 3: KPIs', () => {
  it('ohne Tests kein KPI-Grid, sondern der Leerzustand', () => {
    renderDashboard({ tests: [] })
    expect(screen.queryByText('Active Tests')).toBeNull()
    expect(screen.getByText(/Create your first test/i)).toBeInTheDocument()
  })

  it('Avg Uplift mittelt nur über entschiedene Tests', () => {
    const decided = test({
      id: 'decided',
      status: 'done',
      winner: 'B',
      visitors_a: 1000, conversions_a: 100,   // 10.0 %
      visitors_b: 1000, conversions_b: 120,   // 12.0 %  → +20 %
    })
    // Rauschen: ein Test mit einer Handvoll Besuchern und absurdem "Uplift".
    const noise = test({
      id: 'noise',
      visitors_a: 10, conversions_a: 1,
      visitors_b: 10, conversions_b: 10,      // +900 %
    })
    renderDashboard({ tests: [decided, noise] })

    expect(screen.getByText('+20.0%')).toBeInTheDocument()
    expect(screen.getByText(/Across 1 decided test/)).toBeInTheDocument()
  })

  it('ohne entschiedenen Test steht dort ein Strich statt einer Zahl', () => {
    renderDashboard({ tests: [test({ visitors_a: 10, conversions_a: 1, visitors_b: 10, conversions_b: 10 })] })
    const hint = screen.getByText(/No decided test yet/)
    const card = hint.closest('div')
    expect(card?.querySelector('p')?.textContent).toBe('—')
  })
})

describe('Overview — Ebene 5: Testliste', () => {
  it('zeigt höchstens fünf Tests und verlinkt den Rest', () => {
    const tests = Array.from({ length: 7 }, (_, i) =>
      test({ id: `t${i}`, name: `Test ${i}` })
    )
    renderDashboard({ tests })

    expect(screen.getAllByText(/^Test \d$/)).toHaveLength(5)
    expect(screen.getByRole('link', { name: /View all 7/ })).toHaveAttribute('href', '/dashboard/tests')
  })

  it('stellt Tests mit offener Entscheidung nach vorn', () => {
    const quiet = test({ id: 'quiet', name: 'Quiet test', visitors_a: 90_000, visitors_b: 90_000 })
    const won = test({ id: 'won', name: 'Won test', status: 'done', winner: 'B' })
    renderDashboard({ tests: [quiet, won] })

    const names = screen.getAllByText(/^(Quiet|Won) test$/).map((el) => el.textContent)
    expect(names[0]).toBe('Won test')
  })

  it('bringt keine Toolbar mehr mit — die lebt in /dashboard/tests', () => {
    renderDashboard({ tests: [test()] })
    expect(screen.queryByPlaceholderText(/Search tests/i)).toBeNull()
    expect(screen.queryByRole('button', { name: /Refresh test list/i })).toBeNull()
  })
})
