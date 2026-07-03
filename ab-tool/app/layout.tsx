import './globals.css'
import type { ReactNode } from 'react'
import { Syne, Manrope } from 'next/font/google'

const display = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

const sans = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata = {
  title: 'Variante — A/B Testing from Figma, No Dev Needed',
  description:
    'Pick an element on your live site, describe the change in Figma, AI generates Variant B. One snippet tracks conversions.',
  alternates: {
    canonical: 'https://www.getvariante.com',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var d=document.documentElement;d.classList.add('__ab_pending');window.__ab_pending_resolve=false;var iv=setInterval(function(){if(window.__ab_pending_resolve){clearInterval(iv);return}},50);setTimeout(function(){clearInterval(iv);d.classList.remove('__ab_pending')},3000)})()`,
          }}
        />
        <script async src="/ab.js" />
      </head>
      <body className="min-h-screen bg-[#06050f] text-white/80 antialiased">{children}</body>
    </html>
  )
}
