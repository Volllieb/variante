'use client'

import { Mail, Check, Loader2 } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'

/** Aktuelle E-Mail und Änderung per Bestätigungsmail. */
export function EmailSection({
  email,
  newEmail,
  setNewEmail,
  emailSent,
  busy,
  changeEmail,
}: {
  email: string
  newEmail: string
  setNewEmail: Dispatch<SetStateAction<string>>
  emailSent: boolean
  busy: boolean
  changeEmail: () => Promise<void>
}) {
  return (
    <>
      {/* Current email */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-4 w-4 text-text-3" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">Email</span>
        </div>
        <p className="text-[15px] font-medium text-text">{email}</p>

        <div className="mt-4 space-y-3">
          <p className="text-[11px] text-text-3">Change to a new email address. A confirmation link will be sent.</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new@email.com"
              className="flex-1 rounded-[var(--radius-md)] border border-border bg-bg-2 px-3 py-2 text-[13px] text-text placeholder:text-text-3 focus:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0"
            />
            <button
              onClick={changeEmail}
              disabled={busy || emailSent}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] bg-fill-invert px-4 py-2 text-[11px] font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : emailSent ? <Check className="h-3.5 w-3.5" /> : null}
              {emailSent ? 'Sent' : 'Change'}
            </button>
          </div>
          {emailSent && (
            <p className="flex items-center gap-1.5 text-[12px] text-ok">
              <Check className="h-3 w-3" />
              Confirmation sent — check both old and new inbox.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
