'use client'

/**
 * StepVariantB — Step 1: Variant B.
 *
 * Erkennung: Text vs. Button-Element → entsprechender Editor.
 * - button/link → ButtonEditor (voll)
 * - text/headline → TextInputEditor (einfach)
 * - element → ButtonEditor (vereinfacht)
 *
 * Keine API-Calls mehr. Variante wird rein clientseitig erzeugt.
 */

import { useState, useCallback } from 'react'
import { Pencil, Check } from 'lucide-react'
import { ButtonEditor } from './ButtonEditor'
import { TextInputEditor } from './TextInputEditor'
import { getEditorCategory } from './types'
import type { ElementSelection, VariantResult } from '../NewTestDrawer'

interface StepVariantBProps {
  element: ElementSelection
  variantResult: VariantResult | null
  onVariantUpdate: (patch: Partial<VariantResult>) => void
}

export function StepVariantB({
  element, variantResult, onVariantUpdate,
}: StepVariantBProps) {
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
          Create a variant for your element. Edit the text and styles directly.
        </p>
      </div>

      {/* Editor */}
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
