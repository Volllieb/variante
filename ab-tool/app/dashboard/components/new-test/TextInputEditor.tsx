'use client'

/**
 * TextInputEditor — Einfacher Editor für Text/Headline-Elemente.
 *
 * - Einzeiliges Input-Feld, vorausgefüllt mit Original-Text
 * - Reset-Button setzt auf Original zurück
 * - "Apply" generiert variant_html + variant_css
 */

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import type { ElementSelection } from '../NewTestDrawer'

interface TextInputEditorProps {
  element: ElementSelection
  originalHtml: string
  onApply: (html: string, css: string) => void
  onCancel: () => void
}

function extractTextFromHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

function generateTextHtml(text: string): string {
  return `<span class="ab-variant-b">${text}</span>`
}

function generateTextCss(selector: string): string {
  return `${selector} {\n  transition: all 0.2s ease;\n}`
}

export function TextInputEditor({ element, originalHtml, onApply, onCancel }: TextInputEditorProps) {
  // ponytail: handleApply hatte dieselbe CSS-Regel nochmal inline stehen,
  // während generateTextCss ungenutzt danebenlag.
  const originalText = extractTextFromHtml(originalHtml)
  const [text, setText] = useState(originalText)

  function handleApply() {
    const selector = element.selector || element.elementName
    const html = generateTextHtml(text || originalText)
    onApply(html, generateTextCss(selector))
  }

  function handleReset() {
    setText(originalText)
  }

  return (
    <div className="space-y-4">
      {/* Live Preview */}
      <div className="rounded-[10px] border border-border bg-bg-1 p-4">
        <p className="mb-3 text-[11px] font-medium text-text-2">Live Preview</p>
        <div className="flex items-center justify-center rounded-[8px] border border-border bg-bg-0 p-6 min-h-[60px]">
          <span className="text-[14px] text-text">
            {text || originalText || 'Text'}
          </span>
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
          className="w-full rounded-[6px] border border-border bg-bg-0 px-3 py-2 text-[13px] text-text placeholder:text-text-3 outline-none focus:border-border-strong focus:ring-2 focus:ring-text/10"
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
            className="cursor-pointer rounded-[6px] border border-border px-4 py-2 text-[12px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="cursor-pointer rounded-[6px] bg-accent px-4 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
