'use client'

/**
 * TextInputEditor — Einfacher Editor für Text/Headline-Elemente.
 *
 * Zwei Modi:
 * - `inherit` (Default): B ist ein Delta auf A — A's Markup (Tag, Klassen,
 *   Attribute außer id) bleibt erhalten, nur der Text ändert sich. Kein
 *   CSS nötig: A's Kaskade gilt weiter, responsive Verhalten inklusive.
 * - `scratch`: Neubau als <span class="ab-variant-b"> mit transition.
 *
 * Vorschau als sandboxed iframe MIT dem Site-CSS des Originals.
 */

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { buildPreviewSrcDoc } from '@/lib/previewDoc'
import { inheritRootHtml, scratchVariantHtml } from './delta'
import type { EditorMode } from './types'
import type { ElementSelection } from '../NewTestDrawer'
import { extractTextFromHtml } from '@/lib/previewDoc'

interface TextInputEditorProps {
  element: ElementSelection
  originalHtml: string
  /**
   * Bestehendes Varianten-CSS (KI-Ergebnis). Im inherit-Modus bleibt es
   * erhalten — ein reiner Text-Edit darf das KI-Design nicht wegwerfen.
   */
  baseCss?: string | null
  onApply: (html: string, css: string) => void
  onCancel: () => void
}

function generateTextCss(selector: string): string {
  return `${selector} {\n  transition: all 0.2s ease;\n}`
}

export function TextInputEditor({ element, originalHtml, baseCss, onApply, onCancel }: TextInputEditorProps) {
  const originalText = extractTextFromHtml(originalHtml)
  const [mode, setMode] = useState<EditorMode>('inherit')
  const [text, setText] = useState(originalText)

  function handleApply() {
    const selector = element.selector || element.elementName
    if (mode === 'inherit') {
      // Reines Text-Delta: A's Markup bleibt, kein neues CSS nötig — aber ein
      // bestehendes Varianten-CSS (KI-Ergebnis) bleibt erhalten.
      onApply(inheritRootHtml(originalHtml, text || originalText), baseCss ?? '')
      return
    }
    onApply(scratchVariantHtml(text || originalText, 'span'), generateTextCss(selector))
  }

  function handleReset() {
    setText(originalText)
  }

  const selector = element.selector || element.elementName
  const srcDoc = buildPreviewSrcDoc(
    [
      { html: originalHtml || '' },
      {
        html: mode === 'inherit'
          ? inheritRootHtml(originalHtml, text || originalText)
          : scratchVariantHtml(text || originalText, 'span'),
        css: mode === 'inherit' ? baseCss ?? '' : generateTextCss(selector),
        scopeToSelector: mode === 'inherit',
        selector,
      },
    ],
    { siteCss: element.styleContext?.css }
  )

  return (
    <div className="space-y-4">
      {/* Mode-Umschalter: Delta auf A (Default) vs. kompletter Neubau */}
      <div className="flex rounded-[var(--radius-md)] border border-border bg-bg-0 p-0.5">
        {([
          { value: 'inherit', label: 'Inherit from A' },
          { value: 'scratch', label: 'From scratch' },
        ] as const).map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMode(m.value)}
            className={`flex-1 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
              mode === m.value
                ? 'bg-fill-invert text-text-on-invert'
                : 'text-text-2 hover:text-text'
            }`}
            title={m.value === 'inherit'
              ? 'B erbt Markup, Klassen und responsives Verhalten von A — nur der Text ändert sich'
              : 'B wird komplett neu gebaut (eigenes Markup)'}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Live Preview — iframe mit echtem Site-CSS, A und B nebeneinander */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-4">
        <p className="mb-3 text-[11px] font-medium text-text-2">Live Preview</p>
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-bg-0">
          <iframe
            srcDoc={srcDoc}
            sandbox=""
            title="Live preview — original vs. variant"
            className="h-24 w-full"
          />
        </div>
      </div>

      {/* Text Input */}
      <div>
        <label className="mb-1.5 block text-[11px] font-medium text-text-2">Text</label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text"
          maxLength={200}
          className="w-full rounded-[var(--radius-md)] border border-border bg-bg-0 px-3 py-2 text-[13px] text-text placeholder:text-text-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:border-border-strong focus:ring-2 focus:ring-text/10"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <button
          type="button"
          onClick={handleReset}
          className="flex cursor-pointer items-center gap-1 text-[11px] text-text-3 transition-colors hover:text-text"
        >
          <RotateCcw className="h-3 w-3" />
          Reset to original
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-[var(--radius-md)] border border-border px-4 py-2 text-[12px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="cursor-pointer rounded-[var(--radius-md)] bg-fill-invert px-4 py-2 text-[12px] font-semibold text-text-on-invert transition-opacity hover:opacity-90"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
