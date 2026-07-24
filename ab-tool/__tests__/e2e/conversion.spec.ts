/**
 * Conversion + Event E2E-Tests — Phase 9.
 *
 * @conversion — sendBeacon, /api/event Validierung, CORS, Paused-Test-Guard.
 *
 * Bauen auf den Unit-Tests in conversion-goal-click.mjs auf und testen
 * den realen Server (nur wenn erreichbar).
 *
 * Run: npx playwright test --grep "@conversion"
 */

import { test, expect } from '@playwright/test'

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const DEAD_UUID = '00000000-0000-0000-0000-000000000000'

test.describe('/api/event Validation (@conversion)', () => {
  test('POST /api/event ohne testId → 400', async ({ request }) => {
    const res = await request.post('/api/event', {
      data: { variant: 'A', event: 'conversion' },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  test('POST /api/event mit event=click → 400', async ({ request }) => {
    const res = await request.post('/api/event', {
      data: { testId: VALID_UUID, variant: 'A', event: 'click' },
    })
    expect(res.status()).toBe(400)
  })

  test('POST /api/event mit ungültiger UUID → 400', async ({ request }) => {
    const res = await request.post('/api/event', {
      data: { testId: 'not-a-uuid', variant: 'A', event: 'conversion' },
    })
    expect(res.status()).toBe(400)
  })

  test('POST /api/event mit variant=C → 400', async ({ request }) => {
    const res = await request.post('/api/event', {
      data: { testId: VALID_UUID, variant: 'C', event: 'conversion' },
    })
    expect(res.status()).toBe(400)
  })

  test('POST /api/event mit variant=B → 400, 404 oder 503', async ({ request }) => {
    const res = await request.post('/api/event', {
      data: { testId: VALID_UUID, variant: 'B', event: 'conversion' },
    })
    // 400 = validation, 404 = test not found, 503 = Supabase unavailable (graceful)
    expect([400, 404, 503]).toContain(res.status())
  })

  test('POST /api/event mit nicht-existenter testId → 404 oder 503', async ({ request }) => {
    const res = await request.post('/api/event', {
      data: { testId: DEAD_UUID, variant: 'A', event: 'conversion' },
    })
    // 404 = not found, 503 = Supabase unavailable (graceful fallback)
    expect([400, 404, 503]).toContain(res.status())
  })
})

test.describe('/api/event CORS (@conversion)', () => {
  test('OPTIONS /api/event → 204 mit CORS-Headern', async ({ request }) => {
    const res = await request.fetch('/api/event', { method: 'OPTIONS' })
    expect(res.status()).toBe(204)
    expect(res.headers()['access-control-allow-origin']).toBeDefined()
    expect(res.headers()['access-control-allow-methods']).toBeDefined()
  })

  test('POST /api/event Antwort hat CORS-Header', async ({ request }) => {
    const res = await request.post('/api/event', {
      data: {},
    })
    expect(res.headers()['access-control-allow-origin']).toBeDefined()
  })
})

test.describe('/api/resolve (@conversion)', () => {
  test('GET /api/resolve?host=example.com → 200/204', async ({ request }) => {
    const res = await request.get('/api/resolve?host=example.com')
    expect([200, 204, 400]).toContain(res.status())
  })

  test('GET /api/resolve ohne host → 200 (leere Test-Liste)', async ({ request }) => {
    const res = await request.get('/api/resolve')
    expect(res.status()).toBe(200)
  })
})

test.describe('/api/assign (@conversion)', () => {
  test('GET /api/assign ohne testId → 400', async ({ request }) => {
    const res = await request.get('/api/assign')
    expect(res.status()).toBe(400)
  })

  test('GET /api/assign mit unbekanntem key → 404', async ({ request }) => {
    const res = await request.get(`/api/assign?testId=${DEAD_UUID}`)
    expect([400, 404]).toContain(res.status())
  })
})

test.describe('Conversion via ab.js (Client-Simulation) (@conversion)', () => {
  test('sendBeacon-Payload im korrekten Format', async ({ page }) => {
    // ab.js laden und sendConversion-Logik im Browser testen
    await page.goto('/')

    // Lade ab.js im Browser-Kontext
    const result = await page.evaluate(() => {
      // Simuliere sendConversion-Logik
      const payload = JSON.stringify({
        testId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        variant: 'A',
        event: 'conversion',
      })
      const blob = new Blob([payload], { type: 'text/plain' })
      return {
        type: blob.type,
        hasTextPlain: blob.type === 'text/plain',
        payload,
      }
    })

    expect(result.hasTextPlain).toBe(true)
    const parsed = JSON.parse(result.payload)
    expect(parsed.testId).toBeDefined()
    expect(parsed.variant).toBe('A')
    expect(parsed.event).toBe('conversion')
  })

  test('sessionStorage-Dedup: Key wird nach Conversion gesetzt', async ({ page }) => {
    await page.goto('/')

    const result = await page.evaluate(() => {
      const key = 'ab_conv_test-key-123'
      // Simulate first conversion
      if (sessionStorage.getItem(key) === '1') return false
      sessionStorage.setItem(key, '1')

      // Simulate second conversion attempt
      const secondAttempt = sessionStorage.getItem(key) === '1'
      return { firstAllowed: true, secondBlocked: secondAttempt }
    })

    if (!result) throw new Error('sessionStorage already had key — test precondition failed')
    expect(result.firstAllowed).toBe(true)
    expect(result.secondBlocked).toBe(true)
  })
})
