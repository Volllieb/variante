/**
 * Domain-Verification E2E-Tests — Baustelle #9 / Roadmap §5.1.
 *
 * @domains — Domain-CRUD, SSRF-Validierung, Verify-Flow.
 *
 * Der echte Snippet-Check braucht eine Live-Site mit installiertem ab.js —
 * hier testen wir die API-Verträge drumherum: Auth-Gates, Input-Validierung,
 * CRUD-Zyklus, Ownership-Check beim Verify.
 *
 * Hinweis: Tests die Login erfordern werden nur ausgeführt wenn
 * `E2E_TEST_EMAIL` + `E2E_TEST_PASSWORD` gesetzt sind.
 *
 * Run: npx playwright test --grep "@domains"
 */

import { test, expect, type Page } from '@playwright/test'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD

/** Hilfsfunktion: Login via Supabase-Auth-Formular. */
async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /log in|sign in|continue/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
}

test.describe('Domains API — Auth-Gates (@domains)', () => {
  test('GET /api/domains ohne Auth → 401', async ({ request }) => {
    const res = await request.get('/api/domains')
    expect(res.status()).toBe(401)
  })

  test('POST /api/domains ohne Auth → 401', async ({ request }) => {
    const res = await request.post('/api/domains', { data: { url: 'example.com' } })
    expect(res.status()).toBe(401)
  })

  test('POST /api/domains/verify ohne Auth → 401', async ({ request }) => {
    const res = await request.post('/api/domains/verify', { data: { domainId: 'x' } })
    expect(res.status()).toBe(401)
  })

  test('DELETE /api/domains ohne Auth → 401', async ({ request }) => {
    const res = await request.delete('/api/domains?id=00000000-0000-4000-8000-000000000000')
    expect(res.status()).toBe(401)
  })
})

if (TEST_EMAIL && TEST_PASSWORD) {
  test.describe('Domains API — Validierung (@domains)', () => {
    // page.request teilt die Session-Cookies des eingeloggten Browser-Kontexts.
    test('POST ohne url → 400', async ({ page }) => {
      await login(page, TEST_EMAIL, TEST_PASSWORD)
      const res = await page.request.post('/api/domains', { data: {} })
      expect(res.status()).toBe(400)
    })

    test('POST mit privatem Host (SSRF) → 400', async ({ page }) => {
      await login(page, TEST_EMAIL, TEST_PASSWORD)
      for (const url of ['localhost', '127.0.0.1', '192.168.1.1', 'nodots']) {
        const res = await page.request.post('/api/domains', { data: { url } })
        expect(res.status(), `"${url}" darf nicht angelegt werden`).toBe(400)
      }
    })

    test('POST /api/domains/verify mit fremder/unbekannter ID → 404', async ({ page }) => {
      await login(page, TEST_EMAIL, TEST_PASSWORD)
      const res = await page.request.post('/api/domains/verify', {
        data: { domainId: '00000000-0000-4000-8000-000000000000' },
      })
      expect(res.status()).toBe(404)
    })
  })

  test.describe('Domains API — CRUD-Zyklus (@domains)', () => {
    test('Domain anlegen → listen → löschen', async ({ page }) => {
      await login(page, TEST_EMAIL, TEST_PASSWORD)
      const domainUrl = `e2e-${Date.now()}.example.com`

      const created = await page.request.post('/api/domains', { data: { url: domainUrl } })
      if (created.status() === 402) {
        test.skip(true, 'Plan-Limit erreicht — Test-Account hat schon max. Domains')
        return
      }
      expect(created.status()).toBe(201)
      const domain = await created.json()
      expect(domain.url).toBe(domainUrl)
      expect(domain.verified).toBeFalsy()

      try {
        // Frisch angelegte Domain erscheint in der Liste, unverifiziert.
        const list = await page.request.get('/api/domains')
        expect(list.status()).toBe(200)
        const { domains } = await list.json()
        expect(domains.some((d: { url: string }) => d.url === domainUrl)).toBe(true)

        // Doppelt anlegen → 409.
        const dup = await page.request.post('/api/domains', { data: { url: domainUrl } })
        expect(dup.status()).toBe(409)
      } finally {
        // Cleanup — auch wenn Asserts oben fehlschlagen.
        const del = await page.request.delete(`/api/domains?id=${domain.id}`)
        expect(del.status()).toBe(200)
      }

      const after = await page.request.get('/api/domains')
      const { domains: remaining } = await after.json()
      expect(remaining.some((d: { url: string }) => d.url === domainUrl)).toBe(false)
    })
  })
}
