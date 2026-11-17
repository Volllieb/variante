/**
 * Try-Flow (17.11.2026): KI-Varianten vor dem Signup, Auswahl reist per Cookie
 * zum Claim (lib/demoClaim.ts). Geprüft: Darstellung, Auswahl-Cookie, und dass
 * manipulierte Cookies den Claim nicht füttern.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LandingTrySite } from '@/app/LandingTrySite'
import { decodeDemoPick, encodeDemoPick, parseDemoChoice } from '@/lib/demoClaim'

const fetchMock = vi.fn<typeof fetch>()
beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  document.cookie = 'variante_demo_choice=; Max-Age=0; Path=/'
})
afterEach(() => vi.unstubAllGlobals())

const RESPONSE = {
  ok: true,
  url: 'example.com',
  headline: {
    original: 'Welcome', selector: 'h1', tag: 'h1',
    variants: [
      { text: 'Invoices paid in 7 days', lever: 'h_outcome', why: 'Leads with the result.' },
      { text: 'For freelancers who hate admin', lever: 'h_audience', why: 'Calls out the reader.' },
    ],
  },
  cta: {
    original: 'Sign up', selector: 'a.btn', tag: 'a',
    variants: [{ text: 'Start my free trial', lever: 'c_first_person', why: 'Personal.' }],
  },
}

describe('LandingTrySite', () => {
  it('zeigt Headline- und Button-Ideen mit Hebel und merkt die Auswahl', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(RESPONSE), { status: 200 }))
    render(<LandingTrySite />)
    fireEvent.change(screen.getByLabelText('Your site URL'), { target: { value: 'example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /Try it/ }))

    expect(await screen.findByText('Invoices paid in 7 days')).toBeInTheDocument()
    expect(screen.getByText('Concrete result')).toBeInTheDocument()
    expect(screen.getByText('Start my free trial')).toBeInTheDocument()
    expect(document.cookie).toContain('variante_demo_choice=h:0')

    fireEvent.click(screen.getByText('Start my free trial'))
    expect(document.cookie).toContain('variante_demo_choice=c:0')
    expect(screen.getByRole('link', { name: /test this idea/ })).toHaveAttribute('href', '/signup?demo_url=example.com')
  })

  it('erklärt ehrlich, wenn die Seite nicht lesbar war', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true, url: 'example.com', reason: 'fetch_failed' }), { status: 200 }))
    render(<LandingTrySite />)
    fireEvent.change(screen.getByLabelText('Your site URL'), { target: { value: 'example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /Try it/ }))
    expect(await screen.findByText(/couldn't read this page/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /connect your site/ })).toBeInTheDocument()
  })
})

describe('demoClaim Cookies', () => {
  it('kodiert und dekodiert die Auswahl', () => {
    const pick = { u: 'example.com', h: { s: 'h1', o: 'Welcome', t: 'h1', v: [['Hi', 'h_outcome']] as [string, string][] } }
    expect(decodeDemoPick(encodeDemoPick(pick))).toEqual(pick)
  })
  it('verwirft manipulierte oder kaputte Cookies', () => {
    expect(decodeDemoPick('not-base64-json')).toBeNull()
    const bad = Buffer.from(JSON.stringify({ u: 'x.com', h: { s: 'h1', o: 'x', t: 'h1', v: [[1, 2]] } })).toString('base64url')
    expect(decodeDemoPick(bad)).toEqual({ u: 'x.com' })
    expect(parseDemoChoice('h:1')).toEqual({ kind: 'h', index: 1 })
    expect(parseDemoChoice('x:99')).toBeNull()
  })
})
