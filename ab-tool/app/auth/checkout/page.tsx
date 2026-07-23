'use client'

import { useEffect, useState } from 'react'

// ponytail: Diese Seite war komplett deutsch (Plan UX-05) — mitten im sonst
// durchgehend englischen Produkt und genau im Moment der Kaufentscheidung.
// Zusätzlich Inline-Styles statt Design-Tokens und ein Orange-Spinner (#f97316),
// eine Farbe, die es in der Monochrom-Palette gar nicht mehr gibt. Jetzt
// Englisch und auf den Token-Klassen.

export default function CheckoutRedirectPage() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function startCheckout() {
      try {
        const res = await fetch('/api/billing/checkout', { method: 'POST' })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error((body as { error?: string }).error || `HTTP ${res.status}`)
        }
        const json = (await res.json()) as { url?: string; error?: string }
        if (json.url) {
          window.location.href = json.url
        } else {
          throw new Error(json.error || 'No checkout URL received')
        }
      } catch {
        // Rohen Fehler nicht anzeigen (kann Serverdetails enthalten).
        setError('We could not start the checkout. Redirecting you to the dashboard…')
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 3000)
      }
    }
    startCheckout()
  }, [])

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg-0 px-8 text-center">
      {error ? (
        <>
          <p className="mb-2 text-[18px] text-err" role="alert">
            {error}
          </p>
          <p className="text-text-3">Redirecting to your dashboard…</p>
        </>
      ) : (
        <>
          <div
            className="mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-border border-t-text"
            role="status"
            aria-label="Setting up your Pro account"
          />
          <p className="text-[18px] font-medium text-text">Setting up your Pro account…</p>
          <p className="mt-2 text-text-3">You&rsquo;ll be redirected to Stripe in a moment.</p>
        </>
      )}
    </main>
  )
}
