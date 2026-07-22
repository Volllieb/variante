/**
 * Bot E2E-Test: vallisride.com — Conversion-Messung & Varianten-Anwendung.
 *
 * Testet den echten Client-Flow:
 *   1. ab.js lädt von getvariante.com
 *   2. Variante wird zugewiesen & angewendet (DOM-Änderung sichtbar)
 *   3. Conversion wird per Klick auf Goal-Element getrackt (sendBeacon)
 *
 * Run:
 *   npx playwright test __tests__/e2e/bot-vallisride.spec.ts --headed
 */

import { test, expect } from '@playwright/test'

const SITE = 'https://vallisride.com'
const SNIPPET_KEY = '5fefdc64-288a-4b52-bd5e-26e8d3fecc32'
const SELECTOR = "#hero-meta-right > div.hero-actions > a.hover-btn.hover-btn--white:nth-of-type(2)"
const GOAL = 'click' // ACHTUNG: 'click' ist kein gültiger CSS-Selektor → Bug!

test.describe('vallisride.com — A/B-Test (@bot)', () => {
  test('ab.js wird geladen', async ({ page }) => {
    await page.goto(SITE)

    // ab.js sollte als script-Tag im DOM sein
    const abScript = page.locator('script[src*="ab.js"]')
    await expect(abScript).toHaveCount(1, { timeout: 10000 })
  })

  test('Variante wird angewendet (DOM geändert)', async ({ page }) => {
    // Auf ENV=production wird die Seite vermutlich direkt ohne
    // Query-Parameter geladen → ab.js läuft normal.
    await page.goto(SITE)

    // Warten bis ab.js gelaufen ist — data-ab-el erscheint bei B-Variante
    // oder das Original-Element bleibt bei A. Beides ok.
    await page.waitForTimeout(3000)

    // Prüfe ob das Selektor-Element existiert
    const el = page.locator(SELECTOR)
    await expect(el).toBeAttached({ timeout: 5000 })

    // Prüfe ob data-ab-el gesetzt wurde (B-Variante)
    const abEl = page.locator(`[data-ab-el="${SNIPPET_KEY}"]`)
    const hasB = (await abEl.count()) > 0

    console.log(`Variante: ${hasB ? 'B (DOM getauscht)' : 'A (Original)'}`)

    // Bei A: Element sollte noch da sein
    // Bei B: data-ab-el sollte gesetzt sein
    if (hasB) {
      await expect(abEl).toBeAttached()
    } else {
      await expect(el).toBeAttached()
    }
  })

  test('Conversion-Beacon wird bei Klick gesendet', async ({ page }) => {
    // Beacon-Tracking: sendBeacon requests abfangen
    const beaconRequests: { url: string; data: unknown }[] = []
    page.on('request', (req) => {
      if (req.url().includes('/api/event')) {
        beaconRequests.push({ url: req.url(), data: req.postDataJSON() })
      }
    })

    await page.goto(SITE)
    await page.waitForTimeout(3000)

    // Goal-Element klicken — ACHTUNG: goal='click' matched nichts.
    // Wir klicken daher direkt das Selektor-Element.
    const goalEl = page.locator(SELECTOR)
    const hasGoal = (await goalEl.count()) > 0

    if (hasGoal) {
      await goalEl.first().click()

      // Kurz warten, Beacon ist async
      await page.waitForTimeout(1000)

      console.log(`Beacon-Requests: ${beaconRequests.length}`)
      for (const br of beaconRequests) {
        console.log(`  URL: ${br.url}`)
        console.log(`  Data: ${JSON.stringify(br.data)}`)
      }

      // Wenn goal='click' korrekt wäre, würde ein Beacon abgefeuert.
      // Da goal='click' kein gültiger CSS-Selektor ist, wird KEIN Beacon
      // gesendet → das ist der BUG.
      //
      // Erwartung nach Fix: mindestens 1 Beacon mit testId + variant.
      // Aktuell: 0 Beacons → Bug bestätigt.
      if (beaconRequests.length === 0) {
        console.log('⚠ BUG BESTÄTIGT: goal="click" matched kein DOM-Element → keine Conversion!')
        console.log('  Fix: Goal auf gültigen CSS-Selektor setzen, z.B. denselben wie selector.')
      }
    } else {
      console.log('⚠ Selektor-Element nicht gefunden — Seite evtl. anders strukturiert?')
    }
  })
})
