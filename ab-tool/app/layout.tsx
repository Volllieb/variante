import './globals.css'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'

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
  title: {
    default: 'A/B Testing from Figma — No Dev Needed | Variante',
    template: '%s | Variante',
  },
  description:
    'Pick an element on your live site, redesign it in Figma, and let AI generate Variant B. One snippet serves and tracks everything.',
  alternates: {
    canonical: 'https://www.getvariante.com',
  },
  openGraph: {
    title: 'A/B Testing from Figma — No Dev Needed | Variante',
    description: 'Pick → Generate → Ship. A/B testing without a developer.',
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
    title: 'A/B Testing from Figma — No Dev Needed | Variante',
    description: 'Pick → Generate → Ship. A/B testing without a developer.',
    images: ['https://www.getvariante.com/og'],
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable}`} style={{ '--font-display': inter.style.fontFamily } as React.CSSProperties} suppressHydrationWarning>
      <head>
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
      <body className="min-h-screen bg-bg-0 text-white/80 antialiased">
        {children}
        {/* Plain script tags — zero client JS (React wrappers force hydration of the entire tree).
            Vercel scripts use History API for SPA navigation detection, no React needed. */}
        <script defer src="/_vercel/insights/script.js" data-sdkn="@vercel/analytics/next" />
        <script defer src="/_vercel/speed-insights/script.js" data-sdkn="@vercel/speed-insights/next" />
      </body>
    </html>
  )
}
