import { supabase } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import type Stripe from 'stripe'

// Stripe-Webhook: hält profiles.plan/plan_status synchron mit dem Abo.
// Braucht den ROHEN Body für die Signaturprüfung → req.text().
export async function POST(req: Request) {
  if (!stripe) {
    return Response.json({ error: 'Stripe nicht konfiguriert' }, { status: 500 })
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return Response.json({ error: 'STRIPE_WEBHOOK_SECRET fehlt' }, { status: 500 })
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

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session
        const customerId = typeof s.customer === 'string' ? s.customer : s.customer?.id
        const subId = typeof s.subscription === 'string' ? s.subscription : s.subscription?.id
        if (customerId) {
          await supabase
            .from('profiles')
            .update({ plan: 'pro', plan_status: 'active', stripe_subscription_id: subId ?? null })
            .eq('stripe_customer_id', customerId)
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
        const active = sub.status === 'active' || sub.status === 'trialing'
        if (customerId) {
          await supabase
            .from('profiles')
            .update({ plan: active ? 'pro' : 'free', plan_status: sub.status })
            .eq('stripe_customer_id', customerId)
        }
        break
      }
    }
  } catch (e) {
    console.error('[stripe:webhook] handler error:', e)
    return Response.json({ error: 'handler error' }, { status: 500 })
  }

  return Response.json({ received: true })
}
