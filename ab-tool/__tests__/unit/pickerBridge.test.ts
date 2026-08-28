import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { isSameSite, usePickerBridge, type PickerPayload } from '@/lib/pickerBridge'

/**
 * isSameSite entscheidet, ob eine Picker-Auswahl zur im Wizard eingetippten
 * URL gehört. Vorher stand dort ein strikter origin-Vergleich, der bei jeder
 * Kanonisierungs-Weiterleitung legitime Auswahlen still verworfen hat.
 */
describe('isSameSite', () => {
  it('akzeptiert identische Origins', () => {
    expect(isSameSite('https://example.com', 'https://example.com')).toBe(true)
  })

  // Der eigentliche Regressionsfall: getvariante.com antwortet mit 307 auf
  // www.getvariante.com. Der User tippt die eine Variante, das Popup landet
  // auf der anderen — die Auswahl darf deswegen nicht verloren gehen.
  it('behandelt Apex und www als dieselbe Seite', () => {
    expect(isSameSite('https://www.getvariante.com', 'https://getvariante.com')).toBe(true)
    expect(isSameSite('https://getvariante.com', 'https://www.getvariante.com')).toBe(true)
  })

  // http → https ist die zweite verbreitete Kanonisierung, deshalb vergleicht
  // isSameSite bewusst nur den Hostnamen.
  it('ignoriert das Protokoll', () => {
    expect(isSameSite('https://example.com', 'http://example.com')).toBe(true)
  })

  it('akzeptiert die Ziel-URL ohne Protokoll', () => {
    expect(isSameSite('https://example.com', 'example.com')).toBe(true)
    expect(isSameSite('https://example.com', 'example.com/pricing')).toBe(true)
  })

  it('ignoriert Pfad und Gross-/Kleinschreibung', () => {
    expect(isSameSite('https://example.com', 'https://EXAMPLE.com/a/b?c=d')).toBe(true)
  })

  it('weist fremde Hosts ab', () => {
    expect(isSameSite('https://evil.com', 'https://example.com')).toBe(false)
  })

  // www ist der einzige Sonderfall — andere Subdomains bleiben eigene Seiten.
  it('weist andere Subdomains ab', () => {
    expect(isSameSite('https://app.example.com', 'https://example.com')).toBe(false)
    expect(isSameSite('https://example.com.evil.com', 'https://example.com')).toBe(false)
  })

  it('weist leere und ungültige Werte ab', () => {
    expect(isSameSite(null, 'https://example.com')).toBe(false)
    expect(isSameSite('https://example.com', null)).toBe(false)
    expect(isSameSite('', '')).toBe(false)
    expect(isSameSite('not a url', 'https://example.com')).toBe(false)
  })
})

/**
 * Der Picker liefert seit 08/2026 auch die Styles des gewaehlten Elements mit.
 * Ohne sie rendert die Wizard-Vorschau einen Browser-Default-Button statt des
 * echten Elements (lib/previewDoc.ts) — der Rueckkanal muss das Feld also
 * durchreichen, ohne die Herkunftspruefung aufzuweichen.
 */
describe('usePickerBridge — css im Payload', () => {
  function listen(url: string) {
    const picks: PickerPayload[] = []
    renderHook(() => usePickerBridge({ url, mode: 'element', onPick: (p) => { picks.push(p) } }))
    return picks
  }

  function post(origin: string, data: Record<string, unknown>) {
    window.dispatchEvent(new MessageEvent('message', { data, origin }))
  }

  it('reicht css aus einer postMessage der Zielseite durch', () => {
    const picks = listen('https://example.com')
    post('https://example.com', {
      type: 'ab-pick',
      selector: '.cta',
      html: '<button class="cta">Buy</button>',
      css: '.cta { color: red; }',
    })
    expect(picks).toHaveLength(1)
    expect(picks[0].css).toBe('.cta { color: red; }')
  })

  it('verwirft weiterhin Nachrichten fremder Origins — auch mit css', () => {
    const picks = listen('https://example.com')
    post('https://evil.com', {
      type: 'ab-pick',
      selector: '.cta',
      html: '<button>Buy</button>',
      css: '.cta { color: red; }',
    })
    expect(picks).toHaveLength(0)
  })

  // Alte Picker-Installationen (ab.js im Cache des Kunden) senden kein css.
  it('nimmt Picks ohne css unveraendert an', () => {
    const picks = listen('https://example.com')
    post('https://example.com', { type: 'ab-pick', selector: '.cta', html: '<button>Buy</button>' })
    expect(picks).toHaveLength(1)
    expect(picks[0].css).toBeUndefined()
  })
})
