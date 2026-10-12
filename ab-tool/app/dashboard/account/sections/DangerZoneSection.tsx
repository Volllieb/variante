'use client'

import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'

/** Konto löschen mit Bestätigungseingabe. */
export function DangerZoneSection({
  showDelete,
  setShowDelete,
  deleteConfirm,
  setDeleteConfirm,
  deleting,
  deleteAccount,
  dangerConfirm,
}: {
  showDelete: boolean
  setShowDelete: Dispatch<SetStateAction<boolean>>
  deleteConfirm: string
  setDeleteConfirm: Dispatch<SetStateAction<string>>
  deleting: boolean
  deleteAccount: () => Promise<void>
  dangerConfirm: string
}) {
  return (
    <>
      {/* Danger Zone */}
      <div className="rounded-[var(--radius-lg)] border border-err/20 bg-bg-1 p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-4 w-4 text-err" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-err">Danger Zone</span>
        </div>
        {!showDelete ? (
          <>
            <p className="text-[12px] leading-relaxed text-text-3">
              Permanently delete your account and all associated data — experiments, stats, and settings. This cannot be undone.
            </p>
            <button
              onClick={() => setShowDelete(true)}
              className="mt-3 flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] border border-err/20 bg-err-bg px-4 py-2 text-[11px] font-semibold text-err transition-colors hover:bg-err/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete account
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-[12px] font-semibold text-err">
              Type <code className="rounded-[var(--radius-sm)] bg-err-bg px-1.5 py-0.5 font-mono text-[12px]">{dangerConfirm}</code> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={dangerConfirm}
              className="w-full rounded-[var(--radius-md)] border border-err/20 bg-bg-2 px-3 py-2 font-mono text-[13px] text-text placeholder:text-text-3 focus:border-err/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={deleteAccount}
                disabled={deleting || deleteConfirm !== dangerConfirm}
                className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] bg-err px-4 py-2 text-[11px] font-semibold text-white transition-opacity hover:bg-err/90 disabled:opacity-30"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {deleting ? 'Deleting…' : 'Yes, delete my account'}
              </button>
              <button
                onClick={() => { setShowDelete(false); setDeleteConfirm('') }}
                disabled={deleting}
                className="cursor-pointer rounded-[var(--radius-md)] border border-border px-4 py-2 text-[11px] font-semibold text-text-3 transition-colors hover:text-text disabled:opacity-30"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
