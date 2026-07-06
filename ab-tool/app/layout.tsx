import './globals.css'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import Script from 'next/script'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata = {
  title: 'Variante — A/B Testing from Figma',
  description:
    'Pick an element on your live site, redesign it in Figma, and let AI generate Variant B. One snippet serves and tracks everything.',
  alternates: {
    canonical: 'https://www.getvariante.com',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable}`} style={{ '--font-display': inter.style.fontFamily } as React.CSSProperties} suppressHydrationWarning>
      <body className="min-h-screen bg-bg-0 text-white/80 antialiased">
        {children}
        <Script src="/ab.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}
