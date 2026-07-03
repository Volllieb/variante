import './globals.css'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var d=document.documentElement;d.classList.add('__ab_pending');window.__ab_pending_resolve=false;var iv=setInterval(function(){if(window.__ab_pending_resolve){clearInterval(iv);return}},50);setTimeout(function(){clearInterval(iv);d.classList.remove('__ab_pending')},10000)})()`,
          }}
        />
        <script async src="/ab.js" />
      </head>
      <body className="min-h-screen bg-[#000000] text-white/80 antialiased">{children}</body>
    </html>
  )
}
