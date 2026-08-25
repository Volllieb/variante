/**
 * Bot-E2E gegen die LIVE-Kundenseite vallisride.com.
 *
 * Prüft den echten Client-Flow im Produktivbetrieb:
 *   1. ab.js lädt von getvariante.com
 *   2. Variante B wird angewendet UND bleibt klickbar (href, data-ab-href oder
 *      verstecktes Original als Klick-Brücke)
 *   3. Ein Klick auf B löst die Conversion aus und tut zugleich das, was das
 *      Original getan hätte
 *
 * Läuft NICHT in CI (.github/workflows/e2e.yml grept @smoke/@auth/@conversion/
 * @dashboard, nicht @bot): jeder Lauf zählt echte Assignments und Conversions
 * in den Daten eines echten Kunden.
 *
 * Run: npx playwright test __tests__/e2e/bot-vallisride.spec.ts --project=chromium
 *
 * Selektor und snippet_key kommen aus /api/resolve, nicht aus Konstanten.
 * Vorher standen beide hart im File — als der Kunde den Test neu anlegte, war
 * dieser Test stumm rot und behauptete, die Seite sei "evtl. anders strukturiert".
 */

import { test, expect, type Page } from '@playwright/test'

const SITE = 'https://vallisride.com'
const HOST = 'vallisride.com'
const API = 'https://www.getvariante.com'

// Zuweisung ist 50/50 und ohne Consent nicht sticky → bis zur gewünschten
// Variante nachladen. 10 Versuche: die Gegenvariante 10× in Folge zu ziehen
// hat p < 0.1 %.
const MAX_LOADS = 10

type ResolvedTest = {
  snippet_key: string
  selector: string
  goal: string | null
  variant_b_html: string | null
}

let active: ResolvedTest | null = null

test.beforeAll(async ({ request }) => {
  const res = await request.get(`${API}/api/resolve?host=${HOST}`)
  if (!res.ok()) return
  const body = (await res.json()) as { tests?: ResolvedTest[] }
  active = body.tests?.find((t) => !!t.variant_b_html) ?? null
})

/** Lädt die Seite, bis die gewünschte Variante zugewiesen wurde. */
async function loadUntil(page: Page, key: string, want: 'A' | 'B'): Promise<boolean> {
  for (let i = 0; i < MAX_LOADS; i++) {
    await page.goto(SITE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500) // resolve + assign + applyDom
    const isB = (await page.locator(`[data-ab-el="${key}"]`).count()) > 0
    if ((want === 'B') === isB) return true
  }
  return false
}

test.describe('vallisride.com — A/B-Test (@bot)', () => {
  test('ab.js wird geladen', async ({ page }) => {
    await page.goto(SITE)
    await expect(page.locator('script[src*="ab.js"]')).toHaveCount(1, { timeout: 10_000 })
  })

  test('Variante B wird angewendet und bleibt klickbar', async ({ page }) => {
    test.skip(!active, 'kein aktiver Test mit Variante B für diesen Host')
    const key = active!.snippet_key

    // Cursor am Original messen, solange A ausgeliefert wird — er ist der
    // Sollwert für B. Ein <button> bekommt vom Browser cursor:default; sähe B
    // danach anders aus als A, wirkt die Variante tot.
    const gotA = await loadUntil(page, key, 'A')
    const cursorA = gotA
      ? await page.locator(active!.selector).first().evaluate((el) => getComputedStyle(el).cursor)
      : null

    expect(await loadUntil(page, key, 'B'), `Variante B in ${MAX_LOADS} Ladevorgängen nicht zugewiesen`).toBe(true)

    const b = page.locator(`[data-ab-el="${key}"]`)
    await expect(b).toBeAttached()

    const state = await b.evaluate((el) => ({
      href: el.getAttribute('href'),
      dataAbHref: el.getAttribute('data-ab-href'),
      cursor: getComputedStyle(el).cursor,
      hasHiddenOriginal: !!document.querySelector('[data-ab-original]'),
    }))

    // Genau das war der Bug: B war ein Bild von einem Button, ohne jedes Klickziel.
    expect(
      !!(state.href || state.dataAbHref || state.hasHiddenOriginal),
      'B hat weder href noch data-ab-href noch ein verstecktes Original — nicht klickbar'
    ).toBe(true)

    if (cursorA) expect(state.cursor, 'Mauszeiger von B weicht von A ab').toBe(cursorA)
  })

  test('Klick auf B trackt die Conversion UND löst die Aktion des Originals aus', async ({ page }) => {
    test.skip(!active, 'kein aktiver Test mit Variante B für diesen Host')
    const key = active!.snippet_key

    // Den Body des Beacons bekommt Playwright nicht zu sehen: sendBeacon
    // schickt einen Blob, postData() liefert dafür null. Beobachtbar sind
    // Zeitpunkt und Server-Antwort — und die reichen: /api/event verifiziert
    // testId, Variante und Assignment-Token und antwortet nur dann mit 2xx.
    let eventsBeforeClick = 0
    const eventRequests: string[] = []
    const eventStatus: number[] = []
    page.on('request', (req) => { if (req.url().includes('/api/event')) eventRequests.push(req.method()) })
    page.on('response', (res) => { if (res.url().includes('/api/event')) eventStatus.push(res.status()) })

    expect(await loadUntil(page, key, 'B'), `Variante B in ${MAX_LOADS} Ladevorgängen nicht zugewiesen`).toBe(true)

    // Was hätte das Original getan? Im Bridge-Fall steht es versteckt daneben.
    const originalHref = await page
      .locator('[data-ab-original]')
      .first()
      .evaluate((el) => el.getAttribute('href'))
      .catch(() => null)

    eventsBeforeClick = eventRequests.length
    await page.locator(`[data-ab-el="${key}"]`).first().click()
    await page.waitForTimeout(1500) // sendBeacon ist async

    expect(
      eventRequests.length - eventsBeforeClick,
      'Klick auf B hat keine Conversion an /api/event geschickt'
    ).toBeGreaterThan(0)
    expect(eventRequests[eventRequests.length - 1]).toBe('POST')
    // 2xx = der Server hat die Conversion gegen das Assignment verifiziert und
    // gezählt. 4xx hieße: gesendet, aber verworfen — der Test wäre trotzdem tot.
    expect(eventStatus.length, 'keine Antwort auf den Conversion-Beacon').toBeGreaterThan(0)
    expect(eventStatus[eventStatus.length - 1], `/api/event antwortete ${eventStatus.join(',')}`).toBeLessThan(400)

    // Sprungmarke: der Klick muss dieselbe Navigation auslösen wie das Original.
    if (originalHref?.startsWith('#') && originalHref.length > 1) {
      expect(new URL(page.url()).hash, 'B navigiert nicht wie das Original').toBe(originalHref)
    }
  })
})
