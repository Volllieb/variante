/**
 * croAnalyze — die Analyse muss auf Elemente zeigen, die es wirklich gibt.
 *
 * Regressionen, die diese Datei festhaelt:
 * 1. Das Modell hat Selektoren frei erfunden (gemessen: 3 von 4 Vorschlaegen
 *    ohne Selektor, der vierte war ein href "/signup"). Jetzt waehlt es nur
 *    noch einen Index aus einer DOM-verifizierten Kandidatenliste.
 * 2. "primarySuggestionIndex" kam nie zurueck — das Feld war im Prompt als
 *    Teil eines Vorschlags beschrieben statt als Top-Level-Feld.
 * 3. Jeder AI-Fehler wurde zu "Bitte versuche es erneut", auch bei leerem
 *    Guthaben. Transiente Fehler werden jetzt selbst wiederholt, Endzustaende
 *    sofort als solche gemeldet.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  extractCandidates,
  detectPageLanguage,
  analyzePageWithPrimary,
  AnalyzeError,
} from '@/lib/croAnalyze'

const PAGE = `<!doctype html>
<html lang="de-DE">
  <head><title>Beispiel</title></head>
  <body>
    <main id="main">
      <h1 class="hero-headline">Mehr Umsatz, weniger Aufwand</h1>
      <p class="hero-sub">Wir helfen Teams, schneller zu liefern und dabei Zeit zu sparen.</p>
      <a class="hero-cta" href="/signup">Kostenlos starten</a>
      <button class="nav-back">Zurück</button>
    </main>
  </body>
</html>`

const fetchMock = vi.fn<typeof fetch>()

function aiReply(payload: unknown, init: { ok?: boolean; status?: number; body?: string; headers?: Record<string, string> } = {}) {
  const ok = init.ok ?? true
  return {
    ok,
    status: init.status ?? (ok ? 200 : 500),
    headers: new Headers(init.headers ?? {}),
    json: async () => ({ choices: [{ message: { content: JSON.stringify(payload) }, finish_reason: 'stop' }] }),
    text: async () => init.body ?? '',
  } as unknown as Response
}

function errReply(status: number, body = '', headers: Record<string, string> = {}) {
  return {
    ok: false,
    status,
    headers: new Headers(headers),
    json: async () => ({}),
    text: async () => body,
  } as unknown as Response
}

beforeEach(() => {
  process.env.OPENAI_API_KEY = 'sk-test'
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('extractCandidates', () => {
  it('liefert nur Selektoren, die im DOM genau ein Element treffen', () => {
    const candidates = extractCandidates(PAGE)
    expect(candidates.length).toBeGreaterThan(0)
    for (const c of candidates) {
      expect(c.selector).toBeTruthy()
      // Kein href, kein Pfad — ein Selektor.
      expect(c.selector.startsWith('/')).toBe(false)
    }
    expect(candidates.some((c) => c.selector === '.hero-headline')).toBe(true)
    expect(candidates.some((c) => c.selector === '.hero-cta')).toBe(true)
  })

  it('wirft reine Navigations-Controls raus', () => {
    const candidates = extractCandidates(PAGE)
    expect(candidates.some((c) => c.text.trim() === 'Zurück')).toBe(false)
  })

  it('wirft Consent-/Rechts-Controls raus, laesst Headlines darueber aber stehen', () => {
    const withConsent = PAGE.replace(
      '</main>',
      '<a class="consent-link" href="/c">Cookie Preferences</a>' +
      '<h2 class="privacy-headline">Privacy that respects your data</h2></main>',
    )
    const candidates = extractCandidates(withConsent)
    expect(candidates.some((c) => c.selector === '.consent-link')).toBe(false)
    expect(candidates.some((c) => c.selector === '.privacy-headline')).toBe(true)
  })

  it('fasst textgleiche Kandidaten zusammen', () => {
    const doubled = PAGE.replace('</main>', '<h2 class="dup-headline">Mehr Umsatz, weniger Aufwand</h2></main>')
    const texts = extractCandidates(doubled)
      .filter((c) => c.kind === 'heading')
      .map((c) => c.text)
    expect(new Set(texts).size).toBe(texts.length)
  })
})

describe('detectPageLanguage', () => {
  it('liest <html lang>', () => {
    expect(detectPageLanguage(PAGE)).toBe('de-de')
    expect(detectPageLanguage('<html><body>x</body></html>')).toBeNull()
  })
})

describe('analyzePageWithPrimary', () => {
  const candidates = [
    { selector: '.hero-headline', text: 'Mehr Umsatz', tag: 'h1', kind: 'heading' as const },
    { selector: '.hero-cta', text: 'Kostenlos starten', tag: 'a', kind: 'cta' as const },
  ]

  it('setzt den Selektor aus der Kandidatenliste, nicht aus der AI-Antwort', async () => {
    fetchMock.mockResolvedValue(aiReply({
      suggestions: [
        { candidate: 1, element: 'CTA', original: 'Kostenlos starten', variant: 'Jetzt gratis starten', why: 'x', type: 'text', selector: '/signup' },
      ],
      primarySuggestionIndex: 0,
    }))

    const out = await analyzePageWithPrimary(PAGE, '', { candidates })
    // Der erfundene "/signup" aus der Antwort wird ignoriert.
    expect(out.suggestions[0].selector).toBe('.hero-cta')
  })

  it('laesst einen Vorschlag ohne gueltigen Index OHNE Selektor', async () => {
    fetchMock.mockResolvedValue(aiReply({
      suggestions: [
        { candidate: 99, element: 'Irgendwas', original: 'a', variant: 'b', why: 'x', type: 'text' },
        { candidate: 0, element: 'Headline', original: 'Mehr Umsatz', variant: 'Noch mehr Umsatz', why: 'y', type: 'text' },
      ],
      primarySuggestionIndex: 0,
    }))

    const out = await analyzePageWithPrimary(PAGE, '', { candidates })
    expect(out.suggestions[0].selector).toBeUndefined()
    expect(out.suggestions[1].selector).toBe('.hero-headline')
    // Ein "Best pick" ohne Selektor waere nicht anklickbar → faellt auf den ersten mit.
    expect(out.primarySuggestionIndex).toBe(1)
  })

  it('uebernimmt primarySuggestionIndex, wenn er auf einen brauchbaren Vorschlag zeigt', async () => {
    fetchMock.mockResolvedValue(aiReply({
      suggestions: [
        { candidate: 0, element: 'Headline', original: 'a', variant: 'b', why: 'x', type: 'text' },
        { candidate: 1, element: 'CTA', original: 'c', variant: 'd', why: 'y', type: 'text' },
      ],
      primarySuggestionIndex: 1,
    }))
    const out = await analyzePageWithPrimary(PAGE, '', { candidates })
    expect(out.primarySuggestionIndex).toBe(1)
  })

  it('verwirft Vorschlaege, die denselben Kandidaten nochmal belegen', async () => {
    fetchMock.mockResolvedValue(aiReply({
      suggestions: [
        { candidate: 0, element: 'Headline', original: 'a', variant: 'b', why: 'x', type: 'text' },
        { candidate: 0, element: 'Headline nochmal', original: 'a', variant: 'c', why: 'y', type: 'text' },
        { candidate: 1, element: 'CTA', original: 'd', variant: 'e', why: 'z', type: 'text' },
      ],
      primarySuggestionIndex: 0,
    }))

    const out = await analyzePageWithPrimary(PAGE, '', { candidates })
    expect(out.suggestions).toHaveLength(2)
    expect(out.suggestions.map((s) => s.selector)).toEqual(['.hero-headline', '.hero-cta'])
  })

  it('fragt nur so viele Tests an, wie es Kandidaten gibt', async () => {
    fetchMock.mockResolvedValue(aiReply({ suggestions: [], primarySuggestionIndex: 0 }))
    await analyzePageWithPrimary(PAGE, '', { candidates: [candidates[0]] })
    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))
    expect(body.messages.at(-1).content).toContain('propose 1 specific A/B test')
  })

  it('meldet no-candidates statt OpenAI zu fragen', async () => {
    await expect(analyzePageWithPrimary('<html><body></body></html>', '', { candidates: [] }))
      .rejects.toMatchObject({ kind: 'no-candidates' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('gibt die Seitensprache an das Modell weiter', async () => {
    fetchMock.mockResolvedValue(aiReply({ suggestions: [], primarySuggestionIndex: 0 }))
    await analyzePageWithPrimary(PAGE, '', { candidates })
    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))
    const userPrompt = body.messages.at(-1).content
    expect(userPrompt).toContain('de-de')
  })
})

describe('analyzePageWithPrimary — Fehlerklassen', () => {
  const candidates = [{ selector: '.a', text: 'A', tag: 'a', kind: 'cta' as const }]

  it('wiederholt ein Rate-Limit und liefert danach das Ergebnis', async () => {
    fetchMock
      .mockResolvedValueOnce(errReply(429, 'Rate limit reached', { 'retry-after': '0' }))
      .mockResolvedValueOnce(aiReply({
        suggestions: [{ candidate: 0, element: 'A', original: 'A', variant: 'B', why: 'x', type: 'text' }],
        primarySuggestionIndex: 0,
      }))

    const out = await analyzePageWithPrimary(PAGE, '', { candidates })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(out.suggestions[0].selector).toBe('.a')
  })

  it('wiederholt einen 500er', async () => {
    fetchMock
      .mockResolvedValueOnce(errReply(500))
      .mockResolvedValueOnce(aiReply({ suggestions: [], primarySuggestionIndex: 0 }))
    await analyzePageWithPrimary(PAGE, '', { candidates })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('wiederholt fehlendes Guthaben NICHT — ein zweiter Versuch aendert nichts', async () => {
    fetchMock.mockResolvedValue(errReply(429, '{"error":{"code":"insufficient_quota"}}'))
    await expect(analyzePageWithPrimary(PAGE, '', { candidates }))
      .rejects.toMatchObject({ kind: 'quota' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('wiederholt einen abgelehnten Key NICHT', async () => {
    fetchMock.mockResolvedValue(errReply(401, 'invalid api key'))
    await expect(analyzePageWithPrimary(PAGE, '', { candidates }))
      .rejects.toMatchObject({ kind: 'auth' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('meldet unlesbares JSON als parse-Fehler', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ choices: [{ message: { content: '{"suggestions":[...]}' }, finish_reason: 'stop' }] }),
      text: async () => '',
    } as unknown as Response)

    const err = await analyzePageWithPrimary(PAGE, '', { candidates }).catch((e) => e)
    expect(err).toBeInstanceOf(AnalyzeError)
    expect(err.kind).toBe('parse')
  })

  it('meldet einen fehlenden Key ohne Netzwerkversuch', async () => {
    delete process.env.OPENAI_API_KEY
    await expect(analyzePageWithPrimary(PAGE, '', { candidates }))
      .rejects.toMatchObject({ kind: 'no-key' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
