'use client'

/**
 * StepVariantB — Step 1: Variant B.
 *
 * Zwei Modi:
 * - Manual Editor: ButtonEditor/TextInputEditor (bestehend)
 * - From Figma: User öffnet Figma-Plugin, wählt Variant B, KI übersetzt in Code
 *
 * Keine API-Calls mehr. Variante wird rein clientseitig erzeugt.
 */

import { useState, useCallback } from 'react'
import { Pencil, Check, Palette, ExternalLink } from 'lucide-react'
import { ButtonEditor } from './ButtonEditor'
import { TextInputEditor } from './TextInputEditor'
import { getEditorCategory } from './types'
import type { ElementSelection, VariantResult } from '../NewTestDrawer'

type VariantMode = 'manual' | 'figma'

interface StepVariantBProps {
  element: ElementSelection
  variantResult: VariantResult | null
  onVariantUpdate: (patch: Partial<VariantResult>) => void
}

export function StepVariantB({
  element, variantResult, onVariantUpdate,
}: StepVariantBProps) {
  const [mode, setMode] = useState<VariantMode>('manual')
  const [showEditor, setShowEditor] = useState(!variantResult)
  const category = getEditorCategory(element.elementType)

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

  // ─── Render ───

  return (
    <div className="space-y-4">
      {/* Description */}
      <div>
        <p className="text-[13px] leading-relaxed text-text-2">
          Create a variant for your element. Edit the text and styles directly, or design it in Figma.
        </p>
      </div>

      {/* Mode switcher */}
      <div className="flex rounded-[6px] border border-border bg-bg-0 p-0.5">
        <button
          onClick={() => setMode('manual')}
          className={`flex-1 rounded-[4px] px-3 py-1.5 text-[12px] font-medium transition-colors ${
            mode === 'manual'
              ? 'bg-fill-invert text-text-on-invert'
              : 'text-text-2 hover:text-text'
          }`}
        >
          <Pencil className="inline h-3 w-3 mr-1" />
          Manual Editor
        </button>
        <button
          onClick={() => setMode('figma')}
          className={`flex-1 rounded-[4px] px-3 py-1.5 text-[12px] font-medium transition-colors ${
            mode === 'figma'
              ? 'bg-fill-invert text-text-on-invert'
              : 'text-text-2 hover:text-text'
          }`}
        >
          <Palette className="inline h-3 w-3 mr-1" />
          From Figma
        </button>
      </div>

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

      {/* Applied variant summary */}
      {!showEditor && variantResult && (
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
