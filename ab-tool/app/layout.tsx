import './globals.css'
import type { ReactNode } from 'react'

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
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">{children}</body>
    </html>
  )
}
