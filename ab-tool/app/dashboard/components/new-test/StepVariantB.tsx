'use client'

/**
 * StepVariantB — Step 1: Variant B.
 *
 * Drei Modi:
 * - AI Generate (default): Auto-triggered via /api/test-wizard/generate
 *   → Accept / Edit / Regenerate. User behält volle Kontrolle.
 * - Manual Editor: ButtonEditor/TextInputEditor (bestehend)
 * - From Figma: User öffnet Figma-Plugin, wählt Variant B, KI übersetzt in Code
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { Pencil, Check, Palette, ExternalLink, Sparkles, Loader2, AlertCircle, RefreshCw, ChevronDown } from 'lucide-react'
import { ButtonEditor } from './ButtonEditor'
import { TextInputEditor } from './TextInputEditor'
import { getEditorCategory } from './types'
import type { ElementSelection, VariantResult } from '../NewTestDrawer'

type VariantMode = 'ai' | 'manual' | 'figma'
type AiGenState = 'idle' | 'loading' | 'success' | 'error'

interface StepVariantBProps {
  element: ElementSelection
  variantResult: VariantResult | null
  onVariantUpdate: (patch: Partial<VariantResult>) => void
}

export function StepVariantB({
  element, variantResult, onVariantUpdate,
}: StepVariantBProps) {
  const [mode, setMode] = useState<VariantMode>(variantResult ? 'ai' : 'ai')
  const [showEditor, setShowEditor] = useState(!variantResult)
  const category = getEditorCategory(element.elementType)

  // ── AI Generation State ──
  const [aiState, setAiState] = useState<AiGenState>(variantResult ? 'success' : 'idle')
  const [aiError, setAiError] = useState('')
  const aiTriggered = useRef(false)

  // Inline CSS/HTML editing
  const [editingCss, setEditingCss] = useState(false)
  const [editingHtml, setEditingHtml] = useState(false)
  const [editCss, setEditCss] = useState('')
  const [editHtml, setEditHtml] = useState('')

  const handleApply = useCallback(
    (html: string, css: string) => {
      const variantText = html.replace(/<[^>]*>/g, '').trim()
      onVariantUpdate({
        variant: variantText,
        variant_html: html,
        variant_css: css,
        explanation: '',
      })
      setShowEditor(false)
    },
    [onVariantUpdate],
  )

  const handleCancel = useCallback(() => {
    if (variantResult) {
      setShowEditor(false)
    }
  }, [variantResult])

  // ── AI Variant Generation ──

  const handleAiGenerate = useCallback(async () => {
    setAiState('loading')
    setAiError('')

    try {
      const res = await fetch('/api/test-wizard/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          element: element.elementName || element.selector,
          original: element.originalHtml || `<${element.elementType}>`,
          elementType: element.elementType,
          selector: element.selector || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Generation failed' }))
        setAiError(err.message ?? err.error ?? 'AI generation failed')
        setAiState('error')
        return
      }

      const data = await res.json()
      onVariantUpdate({
        variant: data.variant ?? '',
        variant_html: data.variant_html ?? undefined,
        variant_css: data.variant_css ?? undefined,
        explanation: data.explanation ?? '',
      })
      setAiState('success')
      setShowEditor(false)
    } catch {
      setAiError('Network error — please try again.')
      setAiState('error')
    }
  }, [element, onVariantUpdate])

  // Auto-trigger AI generation when entering step without existing variant
  useEffect(() => {
    if (!variantResult && !aiTriggered.current && aiState === 'idle') {
      aiTriggered.current = true
      handleAiGenerate()
    }
  }, [variantResult, aiState, handleAiGenerate])

  // ─── Render ───

  return (
    <div className="space-y-4">
      {/* Description */}
      <div>
        <p className="text-[13px] leading-relaxed text-text-2">
          Create a variant for your element. AI generates an optimized version — accept it, edit it, or start from scratch.
        </p>
      </div>

      {/* ── Mode Switcher (3-way) ── */}
      <div className="flex rounded-[6px] border border-border bg-bg-0 p-0.5">
        <button
          onClick={() => {
            setMode('ai')
            // Re-trigger AI if no variant yet and not already loading
            if (!variantResult && aiState !== 'loading') {
              aiTriggered.current = false
              setAiState('idle')
            }
          }}
          className={`flex-1 rounded-[4px] px-2.5 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
            mode === 'ai'
              ? 'bg-pro text-black'
              : 'text-text-2 hover:text-text'
          }`}
        >
          <Sparkles className="inline h-3 w-3 mr-1" />
          AI Generate
        </button>
        <button
          onClick={() => { setMode('manual'); setAiState('idle') }}
          className={`flex-1 rounded-[4px] px-2.5 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
            mode === 'manual'
              ? 'bg-fill-invert text-text-on-invert'
              : 'text-text-2 hover:text-text'
          }`}
        >
          <Pencil className="inline h-3 w-3 mr-1" />
          Manual
        </button>
        <button
          onClick={() => setMode('figma')}
          className={`flex-1 rounded-[4px] px-2.5 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
            mode === 'figma'
              ? 'bg-fill-invert text-text-on-invert'
              : 'text-text-2 hover:text-text'
          }`}
        >
          <Palette className="inline h-3 w-3 mr-1" />
          Figma
        </button>
      </div>

      {/* ── AI MODE ── */}
      {mode === 'ai' && (
        <>
          {/* AI Loading */}
          {aiState === 'loading' && (
            <div className="rounded-[10px] border border-pro/15 bg-pro/[0.03] p-5">
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pro/10">
                  <Loader2 className="h-5 w-5 animate-spin text-pro" />
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-medium text-text">Generating variant…</p>
                  <p className="mt-1 text-[11px] text-text-3">
                    AI is creating an optimized version of your{' '}
                    <span className="text-text-2 font-medium">{element.elementType}</span>
                  </p>
                </div>
                <button
                  onClick={() => { setMode('manual'); setAiState('idle') }}
                  className="text-[11px] text-text-3 hover:text-text-2 transition-colors cursor-pointer"
                >
                  Skip — edit manually instead
                </button>
              </div>
            </div>
          )}

          {/* AI Error */}
          {aiState === 'error' && (
            <div className="rounded-[10px] border border-err/20 bg-err/[0.04] p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-err/60" />
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-err/80">Generation failed</p>
                  <p className="mt-1 text-[11px] text-text-3">{aiError}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleAiGenerate}
                      className="flex items-center gap-1.5 rounded-[6px] bg-fill-invert px-3 py-1.5 text-[11px] font-semibold text-text-on-invert transition-opacity hover:opacity-90 cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Retry
                    </button>
                    <button
                      onClick={() => setMode('manual')}
                      className="rounded-[6px] border border-border px-3 py-1.5 text-[11px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text cursor-pointer"
                    >
                      Edit manually
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Success — variant preview */}
          {aiState === 'success' && variantResult && !showEditor && (
            <div className="space-y-3">
              {/* Variant preview card */}
              <div className="rounded-[10px] border border-ok/15 bg-ok/[0.03] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-ok/15">
                    <Sparkles className="h-3 w-3 text-ok" />
                  </div>
                  <p className="text-[11px] font-semibold text-ok uppercase tracking-wider">AI Variant Ready</p>
                </div>

                {/* Variant text/content */}
                <div className="rounded-[7px] border border-border bg-bg-0 p-3">
                  <p className="text-[11px] font-medium text-text-3 mb-1.5">Preview</p>
                  <p className="text-[13px] leading-relaxed text-text">
                    {variantResult.variant}
                  </p>
                </div>

                {/* CSS preview (collapsed) */}
                {variantResult.variant_css && (
                  <details className="mt-2">
                    <summary className="flex cursor-pointer items-center gap-1 text-[11px] text-text-3 hover:text-text-2 transition-colors">
                      <ChevronDown className="h-3 w-3" />
                      CSS Changes
                    </summary>
                    <code className="mt-1.5 block rounded-[6px] bg-bg-0 p-2.5 text-[10px] text-text-3 font-mono leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {variantResult.variant_css}
                    </code>
                  </details>
                )}

                {/* Explanation */}
                {variantResult.explanation && (
                  <p className="mt-2 text-[10px] text-text-3 italic">
                    {variantResult.explanation}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEditor(true)}
                  className="flex items-center gap-1.5 rounded-[6px] border border-border px-3.5 py-2 text-[12px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={handleAiGenerate}
                  className="flex items-center gap-1.5 rounded-[6px] border border-border px-3.5 py-2 text-[12px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Regenerate
                </button>
              </div>
            </div>
          )}

          {/* Editor overlay when user clicks "Edit" on AI result */}
          {aiState === 'success' && showEditor && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-[6px] bg-pro/[0.04] px-3 py-2">
                <Sparkles className="h-3.5 w-3.5 text-pro" />
                <p className="text-[11px] text-text-2">
                  Editing AI-generated variant. Changes are applied to the AI result.
                </p>
              </div>
              {category === 'button' ? (
                <ButtonEditor
                  element={element}
                  originalHtml={variantResult?.variant_html ?? element.originalHtml}
                  onApply={(html, css) => {
                    handleApply(html, css)
                    setShowEditor(false)
                  }}
                  onCancel={() => setShowEditor(false)}
                />
              ) : (
                <TextInputEditor
                  element={element}
                  originalHtml={variantResult?.variant_html ?? element.originalHtml}
                  onApply={(html, css) => {
                    handleApply(html, css)
                    setShowEditor(false)
                  }}
                  onCancel={() => setShowEditor(false)}
                />
              )}
            </div>
          )}
        </>
      )}

      {/* Manual Editor Mode */}
      {mode === 'manual' && (
        <>
          {showEditor && (
            category === 'button' ? (
              <ButtonEditor
                element={element}
                originalHtml={element.originalHtml}
                onApply={handleApply}
                onCancel={handleCancel}
              />
            ) : (
              <TextInputEditor
                element={element}
                originalHtml={element.originalHtml}
                onApply={handleApply}
                onCancel={handleCancel}
              />
            )
          )}
        </>
      )}

      {/* From Figma Mode */}
      {mode === 'figma' && (
        <div className="rounded-[10px] border border-border bg-bg-1 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-bg-2">
              <Palette className="h-4 w-4 text-text-2" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-text">Design your variant in Figma</p>
              <p className="mt-1 text-[12px] leading-relaxed text-text-2">
                Open the variante Figma plugin, select the element you want to redesign, and let the AI generate the variant code. The generated HTML and CSS will appear here automatically.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-text-3">How it works</p>
            <ol className="space-y-2 text-[12px] text-text-2">
              <li className="flex items-start gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-bg-2 text-[10px] font-bold text-text-3 mt-0.5">1</span>
                <span>Open the <strong className="text-text">variante plugin</strong> in Figma — or install it from the <a href="https://www.figma.com/community/plugin/1653734891132085565" target="_blank" rel="noopener noreferrer" className="underline hover:text-text transition-colors">Figma Community <ExternalLink className="inline h-2.5 w-2.5" /></a></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-bg-2 text-[10px] font-bold text-text-3 mt-0.5">2</span>
                <span>Click <strong className="text-text">&quot;Create Test in Dashboard&quot;</strong> in the plugin to open the test wizard here</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-bg-2 text-[10px] font-bold text-text-3 mt-0.5">3</span>
                <span>Select the variant layer in Figma — the AI translates it to HTML/CSS code</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-bg-2 text-[10px] font-bold text-text-3 mt-0.5">4</span>
                <span>The generated code appears in this wizard — review and continue</span>
              </li>
            </ol>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                // Open the Figma plugin page — user needs the desktop app for the plugin itself
                window.open('https://www.figma.com/community/plugin/1653734891132085565', '_blank', 'noopener,noreferrer')
              }}
              className="inline-flex items-center gap-1.5 rounded-[6px] bg-fill-invert px-3.5 py-2 text-[12px] font-semibold text-text-on-invert transition-opacity hover:opacity-85"
            >
              <Palette className="h-3.5 w-3.5" />
              Open Figma Plugin
            </button>
          </div>

          <p className="text-[11px] text-text-3">
            Don&apos;t have Figma? Use the <button onClick={() => setMode('manual')} className="underline hover:text-text-2 transition-colors">Manual Editor</button> instead.
          </p>
        </div>
      )}

      {/* Applied variant summary (manual/figma only — AI has its own preview) */}
      {mode !== 'ai' && !showEditor && variantResult && (
        <div className="space-y-4">
          <div className="rounded-[10px] border border-border bg-bg-1 p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-text">Variant B</p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-text-2">
                  {variantResult.variant}
                </p>
              </div>
            </div>

            {/* CSS section */}
            {variantResult.variant_css !== undefined && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-text-3">CSS</p>
                  {!editingCss && (
                    <button
                      onClick={() => { setEditCss(variantResult.variant_css ?? ''); setEditingCss(true) }}
                      className="flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[10px] text-text-3 transition-colors hover:text-text cursor-pointer"
                    >
                      <Pencil className="h-2.5 w-2.5" /> Edit
                    </button>
                  )}
                </div>
                {editingCss ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={editCss}
                      onChange={(e) => setEditCss(e.target.value)}
                      rows={6}
                      className="w-full rounded-[6px] border border-border bg-bg-0 p-3 text-[11px] text-text font-mono leading-relaxed resize-y focus:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0"
                      spellCheck={false}
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => { onVariantUpdate({ variant_css: editCss }); setEditingCss(false) }}
                        className="flex items-center gap-1 rounded-[4px] bg-fill-invert px-2.5 py-1 text-[10px] font-semibold text-text-on-invert transition-opacity hover:opacity-85 cursor-pointer"
                      >
                        <Check className="h-2.5 w-2.5" /> Apply
                      </button>
                      <button
                        onClick={() => setEditingCss(false)}
                        className="rounded-[4px] border border-border px-2.5 py-1 text-[10px] text-text-3 transition-colors hover:text-text cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <code className="block rounded-[6px] bg-bg-0 p-3 text-[11px] text-text-3 font-mono leading-relaxed whitespace-pre-wrap">
                    {variantResult.variant_css}
                  </code>
                )}
              </div>
            )}

            {/* HTML section */}
            {variantResult.variant_html !== undefined && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-text-3">HTML</p>
                  {!editingHtml && (
                    <button
                      onClick={() => { setEditHtml(variantResult.variant_html ?? ''); setEditingHtml(true) }}
                      className="flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[10px] text-text-3 transition-colors hover:text-text cursor-pointer"
                    >
                      <Pencil className="h-2.5 w-2.5" /> Edit
                    </button>
                  )}
                </div>
                {editingHtml ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={editHtml}
                      onChange={(e) => setEditHtml(e.target.value)}
                      rows={6}
                      className="w-full rounded-[6px] border border-border bg-bg-0 p-3 text-[11px] text-text font-mono leading-relaxed resize-y focus:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0"
                      spellCheck={false}
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => { onVariantUpdate({ variant_html: editHtml }); setEditingHtml(false) }}
                        className="flex items-center gap-1 rounded-[4px] bg-fill-invert px-2.5 py-1 text-[10px] font-semibold text-text-on-invert transition-opacity hover:opacity-85 cursor-pointer"
                      >
                        <Check className="h-2.5 w-2.5" /> Apply
                      </button>
                      <button
                        onClick={() => setEditingHtml(false)}
                        className="rounded-[4px] border border-border px-2.5 py-1 text-[10px] text-text-3 transition-colors hover:text-text cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <code className="block rounded-[6px] bg-bg-0 p-3 text-[11px] text-text-3 font-mono leading-relaxed whitespace-pre-wrap">
                    {variantResult.variant_html}
                  </code>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowEditor(true)}
            className="cursor-pointer rounded-[6px] border border-border px-4 py-2 text-[12px] text-text-2 transition-colors hover:border-border-strong hover:text-text"
          >
            Edit variant
          </button>
        </div>
      )}
    </div>
  )
}
