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
import { Button, Card, SegmentedControl } from '@/app/components'

interface TextInputEditorProps {
  element: ElementSelection
  originalHtml: string
  /**
   * Bestehendes Varianten-CSS (KI-Ergebnis). Im inherit-Modus bleibt es
   * erhalten — ein reiner Text-Edit darf das KI-Design nicht wegwerfen.
   */
  baseCss?: string | null
  /**
   * Wenn gesetzt, ist der Mode-Umschalter ausgeblendet und dieser Modus gilt
   * fest — die Advanced-Ausklappung in StepChange bindet den Editor so als
   * reinen Scratch-Editor ein.
   */
  modeLocked?: EditorMode
  onApply: (html: string, css: string) => void
  onCancel: () => void
}

function generateTextCss(selector: string): string {
  return `${selector} {\n  transition: all 0.2s ease;\n}`
}

export function TextInputEditor({ element, originalHtml, baseCss, modeLocked, onApply, onCancel }: TextInputEditorProps) {
  const originalText = extractTextFromHtml(originalHtml)
  const [mode, setMode] = useState<EditorMode>(modeLocked ?? 'inherit')
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
      {/* Mode-Umschalter: Delta auf A (Default) vs. kompletter Neubau.
          In der Advanced-Ausklappung von StepChange ist der Modus fest
          'scratch' — der Umschalter entfällt dann komplett. */}
      {!modeLocked && (
        <SegmentedControl
          label="Variant B base"
          value={mode}
          onChange={setMode}
          options={[
            {
              value: 'inherit',
              label: 'Inherit from A',
              title: 'B inherits markup, classes and responsive behavior from A — only the text changes',
            },
            {
              value: 'scratch',
              label: 'From scratch',
              title: 'B is rebuilt completely (own markup)',
            },
          ]}
        />
      )}

      {/* Live Preview — iframe mit echtem Site-CSS, A und B nebeneinander */}
      <Card>
        <p className="mb-3 text-meta font-medium text-text-2">Live Preview</p>
        <div className="overflow-hidden rounded-md border border-border bg-bg-0">
          <iframe
            srcDoc={srcDoc}
            sandbox=""
            title="Live preview — original vs. variant"
            className="h-24 w-full"
          />
        </div>
      </Card>

      {/* Text Input */}
      <div>
        <label className="mb-1.5 block text-meta font-medium text-text-2">Text</label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text"
          maxLength={200}
          className="w-full rounded-md border border-border bg-bg-0 px-3 py-2 text-body text-text placeholder:text-text-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:border-border-strong focus:ring-2 focus:ring-text/10"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button
          variant="ghost"
          type="button"
          onClick={handleReset}
          className="gap-1 text-meta"
        >
          <RotateCcw className="h-3 w-3" />
          Reset to original
        </Button>
        <div className="flex gap-2">
          <Button
            variant="secondary" size="md"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="primary" size="md"
            type="button"
            onClick={handleApply}
            className="hover:opacity-90"
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  )
}
