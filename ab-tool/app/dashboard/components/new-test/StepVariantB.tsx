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
import { ButtonEditor } from './ButtonEditor'
import { TextInputEditor } from './TextInputEditor'
import { getEditorCategory } from './types'
import type { ElementSelection, VariantResult } from '../NewTestDrawer'

interface StepVariantBProps {
  element: ElementSelection
  url: string
  variantResult: VariantResult | null
  onVariantUpdate: (patch: Partial<VariantResult>) => void
}

export function StepVariantB({
  element, url, variantResult, onVariantUpdate,
}: StepVariantBProps) {
  const [showEditor, setShowEditor] = useState(!variantResult)
  const category = getEditorCategory(element.elementType)

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

            {variantResult.variant_css && (
              <div className="mt-3">
                <code className="block rounded-[6px] bg-bg-0 p-3 text-[11px] text-text-3 font-mono leading-relaxed whitespace-pre-wrap">
                  {variantResult.variant_css}
                </code>
              </div>
            )}

            {variantResult.variant_html && (
              <div className="mt-2">
                <p className="mb-1 text-[10px] text-text-3">HTML:</p>
                <code className="block rounded-[6px] bg-bg-0 p-3 text-[11px] text-text-3 font-mono leading-relaxed whitespace-pre-wrap">
                  {variantResult.variant_html}
                </code>
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
