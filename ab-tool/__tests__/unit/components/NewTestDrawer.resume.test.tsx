/**
 * Entwurf öffnen (17.11.2026): Nach „Save Draft" war die Listenzeile
 * unvollständig, der Wizard startete leer bei Schritt 1. Jetzt lädt er den
 * Entwurf frisch und öffnet einen fertigen Entwurf direkt bei „Review";
 * die Schritte oben sind direkt anspringbar.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NewTestDrawer } from '@/app/dashboard/components/NewTestDrawer'
import type { TestRow } from '@/app/dashboard/components/TestCard'

const FULL_DRAFT = {
  id: 't1',
  name: 'Button test on example.com',
  site_url: 'https://example.com/',
  status: 'draft',
  selector: 'a.btn',
  original_html: '<a class="btn" href="#x">Sign up</a>',
  site_css: null,
  goal: 'click:a.btn',
  element_type: 'link',
  variant_b_html: null,
  variant_b_css: null,
  variant_b_changes: { mode: 'inherit', baseline: null, entries: [{ id: 'e1', property: 'text', before: 'Sign up', after: 'Start my free trial', source: 'ai', status: 'applied', lever: 'c_first_person' }] },
}

// So sah die Listenzeile direkt nach „Save Draft" aus: nur Name/Status
const THIN_ROW = { id: 't1', name: 'Button test on example.com', site_url: 'https://example.com/', status: 'draft', visitors_a: 0, visitors_b: 0, conversions_a: 0, conversions_b: 0, winner: null, created_at: '2026-11-17T00:00:00Z' } as unknown as TestRow

const fetchMock = vi.fn<typeof fetch>()
beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockImplementation(async (input) => {
    const url = String(input)
    if (url === '/api/tests/t1') return new Response(JSON.stringify(FULL_DRAFT), { status: 200 })
    return new Response('{}', { status: 200 })
  })
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('NewTestDrawer — Entwurf öffnen', () => {
  it('lädt den Entwurf frisch und öffnet direkt bei Review', async () => {
    render(
      <NewTestDrawer
        isOpen
        onClose={() => {}}
        userId="u1"
        onTestCreated={() => {}}
        verifiedDomains={[{ url: 'example.com', verifiedAt: '2026-11-17T00:00:00Z' }]}
        resumeTest={THIN_ROW}
      />,
    )
    expect(await screen.findByText(/Step 4 of 4/)).toBeInTheDocument()
    expect(screen.getByText('Edit draft')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/tests/t1')
    expect(screen.getAllByText(/Start my free trial/).length).toBeGreaterThan(0)
  })

  it('springt per Klick auf einen Schritt direkt dorthin', async () => {
    render(
      <NewTestDrawer
        isOpen
        onClose={() => {}}
        userId="u1"
        onTestCreated={() => {}}
        verifiedDomains={[{ url: 'example.com', verifiedAt: '2026-11-17T00:00:00Z' }]}
        resumeTest={THIN_ROW}
      />,
    )
    await screen.findByText(/Step 4 of 4/)
    fireEvent.click(screen.getByRole('button', { name: /Go to step 3: Change/ }))
    await waitFor(() => expect(screen.getByText(/Step 3 of 4/)).toBeInTheDocument())
  })
})
