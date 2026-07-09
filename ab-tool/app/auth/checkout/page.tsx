'use client'

import { useEffect, useState } from 'react'

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
          throw new Error(json.error || 'Keine Checkout-URL erhalten')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
        // Fallback: nach 3 s ins Dashboard, damit der User nicht hängt
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 3000)
      }
    }
    startCheckout()
  }, [])

  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {error ? (
        <>
          <p style={{ color: '#ef4444', fontSize: '1.125rem', marginBottom: '0.5rem' }}>
            Checkout konnte nicht gestartet werden: {error}
          </p>
          <p style={{ color: '#6b7280' }}>Du wirst zum Dashboard weitergeleitet …</p>
        </>
      ) : (
        <>
          <div style={{
            width: 40,
            height: 40,
            border: '3px solid #e5e7eb',
            borderTopColor: '#f97316',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            marginBottom: '1rem',
          }} />
          <p style={{ fontSize: '1.125rem', fontWeight: 500 }}>
            Pro-Account wird eingerichtet …
          </p>
          <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
            Du wirst in Kürze zu Stripe weitergeleitet.
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </main>
  )
}
