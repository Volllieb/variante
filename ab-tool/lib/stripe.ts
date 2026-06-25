import Stripe from 'stripe'

// Server-seitiger Stripe-Client. Null, wenn der Key fehlt (z. B. lokal ohne Billing).
const key = process.env.STRIPE_SECRET_KEY
export const stripe = key ? new Stripe(key) : null

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://getvariante.com'
