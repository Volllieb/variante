'use client'

/**
 * ButtonEditor — Manueller Editor für Button/Link-Elemente.
 *
 * Live-Vorschau (sofort, kein Debounce) mit:
 * - Text-Input
 * - Farben (Background, Text, Border) mit Reset
 * - Rahmen (Dicke, Stil, Farbe, Ecken-Radius)
 * - Hover (Checkbox + Hover-Vorschau + Hintergrund + Scale + Schatten)
 * - "Auf Original zurücksetzen"
 *
 * Keine API-Calls — alles clientseitig.
 */

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { ColorPicker } from './ColorPicker'
import { PropertySlider } from './PropertySlider'
import type { UserEdits } from './types'
import type { ElementSelection } from '../NewTestDrawer'

interface ButtonEditorProps {
  element: ElementSelection
  originalHtml: string
  onApply: (html: string, css: string) => void
  onCancel: () => void
}

const BORDER_STYLES = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'none', label: 'None' },
] as const

function extractTextFromHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

function generateButtonHtml(text: string): string {
  return `<button class="ab-variant-b">${text}</button>`
}

function generateButtonCss(edits: UserEdits, selector: string): string {
  const lines: string[] = []
  lines.push(`${selector} {`)
  if (edits.bgColor) lines.push(`  background-color: ${edits.bgColor};`)
  if (edits.textColor) lines.push(`  color: ${edits.textColor};`)
  if (edits.fontSize) lines.push(`  font-size: ${edits.fontSize}px;`)
  if (edits.fontWeight) lines.push(`  font-weight: ${edits.fontWeight};`)
  if (edits.borderRadius !== undefined) lines.push(`  border-radius: ${edits.borderRadius}px;`)
  if (edits.borderWidth !== undefined) lines.push(`  border-width: ${edits.borderWidth}px;`)
  if (edits.borderColor) lines.push(`  border-color: ${edits.borderColor};`)
  if (edits.borderStyle) lines.push(`  border-style: ${edits.borderStyle};`)
  if (edits.paddingX !== undefined || edits.paddingY !== undefined) {
    const py = edits.paddingY ?? 12
    const px = edits.paddingX ?? 24
    lines.push(`  padding: ${py}px ${px}px;`)
  }
  lines.push('  transition: all 0.2s ease;')
  lines.push('}')

  if (edits.hoverEnabled) {
    lines.push('')
    lines.push(`${selector}:hover {`)
    if (edits.hoverBgColor) lines.push(`  background-color: ${edits.hoverBgColor};`)
    if (edits.hoverScale) lines.push(`  transform: scale(${edits.hoverScale / 100});`)
    if (edits.hoverShadow) lines.push(`  box-shadow: 0 4px 12px rgba(0,0,0,0.15);`)
    lines.push('}')
  }

  return lines.join('\n')
}

function editsToStyle(edits: UserEdits): React.CSSProperties {
  const style: React.CSSProperties = {}
  if (edits.bgColor) style.backgroundColor = edits.bgColor
  if (edits.textColor) style.color = edits.textColor
  if (edits.fontSize) style.fontSize = edits.fontSize
  if (edits.fontWeight) style.fontWeight = edits.fontWeight
  if (edits.borderRadius !== undefined) style.borderRadius = edits.borderRadius
  if (edits.borderWidth !== undefined) style.borderWidth = edits.borderWidth
  if (edits.borderColor) style.borderColor = edits.borderColor
  if (edits.borderStyle) style.borderStyle = edits.borderStyle
  if (edits.paddingX !== undefined || edits.paddingY !== undefined) {
    const py = edits.paddingY ?? 12
    const px = edits.paddingX ?? 24
    style.paddingTop = py
    style.paddingBottom = py
    style.paddingLeft = px
    style.paddingRight = px
  }
  style.transition = 'all 0.2s ease'
  return style
}

function editsToHoverStyle(edits: UserEdits): React.CSSProperties {
  const style: React.CSSProperties = {}
  if (edits.hoverBgColor) style.backgroundColor = edits.hoverBgColor
  else if (edits.bgColor) style.backgroundColor = edits.bgColor
  if (edits.hoverScale) style.transform = `scale(${edits.hoverScale / 100})`
  if (edits.hoverShadow) style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
  style.transition = 'all 0.2s ease'
  return style
}

const DEFAULT_EDITS: UserEdits = {
  text: '',
  bgColor: '#2563EB',
  textColor: '#FFFFFF',
  fontSize: 16,
  fontWeight: 600,
  borderRadius: 8,
  paddingX: 24,
  paddingY: 12,
  borderWidth: 0,
  borderColor: 'transparent',
  borderStyle: 'solid',
  hoverEnabled: false,
  hoverBgColor: '#1D4ED8',
  hoverScale: 105,
  hoverShadow: false,
}

export function ButtonEditor({ element, originalHtml, onApply, onCancel }: ButtonEditorProps) {
  const originalText = extractTextFromHtml(originalHtml)
  const [edits, setEdits] = useState<UserEdits>(() => ({
    ...DEFAULT_EDITS,
    text: originalText,
  }))

  function handleChange(patch: Partial<UserEdits>) {
    setEdits((prev) => ({ ...prev, ...patch }))
  }

  function handleReset() {
    setEdits({ ...DEFAULT_EDITS, text: originalText })
  }

  function handleApply() {
    const selector = element.selector || element.elementName
    const html = generateButtonHtml(edits.text || originalText)
    const css = generateButtonCss(edits, selector)
    onApply(html, css)
  }

  const style = editsToStyle(edits)
  const hoverStyle = editsToHoverStyle(edits)

  return (
    <div className="space-y-4">
      {/* Live Preview */}
      <div className="rounded-[10px] border border-border bg-bg-1 p-4">
        <p className="mb-3 text-[11px] font-medium text-text-2">Live Preview</p>
        <div className="flex items-center justify-center rounded-[8px] border border-border bg-bg-0 p-6 min-h-[100px]">
          <button
            type="button"
            className="inline-block rounded-[6px] text-center font-semibold transition-all"
            style={style}
          >
            {edits.text || originalText || 'Button'}
          </button>
        </div>
        {edits.hoverEnabled && (
          <div className="mt-2">
            <p className="mb-1.5 text-[10px] text-text-3">Hover Preview:</p>
            <div className="flex items-center justify-center rounded-[8px] border border-border/50 bg-bg-0/50 p-6">
              <button
                type="button"
                className="inline-block rounded-[6px] text-center font-semibold"
                style={{ ...style, ...hoverStyle }}
              >
                {edits.text || originalText || 'Button'}
              </button>
            </div>
          </div>
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
          className="w-full rounded-[6px] border border-border bg-bg-0 px-3 py-2 text-[13px] text-text placeholder:text-text-3 outline-none focus:border-border-strong focus:ring-2 focus:ring-text/10"
        />
      </div>

      {/* Colors */}
      <div className="space-y-3">
        <p className="text-[11px] font-medium text-text-2">Colors</p>
        <ColorPicker
          label="Background"
          value={edits.bgColor ?? '#2563EB'}
          onChange={(color) => handleChange({ bgColor: color })}
          originalColor="#2563EB"
          onReset={() => handleChange({ bgColor: '#2563EB' })}
        />
        <ColorPicker
          label="Text"
          value={edits.textColor ?? '#FFFFFF'}
          onChange={(color) => handleChange({ textColor: color })}
          originalColor="#FFFFFF"
          onReset={() => handleChange({ textColor: '#FFFFFF' })}
        />
        <ColorPicker
          label="Border"
          value={edits.borderColor ?? 'transparent'}
          onChange={(color) => handleChange({ borderColor: color })}
          originalColor="transparent"
          onReset={() => handleChange({ borderColor: 'transparent' })}
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
                className={`flex-1 cursor-pointer rounded-[6px] px-2 py-1.5 text-[11px] font-medium transition-all ${
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
            className="cursor-pointer rounded-[6px] border border-border px-4 py-2 text-[12px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="cursor-pointer rounded-[6px] bg-fill-invert px-4 py-2 text-[12px] font-semibold text-text-on-invert transition-opacity hover:opacity-90"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
