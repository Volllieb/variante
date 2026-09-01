'use client'

/**
 * ChangeList — die Änderungsliste als Quelle der Wahrheit für Variante B.
 *
 * Geteilt zwischen StepChange (Step 2, editierbar) und StepReview (Step 3,
 * read-only). Pro Zeile: Label, vorher → nachher, Quellen-Badge und Aktionen.
 *
 * Editieren klappt INLINE den passenden Sub-Control auf (ColorPicker,
 * PropertySlider, Border-Style-Segment, Text-Input) — die Scratch-Editoren
 * (ButtonEditor/TextInputEditor) bleiben der Advanced-Ausklappung in
 * StepChange vorbehalten, sie bringen einen eigenen Mode-Umschalter und
 * Apply-Footer mit, die im Zeilenmodell doppelt wären.
 */

import { useState } from 'react'
import { X, Pencil, Check, Sparkles, Palette, ChevronDown } from 'lucide-react'
import { ColorPicker } from './ColorPicker'
import { PropertySlider } from './PropertySlider'
import { describeChange } from './delta'
import type { ChangeEntry, ChangeProperty } from './types'

interface ChangeListProps {
  entries: ChangeEntry[]
  /** Step 3: Zeilen ohne Aktionen anzeigen. */
  readOnly?: boolean
  /** Inline-Editor (kontrolliert von StepChange, damit neue Zeilen direkt aufgehen). */
  editingId?: string | null
  onEditingChange?: (id: string | null) => void
  onEntriesChange?: (entries: ChangeEntry[]) => void
}

const BORDER_STYLES = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'none', label: 'None' },
] as const

/** Slider-Konfiguration der numerischen Properties (Radius/Width/Scale + KI-Zeilen). */
const SLIDERS: Record<string, { min: number; max: number; step: number; unit: string }> = {
  fontSize: { min: 10, max: 72, step: 1, unit: 'px' },
  fontWeight: { min: 300, max: 900, step: 100, unit: '' },
  borderRadius: { min: 0, max: 32, step: 1, unit: 'px' },
  paddingX: { min: 0, max: 64, step: 1, unit: 'px' },
  paddingY: { min: 0, max: 64, step: 1, unit: 'px' },
  borderWidth: { min: 0, max: 8, step: 1, unit: 'px' },
  hoverScale: { min: 100, max: 120, step: 1, unit: '%' },
}

const COLOR_PROPS: ReadonlySet<ChangeProperty> = new Set([
  'bgColor', 'textColor', 'borderColor', 'hoverBgColor',
])

/** Properties ohne Inline-Editor — hoverShadow ist nur löschbar, other ist Roh-CSS. */
const NON_EDITABLE: ReadonlySet<ChangeProperty> = new Set(['other', 'hoverShadow'])

export function ChangeList({
  entries, readOnly, editingId, onEditingChange, onEntriesChange,
}: ChangeListProps) {
  const [localEditingId, setLocalEditingId] = useState<string | null>(null)
  const activeEditingId = readOnly ? null : (editingId !== undefined ? editingId : localEditingId)
  const setActiveEditingId = (id: string | null) => {
    if (onEditingChange) onEditingChange(id)
    else setLocalEditingId(id)
  }

  if (entries.length === 0) {
    if (readOnly) return null
    return (
      <p className="rounded-[var(--radius-md)] border border-dashed border-border px-4 py-5 text-center text-[12px] text-text-3">
        No changes yet — Variant B is identical to your original.
      </p>
    )
  }

  const patch = (id: string, next: Partial<ChangeEntry>) => {
    onEntriesChange?.(entries.map((e) => (e.id === id ? { ...e, ...next } : e)))
  }
  const remove = (id: string) => {
    onEntriesChange?.(entries.filter((e) => e.id !== id))
    if (activeEditingId === id) setActiveEditingId(null)
  }

  /** Vorschlag annehmen: ersetzt eine bestehende applied-Zeile desselben
      Properties; other-Zeilen verschmelzen zu einer Roh-CSS-Gruppe. */
  const accept = (id: string) => {
    const target = entries.find((e) => e.id === id)
    if (!target) return
    let next = entries.filter(
      (e) => !(e.status === 'suggested' && e.property === target.property)
    )
    if (target.property === 'other') {
      const existing = next.find((e) => e.property === 'other' && e.status === 'applied')
      next = existing
        ? next.map((e) => e.id === existing.id
          ? { ...e, rawCss: [e.rawCss, target.rawCss].filter(Boolean).join('\n') }
          : e)
        : [...next, { ...target, status: 'applied' as const }]
    } else {
      next = [
        ...next.filter((e) => !(e.property === target.property && e.status === 'applied')),
        { ...target, status: 'applied' as const },
      ]
    }
    onEntriesChange?.(next)
  }

  return (
    <div className="space-y-1.5">
      {entries.map((entry) => {
        const { label, before, after } = describeChange(entry)
        const isSuggested = entry.status === 'suggested'
        const isEditing = activeEditingId === entry.id
        const editable = !readOnly && !NON_EDITABLE.has(entry.property)
        return (
          <div
            key={entry.id}
            className={`rounded-[var(--radius-md)] border px-3 py-2.5 ${
              isSuggested ? 'border-pro/25 bg-pro/[0.04]' : 'border-border bg-bg-1'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {/* Label + Quelle */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className={`text-[12px] font-medium ${isSuggested ? 'text-pro' : 'text-text'}`}>
                    {label}
                  </p>
                  {entry.source === 'ai' && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-pro/15 px-1.5 py-0.5 text-[9px] font-semibold text-pro">
                      <Sparkles className="h-2.5 w-2.5" />
                      AI
                    </span>
                  )}
                  {entry.source === 'figma' && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-bg-2 px-1.5 py-0.5 text-[9px] font-semibold text-text-3">
                      <Palette className="h-2.5 w-2.5" />
                      Figma
                    </span>
                  )}
                </div>
                {/* Die other-Zeile trägt ihr Roh-CSS selbst — ein "set to
                    Custom CSS" unter dem Label wäre nur Rauschen. */}
                {entry.property !== 'other' && (
                  <p className="mt-0.5 truncate text-[11px] text-text-2">
                    {before === ''
                      ? <><span className="text-text-3">set to</span> <span className="font-mono text-text">{after}</span></>
                      : <><span className="font-mono text-text-3">{before}</span>
                          <span className="mx-1 text-text-3">→</span>
                          <span className="font-mono text-text">{after}</span></>}
                  </p>
                )}
              </div>

              {/* Aktionen */}
              {!readOnly && (
                <div className="flex shrink-0 items-center gap-1">
                  {isSuggested ? (
                    <>
                      <button
                        type="button"
                        onClick={() => accept(entry.id)}
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-ok transition-colors hover:bg-ok/10"
                        title="Accept suggestion"
                        aria-label={`Accept ${label} suggestion`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(entry.id)}
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-text-3 transition-colors hover:bg-bg-2 hover:text-text"
                        title="Dismiss suggestion"
                        aria-label={`Dismiss ${label} suggestion`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      {editable && (
                        <button
                          type="button"
                          onClick={() => setActiveEditingId(isEditing ? null : entry.id)}
                          className="flex h-6 cursor-pointer items-center gap-1 rounded-[var(--radius-sm)] px-1.5 text-[10px] font-medium text-text-3 transition-colors hover:bg-bg-2 hover:text-text"
                          aria-label={`Edit ${label}`}
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(entry.id)}
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-text-3 transition-colors hover:bg-bg-2 hover:text-text"
                        title={`Remove ${label} change`}
                        aria-label={`Remove ${label} change`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Erklärung des KI-Vorschlags */}
            {entry.explanation && (
              <p className="mt-1 text-[10px] leading-relaxed text-text-3 italic">{entry.explanation}</p>
            )}

            {/* Roh-CSS der other-Zeile — nicht editierbar, als Gruppe verwirfbar */}
            {entry.property === 'other' && entry.rawCss && (
              <details className="mt-1.5">
                <summary className="flex cursor-pointer items-center gap-1 text-[10px] text-text-3 transition-colors hover:text-text-2">
                  <ChevronDown className="h-3 w-3" />
                  Raw CSS
                </summary>
                <code className="mt-1 block max-h-24 overflow-y-auto rounded-[var(--radius-md)] bg-bg-0 p-2.5 text-[10px] font-mono leading-relaxed whitespace-pre-wrap text-text-3">
                  {entry.rawCss}
                </code>
              </details>
            )}

            {/* Inline-Editor */}
            {isEditing && (
              <div className="mt-2.5 border-t border-border pt-2.5">
                <InlineControl
                  entry={entry}
                  onChange={(after) => patch(entry.id, { after })}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveEditingId(null)}
                    className="cursor-pointer rounded-[var(--radius-sm)] bg-fill-invert px-2.5 py-1 text-[10px] font-semibold text-text-on-invert transition-opacity hover:opacity-90"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Der passende Sub-Control pro Property — alle existierten bereits in den Editoren. */
function InlineControl({ entry, onChange }: { entry: ChangeEntry; onChange: (after: string) => void }) {
  const { label } = describeChange(entry)
  const numeric = parseFloat(entry.after)

  if (COLOR_PROPS.has(entry.property)) {
    return (
      <ColorPicker
        label={label}
        value={/^#[0-9a-fA-F]{6}$/.test(entry.after) ? entry.after : '#000000'}
        onChange={onChange}
      />
    )
  }

  const slider = SLIDERS[entry.property]
  if (slider) {
    return (
      <PropertySlider
        label={label}
        value={Number.isNaN(numeric) ? slider.min : numeric}
        min={slider.min}
        max={slider.max}
        step={slider.step}
        unit={slider.unit || undefined}
        onChange={(v) => onChange(String(v))}
      />
    )
  }

  if (entry.property === 'borderStyle') {
    return (
      <div>
        <p className="mb-1.5 text-[11px] font-medium text-text-2">{label}</p>
        <div className="flex gap-1">
          {BORDER_STYLES.map((bs) => (
            <button
              key={bs.value}
              type="button"
              onClick={() => onChange(bs.value)}
              className={`flex-1 cursor-pointer rounded-[var(--radius-md)] px-2 py-1.5 text-[11px] font-medium transition-colors ${
                entry.after === bs.value
                  ? 'bg-bg-2 text-text'
                  : 'bg-bg-1 text-text-3 hover:text-text'
              }`}
            >
              {bs.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // text und alles sonst nicht Spezifische: einfaches Textfeld
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium text-text-2">{label}</p>
      <input
        type="text"
        value={entry.after}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        maxLength={200}
        autoFocus
        className="w-full rounded-[var(--radius-md)] border border-border bg-bg-0 px-3 py-2 text-[13px] text-text placeholder:text-text-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:border-border-strong focus:ring-2 focus:ring-text/10"
      />
    </div>
  )
}
