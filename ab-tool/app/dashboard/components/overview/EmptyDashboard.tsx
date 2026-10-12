'use client'

import { FlaskConical, Plus } from 'lucide-react'

export function EmptyDashboard({
  hasVerifiedDomain,
  isPro,
  onNewTest,
}: {
  hasVerifiedDomain: boolean
  isPro: boolean
  onNewTest: () => void
}) {
  return (
    <div className="py-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-bg-2">
        <FlaskConical className="h-6 w-6 text-text-3" />
      </div>
      <h2 className="text-[15px] font-semibold text-text">Create your first test</h2>
      <p className="mt-1.5 text-[13px] text-text-2 max-w-sm mx-auto">
        {hasVerifiedDomain
          ? 'Run your first A/B test in minutes. Pick a page element, let the AI generate a variant, and go live.'
          : 'Tests are saved as drafts until you install the snippet on your site.'}
      </p>
      <div className="mt-5 flex items-center justify-center gap-3">
        <button
          onClick={onNewTest}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-fill-invert px-4 py-2.5 text-[13px] font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover"
        >
          <Plus className="h-4 w-4" />
          New test
        </button>
      </div>
      {!isPro && (
        <p className="mt-3 text-[11px] text-text-3">
          Free plan: 1 active test, 1 domain.{' '}
          <a href="/dashboard/billing" className="underline hover:text-text-2 transition-colors">Upgrade</a>
        </p>
      )}
    </div>
  )
}
