import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Code2, MousePointer2, FlaskConical, ArrowRight } from 'lucide-react'
import { PandaLogo } from '@/components/PandaLogo'

export const metadata: Metadata = {
  title: 'Onboarding — Variante',
  description: 'Get started with A/B testing in 5 minutes. Install the snippet, pick an element, create a variant.',
  robots: { index: false },
}

const STEPS = [
  {
    icon: Code2,
    title: '1. Install the snippet',
    body: 'Paste one script tag into your site. It loads async at 5 KB — zero impact on performance. Works with any stack: Next.js, WordPress, Webflow, Shopify.',
  },
  {
    icon: MousePointer2,
    title: '2. Pick an element',
    body: 'Click any element on your page — a headline, a button, a pricing card. The picker highlights what you selected and reads its current state.',
  },
  {
    icon: FlaskConical,
    title: '3. Create a variant & test',
    body: 'Write the new version — or let the AI draft one. Variante splits traffic, measures conversions, and tells you which version wins. You ship the winner in one click.',
  },
]

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{ source?: string; plan?: string }>
}) {
  const { source, plan } = (await searchParams) ?? {}

  const signupParams = new URLSearchParams()
  if (source) signupParams.set('source', source)
  if (plan) signupParams.set('plan', plan)
  const signupQs = signupParams.toString()
  const signupHref = `/signup${signupQs ? `?${signupQs}` : ''}`

  // Skip-Link: gleiche Query-Parameter + skip=1, damit /signup nicht
  // zurück zu /onboarding redirected.
  const skipParams = new URLSearchParams(signupParams)
  skipParams.set('skip', '1')
  const skipHref = `/signup?${skipParams.toString()}`

  return (
    <div className="min-h-screen bg-bg-0 text-white/80 antialiased flex flex-col">
      {/* Minimal-Header */}
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
          <Link
            href={skipHref}
            className="rounded-full px-4 py-1.5 text-sm font-medium text-text-3 transition-colors hover:text-text-2 hover:bg-white/[0.04]"
          >
            Skip
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-2xl mx-auto text-center">
          {/* Headline */}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            A/B testing in 5 minutes
          </h1>
          <p className="mt-3 text-sm sm:text-base text-white/55 max-w-lg mx-auto">
            No dev ticket. No setup. Paste one snippet, pick what to optimize, and start testing.
          </p>

          {/* Steps */}
          <div className="mt-10 space-y-4 text-left">
            {STEPS.map((step) => (
              <div
                key={step.title}
                className="flex items-start gap-4 rounded-[10px] border border-border bg-bg-1 p-4 sm:p-5"
              >
                <span className="shrink-0 rounded-full bg-white/10 p-2.5 text-white/70">
                  <step.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                  <p className="mt-1 text-sm text-white/55 leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-10 flex flex-col items-center gap-3">
            <Link
              href={signupHref}
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98]"
            >
              Create free account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-xs text-text-3">No credit card required. Free plan included.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
