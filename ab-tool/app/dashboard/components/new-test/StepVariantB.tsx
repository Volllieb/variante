'use client'

/**
 * StepVariantB — Step 2: Variant B.
 *
 * Drei Tabs:
 * - AI Generate: KI generiert automatisch beste CRO-Variante (wie bisher)
 * - Edit Manually: Manuelle Anpassung via PropertyControls + Live-Preview
 * - Inspiration: CRO-Pattern-Gallery zum Auswählen
 *
 * Nach KI-Generierung kann der User zwischen den Tabs wechseln.
 * User-Edits werden mit dem KI-Vorschlag gemerged.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Sparkles, Loader2, RefreshCw, Eye, AlertTriangle, Wand2, ArrowRight,
  PenLine, Lightbulb,
} from 'lucide-react'
import { VariantEditor } from './VariantEditor'
import { InspirationGallery } from './InspirationGallery'
import { mergeVariantEdits } from './mergeVariantEdits'
import type { VariantTab, UserEdits } from './types'
import type { ElementSelection, VariantResult } from '../NewTestDrawer'

interface StepVariantBProps {
  element: ElementSelection
  url: string
  variantResult: VariantResult | null
  variantTab: VariantTab
  onTabChange: (tab: VariantTab) => void
  onGenerate: () => Promise<void>
  onVariantUpdate: (patch: Partial<VariantResult>) => void
  onSkip?: () => void
}

const TABS: Array<{ id: VariantTab; label: string; icon: typeof Sparkles }> = [
  { id: 'ai', label: 'AI Generate', icon: Sparkles },
  { id: 'edit', label: 'Edit Manually', icon: PenLine },
  { id: 'inspiration', label: 'Inspiration', icon: Lightbulb },
]

export function StepVariantB({
  element, url, variantResult, variantTab, onTabChange,
  onGenerate, onVariantUpdate, onSkip,
}: StepVariantBProps) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const autoFired = useRef(false)

  // Auto-generate on mount if no variant yet
  useEffect(() => {
    if (!variantResult && !generating && !autoFired.current) {
      autoFired.current = true
      handleGenerate()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setError('')
    try {
      await onGenerate()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate variant. Please try again.'
      setError(msg)
    } finally {
      setGenerating(false)
    }
  }, [onGenerate])

  // Handle manual edits from VariantEditor
  const handleEditsChange = useCallback(
    (edits: UserEdits, mergedCss?: string, mergedHtml?: string) => {
      onVariantUpdate({
        userEdits: edits,
        variant_css: mergedCss,
        variant_html: mergedHtml,
      })
    },
    [onVariantUpdate],
  )

  // Handle pattern applied from InspirationGallery
  const handlePatternApplied = useCallback(
    (result: VariantResult) => {
      onVariantUpdate(result)
      onTabChange('edit')
    },
    [onVariantUpdate, onTabChange],
  )

  // Warn before regenerate if user has edits
  function handleRegenerate() {
    if (variantResult?.userEdits) {
      const hasEdits = Object.values(variantResult.userEdits).some(
        (v) => v !== undefined && v !== '',
      )
      if (hasEdits && !window.confirm('Your manual changes will be lost. Regenerate anyway?')) {
        return
      }
    }
    handleGenerate()
  }

  // ─── Render ───

  return (
    <div className="space-y-4">
      {/* Description */}
      <div>
        <p className="text-[13px] leading-relaxed text-text-2">
          Create a variant for your element. AI generates a CRO-optimized version,
          or you can edit manually or choose an inspiration pattern.
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
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-err/70">{error}</p>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="text-[11px] text-accent hover:underline disabled:opacity-50 cursor-pointer"
              >
                {generating ? 'Retrying…' : 'Try again'}
              </button>
              {onSkip && (
                <button
                  onClick={onSkip}
                  className="flex items-center gap-1 text-[11px] text-text-3 hover:text-text transition-colors cursor-pointer"
                >
                  Skip variant generation
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fallback: no variant yet, not generating, no error */}
      {!variantResult && !generating && !error && (
        <div className="flex flex-col items-center gap-3 rounded-[10px] border border-border bg-bg-1 py-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15">
            <Wand2 className="h-5 w-5 text-accent" />
          </div>
          <p className="text-[13px] text-text-2 text-center max-w-[280px]">
            Ready to generate an AI-powered CRO variant for this element.
          </p>
          <button
            onClick={handleGenerate}
            className="flex items-center gap-1.5 rounded-[6px] bg-accent px-4 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate Variant
          </button>
        </div>
      )}

      {/* Result: Tabs + Content */}
      {variantResult && !generating && (
        <div className="space-y-4">
          {/* Tab Bar */}
          <div className="flex gap-1 rounded-[8px] bg-bg-1 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[6px] px-3 py-2 text-[11px] font-medium transition-all ${
                  variantTab === tab.id
                    ? 'bg-accent/15 text-accent shadow-sm'
                    : 'text-text-3 hover:text-text'
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: AI Generate (bestehende Ansicht) */}
          {variantTab === 'ai' && (
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

              {/* Regenerate */}
              <div className="flex gap-2">
                <button
                  onClick={handleRegenerate}
                  disabled={generating}
                  className="flex items-center gap-1.5 rounded-[6px] border border-border px-4 py-2 text-[12px] text-text-2 transition-colors hover:border-border-strong hover:text-text disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Regenerate
                </button>
              </div>
            </div>
          )}

          {/* Tab: Edit Manually */}
          {variantTab === 'edit' && (
            <VariantEditor
              element={element}
              variantResult={variantResult}
              onEditsChange={handleEditsChange}
            />
          )}

          {/* Tab: Inspiration Gallery */}
          {variantTab === 'inspiration' && (
            <InspirationGallery
              element={element}
              onPatternApplied={handlePatternApplied}
            />
          )}
        </div>
      )}
    </div>
  )
}
