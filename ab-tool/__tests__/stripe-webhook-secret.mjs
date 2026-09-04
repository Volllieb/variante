// Tests für constructStripeEvent aus lib/stripe.ts: Webhook-Signaturen müssen
// sowohl mit dem Live-Secret (STRIPE_WEBHOOK_SECRET) als auch — falls gesetzt —
// mit dem Testmodus-Secret (STRIPE_WEBHOOK_SECRET_TEST) verifiziert werden.
// Hintergrund: Stripe hat pro Modus einen eigenen Webhook-Endpoint mit eigenem
// Signing-Secret; ohne den Fallback scheitern Testmodus-Events mit 400.
//
// Ausführen: node --import tsx __tests__/stripe-webhook-secret.mjs

import assert from 'node:assert'
import crypto from 'node:crypto'
import Stripe from 'stripe'
import { constructStripeEvent } from '../lib/stripe.ts'

let failed = 0
function check(name, fn) {
  try {
    fn()
    console.log('✓', name)
  } catch (err) {
    failed++
    console.error('✗', name, '\n   ', err.message)
  }
}

// constructEvent ist reine Krypto — die Instanz braucht keinen echten Key.
const client = new Stripe('sk_test_dummy')

const PAYLOAD = JSON.stringify({
  id: 'evt_test_123',
  object: 'event',
  type: 'checkout.session.completed',
})

/** Signiert den Payload wie Stripe: HMAC-SHA256 über "<timestamp>.<payload>". */
function sign(payload, secret, t = Math.floor(Date.now() / 1000)) {
  const sig = crypto.createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex')
  return { header: `t=${t},v1=${sig}` }
}

const LIVE_SECRET = 'whsec_live_secret'
const TEST_SECRET = 'whsec_test_secret'

// ── Live-Secret ─────────────────────────────────────────────────────────────
check('Live-signiertes Event + nur Live-Secret → verifiziert', () => {
  const { header } = sign(PAYLOAD, LIVE_SECRET)
  const event = constructStripeEvent(client, PAYLOAD, header, LIVE_SECRET)
  assert.strictEqual(event.type, 'checkout.session.completed')
})

// ── Test-Secret-Fallback ────────────────────────────────────────────────────
check('Test-signiertes Event + Live+Test-Secret → verifiziert via Fallback', () => {
  const { header } = sign(PAYLOAD, TEST_SECRET)
  const event = constructStripeEvent(client, PAYLOAD, header, LIVE_SECRET, TEST_SECRET)
  assert.strictEqual(event.id, 'evt_test_123')
})

check('Test-signiertes Event OHNE Test-Secret → wirft (Bug-Szenario der Stripe-Mail)', () => {
  const { header } = sign(PAYLOAD, TEST_SECRET)
  assert.throws(() => constructStripeEvent(client, PAYLOAD, header, LIVE_SECRET))
})

// ── Unbekanntes Secret ──────────────────────────────────────────────────────
check('Event mit unbekanntem Secret signiert → wirft trotz Fallback', () => {
  const { header } = sign(PAYLOAD, 'whsec_attacker')
  assert.throws(() =>
    constructStripeEvent(client, PAYLOAD, header, LIVE_SECRET, TEST_SECRET)
  )
})

check('Gefälschte Signatur → wirft', () => {
  assert.throws(() =>
    constructStripeEvent(client, PAYLOAD, 't=1,v1=deadbeef', LIVE_SECRET, TEST_SECRET)
  )
})

check('Manipulierter Payload → wirft', () => {
  const { header } = sign(PAYLOAD, LIVE_SECRET)
  assert.throws(() =>
    constructStripeEvent(client, PAYLOAD.replace('completed', 'failed'), header, LIVE_SECRET, TEST_SECRET)
  )
})

if (failed) {
  console.error(`\n${failed} Test(s) fehlgeschlagen`)
  process.exit(1)
}
console.log('\nAlle Stripe-Webhook-Secret-Tests bestanden')
