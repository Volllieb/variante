'use client'

import { AlertTriangle, Check, FlaskConical } from 'lucide-react'
import { Toggle } from '@/app/components/Toggle'

/** Experiment-Einstellungen: Auto-Apply und Winner-Mails (Plan RA-06). */
export function ExperimentSettingsSection({
  email,
  autoPromote,
  notifyWinner,
  prefsError,
  savePreference,
}: {
  email: string
  autoPromote: boolean
  notifyWinner: boolean
  prefsError: string
  savePreference: (patch: { auto_promote_winner?: boolean } | { notify_on_winner?: boolean }) => Promise<void>
}) {
  return (
    <>
      {/* Experiments — Auto-Promotion & Winner-Mails (Plan RA-06) */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical className="h-4 w-4 text-text-3" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">Experiments</span>
        </div>

        <div className="space-y-4">
          {/* Auto-apply winners */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <label htmlFor="auto-promote" className="cursor-pointer text-[13px] font-medium text-text">
                Apply winners automatically
              </label>
              <p className="mt-1 text-[11px] leading-relaxed text-text-3">
                When a test reaches significance, serve the winning variant to{' '}
                <strong className="font-medium text-text-2">all</strong> visitors and close the test.
                Turn this off to review each winner before it goes live on your site.
              </p>
            </div>
            <Toggle
              id="auto-promote"
              checked={autoPromote}
              onChange={(next) => savePreference({ auto_promote_winner: next })}
              label="Apply winners automatically"
            />
          </div>

          {!autoPromote && (
            <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-border bg-bg-2 px-3 py-2.5">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" />
              <p className="text-[11px] leading-relaxed text-text-3">
                Winners will be recorded and you&apos;ll be notified, but nothing changes on your site
                until you hit <strong className="font-medium text-text-2">Apply winner</strong> on the
                test. Tests keep running at their current split in the meantime.
              </p>
            </div>
          )}

          <div className="h-px bg-border" />

          {/* Winner emails */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <label htmlFor="notify-winner" className="cursor-pointer text-[13px] font-medium text-text">
                Email me when a test finds a winner
              </label>
              <p className="mt-1 text-[11px] leading-relaxed text-text-3">
                One email per test, sent to <strong className="font-medium text-text-2">{email}</strong>.
                In-app notifications stay on either way.
              </p>
            </div>
            <Toggle
              id="notify-winner"
              checked={notifyWinner}
              onChange={(next) => savePreference({ notify_on_winner: next })}
              label="Email me when a test finds a winner"
            />
          </div>

          {prefsError && (
            <p className="flex items-center gap-1.5 text-[11px] text-err" role="alert">
              <AlertTriangle className="h-3.5 w-3.5" />
              {prefsError}
            </p>
          )}
        </div>
      </div>
    </>
  )
}
