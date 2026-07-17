// Security: Next.js Security-Header-Konfiguration.
// Setzt HTTP-Security-Header für API-Routen und Pages.
// Kein Helmet — native Next.js-Header-API.

import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

// Content-Security-Policy für Pages (nicht für /api — JSON-Antworten rendern nichts,
// dort schützen nosniff + X-Frame-Options: DENY).
//
// Warum die einzelnen Direktiven so aussehen:
// - script-src 'unsafe-inline': Next.js injiziert Inline-Scripts für Hydration/
//   Streaming, dazu kommt der Theme-Script in layout.tsx (verhindert Flash).
//   Ohne Nonce-Umbau ist 'unsafe-inline' unvermeidbar. 'unsafe-eval' nur in Dev (HMR).
//   Vercel Analytics/Speed-Insights laufen über /_vercel/… → same-origin, 'self' reicht.
// - connect-src: Supabase REST + Realtime (useRealtime.ts nutzt WebSockets → wss).
// - img-src https:: Gravatar-Avatare und beliebige Bilder in den Varianten-Previews
//   von Kundenseiten.
// - frame-src 'self': VariantPreview rendert srcDoc-iframes (sandbox=""), die die
//   CSP des Parents erben.
// - style-src 'unsafe-inline': Tailwind-Runtime + die <style>-Blöcke der Varianten.
const isDev = process.env.NODE_ENV === 'development'

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  'upgrade-insecure-requests',
].join('; ')

const nextConfig: NextConfig = {
  // Turbopack root auf ab-tool/ festlegen, da Root package-lock.json existiert
  turbopack: {
    root: '.',
  },
  async redirects() {
    return [
      {
        source: '/playground',
        destination: '/',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      // API-Routen: Strikte Security-Header
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '0' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      // Statische Assets: langes Caching (fingerprinted via Next.js Build)
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Public Assets (ab.js, icon.svg): 1h Stale + Revalidate
      {
        source: '/:file(ab.js|icon.svg)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' },
        ],
      },
      // Fonts: 1 Jahr Cache
      {
        source: '/_next/static/media/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Pages: Weniger strikt (Dashboard braucht Framing für Preview-iframes nicht)
      {
        source: '/((?!api|_next).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '0' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: csp },
          // Opt-out from AI/ML training datasets. Wird von GPTBot, Google Extended,
          // CCBot und anderen KI-Crawlern vor dem Abruf ausgewertet.
          { key: 'X-Robots-Tag', value: 'noai, noimageai' },
        ],
      },
    ]
  },
}

// Sentry nur einhängen, wenn ein DSN existiert. Ohne DSN bleibt der Build exakt
// so wie vorher — kein Sentry-Webpack-Plugin, keine zusätzliche Build-Zeit, keine
// Warnungen. Damit ist das Deploy risikofrei, bevor das Sentry-Projekt steht.
//
// Source-Maps werden nur hochgeladen, wenn zusätzlich SENTRY_AUTH_TOKEN gesetzt ist
// (sonst sind Stacktraces minifiziert, aber der Build bricht nicht ab).
export default process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
      silent: !process.env.CI,
      telemetry: false,
      // Entfernt Sentry-Debug-Logging aus dem Bundle (ersetzt das veraltete disableLogger).
      webpack: { treeshake: { removeDebugLogging: true } },
    })
  : nextConfig
