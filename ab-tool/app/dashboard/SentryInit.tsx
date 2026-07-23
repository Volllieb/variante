'use client'

import { useEffect } from 'react'

// Client-Error-Tracking, NUR im Dashboard (Plan OPS-03).
//
// instrumentation.ts lädt Sentry bewusst nur server-/edge-seitig, um die
// Marketing-Seiten bei "zero client JS" zu halten. Das Dashboard ist aber
// vollständig clientseitig gerendert (DashboardClient, ResultsClient,
// AccountClient, der Wizard) — jeder Fehler dort war bisher unsichtbar, außer
// der Kunde schrieb eine Mail. Genau die Fehlerklasse aus Block 0 (der
// funktionslose Re-check-Button) hätte Client-Monitoring binnen einer Stunde
// gemeldet.
//
// Dynamischer Import statt statischem instrumentation-client.ts: so landet das
// Sentry-SDK NUR im Dashboard-Bundle, nicht auf den Marketing-Seiten.
//
// No-op ohne NEXT_PUBLIC_SENTRY_DSN — Dev und Builds ohne DSN unverändert.
// WICHTIG: connect-src in next.config.ts muss die Sentry-Ingest-Domain
// erlauben, sonst blockt die CSP die Beacons still (bereits ergänzt).
export function SentryInit() {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
    if (!dsn) return
    let cancelled = false
    import('@sentry/nextjs').then((Sentry) => {
      if (cancelled) return
      // getClient() verhindert Doppel-Init bei Client-Navigation im Dashboard.
      if (Sentry.getClient()) return
      Sentry.init({
        dsn,
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'production',
        tracesSampleRate: 0.1,
        // DSGVO: keine IPs/Cookies an Sentry — konsistent mit sentry.server.config.ts.
        sendDefaultPii: false,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
      })
    }).catch(() => {
      // SDK-Ladefehler darf das Dashboard nie beeinträchtigen.
    })
    return () => { cancelled = true }
  }, [])

  return null
}
