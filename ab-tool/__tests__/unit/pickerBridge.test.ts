import { describe, it, expect } from 'vitest'
import { isSameSite } from '@/lib/pickerBridge'

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
