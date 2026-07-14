import './globals.css'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import Script from 'next/script'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  adjustFontFallback: true,
  // Only load weights used on the marketing site (400 reg, 600 semibold).
  // Variable font already covers all weights; subsetting reduces CLS by
  // providing tighter fallback metrics via size-adjust.
  weight: ['400', '600'],
})

export const metadata = {
  metadataBase: new URL('https://www.getvariante.com'),
  title: {
    default: 'A/B Testing for Designers — No Developer Needed | Variante',
    template: '%s | Variante',
  },
  description:
    'Every designer can now run A/B tests. Pick an element, redesign in Figma, AI ships Variant B. No dev, no pipeline.',
  alternates: {
    canonical: 'https://www.getvariante.com',
  },
  openGraph: {
    title: 'A/B Testing for Designers — No Developer Needed | Variante',
    description: 'Every designer can now improve conversions with A/B testing. Pick → Generate → Ship. No developer needed.',
    url: 'https://www.getvariante.com',
    siteName: 'Variante',
    images: [
      {
        url: 'https://www.getvariante.com/og',
        width: 1200,
        height: 630,
        alt: 'Variante — A/B Testing from Figma',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'A/B Testing for Designers — No Developer Needed | Variante',
    description: 'Every designer can now improve conversions with A/B testing. No developer needed.',
    images: ['https://www.getvariante.com/og'],
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable}`} style={{ '--font-display': inter.style.fontFamily } as React.CSSProperties} suppressHydrationWarning>
      <head>
        {/* variante A/B — paste in <head> on every page */}
        <link rel="preconnect" href="https://www.getvariante.com" />
        <style id="__ab_hide">html.__ab_pending{"{"}opacity:0!important{"}"}</style>
        <Script
          id="ab-pending"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)`,
          }}
        />
        <Script id="ab-js" src="https://www.getvariante.com/ab.js" strategy="beforeInteractive" async />
        {/* JSON-LD Organization — Root-fallback für alle Seiten */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Variante',
              url: 'https://www.getvariante.com',
              logo: 'https://www.getvariante.com/icon.svg',
              description:
                'A/B Testing from Figma — pick, generate, ship without a developer.',
              sameAs: ['https://github.com/valentinbu/variante'],
            }),
          }}
        />
      </head>
      <body className="min-h-screen bg-bg-0 text-white/80 antialiased" suppressHydrationWarning>
        {children}
        {/* Plain script tags — zero client JS (React wrappers force hydration of the entire tree).
            Vercel scripts use History API for SPA navigation detection, no React needed. */}
        <script defer src="/_vercel/insights/script.js" data-sdkn="@vercel/analytics/next" />
        <script defer src="/_vercel/speed-insights/script.js" data-sdkn="@vercel/speed-insights/next" />
      </body>
    </html>
  )
}
