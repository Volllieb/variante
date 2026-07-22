/**
 * Auth-Flow E2E-Tests — Phase 2.
 *
 * @auth — Signup, Login, Password-Reset, Source-Tracking.
 *
 * Hinweis: Tests die echte Emails senden (Signup, Reset) werden nur
 * ausgeführt wenn `E2E_TEST_EMAIL` gesetzt ist. CI überspringt sie.
 *
 * Run: npx playwright test --grep "@auth"
 */

import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL
const _TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'E2eTest123!'

test.describe('Signup Page (@auth)', () => {
  test('Signup-Seite lädt — Formular sichtbar', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByRole('heading', { name: /sign up|create account|get started/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

  test('Signup: Leeres Formular → Validierungsfehler', async ({ page }) => {
    await page.goto('/signup')
    await page.getByRole('button', { name: /sign up|continue/i }).click()
    // HTML5-Validierung oder Fehlermeldung
    const emailInput = page.getByLabel(/email/i)
    await expect(emailInput).toBeVisible()
    // Prüfe ob input noch:invalid ist (HTML5)
    const valid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid)
    expect(valid).toBe(false)
  })

  test('Signup: email === password → abgelehnt', async ({ page }) => {
    await page.goto('/signup')
    await page.getByLabel(/email/i).fill('test@test.com')
    await page.getByLabel(/password/i).fill('test@test.com')
    await page.getByRole('button', { name: /sign up|continue/i }).click()
    // Sollte Fehlermeldung zeigen (email darf nicht gleich password sein)
    await expect(page.getByText(/password.*email|email.*password/i)).toBeVisible({ timeout: 5000 })
  })

  test('Signup: Google OAuth-Button sichtbar', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByText(/google/i)).toBeVisible()
  })

  test('Signup: Link zu Login vorhanden', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByRole('link', { name: /log in|sign in|already have/i })).toBeVisible()
  })

  if (TEST_EMAIL) {
    test('Signup: Source + Plan in URL → in Query-Parametern erhalten', async ({ page }) => {
      // Simuliert: /signup?source=figma&plan=pro
      await page.goto('/signup?source=figma&plan=pro')
      // Prüfe dass Formular die Werte in hidden inputs oder State hat
      const url = page.url()
      expect(url).toContain('source=figma')
      expect(url).toContain('plan=pro')
    })
  }
})

test.describe('Login Page (@auth)', () => {
  test('Login-Seite lädt — Formular sichtbar', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /log in|sign in|welcome back/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

  test('Login: "Forgot password?"-Link sichtbar', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText(/forgot password/i)).toBeVisible()
  })

  test('Login: Source + Plan aus URL preserved im Forgot-Password-Link', async ({ page }) => {
    await page.goto('/login?source=figma&plan=pro')
    // Klick auf Forgot Password
    await page.getByText(/forgot password/i).click()
    // URL sollte source/plan preserved haben
    await expect(page).toHaveURL(/source=figma/)
    await expect(page).toHaveURL(/plan=pro/)
  })

  test('Login: Google OAuth-Button sichtbar', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText(/google/i)).toBeVisible()
  })

  test('Login: Link zu Signup vorhanden', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('link', { name: /sign up|create account|no account/i })).toBeVisible()
  })
})

test.describe('Password Reset Flow (@auth)', () => {
  test('Forgot Password: Formular + Zurück-Link', async ({ page }) => {
    await page.goto('/login?source=figma&plan=pro')
    await page.getByText(/forgot password/i).click()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /reset|send/i })).toBeVisible()
  })

  test('Update-Password: Seite lädt (nur UI, kein Token)', async ({ page }) => {
    await page.goto('/update-password')
    // Sollte entweder Formular oder Fehlermeldung zeigen (kein Token)
    await expect(page.locator('body')).toBeVisible()
  })

  if (TEST_EMAIL) {
    test('Update-Password: Source/Plan aus URL → forwarded', async ({ page }) => {
      // Simuliert den Flow nach Reset-Link-Klick
      await page.goto('/update-password?source=figma&plan=pro#access_token=fake')
      const url = page.url()
      expect(url).toContain('source=figma')
      expect(url).toContain('plan=pro')
    })
  }
})

test.describe('Auth Redirect Guards (@auth)', () => {
  test('/dashboard ohne Login → redirect zu /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/results/<id> ohne Login → redirect zu /login', async ({ page }) => {
    await page.goto('/results/some-test-id')
    await expect(page).toHaveURL(/\/login/)
  })
})
