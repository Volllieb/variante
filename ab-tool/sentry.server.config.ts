// Sentry — Node.js-Runtime (API-Routes, Server-Components, Cron-Jobs).
// Wird von instrumentation.ts geladen.
//
// Ohne SENTRY_DSN passiert NICHTS: init() wird gar nicht erst aufgerufen, der SDK
// bleibt inaktiv. Dev-Runs und Builds ohne DSN verhalten sich exakt wie vorher.
// Aktivieren: SENTRY_DSN in Vercel (Production + Preview) setzen.

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    // 10% Traces in Production — reicht für Latenz-Trends, ohne das Kontingent
    // zu sprengen. Lokal 100%, damit man beim Debuggen alles sieht.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // DSGVO: keine IPs/Cookies/Header-Bodies an Sentry. Die Codebase hält
    // personenbezogene Daten bewusst raus (vgl. lib/safeLog.ts, lib/pii.ts) —
    // Error-Tracking darf das nicht unterlaufen.
    sendDefaultPii: false,
  })
}
