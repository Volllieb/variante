'use client'

import { Key, Check, Loader2 } from 'lucide-react'

/** Passwort-Reset per Mail. */
export function PasswordSection({
  email,
  pwSent,
  busy,
  changePassword,
}: {
  email: string
  pwSent: boolean
  busy: boolean
  changePassword: () => Promise<void>
}) {
  return (
    <>
      {/* Password */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Key className="h-4 w-4 text-text-3" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">Password</span>
        </div>
        <p className="text-[11px] text-text-3">
          Receive a reset link at <strong className="font-medium text-text-2">{email}</strong>.
        </p>
        <button
          onClick={changePassword}
          disabled={busy || pwSent}
          className="mt-3 flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] border border-border px-4 py-2 text-[11px] font-semibold text-text-2 transition-colors hover:border-border-strong hover:text-text disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : pwSent ? <Check className="h-3.5 w-3.5 text-ok" /> : <Key className="h-3.5 w-3.5" />}
          {pwSent ? 'Link sent — check your inbox' : 'Send password reset link'}
        </button>
      </div>
    </>
  )
}
