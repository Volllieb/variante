'use client'

import { Loader2, Sparkles, AlertCircle, Zap } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import type { ScanResult, ScanState, ScanSuggestion } from './types'

/** KI-Vorschlag: Scan-Trigger, Lade-/Fehlerzustand und die Vorschlagsliste. */
export function ScanSuggestions({
  scanState,
  setScanState,
  scanResult,
  scanError,
  scanRetryable,
  urlValid,
  runScan,
  applySuggestion,
}: {
  scanState: ScanState
  setScanState: Dispatch<SetStateAction<ScanState>>
  scanResult: ScanResult | null
  scanError: string
  scanRetryable: boolean
  urlValid: string | boolean
  runScan: () => Promise<void>
  applySuggestion: (s: ScanSuggestion) => void
}) {
  return (
    <>
      {/* ── AI Suggestion — a single inline trigger instead of its own card,
          so it doesn't visually compete with picking the element yourself. ── */}
      {urlValid && (
        <div className="text-[12px]">
          {scanState === 'idle' && (
            <button
              onClick={runScan}
              className="inline-flex items-center gap-1.5 text-pro transition-colors hover:text-pro/80 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Not sure which element? Let AI suggest one
            </button>
          )}
          {scanState === 'loading' && (
            <span className="inline-flex items-center gap-1.5 text-text-3">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              AI is scanning the page structure, CTAs, and headlines…
            </span>
          )}
          {scanState === 'error' && (
            <span className="inline-flex flex-wrap items-center gap-x-1.5 text-err/80">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {scanError}
              {scanRetryable && (
                <button onClick={runScan} className="underline hover:text-err cursor-pointer">Try again</button>
              )}
            </span>
          )}
        </div>
      )}

      {/* Scan results — compact list, no extra wrapping card */}
      {scanState === 'success' && scanResult && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-pro" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-pro">AI suggestions</p>
          </div>
          {scanResult.suggestions.map((s, i) => {
            const isPrimary = scanResult.primarySuggestion?.element === s.element
            return (
              <button
                key={s.element}
                onClick={() => applySuggestion(s)}
                className={`flex w-full cursor-pointer items-start gap-2.5 rounded-[var(--radius-md)] px-3 py-2.5 text-left transition-colors ${
                  isPrimary
                    ? 'border border-pro/25 bg-pro/[0.05] hover:bg-pro/[0.09]'
                    : 'border border-border hover:border-border-strong'
                }`}
              >
                <div className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                  isPrimary ? 'bg-pro/15 text-pro' : 'bg-bg-2 text-text-3'
                }`}>
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[12px] font-semibold text-text">{s.element}</p>
                    {isPrimary && (
                      <span className="shrink-0 rounded-full bg-pro/15 px-1.5 py-0.5 text-[9px] font-semibold text-pro">
                        Best pick
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[11px] leading-relaxed text-text-3">{s.rationale}</p>
                </div>
              </button>
            )
          })}
          <button
            onClick={() => setScanState('idle')}
            className="text-[11px] text-text-3 transition-colors hover:text-text-2 cursor-pointer"
          >
            Dismiss suggestions
          </button>
        </div>
      )}
    </>
  )
}
