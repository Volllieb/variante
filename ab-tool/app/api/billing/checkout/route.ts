import { supabase } from '@/lib/supabase'
import { stripe, SITE_URL } from '@/lib/stripe'
import { getSessionUser } from '@/lib/supabaseServer'

const PRICE_IDS: Record<string, string | undefined> = {
  pro: process.env.STRIPE_PRICE_PRO,
  agency: process.env.STRIPE_PRICE_AGENCY,
}

// Startet einen Stripe-Checkout für Pro- oder Agency-Abo.
// Body: { plan?: 'pro' | 'agency' } — default 'pro'.
export async function POST(req: Request) {
  if (!stripe) {
    return Response.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  let plan: 'pro' | 'agency' = 'pro'
  try {
    const body = await req.json() as { plan?: string }
    if (body.plan === 'agency') plan = 'agency'
  } catch { /* body optional */ }

  const priceId = PRICE_IDS[plan]
  if (!priceId) {
    return Response.json({ error: `STRIPE_PRICE_${plan.toUpperCase()} missing` }, { status: 500 })
  }

  const user = await getSessionUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  // Stripe-Customer holen oder anlegen und am Profil speichern.
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id ?? undefined
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    })
    customerId = customer.id
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('user_id', user.id)
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { plan },
    success_url: `${SITE_URL}/dashboard?upgraded=1`,
    cancel_url: `${SITE_URL}/dashboard`,
    client_reference_id: user.id,
  })

  return Response.json({ url: session.url })
}
