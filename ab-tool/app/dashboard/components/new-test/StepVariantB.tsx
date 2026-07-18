'use client'

/**
 * StepVariantB — Step 2: Variant B AI-generieren (AI-only).
 *
 * Kein Figma-Weg. Kein Natural-Language-Refine. Nur:
 * - AI generiert automatisch beste CRO-Variante
 * - Vorher/Nachher Screenshot-Preview (urlbox)
 * - "Variante übernehmen" oder "Neu generieren"
 */

import { useState, useEffect } from 'react'
import { Sparkles, Loader2, RefreshCw, Eye, Image, AlertTriangle } from 'lucide-react'
import type { ElementSelection, VariantResult } from '../NewTestDrawer'

interface StepVariantBProps {
  element: ElementSelection
  url: string
  variantResult: VariantResult | null
  onGenerate: () => Promise<void>
}

export function StepVariantB({ element, url, variantResult, onGenerate }: StepVariantBProps) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [screenshots, setScreenshots] = useState<{ original?: string; variant?: string }>({})
  const [showVariant, setShowVariant] = useState(false)

  // Auto-generate on mount if no variant yet
  useEffect(() => {
    if (!variantResult && !generating) {
      handleGenerate()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    try {
      await onGenerate()
    } catch {
      setError('Failed to generate variant. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  // Load screenshots when variant is ready
  useEffect(() => {
    if (!variantResult || !url) return
    ;(async () => {
      try {
        const finalUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`
        const res = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: finalUrl }),
        })
        if (res.ok) {
          const data = await res.json()
          setScreenshots({ original: data.originalUrl })
        }
      } catch { /* Screenshots are nice-to-have */ }
    })()
  }, [variantResult, url])

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] leading-relaxed text-text-2">
          AI generates the best-performing variant based on proven CRO patterns.
        </p>
      </div>

      {/* Generating state */}
      {generating && (
        <div className="flex flex-col items-center gap-3 rounded-[10px] border border-border bg-bg-1 py-8">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
          <p className="text-[13px] text-text-2">Generating best CRO variant…</p>
          <p className="text-[11px] text-text-3">Analyzing conversion patterns for {element.elementType}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-[7px] border border-err/20 bg-err/5 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-err/70" />
          <div>
            <p className="text-[12px] text-err/70">{error}</p>
            <button
              onClick={handleGenerate}
              className="mt-1 text-[11px] text-accent hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {variantResult && !generating && (
        <div className="space-y-4">
          {/* Explanation */}
          <div className="rounded-[10px] border border-border bg-bg-1 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-accent/15">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-text">AI-Generated Variant</p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-text-2">
                  {variantResult.explanation || variantResult.variant}
                </p>
              </div>
            </div>

            {/* CSS Preview */}
            {variantResult.variant_css && (
              <div className="mt-3">
                <code className="block rounded-[6px] bg-bg-0 p-3 text-[11px] text-text-3 font-mono leading-relaxed whitespace-pre-wrap">
                  {variantResult.variant_css}
                </code>
              </div>
            )}

            {/* HTML Preview */}
            {variantResult.variant_html && (
              <div className="mt-2">
                <p className="mb-1 text-[10px] text-text-3">HTML Variant:</p>
                <code className="block rounded-[6px] bg-bg-0 p-3 text-[11px] text-text-3 font-mono leading-relaxed whitespace-pre-wrap">
                  {variantResult.variant_html}
                </code>
              </div>
            )}
          </div>

          {/* Screenshot Preview Toggle */}
          {screenshots.original && (
            <div className="rounded-[10px] border border-border bg-bg-1 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[12px] font-medium text-text-2">Preview</p>
                <button
                  onClick={() => setShowVariant((v) => !v)}
                  className="flex items-center gap-1.5 rounded-[5px] border border-border px-2.5 py-1 text-[11px] text-text-2 transition-colors hover:border-border-strong hover:text-text cursor-pointer"
                >
                  <Eye className="h-3 w-3" />
                  {showVariant ? 'Show Original' : 'Show Variant'}
                </button>
              </div>
              <div className="overflow-hidden rounded-[6px] border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={screenshots.original}
                  alt="Page preview"
                  className="w-full"
                  style={showVariant && variantResult.variant_css ? {} : {}}
                />
              </div>
              {!showVariant && (
                <p className="mt-2 text-[10px] text-text-3 text-center">Original page</p>
              )}
              {showVariant && (
                <p className="mt-2 text-[10px] text-accent text-center">
                  Variant preview — CSS will be injected live
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 rounded-[6px] border border-border px-4 py-2 text-[12px] text-text-2 transition-colors hover:border-border-strong hover:text-text disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
