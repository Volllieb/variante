import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { PandaLogo } from '@/components/PandaLogo'
import { HybridDemo } from '@/app/components/HybridDemo'
import { detectLang } from '@/lib/detectLang'
import { getCopy } from '@/lib/landingCopy'
import { SkipButton } from '@/app/components/SkipButton'

export const metadata: Metadata = {
  title: 'Onboarding — Variante',
  description: 'Sieh in 30 Sekunden, wie deine Website mit A/B-Testing performt.',
  robots: { index: false },
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{ source?: string; url?: string; plan?: string }>
}) {
  const { source, url, plan } = (await searchParams) ?? {}
  const lang = await detectLang()
  const cp = getCopy(lang)

  // Skip-Link baut die gleichen Query-Parameter wie die Landingpage-CTAs
  const skipParams = new URLSearchParams()
  if (source) skipParams.set('source', source)
  if (plan) skipParams.set('plan', plan)
  const skipQs = skipParams.toString()
  const skipHref = `/signup${skipQs ? `?${skipQs}` : ''}`

  return (
    <div className="min-h-screen bg-bg-0 text-white/80 antialiased flex flex-col">
      {/* Minimal-Header: Logo + Navigation */}
      <header className="shrink-0 border-b border-border bg-bg-0/95 px-4 sm:px-6">
        <div className="flex items-center justify-between py-2.5 sm:py-3 max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-[1.1rem] font-semibold tracking-tight text-white transition-opacity duration-200 hover:opacity-80"
            >
              <PandaLogo size="md" />
              variante
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-text-3 transition-colors hover:text-text-2 hover:bg-white/[0.04]"
            >
              <ChevronLeft className="h-4 w-4" />
              {lang === 'de' ? 'Zurück' : 'Back'}
            </Link>
          </div>
          <SkipButton href={skipHref} label={lang === 'de' ? 'Überspringen' : 'Skip'} />
        </div>
      </header>

      {/* Onboarding nimmt den gesamten restlichen Viewport ein */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-5xl">
          <HybridDemo cp={cp} source={source} prefillUrl={url} plan={plan} />
        </div>
      </main>
    </div>
  )
}
