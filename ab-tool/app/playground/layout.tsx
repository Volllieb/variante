import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Variante Playground — Try the Figma Plugin in Your Browser',
  description:
    'Walk through the full Variante workflow — pick an element, set a goal, ship a snippet, watch live results. No Figma account needed.',
  openGraph: {
    title: 'Variante Playground — Try the Figma Plugin in Your Browser',
    description:
      'Walk through the full Variante workflow — pick an element, set a goal, ship a snippet, watch live results. No Figma account needed.',
    url: 'https://www.getvariante.com/playground',
    siteName: 'Variante',
    images: [
      {
        url: 'https://www.getvariante.com/og',
        width: 1200,
        height: 630,
        alt: 'Variante Playground',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Variante Playground — Try the Figma Plugin in Your Browser',
    description:
      'Walk through the full Variante workflow — pick, generate, ship, measure — all in your browser.',
    images: ['https://www.getvariante.com/og'],
  },
}

export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
