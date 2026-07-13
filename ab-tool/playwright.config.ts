import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E-Konfiguration für variante.
 *
 * Lokal:   npx playwright test
 * CI:      npx playwright test --project=chromium-ci
 * Smoke:   npx playwright test --grep "@smoke"
 * Auth:    npx playwright test --grep "@auth"
 *
 * Voraussetzung: `npm run build && npm run start` ODER `npm run dev`
 * Die webServer-Option startet automatisch den Dev-Server.
 */

export default defineConfig({
  testDir: './__tests__/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // CI-spezifisch: headless + no-sandbox für GitHub Actions
    {
      name: 'chromium-ci',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
    },
  ],

  // Dev-Server automatisch starten (nur wenn kein E2E_BASE_URL gesetzt)
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
})
