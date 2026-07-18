'use client'

/**
 * StepUrlScan — Step 0: URL eingeben, KI scannt die Seite.
 *
 * Zeigt nach dem Scan:
 * - Primärer Vorschlag (hervorgehoben, "Empfohlen")
 * - Alternative Vorschläge (collapsed)
 * - "Weiter mit [Element]" → akzeptiert AI-Vorschlag
 * - "Anderes Element wählen" → geht zu Step 1 (Picker)
 */

import { useState } from 'react'
import { Globe, Search, Loader2, Sparkles, AlertTriangle, Check, ChevronDown, ChevronRight, ArrowRight } from 'lucide-react'
import type { ScanResult } from '../NewTestDrawer'

interface StepUrlScanProps {
  url: string
  onUrlChange: (url: string) => void
  scanResult: ScanResult | null
  scanError: string
  onScan: (url: string) => Promise<void>
  onSelectPrimary: () => void
  onPickDifferent: () => void
}

export function StepUrlScan({
  url, onUrlChange, scanResult, scanError, onScan, onSelectPrimary, onPickDifferent,
}: StepUrlScanProps) {
  const [scanning, setScanning] = useState(false)
  const [showAlternatives, setShowAlternatives] = useState(false)

  async function handleScan() {
    if (!url.trim() || scanning) return
    setScanning(true)
    try {
      await onScan(url.trim())
    } finally {
      setScanning(false)
    }
  }

  const primary = scanResult?.primarySuggestion
  const alternatives = scanResult
    ? scanResult.suggestions.filter((_, i) => i !== scanResult.primarySuggestionIndex)
    : []

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] leading-relaxed text-text-2">
          Enter your page URL. The AI scans it and picks the best element to test.
        </p>
        <p className="mt-1 text-[11px] text-text-3">
          You can always change the AI&apos;s choice in the next step.
        </p>
      </div>

      {/* URL Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
          <input
            type="url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            placeholder="https://example.com/landing"
            className="w-full rounded-[7px] border border-border bg-bg-1 py-2.5 pl-9 pr-3 text-[13px] text-text placeholder:text-text-3 outline-none focus:border-border-strong focus:ring-2 focus:ring-text/10"
            disabled={scanning}
          />
        </div>
        <button
          onClick={handleScan}
          disabled={scanning || !url.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-[7px] bg-fill-invert px-5 py-2.5 text-[13px] font-semibold text-text-on-invert transition-opacity hover:opacity-90 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
        >
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {scanning ? 'Scanning…' : 'Scan'}
        </button>
      </div>

      {/* Scanning state */}
      {scanning && (
        <div className="flex flex-col items-center gap-3 rounded-[10px] border border-border bg-bg-1 py-8">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
          <p className="text-[13px] text-text-2">AI analyzing your page…</p>
          <p className="text-[11px] text-text-3">Finding the best conversion opportunities</p>
        </div>
      )}

      {/* Error */}
      {scanError && (
        <div className="flex items-start gap-2 rounded-[7px] border border-err/20 bg-err/5 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-err/70" />
          <p className="text-[12px] text-err/70">{scanError}</p>
        </div>
      )}

      {/* Results */}
      {primary && (
        <div className="space-y-3">
          {/* Primary Suggestion */}
          <div className="rounded-[10px] border border-accent/20 bg-accent/5 p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span className="text-[11px] font-medium text-accent">Recommended</span>
            </div>
            <p className="text-[14px] font-semibold text-text">{primary.element}</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-text-2">{primary.rationale}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-[4px] border border-border bg-bg-1 px-2 py-0.5 text-[10px] text-text-3">
                {primary.elementType}
              </span>
              {primary.selector && (
                <code className="rounded-[4px] bg-bg-1 px-2 py-0.5 text-[10px] text-text-3 font-mono">
                  {primary.selector}
                </code>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={onSelectPrimary}
              className="flex items-center justify-center gap-2 rounded-[7px] bg-fill-invert py-2.5 text-[13px] font-semibold text-text-on-invert transition-opacity hover:opacity-90 cursor-pointer"
            >
              Continue with this element
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={onPickDifferent}
              className="text-[12px] text-text-3 transition-colors hover:text-text cursor-pointer"
            >
              Pick a different element on the site
            </button>
          </div>

          {/* Alternatives */}
          {alternatives.length > 0 && (
            <div>
              <button
                onClick={() => setShowAlternatives((v) => !v)}
                className="flex items-center gap-1 text-[11px] text-text-3 transition-colors hover:text-text-2 cursor-pointer"
              >
                {showAlternatives ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {alternatives.length} other suggestion{alternatives.length !== 1 ? 's' : ''}
              </button>
              {showAlternatives && (
                <div className="mt-2 space-y-1.5">
                  {alternatives.map((s, i) => (
                    <div key={i} className="rounded-[6px] border border-border bg-bg-1 px-3 py-2">
                      <p className="text-[12px] font-medium text-text">{s.element}</p>
                      <p className="mt-0.5 text-[11px] text-text-3 line-clamp-2">{s.why}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
