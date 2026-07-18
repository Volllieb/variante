/**
 * Billing/Stripe E2E-Tests — Baustelle #9 / Roadmap §5.1.
 *
 * @billing — Auth-Gates von Checkout/Portal, Webhook-Signatur-Validierung.
 *
 * BEWUSST KEIN AUTHENTIFIZIERTER CHECKOUT: POST /api/billing/checkout legt
 * eine echte Session beim (ggf. Live-)Stripe-Account an. E2E bleibt bei den
 * Verträgen, die ohne Stripe-Seiteneffekte prüfbar sind. Voller Checkout-Flow:
 * manuell mit Stripe-Testmode + `stripe listen` (siehe Roadmap §2.6).
 *
 * Run: npx playwright test --grep "@billing"
 */

import { test, expect } from '@playwright/test'

test.describe('Billing API — Auth-Gates (@billing)', () => {
  test('POST /api/billing/checkout ohne Auth → 401', async ({ request }) => {
    const res = await request.post('/api/billing/checkout', { data: { plan: 'pro' } })
    // 500 nur wenn Stripe lokal nicht konfiguriert ist (fehlende Env-Vars).
    expect([401, 500]).toContain(res.status())
  })

  test('POST /api/billing/portal ohne Auth → 401', async ({ request }) => {
    const res = await request.post('/api/billing/portal')
    expect([401, 500]).toContain(res.status())
  })
})

test.describe('Stripe Webhook — Signatur (@billing)', () => {
  test('POST ohne Signatur-Header → 400', async ({ request }) => {
    const res = await request.post('/api/stripe/webhook', {
      data: { type: 'checkout.session.completed', id: 'evt_fake' },
    })
    // 400 = invalid signature (erwartet), 500 = Stripe lokal nicht konfiguriert.
    expect([400, 500]).toContain(res.status())
  })

  test('POST mit gefälschter Signatur → 400', async ({ request }) => {
    const res = await request.post('/api/stripe/webhook', {
      headers: { 'stripe-signature': 't=1,v1=deadbeef' },
      data: { type: 'checkout.session.completed', id: 'evt_fake' },
    })
    expect([400, 500]).toContain(res.status())
  })

  test('Webhook akzeptiert keine GET-Requests', async ({ request }) => {
    const res = await request.get('/api/stripe/webhook')
    expect([404, 405]).toContain(res.status())
  })
})
