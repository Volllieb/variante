import './globals.css'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'Variante — Designer-native A/B Testing',
  description: 'Designer-native A/B testing: pick an element, generate Variant B, ship one snippet.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  )
}
