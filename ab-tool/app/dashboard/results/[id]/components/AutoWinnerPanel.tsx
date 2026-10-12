'use client'

import { MIN_VISITORS_PER_ARM } from '@/lib/significance'
import { Check, Trophy } from 'lucide-react'
import { formatCount } from '@/lib/formatNumber'
import type { ArmCriterion } from '@/lib/resultsHelpers'
import type { Dispatch, SetStateAction } from 'react'

/** Auto-Winner: Status bzw. Schwellen-Konfiguration (Pro) oder Upgrade-Hinweis (Free). */
export function AutoWinnerPanel({
  pro,
  done,
  winner,
  winnerPending,
  applyWinner,
  busy,
  minVisitors,
  setMinVisitors,
  minUplift,
  setMinUplift,
  significanceLevel,
  setSignificanceLevel,
  visitorsReq,
  effectiveMinVisitors,
  saveConfig,
  saved,
  upgrade,
}: {
  pro: boolean
  done: boolean
  winner: string | null
  winnerPending: boolean
  applyWinner: () => Promise<void>
  busy: boolean
  minVisitors: number
  setMinVisitors: Dispatch<SetStateAction<number>>
  minUplift: number
  setMinUplift: Dispatch<SetStateAction<number>>
  significanceLevel: number
  setSignificanceLevel: Dispatch<SetStateAction<number>>
  visitorsReq: ArmCriterion
  effectiveMinVisitors: number
  saveConfig: () => Promise<void>
  saved: boolean
  upgrade: () => Promise<void>
}) {
  return (
    <>
      {/* Auto-winner */}
      {pro && (
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-6">
          <h2 className="mb-1 text-sm font-semibold text-text">Auto Winner</h2>
          {done ? (
            <p className="mt-2 text-[13px] text-ok">
              ✓ Test complete —{' '}
              {winner
                ? `Variant ${winner} wins and is now served to all visitors.`
                : 'no winner declared.'}
            </p>
          ) : winnerPending ? (
            // Plan RA-06: Auto-Apply ist aus — der Gewinner steht fest, aber
            // auf der Kundenseite hat sich nichts geändert. Das hier muss
            // unmissverständlich sein, sonst glaubt der Kunde, die Variante
            // sei live.
            <div className="mt-2 space-y-3">
              <p className="text-[13px] text-pro">
                Variant {winner} won — <strong className="font-semibold">not applied yet</strong>.
              </p>
              <p className="text-xs leading-relaxed text-text-3">
                Auto-apply is off, so your site is unchanged and the test keeps running at its
                current split. Applying the winner serves Variant {winner} to all visitors and
                closes the test.
              </p>
              <button
                onClick={applyWinner}
                disabled={busy}
                className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] bg-fill-invert px-4 py-2 text-xs font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trophy className="h-3.5 w-3.5" /> Apply winner
              </button>
            </div>
          ) : (
            <>
              <p className="mt-1 text-xs text-text-3 leading-relaxed">
                Once every requirement above is met — visitors and conversions in
                <em> both </em> variants, minimum runtime, confidence and minimum uplift —
                Variant B becomes the winner. If auto-apply is on
                (Account → Experiments), it is served to all new visitors automatically —
                otherwise you get a notification and decide here.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-text-2">
                    Min Visitors <span className="font-normal text-text-3">per variant</span>
                  </span>
                  <input
                    type="number"
                    min={MIN_VISITORS_PER_ARM}
                    step={100}
                    value={minVisitors}
                    onChange={e => setMinVisitors(Number(e.target.value))}
                    className="w-full rounded-[var(--radius-md)] border border-border bg-bg-2 px-3 py-2 text-sm text-text focus:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:ring-1 focus:ring-border-strong"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-text-2">
                    Min Uplift B · {Math.round(minUplift * 100)}%
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    step={0.5}
                    value={minUplift * 100}
                    onChange={e => setMinUplift(Number(e.target.value) / 100)}
                    className="w-full accent-white h-1.5 rounded-full cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, var(--color-text) 0%, var(--color-text) ${(minUplift * 100 - 1) / 19 * 100}%, var(--color-bg-2) ${(minUplift * 100 - 1) / 19 * 100}%, var(--color-bg-2) 100%)`,
                    }}
                  />
                </label>
              </div>

              {/* Segmented control: significance level */}
              <fieldset className="mt-4">
                <legend className="text-xs font-semibold text-text-2 mb-2">Significance Level</legend>
                <div className="flex gap-1">
                  {([0.9, 0.95, 0.99] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSignificanceLevel(lvl)}
                      className={`flex-1 cursor-pointer rounded-[var(--radius-md)] border px-3 py-2 text-xs font-semibold transition-colors ${
                        significanceLevel === lvl
                          ? 'border-white/30 bg-white text-black'
                          : 'border-border bg-bg-2 text-text-2 hover:text-text'
                      }`}
                    >
                      {Math.round(lvl * 100)}%
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-text-3">
                  {significanceLevel === 0.9 ? 'Looser threshold, faster results' : significanceLevel === 0.99 ? 'Strictest threshold, most confident' : 'Balanced confidence (default)'}
                </p>
              </fieldset>

              {minVisitors < MIN_VISITORS_PER_ARM && (
                <p className="mt-2 text-[11px] text-text-3">
                  Below the system floor — {formatCount(MIN_VISITORS_PER_ARM)} visitors per variant
                  are required regardless, so a lower value has no effect.
                </p>
              )}

              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs text-text-3">
                  <span>Visitor threshold</span>
                  {/* Derselbe Wert wie in der Anforderungsliste oben: schwächerer
                      Arm gegen die effektive Schwelle. Vorher stand hier die
                      Gesamtsumme gegen dieselbe Zahl — doppelt so schnell voll. */}
                  <span className="tabular-nums">
                    {formatCount(visitorsReq.lagging)} / {formatCount(effectiveMinVisitors)} per variant
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-bg-2">
                  <div
                    className="h-full rounded-full bg-text transition-[width] duration-[var(--duration-slow)]"
                    style={{ width: `${visitorsReq.pct}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={saveConfig}
                  disabled={busy}
                  className="cursor-pointer rounded-[var(--radius-md)] bg-white px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save
                </button>
                {saved && (
                  <span className="flex items-center gap-1 text-xs text-ok">
                    <Check className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {!pro && (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-border p-6 text-center">
          <h2 className="text-sm font-semibold text-text">Auto Winner</h2>
          <p className="mt-2 text-xs text-text-3">
            Auto-Winner configuration is available from the Pro plan onward.
          </p>
          <button
            onClick={upgrade}
            disabled={busy}
            className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] bg-white px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:opacity-50"
          >
            {busy ? 'Redirecting…' : 'Upgrade to Pro'}
          </button>
        </div>
      )}
    </>
  )
}
