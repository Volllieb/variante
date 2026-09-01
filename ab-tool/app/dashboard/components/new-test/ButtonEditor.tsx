'use client'

/**
 * ButtonEditor — Manueller Editor für Button/Link-Elemente.
 *
 * Zwei Modi:
 * - `inherit` (Default): B ist ein Delta auf A. Markup, Klassen und Attribute
 *   kommen von A, nur der Text ändert sich; das CSS enthält ausschließlich
 *   Properties, die von der gemessenen Baseline abweichen. A's responsives
 *   Verhalten (@media, clamp(), Container-Queries) gilt dadurch automatisch.
 * - `scratch`: kompletter Neubau mit eigenem Markup und absolutem CSS —
 *   Escape-Hatch für radikale Redesigns.
 *
 * Live-Vorschau als sandboxed iframe MIT dem Site-CSS des Originals — ein
 * React-Element mit Inline-Styles kann A's Kaskade nicht abbilden.
 *
 * Keine API-Calls — alles clientseitig. Pure Logik liegt in delta.ts und
 * lib/previewDoc.ts (node-testbar).
 */

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { ColorPicker } from './ColorPicker'
import { PropertySlider } from './PropertySlider'
import { buildPreviewSrcDoc } from '@/lib/previewDoc'
import {
  baselineFromCss,
  buildStyleBaseline,
  generateButtonCss,
  inheritRootHtml,
  initialEdits,
  mergeVariantCss,
  scratchVariantHtml,
} from './delta'
import type { UserEdits, EditorMode } from './types'
import type { ElementSelection } from '../NewTestDrawer'
import { extractTextFromHtml } from '@/lib/previewDoc'

interface ButtonEditorProps {
  element: ElementSelection
  originalHtml: string
  /**
   * Bestehendes Varianten-CSS, auf dem die Edits aufbauen (KI-Ergebnis).
   * Die Baseline des Editors wird daraus abgeleitet, und das Delta wird beim
   * Anwenden DARAN angehängt statt es zu ersetzen — "Changes are applied to
   * the AI result" muss stimmen. Ohne baseCss bleibt das bisherige Verhalten.
   */
  baseCss?: string | null
  onApply: (html: string, css: string) => void
  onCancel: () => void
}

const BORDER_STYLES = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'none', label: 'None' },
] as const

export function ButtonEditor({ element, originalHtml, baseCss, onApply, onCancel }: ButtonEditorProps) {
  const originalText = extractTextFromHtml(originalHtml)
  // Im AI-Edit-Fall ist das KI-Design die Baseline (das Delta misst Änderungen
  // gegen das, was der User sieht), sonst die gemessenen Computed-Styles von A.
  const baseline = baselineFromCss(baseCss) ?? buildStyleBaseline(element.styleContext?.computed)
  const [mode, setMode] = useState<EditorMode>('inherit')
  const [edits, setEdits] = useState<UserEdits>(() => initialEdits(baseline, originalText))

  function handleChange(patch: Partial<UserEdits>) {
    setEdits((prev) => {
      const next = { ...prev, ...patch }
      // Breite erhöhen bei border-style: none ergäbe eine unsichtbare Grenze
      // (A hat width>0 und style:none) — die Breiten-Änderung wirkt erst mit
      // einer sichtbaren Linie, also automatisch auf solid wechseln.
      if (patch.borderWidth !== undefined && (next.borderStyle ?? 'solid') === 'none') {
        next.borderStyle = 'solid'
      }
      return next
    })
  }

  function handleReset() {
    // Baseline statt DEFAULT_EDITS: erzeugt im inherit-Modus ein LEERES Delta.
    setEdits(initialEdits(baseline, originalText))
  }

  function handleApply() {
    const selector = element.selector || element.elementName
    const html = mode === 'inherit'
      ? inheritRootHtml(originalHtml, edits.text || originalText)
      : scratchVariantHtml(edits.text || originalText)
    // Das Delta hängt an das bestehende Varianten-CSS an (KI-Ergebnis) —
    // nur im inherit-Modus: "From scratch" ersetzt bewusst alles.
    const css = mergeVariantCss(mode === 'inherit' ? baseCss : null, generateButtonCss(edits, selector, baseline, mode))
    onApply(html, css)
  }

  const selector = element.selector || element.elementName
  const previewHtml = mode === 'inherit'
    ? inheritRootHtml(originalHtml, edits.text || originalText)
    : scratchVariantHtml(edits.text || originalText)
  const previewCss = mergeVariantCss(mode === 'inherit' ? baseCss : null, generateButtonCss(edits, selector, baseline, mode))
  const srcDoc = buildPreviewSrcDoc(
    [
      { html: originalHtml || '' },
      { html: previewHtml, css: previewCss, scopeToSelector: true, selector },
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
              ? 'B erbt Markup, Klassen und responsives Verhalten von A — nur Änderungen werden emittiert'
              : 'B wird komplett neu gebaut (eigenes Markup + absolutes CSS)'}
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
            className="h-32 w-full"
          />
        </div>
        {edits.hoverEnabled && (
          <p className="mt-1.5 text-[10px] text-text-3">
            Hover the variant in the preview to see the hover state.
          </p>
        )}
      </div>

      {/* Text */}
      <div>
        <label className="mb-1.5 block text-[11px] font-medium text-text-2">Text</label>
        <input
          type="text"
          value={edits.text ?? ''}
          onChange={(e) => handleChange({ text: e.target.value })}
          placeholder="Button text"
          maxLength={120}
          className="w-full rounded-[var(--radius-md)] border border-border bg-bg-0 px-3 py-2 text-[13px] text-text placeholder:text-text-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:border-border-strong focus:ring-2 focus:ring-text/10"
        />
      </div>

      {/* Colors */}
      <div className="space-y-3">
        <p className="text-[11px] font-medium text-text-2">Colors</p>
        <ColorPicker
          label="Background"
          value={edits.bgColor ?? '#2563EB'}
          onChange={(color) => handleChange({ bgColor: color })}
          originalColor={baseline?.bgColor ?? '#2563EB'}
          onReset={() => handleChange({ bgColor: baseline?.bgColor ?? '#2563EB' })}
        />
        <ColorPicker
          label="Text"
          value={edits.textColor ?? '#FFFFFF'}
          onChange={(color) => handleChange({ textColor: color })}
          originalColor={baseline?.textColor ?? '#FFFFFF'}
          onReset={() => handleChange({ textColor: baseline?.textColor ?? '#FFFFFF' })}
        />
        <ColorPicker
          label="Border"
          value={edits.borderColor ?? 'transparent'}
          onChange={(color) => handleChange({ borderColor: color })}
          originalColor={baseline?.borderColor ?? 'transparent'}
          onReset={() => handleChange({ borderColor: baseline?.borderColor ?? 'transparent' })}
        />
      </div>

      {/* Border */}
      <div className="space-y-3">
        <p className="text-[11px] font-medium text-text-2">Border</p>
        <PropertySlider
          value={edits.borderWidth ?? 0}
          onChange={(v) => handleChange({ borderWidth: v })}
          min={0}
          max={8}
          step={1}
          label="Width"
          unit="px"
        />
        <div>
          <label className="mb-1.5 block text-[11px] font-medium text-text-2">Style</label>
          <div className="flex gap-1">
            {BORDER_STYLES.map((bs) => (
              <button
                key={bs.value}
                type="button"
                onClick={() => handleChange({ borderStyle: bs.value })}
                className={`flex-1 cursor-pointer rounded-[var(--radius-md)] px-2 py-1.5 text-[11px] font-medium transition-colors ${
                  (edits.borderStyle ?? 'solid') === bs.value
                    ? 'bg-bg-2 text-text'
                    : 'bg-bg-1 text-text-3 hover:text-text'
                }`}
              >
                {bs.label}
              </button>
            ))}
          </div>
        </div>
        <PropertySlider
          value={edits.borderRadius ?? 8}
          onChange={(v) => handleChange({ borderRadius: v })}
          min={0}
          max={32}
          step={1}
          label="Radius"
          unit="px"
        />
      </div>

      {/* Hover */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="hover-enabled"
            checked={edits.hoverEnabled ?? false}
            onChange={(e) => handleChange({ hoverEnabled: e.target.checked })}
            className="h-4 w-4 cursor-pointer rounded border-border accent-[var(--color-text)]"
          />
          <label htmlFor="hover-enabled" className="text-[11px] font-medium text-text-2 cursor-pointer">
            Hover Effect
          </label>
        </div>

        {edits.hoverEnabled && (
          <div className="ml-6 space-y-3 border-l-2 border-border pl-3">
            <ColorPicker
              label="Hover Background"
              value={edits.hoverBgColor ?? '#1D4ED8'}
              onChange={(color) => handleChange({ hoverBgColor: color })}
              originalColor="#1D4ED8"
              onReset={() => handleChange({ hoverBgColor: '#1D4ED8' })}
            />
            <PropertySlider
              value={edits.hoverScale ?? 105}
              onChange={(v) => handleChange({ hoverScale: v })}
              min={100}
              max={120}
              step={1}
              label="Scale"
              unit="%"
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hover-shadow"
                checked={edits.hoverShadow ?? false}
                onChange={(e) => handleChange({ hoverShadow: e.target.checked })}
                className="h-4 w-4 cursor-pointer rounded border-border accent-[var(--color-text)]"
              />
              <label htmlFor="hover-shadow" className="text-[11px] font-medium text-text-2 cursor-pointer">
                Shadow
              </label>
            </div>
          </div>
        )}
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
