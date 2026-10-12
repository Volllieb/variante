'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PandaLogo } from '@/components/PandaLogo'
import { ChevronLeft } from 'lucide-react'
import type { Step } from '../types'

export function OnboardingHeader({
  step,
  setStep,
  router,
}: {
  step: Step
  setStep: (s: Step) => void
  router: ReturnType<typeof useRouter>
}) {
  return (
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
          {step > 1 && (
            <button
              onClick={() => setStep((step - 1) as Step)}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-text-3 transition-colors hover:text-text-2 hover:bg-white/[0.04]"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          )}
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          aria-label="Skip onboarding and go to dashboard"
          className="rounded-full px-4 py-1.5 text-sm font-medium text-text-3 transition-colors hover:text-text-2 hover:bg-white/[0.04]"
        >
          Skip to dashboard
        </button>
      </div>
    </header>
  )
}
