'use client'

import type { TestRow } from '../TestCard'
import { Globe } from 'lucide-react'

/**
 * Der Blocker für den Hybrid-Onboarding-Fall: Variante existiert schon, das
 * Snippet fehlt. Ersetzt den Snippet-Banner, statt ihn zu verdoppeln — die
 * Verifikation selbst läuft dann über /dashboard/account.
 */
export function PreviewReadyBlocker({ test }: { test: TestRow }) {
  return (
    <div className="mb-5 flex flex-col gap-4 rounded-[var(--radius-lg)] border border-pro/25 bg-pro/[0.05] p-4 sm:flex-row sm:items-center">
      {test.preview_variant_screenshot_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={test.preview_variant_screenshot_url} alt="" className="h-20 w-32 shrink-0 rounded-[var(--radius-md)] border border-border object-cover object-top" />
      )}
      <div className="min-w-0 flex-1">
        <h2 className="text-[14px] font-semibold text-text">Your variant is ready — one step left</h2>
        <p className="mt-1 text-[12px] text-text-2">
          <span className="font-medium text-text">{test.name}</span> is saved as a draft. Add the one-line snippet to your site and this test goes live.
        </p>
      </div>
      <a href="/dashboard/account" className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] bg-fill-invert px-4 py-2.5 text-[12px] font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover">
        <Globe className="h-3.5 w-3.5" />
        Install snippet
      </a>
    </div>
  )
}
