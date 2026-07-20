'use client'

/**
 * VariantEditor — Manueller Editor für die KI-generierte Variante.
 *
 * Split-Pane-Layout:
 * - Links: Live-Preview des Elements mit CSS-Injection
 * - Rechts: PropertyControls (Text, Color, Spacing, Typography)
 *
 * Änderungen sind sofort in der Preview sichtbar (debounced 150ms).
 * Merged User-Edits mit KI-Vorschlag via mergeVariantEdits().
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { RotateCcw } from 'lucide-react'
import { PropertyControls } from './PropertyControls'
import { initializeEditsFromVariant, mergeVariantEdits, parseCssToStyle } from './mergeVariantEdits'
import type { UserEdits } from './types'
import type { ElementSelection, VariantResult } from '../NewTestDrawer'

interface VariantEditorProps {
  element: ElementSelection
  variantResult: VariantResult
  onEditsChange: (edits: UserEdits, mergedCss?: string, mergedHtml?: string) => void
}

export function VariantEditor({ element, variantResult, onEditsChange }: VariantEditorProps) {
  const [edits, setEdits] = useState<UserEdits>(() => initializeEditsFromVariant(variantResult))
  const [previewCss, setPreviewCss] = useState('')
  const [previewHtml, setPreviewHtml] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const selector = element.selector || element.elementName

  // Initialize edits when variantResult changes
  useEffect(() => {
    setEdits(initializeEditsFromVariant(variantResult))
  }, [variantResult])

  // Debounced merge + preview update
  const applyEdits = useCallback(
    (newEdits: UserEdits) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const merged = mergeVariantEdits(newEdits, variantResult, selector)
        if (merged.variant_css) setPreviewCss(merged.variant_css)
        if (merged.variant_html) setPreviewHtml(merged.variant_html)
        onEditsChange(newEdits, merged.variant_css, merged.variant_html)
      }, 150)
    },
    [variantResult, selector, onEditsChange],
  )

  function handleChange(patch: Partial<UserEdits>) {
    const newEdits = { ...edits, ...patch }
    setEdits(newEdits)
    applyEdits(newEdits)
  }

  function handleReset() {
    const fresh = initializeEditsFromVariant(variantResult)
    setEdits(fresh)
    const merged = mergeVariantEdits(fresh, variantResult, selector)
    if (merged.variant_css) setPreviewCss(merged.variant_css)
    if (merged.variant_html) setPreviewHtml(merged.variant_html)
    onEditsChange(fresh, merged.variant_css, merged.variant_html)
  }

  // Initial preview on mount
  useEffect(() => {
    const merged = mergeVariantEdits(edits, variantResult, selector)
    if (merged.variant_css) setPreviewCss(merged.variant_css)
    if (merged.variant_html) setPreviewHtml(merged.variant_html)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      {/* Left: Live Preview */}
      <div className="flex-1">
        <div className="rounded-[10px] border border-border bg-bg-1 p-4">
          <p className="mb-3 text-[11px] font-medium text-text-2">Preview</p>

          {/* Preview Container */}
          <div className="flex items-center justify-center rounded-[8px] border border-border bg-bg-0 p-6 min-h-[100px]">
            <div
              className="inline-block rounded-[6px] px-6 py-3 text-center text-[14px] font-semibold transition-all"
              style={
                previewCss
                  ? parseCssToStyle(previewCss)
                  : { backgroundColor: '#2563EB', color: '#FFFFFF', borderRadius: '6px' }
              }
            >
              {previewHtml || edits.text || variantResult.variant || 'Element'}
            </div>
          </div>

          {/* Original zum Vergleich */}
          <div className="mt-3">
            <p className="mb-1 text-[10px] text-text-3">Original</p>
            <div className="flex items-center justify-center rounded-[6px] border border-border/50 bg-bg-0/50 p-4">
              <span className="text-[12px] text-text-3">
                {element.elementName || element.selector}
              </span>
            </div>
          </div>

          {/* CSS Output (klein) */}
          {previewCss && (
            <div className="mt-3">
              <p className="mb-1 text-[10px] text-text-3">Generated CSS:</p>
              <code className="block max-h-16 overflow-y-auto rounded-[4px] bg-bg-0 p-2 text-[9px] text-text-3 font-mono leading-relaxed whitespace-pre-wrap">
                {previewCss}
              </code>
            </div>
          )}
        </div>
      </div>

      {/* Right: Controls */}
      <div className="w-full sm:w-64 shrink-0">
        <div className="rounded-[10px] border border-border bg-bg-1 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-medium text-text-2">Properties</p>
            <button
              type="button"
              onClick={handleReset}
              className="flex cursor-pointer items-center gap-1 text-[10px] text-text-3 transition-colors hover:text-text"
              title="Reset to AI-generated values"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
          <PropertyControls
            elementType={element.elementType}
            edits={edits}
            onChange={handleChange}
          />
        </div>
      </div>
    </div>
  )
}


