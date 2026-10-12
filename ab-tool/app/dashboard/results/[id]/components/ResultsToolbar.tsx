'use client'

import { Breadcrumbs } from '@/app/components/Breadcrumbs'
import { Tooltip } from '@/app/components/Tooltip'
import { formatCreatedAt } from '@/lib/resultsHelpers'
import { RefreshCw, Pause, Play, Trash2, Trophy } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'

/** Kopfzeile: Breadcrumb, Status-Pille, Apply/Pause/Resume, Refresh, Löschen mit Inline-Confirm. */
export function ResultsToolbar({
  name,
  from,
  backHref,
  created_at,
  statusColor,
  winnerPending,
  winner,
  status,
  busy,
  refreshing,
  deleteConfirm,
  deleting,
  applyWinner,
  toggleStatus,
  refresh,
  setDeleteConfirm,
  deleteTest,
}: {
  name: string
  from: string | null
  backHref: string
  created_at: string
  statusColor: string
  winnerPending: boolean
  winner: string | null
  status: string
  busy: boolean
  refreshing: boolean
  deleteConfirm: boolean
  deleting: boolean
  applyWinner: () => Promise<void>
  toggleStatus: (next: 'active' | 'paused') => Promise<void>
  refresh: () => Promise<void>
  setDeleteConfirm: Dispatch<SetStateAction<boolean>>
  deleteTest: () => Promise<void>
}) {
  return (
    <>
      {/* Test toolbar */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex items-center gap-3">
          <Breadcrumbs items={[{ label: from === 'tests' ? 'Tests' : 'Dashboard', href: backHref }, { label: name }]} />
          <span className="text-[11px] text-text-3 ml-3">
            Created {formatCreatedAt(created_at)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-[var(--radius-md)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusColor}`}>
            {winnerPending ? `${winner} won · not applied` : winner ? `${winner} won` : status}
          </span>
          {/* Plan RA-06: Nur sichtbar, wenn die Auto-Promotion aus ist und ein
              Gewinner auf Freigabe wartet. Bei aktiver Auto-Promotion tritt
              dieser Zustand nie auf — der Cron setzt done direkt. */}
          {winnerPending && (
            <button
              onClick={applyWinner}
              disabled={busy}
              className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] bg-fill-invert px-3 py-1.5 text-xs font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trophy className="h-3 w-3" /> Apply winner
            </button>
          )}
          {status === 'active' && (
            <button
              onClick={() => toggleStatus('paused')}
              disabled={busy}
              className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] border border-pro/20 bg-pro-bg px-3 py-1.5 text-xs text-pro transition-colors hover:bg-pro/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Pause className="h-3 w-3" /> Pause
            </button>
          )}
          {status === 'paused' && (
            <button
              onClick={() => toggleStatus('active')}
              disabled={busy}
              className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] border border-ok/20 bg-ok-bg px-3 py-1.5 text-xs text-ok transition-colors hover:bg-ok/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="h-3 w-3" /> Resume
            </button>
          )}
          <Tooltip content="Refresh data">
            <button
              onClick={refresh}
              className="flex cursor-pointer h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-border text-text-3 transition-colors hover:border-white/[0.18] hover:text-text"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </Tooltip>
          {!deleteConfirm ? (
            <Tooltip content="Delete experiment">
              <button
                onClick={() => setDeleteConfirm(true)}
                className="flex cursor-pointer h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-border text-text-3 transition-colors hover:border-err/30 hover:text-err"
                aria-label="Delete experiment"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-err/20 bg-err-bg px-3 py-1.5">
              <button
                onClick={deleteTest}
                disabled={deleting}
                className="cursor-pointer text-xs font-semibold text-err transition-colors hover:opacity-80 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                disabled={deleting}
                className="cursor-pointer text-xs text-text-3 transition-colors hover:text-text disabled:opacity-30"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
