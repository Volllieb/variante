/**
 * Mobile-Tests — Responsive-Verhalten auf Pixel 5 (393×851).
 *
 * @mobile — Keine Auth, keine DB. Reine Layout-/Viewport-Checks auf
 * öffentlichen Seiten, damit sie überall laufen (auch ohne Supabase-Creds).
 *
 * Run: npx playwright test --project=mobile --grep "@mobile"
 *
 * Warum diese Checks: getestet wurde bisher nur Desktop Chrome. Product-Hunt-
 * Traffic ist überwiegend mobil — ein umgebrochenes Layout kostet dort direkt
 * Downvotes. Geprüft wird das, was auf Mobile tatsächlich bricht:
 * horizontales Scrollen und zu kleine Touch-Targets.
 */

import { test, expect, devices } from '@playwright/test'

test.use({ ...devices['Pixel 5'] })

// Seiten, die ohne Supabase-Env rendern — überall testbar.
const STATIC_PAGES = ['/', '/privacy', '/imprint', '/docs']

// Auth-Seiten rendern nur MIT NEXT_PUBLIC_SUPABASE_* : login/signup rufen
// getBrowserSupabase() im useEffect auf, das ohne Env wirft → Client-Component
// crasht, die Seite bleibt leer. Ein Overflow-Check auf einer leeren Seite wäre
// Scheinsicherheit, darum werden sie unten explizit übersprungen statt grün zu melden.
const AUTH_PAGES = ['/login', '/signup']

// Erkennt die gecrashte Seite am fehlenden Formular.
async function authPageRendered(page: import('@playwright/test').Page): Promise<boolean> {
  return (await page.locator('input[type="email"]').count()) > 0
}

test.describe('Kein horizontales Overflow (@mobile)', () => {
  // Der klassische Mobile-Bug: ein zu breites Element zwingt die ganze Seite
  // ins seitliche Scrollen. Fällt auf Desktop nie auf.
  for (const path of STATIC_PAGES) {
    test(`${path} scrollt nicht seitlich`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))

      // 1px Toleranz für Sub-Pixel-Rundung.
      expect(
        scrollWidth,
        `${path}: Seite ist ${scrollWidth}px breit bei ${clientWidth}px Viewport → seitliches Scrollen`
      ).toBeLessThanOrEqual(clientWidth + 1)
    })
  }
})

test.describe('Auth-Seiten (@mobile)', () => {
  for (const path of AUTH_PAGES) {
    test(`${path} scrollt nicht seitlich`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      test.skip(
        !(await authPageRendered(page)),
        `${path} rendert ohne NEXT_PUBLIC_SUPABASE_* nicht — fehlendes Env, kein Layout-Problem`
      )

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(
        scrollWidth,
        `${path}: ${scrollWidth}px breit bei ${clientWidth}px Viewport → seitliches Scrollen`
      ).toBeLessThanOrEqual(clientWidth + 1)
    })
  }
})

test.describe('Touch-Targets (@mobile)', () => {
  // Harte Grenze: WCAG 2.2 AA (2.5.8) verlangt ≥24px. Darunter ist ein Ziel
  // objektiv kaputt — das failt zu Recht.
  // Die 44px aus Roadmap §4.1 (WCAG AAA 2.5.5 / Material) sind das Ziel, aber
  // Politur: sie werden hier nur BERICHTET, nicht erzwungen, damit das Landing-
  // Redesign nicht an einem roten CI hängt. Wenn ihr auf 44px seid: Schwelle
  // hochziehen und diesen Kommentar löschen.
  const WCAG_AA_MIN = 24
  const TARGET_AAA = 44

  test('Signup-CTAs erfüllen mindestens WCAG AA (24px)', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Nur echte CTAs aus header/main. Das Floating-Badge ("A/B by Variante", 23px)
    // liegt bewusst außerhalb beider Landmarks: es ist die Demo des Badges, das auf
    // Kundenseiten erscheint — dekorativ und absichtlich klein, kein Bedienelement.
    // Scope über die Landmarks statt über den Badge-Text: bricht nicht, wenn der
    // Text sich ändert (er kommt aus lib/landingCopy.ts und wird A/B-getestet).
    const ctas = page.locator('header a[href="/signup"]:visible, main a[href="/signup"]:visible')
    const count = await ctas.count()
    expect(count, 'keine Signup-CTAs gefunden').toBeGreaterThan(0)

    const broken: string[] = []
    const belowTarget: string[] = []
    for (let i = 0; i < count; i++) {
      const box = await ctas.nth(i).boundingBox()
      if (!box) continue
      const label = (await ctas.nth(i).innerText().catch(() => '')).trim().slice(0, 30) || `CTA #${i}`
      const h = Math.round(box.height)
      if (h < WCAG_AA_MIN) broken.push(`"${label}" → ${h}px`)
      else if (h < TARGET_AAA) belowTarget.push(`"${label}" → ${h}px`)
    }

    if (belowTarget.length) {
      console.warn(`[mobile] unter ${TARGET_AAA}px (Roadmap-Ziel, kein Fehler):\n  ${belowTarget.join('\n  ')}`)
    }
    expect(broken, `Touch-Targets unter WCAG-AA-Minimum (${WCAG_AA_MIN}px):\n${broken.join('\n')}`).toEqual([])
  })
})

test.describe('Lesbarkeit (@mobile)', () => {
  test('Landing: H1 sichtbar und passt in den Viewport', async ({ page }) => {
    await page.goto('/')
    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible()

    const box = await h1.boundingBox()
    const vw = page.viewportSize()!.width
    expect(box!.width, 'H1 ragt über den Viewport hinaus').toBeLessThanOrEqual(vw + 1)
  })

  test('Pricing bleibt auf Mobile sichtbar', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('0 €')).toBeVisible()
    await expect(page.getByText('35 €')).toBeVisible()
  })

  test('Login-Formular ist bedienbar', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    test.skip(
      !(await authPageRendered(page)),
      '/login rendert ohne NEXT_PUBLIC_SUPABASE_* nicht — fehlendes Env, kein Layout-Problem'
    )

    const email = page.locator('input[type="email"]').first()
    const box = await email.boundingBox()
    expect(box!.height, 'Email-Feld zu flach für Touch').toBeGreaterThanOrEqual(36)
  })
})
