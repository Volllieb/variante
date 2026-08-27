/**
 * Der Zeitraum-Selektor liest seinen Startwert aus localStorage. Auf dem
 * Server gibt es kein localStorage — steht dort ein anderer Wert als der
 * Default, rendert der Server etwas anderes als die Hydration im Browser.
 * React meldet das als Fehler in der Konsole des Kunden.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderToString } from 'react-dom/server'
import { act } from 'react'
import { hydrateRoot } from 'react-dom/client'
import type { TestRow } from '@/app/dashboard/components/TestCard'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('@/lib/supabaseBrowser', () => ({
  getBrowserSupabase: () => ({
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) },
  }),
}))
vi.mock('@/app/dashboard/components/SnippetStatusBadge', () => ({ SnippetStatusBadge: () => <div /> }))
vi.mock('@/app/dashboard/components/AgentPanel', () => ({ AgentPanel: () => <div /> }))
vi.mock('@/app/dashboard/components/WhatToTestNext', () => ({ WhatToTestNext: () => <div /> }))
vi.mock('@/app/dashboard/components/TrendChart', () => ({ TrendChart: () => <div /> }))
vi.mock('@/app/dashboard/components/NewTestDrawer', () => ({ NewTestDrawer: () => <div /> }))

const { DashboardClient } = await import('@/app/dashboard/DashboardClient')

const tests: TestRow[] = [{
  id: 't1',
  name: 'Pricing headline',
  site_url: 'example.com',
  status: 'active',
  visitors_a: 10,
  visitors_b: 10,
  conversions_a: 1,
  conversions_b: 2,
  winner: null,
  created_at: new Date(Date.now() - 10 * 86_400_000).toISOString(),
}]

function tree() {
  return (
    <DashboardClient
      plan="pro"
      tests={tests}
      dailyStats={[]}
      hasVerifiedDomain
      primaryDomain="example.com"
      verifiedAt={null}
      allVerifiedDomains={[{ url: 'example.com', verifiedAt: null }]}
      domainCount={1}
      userId="u1"
    />
  )
}

let consoleErrors: unknown[][] = []
let spy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  consoleErrors = []
  spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => { consoleErrors.push(args) })
})

afterEach(() => {
  spy.mockRestore()
  localStorage.clear()
})

describe('DashboardClient — Hydration', () => {
  it('hydriert ohne Mismatch, wenn ein abweichender Zeitraum gespeichert ist', () => {
    // Der Server kennt localStorage nicht und rendert den Default (30d).
    const html = renderToString(tree())
    localStorage.setItem('dashboard-period:u1', '7')
    localStorage.setItem('dashboard-scope:u1', 'example.com')

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)

    // React meldet einen Mismatch nicht als Exception, sondern als
    // recoverable error — und rendert danach den ganzen Teilbaum neu.
    const recovered: string[] = []
    act(() => {
      hydrateRoot(container, tree(), {
        onRecoverableError: (err) => recovered.push(String(err)),
      })
    })

    const reported = [...recovered, ...consoleErrors.map((e) => String(e[0]))].join('\n')
    expect(reported).not.toMatch(/hydrat|did not match|Mismatch/i)
  })

  it('zeigt nach der Hydration den gespeicherten Zeitraum an', () => {
    localStorage.setItem('dashboard-period:u1', '7')
    const container = document.createElement('div')
    container.innerHTML = renderToString(tree())
    document.body.appendChild(container)

    act(() => { hydrateRoot(container, tree()) })

    const active = container.querySelector('[aria-pressed="true"]')
    expect(active?.textContent).toBe('7d')
  })
})
