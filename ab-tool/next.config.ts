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
      // Pages: Weniger strikt (Dashboard braucht Framing für Preview-iframes nicht)
      {
        source: '/((?!api).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '0' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
