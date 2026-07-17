// Sentry — Edge-Runtime (proxy.ts, Edge-Routes).
// Wird von instrumentation.ts geladen. Siehe sentry.server.config.ts für die
// Begründung der Optionen. Ohne SENTRY_DSN inaktiv.

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    sendDefaultPii: false,
  })
}
