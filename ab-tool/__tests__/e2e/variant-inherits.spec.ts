/**
 * Variante B erbt A — responsives Verhalten zur Laufzeit (ab.js).
 *
 * Der manuelle Editor baut B als Delta auf A; adoptPresentation() in ab.js
 * repariert zusätzlich den Bestand: <button class="ab-variant-b"> (KI-Pfad,
 * alte Tests) bekommt zur Laufzeit A's Klassen, und damit gilt A's komplette
 * Breakpoint-Staffelung weiter — ohne dass das Snippet sie übertragen müsste.
 *
 * Getestet gegen die Fixture /test-page/responsive.html, deren CTA bei
 * @media (max-width: 600px) kleinere font-size/padding bekommt. /api/resolve
 * und /api/assign sind per route-Mock ersetzt — der Test braucht weder DB
 * noch Auth und läuft damit auch in CI.
 *
 * Run: npx playwright test __tests__/e2e/variant-inherits.spec.ts --project=chromium
 */

import { test, expect, type Page } from '@playwright/test'

const PAGE_URL = '/test-page/responsive.html'
const KEY = 'aaaa-bbbb-cccc-dddd'
const SELECTOR = '.responsive-cta'

type ResolveTest = {
  snippet_key: string
  selector: string
  goal: string | null
  variant_b_html: string
  variant_b_css: string
  force: 'B' | null
  path: string | null
}

/** Ersetzt /api/resolve mit dem gegebenen Test — force:'B' wendet B ohne Assign-Call an. */
async function mockResolve(page: Page, t: ResolveTest) {
  await page.route('**/api/resolve*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tests: [t], badge: false }),
    })
  )
  // Assign darf mit force:'B' gar nicht erst aufgerufen werden — abfangen, damit
  // ein unerwarteter Call sichtbar scheitert statt den echten Server zu treffen.
  await page.route('**/api/assign*', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
  )
}

/** Bestandsfall: B bringt nur unseren Marker mit — A's Klassen kommen zur Laufzeit. */
function legacyTest(): ResolveTest {
  return {
    snippet_key: KEY,
    selector: SELECTOR,
    goal: null,
    variant_b_html: '<button class="ab-variant-b">Start now</button>',
    variant_b_css: '',
    force: 'B',
    path: null,
  }
}

function deltaTest(): ResolveTest {
  return {
    snippet_key: KEY,
    selector: SELECTOR,
    goal: null,
    variant_b_html: '<button class="ab-variant-b">Start now</button>',
    variant_b_css: `${SELECTOR} {\n  background-color: #16a34a;\n}`,
    force: 'B',
    path: null,
  }
}

async function stateOfB(page: Page) {
  const b = page.locator(`[data-ab-el="${KEY}"]`)
  await expect(b).toBeAttached()
  return b.evaluate((el) => {
    const cs = getComputedStyle(el)
    return {
      fontSize: cs.fontSize,
      padding: cs.padding,
      background: cs.backgroundColor,
      cursor: cs.cursor,
      className: el.className,
      dataGoal: el.getAttribute('data-goal'),
      dataAbHref: el.getAttribute('data-ab-href'),
    }
  })
}

/**
 * Misst A's Computed-Styles in einem eigenen Load OHNE Snippet (?ab_env=none).
 * Nach der B-Anwendung trägt B dieselbe Klasse wie A — ein danach gemessenes
 * `.responsive-cta` könnte B selbst sein und den Vergleich aushöhlen.
 */
async function measureA(page: Page) {
  await page.goto(PAGE_URL + '?ab_env=none')
  return page.locator(SELECTOR).first().evaluate((el) => {
    const cs = getComputedStyle(el)
    return { fontSize: cs.fontSize, padding: cs.padding, cursor: cs.cursor }
  })
}

test.describe('B erbt A zur Laufzeit (@snippet)', () => {
  test('bei 375px hat B dieselbe font-size/padding wie A — das Erbe trägt', async ({ page }) => {
    await mockResolve(page, legacyTest())
    await page.setViewportSize({ width: 375, height: 720 })

    const a = await measureA(page)
    await page.goto(PAGE_URL)
    const b = await stateOfB(page)

    expect(a.fontSize).toBe('14px')
    expect(b.fontSize).toBe(a.fontSize)
    expect(b.padding).toBe('8px 16px')
    expect(b.padding).toBe(a.padding)
  })

  test('bei 1280px gilt die Desktop-Staffelung für A und B gleichermaßen', async ({ page }) => {
    await mockResolve(page, legacyTest())
    await page.setViewportSize({ width: 1280, height: 800 })

    const a = await measureA(page)
    await page.goto(PAGE_URL)
    const b = await stateOfB(page)

    expect(a.fontSize).toBe('18px')
    expect(b.fontSize).toBe(a.fontSize)
    expect(b.padding).toBe('16px 32px')
    expect(b.padding).toBe(a.padding)
  })

  test('Bestandsfall: <button class="ab-variant-b"> erbt A\'s Klassen und data-Attribute', async ({ page }) => {
    await mockResolve(page, legacyTest())
    await page.goto(PAGE_URL)

    const b = await stateOfB(page)
    expect(b.className).toContain(SELECTOR.slice(1))
    expect(b.dataGoal).toBe('cta')
  })

  test('href bleibt erhalten — B navigiert wie A', async ({ page }) => {
    await mockResolve(page, legacyTest())
    await page.goto(PAGE_URL)

    const b = await stateOfB(page)
    // A ist ein echter Link, B ein <button> → navigate-Modus mit data-ab-href.
    expect(b.dataAbHref).toContain('/test-page/')
  })

  test('Cursor bleibt erhalten — Regressionsschutz (bot-vallisride-Fall)', async ({ page }) => {
    await mockResolve(page, legacyTest())
    const a = await measureA(page)
    await page.goto(PAGE_URL)
    const b = await stateOfB(page)
    expect(b.cursor).toBe(a.cursor)
  })

  test('ein per Delta geändertes background-color greift in BEIDEN Breiten — !important schlägt die Site-Regel', async ({ page }) => {
    await mockResolve(page, deltaTest())
    await page.setViewportSize({ width: 375, height: 720 })
    await page.goto(PAGE_URL)

    let b = await stateOfB(page)
    expect(b.background).toBe('rgb(22, 163, 74)')

    await page.setViewportSize({ width: 1280, height: 800 })
    b = await stateOfB(page)
    expect(b.background).toBe('rgb(22, 163, 74)')
  })
})
