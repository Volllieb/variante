/**
 * CRO-Agent E2E-Tests — Baustelle #9 / Roadmap §5.1.
 *
 * @agent — Auth-Gate und Input-Validierung von POST /api/agent.
 *
 * BEWUSST NUR VALIDIERUNGSFEHLER: Die Route bucht erst NACH der
 * Body-Validierung $0.03 gegen das OpenAI-Monatslimit (increment_gen_cost).
 * Ein echter Agent-Run (gültige Domain) würde pro CI-Lauf echte OpenAI-Kosten
 * erzeugen und bis zu 120s streamen — das gehört nicht in die E2E-Suite.
 *
 * Hinweis: Tests die Login erfordern werden nur ausgeführt wenn
 * `E2E_TEST_EMAIL` + `E2E_TEST_PASSWORD` gesetzt sind.
 *
 * Run: npx playwright test --grep "@agent"
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

test.describe('Agent API — Auth-Gate (@agent)', () => {
  test('POST /api/agent ohne Auth → 401', async ({ request }) => {
    const res = await request.post('/api/agent', { data: { domain: 'example.com' } })
    expect(res.status()).toBe(401)
  })

  test('POST /api/agent/runs ohne Auth → 401', async ({ request }) => {
    const res = await request.get('/api/agent/runs')
    expect([401, 404, 405]).toContain(res.status())
  })
})

if (TEST_EMAIL && TEST_PASSWORD) {
  test.describe('Agent API — Validierung vor Kostenbuchung (@agent)', () => {
    test('POST mit ungültigem JSON → 400', async ({ page }) => {
      await login(page, TEST_EMAIL, TEST_PASSWORD)
      const res = await page.request.post('/api/agent', {
        headers: { 'Content-Type': 'application/json' },
        data: 'kein json{{',
      })
      expect(res.status()).toBe(400)
    })

    test('POST ohne domain → 400', async ({ page }) => {
      await login(page, TEST_EMAIL, TEST_PASSWORD)
      const res = await page.request.post('/api/agent', { data: { pageGoal: 'signups' } })
      expect(res.status()).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/domain/i)
    })

    test('POST mit domain als Nicht-String → 400', async ({ page }) => {
      await login(page, TEST_EMAIL, TEST_PASSWORD)
      const res = await page.request.post('/api/agent', { data: { domain: 42 } })
      expect(res.status()).toBe(400)
    })
  })
}
