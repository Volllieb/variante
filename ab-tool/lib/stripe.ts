import Stripe from 'stripe'

// Server-seitiger Stripe-Client. Null, wenn der Key fehlt (z. B. lokal ohne Billing).
const key = process.env.STRIPE_SECRET_KEY
export const stripe = key ? new Stripe(key) : null

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.getvariante.com'

// Verifiziert ein Webhook-Event gegen das Live-Secret und — falls konfiguriert —
// gegen das Testmodus-Secret. Stripe hat pro Modus einen eigenen Webhook-Endpoint
// mit eigenem Signing-Secret: Livemodus-Events sind mit STRIPE_WEBHOOK_SECRET
// signiert, Testmodus-Events mit STRIPE_WEBHOOK_SECRET_TEST. constructEvent wirft
// bei Mismatch, daher der Fallback, damit Test-Checkouts auch gegen Production
// verarbeitet werden. Wirft, wenn keines der Secrets passt.
export function constructStripeEvent(
  client: Stripe,
  body: string,
  signature: string,
  secret: string,
  testSecret?: string
): Stripe.Event {
  try {
    return client.webhooks.constructEvent(body, signature, secret)
  } catch (primaryError) {
    if (!testSecret) throw primaryError
    return client.webhooks.constructEvent(body, signature, testSecret)
  }
}
