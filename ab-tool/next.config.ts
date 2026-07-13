// Security: Next.js Security-Header-Konfiguration.
// Setzt HTTP-Security-Header für API-Routen und Pages.
// Kein Helmet — native Next.js-Header-API.

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
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
        ],
      },
    ]
  },
}

export default nextConfig
