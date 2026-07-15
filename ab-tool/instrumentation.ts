// Next.js Instrumentation-Hook — lädt die Sentry-Konfiguration pro Runtime.
//
// BEWUSST NUR SERVER + EDGE, KEIN CLIENT:
// layout.tsx hält die Seiten absichtlich auf "zero client JS" (plain <script>-Tags
// statt React-Wrapper, damit der Baum nicht hydriert). Ein Client-SDK würde auf
// JEDER Seite ~30-40 KB JS erzwingen und genau das kaputt machen.
// Die teuren Fehler liegen ohnehin serverseitig: Supabase, OpenAI, Stripe-Webhooks,
// Cron-Jobs. Die deckt dieser Hook ab.
//
// Client-Errors später gewünscht? Dann `instrumentation-client.ts` anlegen
// (Sentry.init) UND connect-src in next.config.ts um die Sentry-Ingest-Domain
// erweitern — sonst blockt die CSP die Beacons still.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Fängt Fehler aus Server-Components, Route-Handlers und Server-Actions ab,
// die Next.js sonst nur in die Vercel-Logs schreibt. No-op ohne DSN.
export { captureRequestError as onRequestError } from '@sentry/nextjs'
