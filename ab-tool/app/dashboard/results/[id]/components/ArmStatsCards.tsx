'use client'

import { Users, Target, Check, Trophy } from 'lucide-react'
import { formatCount, formatPercent, formatDelta } from '@/lib/formatNumber'
import type { Dispatch, SetStateAction } from 'react'
import type { VariantStats } from '@/lib/getExperimentStats'

/** Karten je Variante (CR, Besucher, Conversions) mit manuellem Winner-Override. */
export function ArmStatsCards({
  a,
  b,
  winner,
  lift,
  status,
  declaringWinner,
  setDeclaringWinner,
  declareWinner,
  busy,
}: {
  a: VariantStats
  b: VariantStats
  winner: string | null
  lift: number | null
  status: string
  declaringWinner: 'A' | 'B' | null
  setDeclaringWinner: Dispatch<SetStateAction<'A' | 'B' | null>>
  declareWinner: (variant: 'A' | 'B') => Promise<void>
  busy: boolean
}) {
  return (
    <>
      {/* ── A/B Stats Cards (Significance jetzt im Hero) ── */}
      <div className="grid grid-cols-2 gap-4">
        {[a, b].map((v, i) => {
          const isWinner = winner === v.id
          const isVariantB = i === 1
          const other = v.id === 'A' ? b : a
          const isLowerCr = v.cr < other.cr
          return (
            <div
              key={v.id}
              className={`rounded-[var(--radius-lg)] border p-6 ${
                isWinner
                  ? 'border-ok/30 bg-ok-bg'
                  : 'border-border bg-bg-1'
              }`}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className={`rounded-[var(--radius-md)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                  isVariantB
                    ? 'bg-pro-bg text-pro'
                    : 'bg-bg-2 text-text-3'
                }`}>
                  Variant {v.label}
                </span>
                {isWinner && (
                  <span className="flex items-center gap-1 rounded-[var(--radius-md)] bg-ok-bg px-2.5 py-1 text-[11px] font-semibold text-ok">
                    <Check className="h-3 w-3" /> Winner
                  </span>
                )}
              </div>

              <p className="text-4xl font-semibold text-text">
                {formatPercent(v.cr)}
              </p>
              <p className="mt-0.5 text-xs text-text-3">Conversion Rate</p>

              <div className="mt-4 space-y-1.5 text-xs text-text-3">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {formatCount(v.views)} visitors
                </div>
                <div className="flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5" />
                  {formatCount(v.conversions)} conversions
                </div>
              </div>

              {lift !== null && isVariantB && (
                <div className={`mt-4 rounded-[var(--radius-md)] px-3 py-2 text-xs font-semibold ${
                  lift > 0
                    ? 'bg-ok-bg text-ok'
                    : 'bg-err-bg text-err'
                }`}>
                  {formatDelta(lift)} vs A
                </div>
              )}

              {/* Manuelles Winner-Override: nur solange kein Gewinner feststeht
                  und der Test läuft/pausiert. Sobald der Algorithmus oder ein
                  früherer Override `winner` gesetzt hat, verschwindet der Weg. */}
              {!winner && (status === 'active' || status === 'paused') && (
                declaringWinner !== v.id ? (
                  <button
                    onClick={() => setDeclaringWinner(v.id as 'A' | 'B')}
                    className="mt-4 flex cursor-pointer items-center gap-1.5 text-xs text-text-3 transition-colors hover:text-text"
                  >
                    <Trophy className="h-3.5 w-3.5" /> Declare winner
                  </button>
                ) : (
                  <div className={`mt-4 rounded-[var(--radius-md)] border p-3 ${
                    isLowerCr ? 'border-err/20 bg-err-bg' : 'border-border bg-bg-2'
                  }`}>
                    <p className={`text-xs ${isLowerCr ? 'text-err' : 'text-text-2'}`}>
                      {isLowerCr
                        ? `Variant ${v.label} currently has a lower conversion rate (${formatPercent(v.cr)} vs ${formatPercent(other.cr)}). Declare it winner anyway?`
                        : `Declare Variant ${v.label} as the winner? This ends the test and serves it to all visitors.`}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => declareWinner(v.id as 'A' | 'B')}
                        disabled={busy}
                        className="cursor-pointer text-xs font-semibold text-ok transition-colors hover:opacity-80 disabled:opacity-50"
                      >
                        Yes, declare winner
                      </button>
                      <button
                        onClick={() => setDeclaringWinner(null)}
                        disabled={busy}
                        className="cursor-pointer text-xs text-text-3 transition-colors hover:text-text disabled:opacity-30"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
