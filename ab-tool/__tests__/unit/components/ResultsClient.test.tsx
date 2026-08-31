/**
 * Die Zahlen der Results-Seite: Hero-Card und Rohdaten-Tabelle.
 *
 * Gemeldet war: "83 visitors so far" neben "Visitors/arm 30 / 1.000" neben
 * "Conversions/arm 6 / 25" — während die Variantentabelle für B 16 Conversions
 * zeigte. Jede Zahl für sich stimmte, zusammen sahen sie aus wie ein Fehler,
 * weil nichts sagte, welche Summe und welches Minimum gemeint war.
 *
 * Lokal ist keine Anmeldung möglich (Supabase-Platzhalter in .env.local),
 * also wird die Karte hier gegen ein Fixture gerendert statt im Browser.
 * Die schweren Kinder (Charts, Preview, Realtime) sind gestubbt.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { ExperimentData } from '@/lib/getExperimentStats'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/lib/useRealtime', () => ({ useTestUpdate: () => {} }))

vi.mock('@/app/components/VariantPreview', () => ({
  VariantPreview: () => <div data-testid="variant-preview" />,
}))

vi.mock('@/app/components/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))

// recharts misst im jsdom nichts (Breite 0) und warnt sich durch den Test.
vi.mock('@/app/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}))

const { ResultsClient } = await import('@/app/dashboard/results/[id]/ResultsClient')

const DAY = 86_400_000

/** Der gemeldete Zustand: 53 + 30 = 83 Besucher, 6 (A) und 16 (B) Conversions. */
function experiment(overrides: Partial<ExperimentData> = {}): ExperimentData {
  return {
    id: 't1',
    name: 'Pricing headline',
    site_url: 'https://example.com',
    status: 'running',
    created_at: new Date(Date.now() - 2 * DAY).toISOString(),
    significance: 0.42,
    winner: null,
    trafficSplit: 50,
    minVisitors: 1000,
    minUplift: 0.05,
    significanceLevel: 0.95,
    userId: 'u1',
    originalHtml: null,
    variantBHtml: null,
    siteCss: null,
    goal: 'click:.cta',
    selector: '.cta',
    variants: [
      { id: 'A', label: 'A', views: 53, conversions: 6, cr: (6 / 53) * 100 },
      { id: 'B', label: 'B', views: 30, conversions: 16, cr: (16 / 30) * 100 },
    ],
    ...overrides,
  }
}

function renderCard(data = experiment()) {
  return render(<ResultsClient initial={data} experimentId={data.id} pro={false} />)
}

// Die Karte kennt ihre Zeitbasis (`now`) erst, wenn der Analytics-Request
// durch ist — vorher zeigt sie bewusst keine Restlaufzeit-Schätzung statt einer
// aus `now = 0` gerechneten Fantasiezahl.
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ daily: [] }) }))
  )
})

describe('Rohdaten-Tabelle', () => {
  const daily = [
    // Duenner Tag: 1 gegen 4 Conversions. Der alte Code schrieb hier "+300.0%".
    { date: '2026-08-28', visitors_a: 40, visitors_b: 40, conversions_a: 1, conversions_b: 4 },
    // Tag mit Substanz: der Uplift steht.
    { date: '2026-08-29', visitors_a: 1000, visitors_b: 1000, conversions_a: 10, conversions_b: 20 },
    // Kein Traffic in A: die CR-Zelle darf nicht "—%" werden.
    { date: '2026-08-30', visitors_a: 0, visitors_b: 500, conversions_a: 0, conversions_b: 15 },
  ]

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ daily }) })))
  })

  async function openTable() {
    render(<ResultsClient initial={experiment()} experimentId="t1" pro />)
    fireEvent.click(await screen.findByText('Raw Data'))
    return screen.getByRole('table')
  }

  it('zeigt die Conversions, aus denen die CR-Spalte entsteht', async () => {
    const table = await openTable()
    const headers = within(table).getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers).toEqual(['Date', 'Vis A', 'Vis B', 'Conv A', 'Conv B', 'CR A', 'CR B', 'Lift'])
  })

  it('haelt den Tages-Uplift zurueck, solange der Tag zu duenn ist', async () => {
    const table = await openTable()
    const rows = within(table).getAllByRole('row').slice(1) // ohne Kopfzeile
    const lift = (i: number) => within(rows[i]).getAllByRole('cell').at(-1)?.textContent
    expect(lift(0)).toBe('—')        // 1 gegen 4 Conversions
    expect(lift(1)).toBe('+100.0%')  // 10 gegen 20
    expect(lift(2)).toBe('—')        // kein Traffic in A
  })

  it('schreibt kein "—%" in die CR-Spalte', async () => {
    const table = await openTable()
    const rows = within(table).getAllByRole('row').slice(1)
    const cells = within(rows[2]).getAllByRole('cell').map((c) => c.textContent)
    expect(cells).toContain('—')
    expect(cells.some((c) => c?.includes('—%'))).toBe(false)
  })
})

describe('Results-Hero-Card', () => {
  it('sagt bei der Gesamtzahl, dass beide Arme zusammengezählt sind', () => {
    renderCard()
    expect(screen.getByText('83')).toBeTruthy()
    expect(screen.getByText(/visitors so far — A \+ B combined/)).toBeTruthy()
    // Und liefert die Aufteilung gleich mit, damit "83" und "30" zusammenpassen.
    expect(screen.getByText('A 53 · B 30')).toBeTruthy()
  })

  it('zeigt in den Anforderungen beide Arme statt eines nackten Minimums', () => {
    const { container } = renderCard()
    const rows = Array.from(container.querySelectorAll('[role="progressbar"]'))
      .map((el) => el.getAttribute('aria-label'))
    expect(rows).toContain('Visitors per variant: A 53, B 30, target 1000 each')
    expect(rows).toContain('Conversions per variant: A 6, B 16, target 25 each')
  })

  it('nennt den Arm, dem die Conversions für einen Uplift fehlen', () => {
    renderCard()
    // 10 - 6 = 4, und zwar in A — nicht "4 pro Variante", wie es vorher dastand.
    expect(screen.getByText(/4 more conversions in variant A/)).toBeTruthy()
  })

  it('rechnet den Uplift aus Rohzählern, nicht aus gerundeten Raten', () => {
    // 110/25000 = 0,44 % gegen 130/25000 = 0,52 % → +18,2 %.
    // Mit den auf eine Nachkommastelle gerundeten Raten waren es "+25,0 %".
    renderCard(
      experiment({
        variants: [
          { id: 'A', label: 'A', views: 25000, conversions: 110, cr: (110 / 25000) * 100 },
          { id: 'B', label: 'B', views: 25000, conversions: 130, cr: (130 / 25000) * 100 },
        ],
      })
    )
    expect(screen.getByText('+18.2%')).toBeTruthy()
    expect(screen.queryByText('+25.0%')).toBeNull()
  })

  it('schätzt die Restzeit über alle Bedingungen, nicht nur über die Konfidenz', async () => {
    renderCard(experiment({ significance: 0.8 }))
    // Bei 15 Besuchern/Tag im schwächeren Arm sind 1.000 pro Arm ~65 Tage
    // entfernt. Die alte Karte versprach hier "~1 day to 95% confidence".
    const badge = await screen.findByText(/until a winner can be called/)
    const days = Number(badge.textContent?.match(/~(\d+)/)?.[1])
    expect(days).toBeGreaterThan(60)
  })

  it('rechnet die Konfidenz live aus denselben Zaehlern statt aus der DB-Spalte', () => {
    // In der DB stehen 99 % — geschrieben beim letzten Conversion-Event. Danach
    // sind Besucher dazugekommen, ohne dass jemand die Spalte fortgeschrieben
    // haette. Aus den Zaehlern daneben ergeben sich rund 22 %.
    renderCard(
      experiment({
        significance: 0.99,
        variants: [
          { id: 'A', label: 'A', views: 500, conversions: 25, cr: 5 },
          { id: 'B', label: 'B', views: 500, conversions: 27, cr: 5.4 },
        ],
      })
    )
    expect(screen.getByText('22%')).toBeTruthy()
    expect(screen.queryByText('99%')).toBeNull()
  })

  it('warnt auf der Ergebnisseite vor kaputter Traffic-Verteilung', () => {
    // 1.400 zu 1.000 bei konfiguriertem 50/50: der Cron erklaert hier keinen
    // Gewinner mehr, die Overview nennt die Zahlen unzuverlaessig — die
    // Ergebnisseite schwieg dazu.
    renderCard(
      experiment({
        trafficSplit: 50,
        variants: [
          { id: 'A', label: 'A', views: 1400, conversions: 70, cr: 5 },
          { id: 'B', label: 'B', views: 1000, conversions: 80, cr: 8 },
        ],
      })
    )
    expect(screen.getByRole('alert').textContent).toMatch(/Traffic split is off/)
    // Und keine Restlaufzeit-Schaetzung fuer einen Test, der so nie entscheidet.
    expect(screen.queryByText(/until a winner can be called/)).toBeNull()
  })

  it('haelt bei pausierten Tests die Hochrechnung zurueck', async () => {
    renderCard(experiment({ status: 'paused' }))
    await screen.findByText('83')
    expect(screen.queryByText(/until a winner can be called/)).toBeNull()
  })

  it('meldet Anforderungen erst als erfüllt, wenn BEIDE Arme sie reißen', () => {
    const { container } = renderCard(
      experiment({
        created_at: new Date(Date.now() - 10 * DAY).toISOString(),
        variants: [
          { id: 'A', label: 'A', views: 5000, conversions: 200, cr: 4 },
          { id: 'B', label: 'B', views: 999, conversions: 60, cr: 6.006 },
        ],
      })
    )
    // 999 von 1.000: der Balken darf hier nicht auf 100 % aufrunden, solange
    // das Gate offen ist — sonst steht ein voller Balken neben einem offenen ○.
    const visitors = container.querySelector('[aria-label^="Visitors per variant"]')
    expect(visitors?.getAttribute('aria-valuenow')).toBe('99')
    expect(screen.getByText(/○ Visitors\/arm/)).toBeTruthy()
    expect(screen.getByText(/✓ Conversions\/arm/)).toBeTruthy()
  })
})
