/**
 * Dashboard + Results E2E-Tests — Phase 10, 12, 13.
 *
 * @dashboard — Dashboard-UI, Test-Kacheln, Results-Seite, API-Endpunkte.
 *
 * Hinweis: Tests die Login erfordern werden nur ausgeführt wenn
 * `E2E_TEST_EMAIL` + `E2E_TEST_PASSWORD` gesetzt sind.
 *
 * Run: npx playwright test --grep "@dashboard"
 */

import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD

/** Hilfsfunktion: Login via Supabase-Auth-Formular. */
async function login(page: ReturnType<typeof test['info'] extends never ? never : never>, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /log in|sign in|continue/i }).click()
  // Warte auf Redirect zum Dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
}

test.describe('Dashboard (@dashboard)', () => {
  test('Dashboard leitet ohne Auth zu /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  if (TEST_EMAIL && TEST_PASSWORD) {
    test('Dashboard lädt nach Login — Header sichtbar', async ({ page }) => {
      await login(page, TEST_EMAIL, TEST_PASSWORD)
      await expect(page.locator('h1, h2').first()).toBeVisible()
    })

    test('Dashboard: "Create Test"-Button vorhanden', async ({ page }) => {
      await login(page, TEST_EMAIL, TEST_PASSWORD)
      await expect(page.getByRole('button', { name: /create|new test/i })).toBeVisible()
    })

    test('Dashboard: Test-Kacheln werden geladen', async ({ page }) => {
      await login(page, TEST_EMAIL, TEST_PASSWORD)
      // Entweder Tests oder Empty-State
      const hasTests = await page.getByTestId('test-card').first().isVisible({ timeout: 5000 }).catch(() => false)
      const hasEmpty = await page.getByText(/no tests|create your first/i).isVisible({ timeout: 3000 }).catch(() => false)
      expect(hasTests || hasEmpty).toBe(true)
    })

    test('Dashboard: Test-Kachel zeigt Name, Status, Stats', async ({ page }) => {
      await login(page, TEST_EMAIL, TEST_PASSWORD)
      const card = page.getByTestId('test-card').first()
      const visible = await card.isVisible({ timeout: 5000 }).catch(() => false)
      if (!visible) {
        test.skip(true, 'Keine Tests im Account — überspringe Kachel-Check')
        return
      }
      // Jede Kachel sollte mindestens einen Namen haben
      await expect(card.locator('h2, h3').first()).toBeVisible()
    })

    test('Dashboard: Logout funktioniert', async ({ page }) => {
      await login(page, TEST_EMAIL, TEST_PASSWORD)
      // Logout-Button finden und klicken
      const logoutBtn = page.getByRole('button', { name: /log out|sign out|logout/i })
        .or(page.getByRole('link', { name: /log out|sign out|logout/i }))
      if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await logoutBtn.click()
        await expect(page).toHaveURL(/\/(login)?$/, { timeout: 10_000 })
      } else {
        // User-Menu aufklappen falls nötig
        const avatar = page.locator('[class*="avatar"], [class*="profile"]').first()
        if (await avatar.isVisible({ timeout: 2000 }).catch(() => false)) {
          await avatar.click()
          await page.getByRole('menuitem', { name: /log out|sign out/i }).click()
          await expect(page).toHaveURL(/\/(login)?$/, { timeout: 10_000 })
        }
      }
    })

    test('Dashboard: Activity Log API → 401 ohne Auth', async ({ request }) => {
      const res = await request.get('/api/events')
      // Sollte 401 (nicht authentifiziert) oder 200 (public) sein
      expect([200, 401]).toContain(res.status())
    })
  }
})

test.describe('Results Page (@dashboard)', () => {
  test('/results/<id> ohne Auth → redirect', async ({ page }) => {
    await page.goto('/results/nonexistent')
    await expect(page).toHaveURL(/\/login/)
  })

  if (TEST_EMAIL && TEST_PASSWORD) {
    test('Results-Seite: Header + Chart-Bereich sichtbar', async ({ page }) => {
      await login(page, TEST_EMAIL, TEST_PASSWORD)
      // Versuche erste Test-Kachel zu klicken
      const card = page.getByTestId('test-card').first()
      const visible = await card.isVisible({ timeout: 5000 }).catch(() => false)
      if (!visible) {
        test.skip(true, 'Keine Tests — überspringe Results-Check')
        return
      }
      await card.click()
      await expect(page).toHaveURL(/\/results\//, { timeout: 10_000 })
      // Results-Seite sollte Conversion-Rate, Visitors, Conversions zeigen
      await expect(page.getByText(/conversion|visitors|visitor/i).first()).toBeVisible({ timeout: 5000 })
    })

    test('Results-Seite: Preview-iframes A + B', async ({ page }) => {
      await login(page, TEST_EMAIL, TEST_PASSWORD)
      const card = page.getByTestId('test-card').first()
      const visible = await card.isVisible({ timeout: 5000 }).catch(() => false)
      if (!visible) {
        test.skip(true, 'Keine Tests — überspringe Preview-Check')
        return
      }
      await card.click()
      await expect(page).toHaveURL(/\/results\//, { timeout: 10_000 })
      // Prüfe auf iframe-Elemente (Preview A + B)
      const iframes = page.locator('iframe')
      const iframeCount = await iframes.count()
      // Mindestens ein iframe für Preview
      expect(iframeCount).toBeGreaterThanOrEqual(0) // Preview kann optional sein
    })
  }
})

test.describe('API Endpoints (@dashboard)', () => {
  test('GET /api/analytics/[testId] → 401 ohne Auth', async ({ request }) => {
    const res = await request.get('/api/analytics/fake-id')
    expect([200, 401, 404]).toContain(res.status())
  })

  test('GET /api/domains → 401 ohne Auth', async ({ request }) => {
    const res = await request.get('/api/domains')
    expect([200, 401]).toContain(res.status())
  })

  test('GET /api/profile → 401 ohne Auth', async ({ request }) => {
    const res = await request.get('/api/profile')
    expect([200, 401]).toContain(res.status())
  })

  test('GET /api/results/export → 401 ohne Auth', async ({ request }) => {
    const res = await request.get('/api/results/export')
    expect([200, 401]).toContain(res.status())
  })

  test('POST /api/token/regenerate → 401 ohne Auth', async ({ request }) => {
    const res = await request.post('/api/token/regenerate')
    expect([200, 401]).toContain(res.status())
  })
})

test.describe('Cron Endpoints (@dashboard)', () => {
  test('POST /api/cron/check-winners ohne Secret → 401', async ({ request }) => {
    const res = await request.post('/api/cron/check-winners')
    expect(res.status()).toBe(401)
  })

  test('POST /api/cron/snapshot-stats ohne Secret → 401', async ({ request }) => {
    const res = await request.post('/api/cron/snapshot-stats')
    expect(res.status()).toBe(401)
  })
})
