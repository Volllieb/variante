import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { PandaLogo } from '@/components/PandaLogo'
import { HybridDemo } from '@/app/components/HybridDemo'
import { copy } from '@/lib/landingCopy'
import { SkipButton } from '@/app/components/SkipButton'

export const metadata: Metadata = {
  title: 'Onboarding — Variante',
  description: 'See how your website performs with A/B testing in 30 seconds.',
  robots: { index: false },
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{ source?: string; url?: string; plan?: string }>
}) {
  const { source, url, plan } = (await searchParams) ?? {}

  // Skip-Link: gleiche Query-Parameter wie Landingpage-CTAs + skip=1,
  // damit /signup nicht zurück zu /onboarding redirected.
  const skipParams = new URLSearchParams()
  skipParams.set('skip', '1')
  if (source) skipParams.set('source', source)
  if (plan) skipParams.set('plan', plan)
  const skipQs = skipParams.toString()
  const skipHref = `/signup?${skipQs}`

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
              Back
            </Link>
          </div>
          <SkipButton href={skipHref} label="Skip" />
        </div>
      </header>

      {/* Onboarding nimmt den gesamten restlichen Viewport ein */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-5xl">
          <HybridDemo cp={copy} source={source} prefillUrl={url} plan={plan} />
        </div>
      </main>
    </div>
  )
}
