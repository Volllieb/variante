/**
 * Wizard Step 2 = Change — Änderungsliste statt Variant-Modi.
 *
 * Hält die Kernversprechen des Umbaus fest:
 * - Manual-first: KEIN Generate-Request ohne Klick auf "Suggest changes".
 * - KI als Vorschlagsquelle: Zeilen einzeln annehmbar, Fehler blockiert die
 *   manuelle Liste nicht.
 * - Create-Payload trägt variant_b_changes (und kein goal_selector mehr).
 * - Advanced/Scratch mit Warnung, Ergebnis wie bisher.
 * - Draft-Resume stellt die Liste wieder her, ohne Auto-Request.
 *
 * Benötigt echte Credentials (E2E_TEST_EMAIL/E2E_TEST_PASSWORD) — der
 * Wizard läuft hinter Supabase-Auth, lokal ist kein Login möglich.
 * Tests legen nur DRAFTS an und umgehen damit Domain-Gate und Plan-Limit.
 *
 * Run: npx playwright test __tests__/e2e/wizard-change.spec.ts --project=chromium
 */

import { test, expect, type Page } from '@playwright/test'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD

/** Login via Supabase-Auth-Formular (Muster aus dashboard.spec.ts). */
async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(TEST_EMAIL!)
  await page.getByLabel(/password/i).fill(TEST_PASSWORD!)
  await page.getByRole('button', { name: /log in|sign in|continue/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
}

/**
 * Drawer öffnen und durch Step 0 (Manual Selector, ohne Picker-Popup) und
 * Step 1 (Manual-Goal) bis zur Change-Liste navigieren.
 */
async function openWizardToChange(page: Page) {
  await page.getByRole('button', { name: 'New test' }).click()

  // ── Step 0: URL + Element (Manual Selector — kein Popup nötig) ──
  const urlInput = page.getByPlaceholder('https://example.com/pricing')
  if (!(await urlInput.isVisible({ timeout: 2000 }).catch(() => false))) {
    test.skip(true, 'Account hat verifizierte Domains — anderer Step-0-Pfad')
    return
  }
  await urlInput.fill('https://example.com/pricing')
  await page.getByRole('button', { name: /Manual Selector/ }).click()
  await page.getByPlaceholder('.cta-button, #hero-headline, button.primary').fill('.cta')
  await page.getByRole('button', { name: 'Confirm Element' }).click()
  // Ohne Picker warnt Step 0 sichtbar vor dem fehlenden Style-Kontext.
  await expect(page.getByText(/Picked without the visual picker/)).toBeVisible()
  await page.getByRole('button', { name: 'Confirm & continue' }).click()

  // ── Step 1: Goal (Manual Selector — der Goal-Picker öffnet sonst ein Popup) ──
  await page.getByRole('button', { name: /Manual Selector/ }).click()
  await page.getByPlaceholder('.buy-button, #checkout, button.cta').fill('.cta')
  await page.getByRole('button', { name: 'Apply Selector' }).click()
  await page.getByRole('button', { name: 'Confirm conversion goal' }).click()

  // ── Step 2: Change ──
  await expect(page.getByText(/Variant B is your original plus the changes below/)).toBeVisible()
}

/** Zählt Generate-Requests, ohne sie zu blocken — der Auto-Trigger-Guard. */
async function countGenerateRequests(page: Page, handler: () => void) {
  await page.route('**/api/test-wizard/generate', async (route) => {
    handler()
    await route.continue()
  })
}

test.describe('Wizard Step 2 — Change (@wizard)', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'E2E_TEST_EMAIL/E2E_TEST_PASSWORD fehlen — Login nicht möglich')

  test('Nur Beschriftung ändern, ohne KI: kein Generate-Request, Review konsistent', async ({ page }) => {
    let genCalls = 0
    await countGenerateRequests(page, () => { genCalls++ })

    await login(page)
    await openWizardToChange(page)

    // Manual-first: die Liste startet leer, KEIN Auto-Trigger.
    await expect(page.getByText(/No changes yet/)).toBeVisible()
    expect(genCalls).toBe(0)

    // Nur die Beschriftung ändern — ohne jeden KI-Aufruf.
    await page.getByRole('button', { name: 'Add change' }).click()
    await page.getByRole('button', { name: 'Text' }).click()
    await page.getByPlaceholder('Text').fill('Start free trial')
    await page.getByRole('button', { name: 'Done' }).click()
    expect(genCalls).toBe(0)

    // Next aktiv, Review zeigt dieselbe Zeile.
    const next = page.getByRole('button', { name: 'Next' })
    await expect(next).toBeEnabled()
    await next.click()
    await expect(page.getByText('Changes')).toBeVisible()
    await expect(page.getByText('Start free trial')).toBeVisible()
    await expect(page.getByText(/Old text|Original/).first()).toBeVisible()
  })

  test('Suggest changes (gemockter 200er): Zeilen erscheinen, einzeln übernehmen, Create-Payload enthält variant_b_changes', async ({ page }) => {
    await page.route('**/api/test-wizard/generate', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          variant: 'Start now',
          variant_html: '<button class="cta">Start now</button>',
          variant_css: '.cta { background-color: rgb(255, 0, 0); letter-spacing: 0.5px; }',
          explanation: 'Dringlichkeit statt Generik.',
        }),
      })
    )

    await login(page)
    await openWizardToChange(page)

    await page.getByRole('button', { name: 'Suggest changes' }).click()
    // Text-Zeile + Farb-Zeile + other-Zeile (letter-spacing) als Vorschläge.
    await expect(page.getByRole('button', { name: 'Accept Text suggestion' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Accept Background suggestion' })).toBeVisible()
    await expect(page.getByText(/letter-spacing: 0.5px;/)).toBeVisible()

    // Nur die Text-Zeile übernehmen — die anderen bleiben Vorschläge.
    await page.getByRole('button', { name: 'Accept Text suggestion' }).click()
    await expect(page.getByRole('button', { name: 'Edit Text' })).toBeVisible()

    // Create abfangen: Draft, umgeht Domain-Gate und Plan-Limit.
    let createPayload: Record<string, unknown> | null = null
    await page.route('**/api/test-wizard/create', async (route) => {
      createPayload = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          test: { id: 'e2e-0000-0000-0001', name: 'E2E wizard change', site_url: 'https://example.com/pricing', status: 'draft', snippet_key: 'e2e-key', created_at: new Date().toISOString() },
        }),
      })
    })

    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('button', { name: 'Save Draft' }).click()
    await expect(page.getByText(/Test created/)).toBeVisible()

    expect(createPayload).not.toBeNull()
    // Die Änderungsliste reist mit — und goal_selector ist raus.
    expect(createPayload!.variant_b_changes).toBeTruthy()
    expect(createPayload!).not.toHaveProperty('goal_selector')
    const changes = JSON.parse(String(createPayload!.variant_b_changes))
    expect(Array.isArray(changes.entries)).toBe(true)
    expect(changes.entries.some((e: { status: string }) => e.status === 'applied')).toBe(true)
  })

  test('Gemocktes 429: Banner über der Liste, manuelle Zeile weiterhin möglich', async ({ page }) => {
    await page.route('**/api/test-wizard/generate', (route) =>
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'rate limit', message: 'Max 10 variant generations per minute.' }),
      })
    )

    await login(page)
    await openWizardToChange(page)

    await page.getByRole('button', { name: 'Suggest changes' }).click()
    await expect(page.getByText(/AI suggestions failed/)).toBeVisible()
    await expect(page.getByText('Max 10 variant generations per minute.')).toBeVisible()

    // Liste bleibt bedienbar — manuelle Zeile + Next funktionieren trotz Banner.
    await page.getByRole('button', { name: 'Add change' }).click()
    await page.getByRole('button', { name: 'Background' }).click()
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  test('Advanced/Scratch: Warnung sichtbar, Ergebnis ersetzt A komplett', async ({ page }) => {
    await login(page)
    await openWizardToChange(page)

    await page.getByRole('button', { name: /Advanced: start from scratch/ }).click()
    await expect(page.getByText(/gets its own markup/)).toBeVisible()
    await page.getByRole('button', { name: 'Open scratch editor' }).click()

    await page.getByPlaceholder('Button text').fill('Rebuilt from scratch')
    await page.getByRole('button', { name: 'Apply' }).click()

    await expect(page.getByText('B replaces A completely')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  test('Draft-Resume: Liste wiederhergestellt, kein Auto-Request', async ({ page }) => {
    let genCalls = 0
    await countGenerateRequests(page, () => { genCalls++ })

    await login(page)
    await openWizardToChange(page)

    // Eine Zeile setzen und als Draft speichern (debounced 500 ms → warten).
    await page.getByRole('button', { name: 'Add change' }).click()
    await page.getByRole('button', { name: 'Text' }).click()
    await page.getByPlaceholder('Text').fill('Resume marker text')
    await page.getByRole('button', { name: 'Done' }).click()
    await page.waitForTimeout(1200)

    // Drawer schliessen, neu öffnen — der Draft lädt die Liste wieder.
    await page.getByRole('button', { name: 'Close new test wizard' }).click()
    await page.getByRole('button', { name: 'New test' }).click()
    await expect(page.getByText('Resume marker text')).toBeVisible({ timeout: 10_000 })
    expect(genCalls).toBe(0)
  })
})
