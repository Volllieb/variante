/**
 * Smoke-Tests — Phase 1 (Landing Page) + Infrastruktur.
 *
 * @smoke — Diese Tests prüfen die grundlegende Erreichbarkeit.
 * Keine Auth, keine DB — reine HTTP- und DOM-Checks.
 *
 * Run: npx playwright test --grep "@smoke"
 */

import { test, expect } from '@playwright/test'

test.describe('Landing Page (@smoke)', () => {
  test('Landing Page lädt mit 200', async ({ page }) => {
    const res = await page.goto('/')
    expect(res?.status()).toBe(200)
  })

  test('Pricing-Sektion sichtbar — Free (0 €) + Pro (35 €/mo)', async ({ page }) => {
    await page.goto('/')
    // Free-Tier
    await expect(page.getByText('0 €')).toBeVisible()
    // Pro-Tier
    await expect(page.getByText('35 €')).toBeVisible()
    // "Most popular"-Badge auf Pro
    await expect(page.getByText(/most popular/i)).toBeVisible()
  })

  test('Footer — Made in Bavaria, Privacy, Imprint, © 2026', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')
    await expect(footer.getByText(/made in bavaria/i)).toBeVisible()
    await expect(footer.getByText(/privacy/i)).toBeVisible()
    await expect(footer.getByText(/imprint/i)).toBeVisible()
    await expect(footer.getByText(/2026/i)).toBeVisible()
  })

  test('Badge-Demo — Floating-Badge "A/B by Variante" klickbar → /signup', async ({ page }) => {
    await page.goto('/')
    const badge = page.getByText(/A\/B by Variante/i)
    await expect(badge).toBeVisible()
    await badge.click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('CTA-Buttons zeigen auf /signup', async ({ page }) => {
    await page.goto('/')
    const buttons = page.locator('a[href="/signup"]')
    const count = await buttons.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })
})

test.describe('API & Assets (@smoke)', () => {
  test('GET /api/resolve mit ?host=example.com → 200/204/500 (Endpoint erreichbar)', async ({ request }) => {
    const res = await request.get('/api/resolve?host=example.com')
    // 200 = OK, 204 = keine Tests, 500 = Supabase nicht konfiguriert (auch ok im Dev)
    expect([200, 204, 500]).toContain(res.status())
  })

  test('OPTIONS /api/resolve → CORS-Header vorhanden', async ({ request }) => {
    const res = await request.fetch('/api/resolve?host=example.com', { method: 'OPTIONS' })
    expect(res.headers()['access-control-allow-origin']).toBeDefined()
  })

  test('GET /ab.js → 200 + text/javascript', async ({ request }) => {
    const res = await request.get('/ab.js')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('javascript')
  })

  test('GET /sitemap.xml → 200', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.status()).toBe(200)
  })

  test('GET /robots.txt → 200', async ({ request }) => {
    const res = await request.get('/robots.txt')
    expect(res.status()).toBe(200)
  })
})

test.describe('Security-Header (@smoke)', () => {
  test('API-Routen haben X-Content-Type-Options: nosniff', async ({ request }) => {
    const res = await request.get('/api/resolve?host=example.com')
    expect(res.headers()['x-content-type-options']).toBe('nosniff')
  })

  test('Pages haben X-Frame-Options (SAMEORIGIN oder DENY)', async ({ request }) => {
    const res = await request.get('/')
    expect(['SAMEORIGIN', 'DENY']).toContain(res.headers()['x-frame-options'])
  })

  test('Static Assets haben Cache-Control', async ({ request }) => {
    const res = await request.get('/ab.js')
    expect(res.headers()['cache-control']).toBeDefined()
  })
})

test.describe('Privacy Pages (@smoke)', () => {
  test('/imprint lädt', async ({ page }) => {
    await page.goto('/imprint')
    await expect(page.locator('h1')).toBeVisible()
  })

  test('/privacy lädt', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.locator('h1')).toBeVisible()
  })
})
