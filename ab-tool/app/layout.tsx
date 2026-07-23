import './globals.css'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import { ToastProvider } from '@/app/components/Toast'

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

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable}`} style={{ '--font-display': inter.style.fontFamily } as React.CSSProperties} suppressHydrationWarning>
      <head>
        {/* variante A/B — paste in <head> on every page */}
        <link rel="preconnect" href="https://www.getvariante.com" />
        <style id="__ab_hide" dangerouslySetInnerHTML={{ __html: 'html.__ab_pending{opacity:0!important}' }} suppressHydrationWarning />
        {/* Opt-out from AI training, screenshots, and generative image models.
            noai / noimageai: respected by GPTBot, Google Extended, CCBot & others.
            max-image-preview:none: prevents large previews in AI interfaces. */}
        <meta name="robots" content="noai, noimageai, max-image-preview:none" />
        {/* Plain script tags, not next/script: beforeInteractive doesn't support inline
            scripts and re-renders the tag through React on the client ("Encountered a
            script tag..."). A plain tag in the server-rendered <head> executes during
            HTML parsing — same timing, no React involvement.
            Production-only: on localhost the CSP (script-src 'self') blocks the
            cross-origin ab.js, so __ab_pending_resolve never fires and the page
            would sit at opacity 0 until the 10s safety timeout. */}
        {process.env.NODE_ENV === 'production' && (
          <>
            <script
              id="ab-pending"
              dangerouslySetInnerHTML={{
                __html: `document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)`,
              }}
            />
            <script id="ab-js" src="https://www.getvariante.com/ab.js" async />
          </>
        )}
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
      <body className="min-h-screen bg-bg-0 text-[#ededed]/80 antialiased" suppressHydrationWarning>
        {/* ponytail (Plan UX-06): Hier stand ein render-blockierendes Inline-Script,
            das html.light aus localStorage['variante-theme'] setzte — für ein
            Light-Theme, das kein Nutzer erreichen konnte (es gibt keinen Toggle)
            und das die Landingpage wegen hartkodierter white-Werte unlesbar machte.
            Wer den Key aus einer alten Session hatte, sah eine leere Seite.
            Script und der html.light-Block in globals.css sind entfernt; die App
            ist bewusst Dark-only, bis Light Mode vollständig gebaut wird. */}
        {/* A11Y-05: Skip-Link (WCAG 2.4.1). Erstes fokussierbares Element, führt
            an der Navigation vorbei zum Hauptinhalt. Zielanker #main sitzt auf den
            <main>-Elementen (Dashboard-Layout, Landingpage). */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[100] focus:rounded focus:bg-fill-invert focus:px-4 focus:py-2 focus:text-text-on-invert focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40"
        >
          Skip to content
        </a>
        <ToastProvider>{children}</ToastProvider>
        {/* Plain script tags — zero client JS (React wrappers force hydration of the entire tree).
            Vercel scripts use History API for SPA navigation detection, no React needed. */}
        <script defer src="/_vercel/insights/script.js" data-sdkn="@vercel/analytics/next" />
        <script defer src="/_vercel/speed-insights/script.js" data-sdkn="@vercel/speed-insights/next" />
      </body>
    </html>
  )
}
