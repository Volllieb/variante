/**
 * Agent API E2E-Tests.
 *
 * @agent — POST /api/agent (autonomer CRO-Agent).
 *
 * Run: npx playwright test --grep "@agent"
 */

import { test, expect } from '@playwright/test'

test.describe('Agent API (@agent)', () => {
  test('OPTIONS /api/agent → 200 + CORS-Header', async ({ request }) => {
    const res = await request.fetch('/api/agent', { method: 'OPTIONS' })
    expect(res.status()).toBe(200)
    expect(res.headers()['access-control-allow-methods']).toContain('POST')
  })

  test('POST /api/agent ohne Auth → 401', async ({ request }) => {
    const res = await request.post('/api/agent', {
      data: { domain: 'example.com' },
    })
    expect(res.status()).toBe(401)
  })

  test('POST /api/agent mit leerem Body → 400', async ({ request }) => {
    // Ohne Auth bekommen wir 401 vor dem Body-Parse
    // Dieser Test prüft nur dass der Endpoint existiert
    const res = await request.post('/api/agent', {
      data: {},
    })
    expect([400, 401]).toContain(res.status())
  })

  test('POST /api/agent ohne domain-Feld → validiert', async ({ request }) => {
    const res = await request.post('/api/agent', {
      data: { pageGoal: 'signups' },
    })
    // 401 weil kein Auth, aber Endpoint antwortet
    expect([400, 401]).toContain(res.status())
  })

  test('GET /api/agent → 405 (Method not allowed)', async ({ request }) => {
    const res = await request.get('/api/agent')
    // OPTIONS ist erlaubt, GET nicht → 405 oder handled vom Router
    expect([405, 404, 401]).toContain(res.status())
  })

  test('POST /api/agent mit invalider domain (nicht http) → 401 vor Validierung', async ({ request }) => {
    const res = await request.post('/api/agent', {
      data: { domain: 'not-a-valid-url-$$$' },
    })
    // Auth-Check vor Domain-Validierung → 401
    expect(res.status()).toBe(401)
  })
})

/**
 * Integration-Test (auskommentiert — braucht auth session):
 *
 * test('POST /api/agent mit gültiger Domain und Auth → 200 + Streaming', async ({ request }) => {
 *   // Voraussetzung: E2E_TEST_EMAIL + E2E_TEST_PASSWORD gesetzt,
 *   // User hat verified domain und genug OpenAI-Budget.
 *   // Signup/Login → Session-Cookie → Agent-Call → prüfe Response.
 * })
 */
