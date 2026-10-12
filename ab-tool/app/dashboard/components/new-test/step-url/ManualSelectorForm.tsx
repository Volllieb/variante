'use client'

import { Check, ChevronDown } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'

/** Manueller Modus: CSS-Selektor, optionale Typ/Name/HTML-Felder, Bestätigen. */
export function ManualSelectorForm({
  manualSelector,
  setManualSelector,
  manualSelectorError,
  setManualSelectorError,
  manualElementType,
  setManualElementType,
  manualElementName,
  setManualElementName,
  manualHtml,
  setManualHtml,
  showMoreOptions,
  setShowMoreOptions,
  confirmManual,
  showPickerMode,
}: {
  manualSelector: string
  setManualSelector: Dispatch<SetStateAction<string>>
  manualSelectorError: string
  setManualSelectorError: Dispatch<SetStateAction<string>>
  manualElementType: string
  setManualElementType: Dispatch<SetStateAction<string>>
  manualElementName: string
  setManualElementName: Dispatch<SetStateAction<string>>
  manualHtml: string
  setManualHtml: Dispatch<SetStateAction<string>>
  showMoreOptions: boolean
  setShowMoreOptions: Dispatch<SetStateAction<boolean>>
  confirmManual: () => void
  showPickerMode: boolean
}) {
  return (
    <>
      {/* ── MANUAL MODE ── */}
      {!showPickerMode && (
        <div className="space-y-3">
          {/* CSS Selector */}
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-text-3 uppercase tracking-wider">
              CSS Selector
            </label>
            <input
              type="text"
              value={manualSelector}
              onChange={(e) => { setManualSelector(e.target.value); setManualSelectorError('') }}
              onKeyDown={(e) => e.key === 'Enter' && confirmManual()}
              placeholder=".cta-button, #hero-headline, button.primary"
              className="w-full rounded-[7px] border border-border bg-bg-1 py-2.5 px-3 text-[13px] text-text font-mono placeholder:text-text-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:border-border-strong"
            />
            {manualSelectorError && (
              <p className="mt-1 text-[11px] text-err">{manualSelectorError}</p>
            )}
            <p className="mt-1 text-[11px] text-text-3">
              Examples: <code className="text-text-2 bg-bg-2 px-1 rounded text-[10px]">.my-class</code>,{' '}
              <code className="text-text-2 bg-bg-2 px-1 rounded text-[10px]">#my-id</code>,{' '}
              <code className="text-text-2 bg-bg-2 px-1 rounded text-[10px]">button.cta</code>
            </p>
          </div>

          {/* Type / Name / HTML — optional, tucked behind a disclosure since
              most manual entries only need the selector. */}
          <button
            onClick={() => setShowMoreOptions((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-text-3 transition-colors hover:text-text-2 cursor-pointer"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${showMoreOptions ? 'rotate-180' : ''}`} />
            {showMoreOptions ? 'Fewer options' : 'More options'}
            <span className="text-text-3/60">(type, name, HTML)</span>
          </button>

          {showMoreOptions && (
            <div className="space-y-3 rounded-[var(--radius-md)] border border-border bg-bg-1 p-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-text-3 uppercase tracking-wider">
                    Element Type
                  </label>
                  {/* Only types with a real editor behind them: button/link open the
                      button editor (colors, border, hover), headline/text open the
                      text editor. "Image" and "Form" used to be offered here but had
                      no editor at all — picking them silently produced a button
                      editor, which made no sense for an image or a form. */}
                  <select
                    value={manualElementType}
                    onChange={(e) => setManualElementType(e.target.value)}
                    className="w-full rounded-[7px] border border-border bg-bg-0 py-2.5 px-3 text-[13px] text-text cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30"
                  >
                    <option value="element">Generic Element</option>
                    <option value="button">Button</option>
                    <option value="link">Link</option>
                    <option value="headline">Headline</option>
                    <option value="text">Text / Paragraph</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-text-3 uppercase tracking-wider">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={manualElementName}
                    onChange={(e) => setManualElementName(e.target.value)}
                    placeholder='e.g. "Hero CTA Button"'
                    className="w-full rounded-[7px] border border-border bg-bg-0 py-2.5 px-3 text-[13px] text-text placeholder:text-text-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-text-3 uppercase tracking-wider">
                  Original HTML <span className="font-normal text-text-3/60">(helps AI generate better variants)</span>
                </label>
                <textarea
                  value={manualHtml}
                  onChange={(e) => setManualHtml(e.target.value)}
                  placeholder='<button class="cta">Get Started</button>'
                  rows={3}
                  className="w-full rounded-[7px] border border-border bg-bg-0 py-2.5 px-3 text-[12px] text-text font-mono placeholder:text-text-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 resize-none"
                />
              </div>
            </div>
          )}

          {/* Confirm button */}
          <button
            onClick={confirmManual}
            className="flex w-full items-center justify-center gap-1.5 rounded-[7px] bg-fill-invert px-5 py-2.5 text-[13px] font-semibold text-text-on-invert transition-opacity hover:opacity-90 cursor-pointer"
          >
            <Check className="h-4 w-4" />
            Confirm Element
          </button>
        </div>
      )}
    </>
  )
}
