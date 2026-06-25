import { supabase } from '@/lib/supabase'
import { stripe, SITE_URL } from '@/lib/stripe'
import { getSessionUser } from '@/lib/supabaseServer'

// Öffnet das Stripe Customer Portal (Abo verwalten/kündigen).
export async function POST() {
  if (!stripe) {
    return Response.json({ error: 'Stripe nicht konfiguriert' }, { status: 500 })
  }

  const user = await getSessionUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (!profile?.stripe_customer_id) {
    return Response.json({ error: 'Kein Stripe-Kunde — zuerst upgraden.' }, { status: 400 })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${SITE_URL}/dashboard`,
  })

  return Response.json({ url: session.url })
}
