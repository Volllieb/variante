/**
 * Claim nach Signup (lib/demoClaim.ts): erster Entwurf trägt die im Try-Flow
 * gewählte Variante; Domain nur innerhalb des Plan-Limits.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const inserts: { table: string; row: Record<string, unknown> }[] = []
let domainsRows: { url: string }[] = []
let testsCount = 0

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => table === 'domains'
          ? Promise.resolve({ data: domainsRows })
          : Promise.resolve({ count: testsCount }),
      }),
      insert: (row: Record<string, unknown>) => { inserts.push({ table, row }); return Promise.resolve({ error: null }) },
    }),
  },
}))
vi.mock('@/lib/auth', () => ({ getPlanForUser: async () => 'free' }))

import { claimDemoUrlForUser, encodeDemoPick } from '@/lib/demoClaim'

const PICK = encodeDemoPick({
  u: 'example.com',
  h: { s: '#hero-title', o: 'Welcome', t: 'h1', x: '<h1 id="hero-title" class="big">Welcome</h1>', v: [['Invoices paid in 7 days', 'h_outcome'], ['For freelancers', 'h_audience']] },
  c: { s: 'a.btn', o: 'Sign up', t: 'a', v: [['Start my free trial', 'c_first_person']] },
})

beforeEach(() => { inserts.length = 0; domainsRows = []; testsCount = 0 })

describe('claimDemoUrlForUser', () => {
  it('legt Domain und einen Entwurf mit der gewählten Headline-Variante an', async () => {
    expect(await claimDemoUrlForUser('u1', 'example.com', PICK, 'h:1')).toBe(true)
    expect(inserts.map((i) => i.table)).toEqual(['domains', 'tests'])
    const test = inserts[1].row
    expect(test).toMatchObject({
      selector: '#hero-title',
      original_html: '<h1 id="hero-title" class="big">Welcome</h1>',
      element_type: 'headline',
      goal: 'click:a.btn',
      status: 'draft',
      site_url: 'https://example.com/',
    })
    const changes = test.variant_b_changes as { entries: Record<string, unknown>[] }
    expect(changes.entries[0]).toMatchObject({ property: 'text', before: 'Welcome', after: 'For freelancers', source: 'ai', lever: 'h_audience' })
  })

  it('nimmt den Button, wenn er gewählt wurde — Original-HTML aus Tag + Text, wenn kein HTML im Cookie', async () => {
    await claimDemoUrlForUser('u1', 'example.com', PICK, 'c:0')
    expect(inserts[1].row).toMatchObject({ selector: 'a.btn', element_type: 'link', original_html: '<a>Sign up</a>' })
  })

  it('Free-Plan mit schon einer anderen Domain: keine zweite Domain, kein Entwurf', async () => {
    domainsRows = [{ url: 'other.com' }]
    expect(await claimDemoUrlForUser('u1', 'example.com', PICK, 'h:0')).toBe(false)
    expect(inserts).toEqual([])
  })

  it('Account mit bestehenden Tests: Domain ja (wenn frei), Entwurf nein', async () => {
    testsCount = 2
    expect(await claimDemoUrlForUser('u1', 'example.com', PICK, 'h:0')).toBe(false)
    expect(inserts.map((i) => i.table)).toEqual(['domains'])
  })

  it('Cookie einer anderen Seite wird ignoriert → leerer Entwurf wie bisher', async () => {
    await claimDemoUrlForUser('u1', 'other-site.com', PICK, 'h:0')
    expect(inserts[1].row.selector).toBeUndefined()
    expect(inserts[1].row.name).toBe('Demo test on other-site.com')
  })
})
