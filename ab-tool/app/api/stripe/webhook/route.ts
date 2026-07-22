import { supabase } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import type Stripe from 'stripe'

// ponytail: Idempotenz via stripe_webhook_events (Event-ID als PK).
// Verarbeitung erfolgt VOR dem Insert — crashed der Handler nach dem Update
// aber vor dem Insert, wird beim Retry erneut verarbeitet (harmlos, Updates sind idempotent).
// Race bei parallelen Instanzen ist harmlos aus gleichem Grund.
// Kein TTL-Cleanup; bei >100k rows: partition by month, drop >90d.

export async function POST(req: Request) {
  if (!stripe) {
    return Response.json({ error: 'Stripe not configured' }, { status: 500 })
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return Response.json({ error: 'STRIPE_WEBHOOK_SECRET missing' }, { status: 500 })
  }

  const sig = req.headers.get('stripe-signature') || ''
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (e) {
    console.error('[stripe:webhook] signature error:', e)
    return Response.json({ error: 'invalid signature' }, { status: 400 })
  }

  // Idempotenz-Check: Event schon verarbeitet?
  const { data: existing } = await supabase
    .from('stripe_webhook_events')
    .select('event_id')
    .eq('event_id', event.id)
    .maybeSingle()
  if (existing) {
    return Response.json({ received: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session
        // Nur bei bestätigter Zahlung upgraden — async Payment Methods
        // (SEPA, Bank Transfers) feuern das Event ggf. vor Zahlungseingang.
        if (s.payment_status !== 'paid' && s.payment_status !== 'no_payment_required') {
          console.log('[stripe:webhook] checkout session not paid, skipping:', s.id, s.payment_status)
          break
        }
        const customerId = typeof s.customer === 'string' ? s.customer : s.customer?.id
        const subId = typeof s.subscription === 'string' ? s.subscription : s.subscription?.id
        // Plan aus Checkout-Metadata lesen (Fallback: pro)
        const plan = s.metadata?.plan === 'agency' ? 'agency' : 'pro'
        if (customerId) {
          await supabase
            .from('profiles')
            .update({ plan, plan_status: 'active', stripe_subscription_id: subId ?? null })
            .eq('stripe_customer_id', customerId)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
        if (!customerId) break

        const active = sub.status === 'active' || sub.status === 'trialing'
        // past_due/incomplete/paused: User hat gezahlt/gestartet, nicht degradieren.
        // Nur bei canceled/unpaid auf 'free' setzen.
        const ended = sub.status === 'canceled' || sub.status === 'unpaid'

        // Plan anhand der Subscription-Items Price-ID erkennen.
        const agencyPriceId = process.env.STRIPE_PRICE_AGENCY
        const priceId = sub.items?.data?.[0]?.price?.id
        const detectedPlan = priceId && agencyPriceId && priceId === agencyPriceId ? 'agency' : 'pro'
        const plan = active || !ended ? detectedPlan : 'free'

        await supabase
          .from('profiles')
          .update({ plan, plan_status: sub.status })
          .eq('stripe_customer_id', customerId)
        break
      }
    }

    // ponytail: Hier stand revalidateTag('profile', `user-<id>`).
    // In Next.js 16 ist der zweite Parameter ein Cache-Life-PROFILNAME, kein
    // zweiter Tag — 'user-<uuid>' ist kein definiertes Profil. Zudem ruft die
    // Codebase nirgends cacheTag('profile') auf und nutzt kein 'use cache',
    // es gab also gar nichts zu invalidieren.
    //
    // Der Aufruf stand im try-Block VOR dem Idempotenz-Insert: warf er, griff
    // der catch, die Route antwortete 500 und stripe_webhook_events bekam nie
    // einen Eintrag. Stripe wiederholte das Event drei Tage lang und haette den
    // Endpunkt am Ende deaktiviert (Plan BILL-02).
    //
    // Die Profil-Daten werden ohnehin bei jedem Request frisch aus Supabase
    // gelesen; wird spaeter gecached, gehoert hier ein korrektes
    // cacheTag()/revalidateTag()-Paar hin.

    // Erst nach erfolgreicher Verarbeitung als processed markieren,
    // damit Fehler zu einem Retry führen.
    await supabase.from('stripe_webhook_events').insert({ event_id: event.id })
  } catch (e) {
    console.error('[stripe:webhook] handler error:', e)
    return Response.json({ error: 'handler error' }, { status: 500 })
  }

  return Response.json({ received: true })
}
