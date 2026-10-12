'use client'

import { Check, MousePointerClick, AlertCircle } from 'lucide-react'
import type { ElementSelection } from '../../NewTestDrawer'

/** Gewähltes Element (beide Modi) samt Hinweis, wenn es ohne visuellen Picker gewählt wurde. */
export function SelectedElementCard({
  selectedElement,
  onElementSelected,
  onConfirm,
  openPicker,
  showPickerMode,
}: {
  selectedElement: ElementSelection | null
  onElementSelected: (el: ElementSelection) => void
  onConfirm: () => void
  openPicker: () => void
  showPickerMode: boolean
}) {
  return (
    <>
      {/* ── Selected element (shared between both modes) ── */}
      {selectedElement && (
        <>
          <div className="rounded-[var(--radius-lg)] border border-ok/20 bg-ok/5 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-ok/15">
                <Check className="h-4 w-4 text-ok" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-text">{selectedElement.elementName}</p>
                <p className="mt-1 text-[12px] text-text-2 capitalize">{selectedElement.elementType}</p>
                <code className="mt-2 inline-block rounded-[var(--radius-sm)] bg-bg-1 px-2 py-0.5 text-[10px] text-text-3 font-mono">
                  {selectedElement.selector}
                </code>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={onConfirm}
                className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-ok px-4 py-2 text-[12px] font-semibold text-black transition-opacity hover:opacity-90 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                Confirm &amp; continue
              </button>
              {showPickerMode ? (
                <button
                  onClick={openPicker}
                  className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-border px-4 py-2 text-[12px] text-text-2 transition-colors hover:border-border-strong hover:text-text cursor-pointer"
                >
                  Pick different element
                </button>
              ) : (
                <button
                  onClick={() => onElementSelected({ selector: '', originalHtml: '', originalCss: '', elementType: 'element', elementName: '' })}
                  className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-border px-4 py-2 text-[12px] text-text-2 transition-colors hover:border-border-strong hover:text-text cursor-pointer"
                >
                  Change element
                </button>
              )}
            </div>
          </div>

          {/* Ohne den visuellen Picker können wir das Element nicht vermessen:
              Änderungen werden als absolute Werte geschrieben (kein Delta) und
              die Vorschau bleibt text-only. Sichtbar HIER statt erst beim
              Textvergleich in Step 4 — der Nutzer soll die Auswahl korrigieren
              können, bevor sie festgenagelt ist. */}
          {!selectedElement.styleContext && (
            <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-pro/20 bg-pro/[0.04] px-3 py-2.5">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pro" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] leading-relaxed text-text-2">
                  Picked without the visual picker — we can&apos;t measure how this
                  element looks on your site. Your changes will be written as
                  absolute values instead of a delta, and the preview stays text-only.
                </p>
                <button
                  onClick={openPicker}
                  className="mt-1.5 inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-pro underline transition-colors hover:text-pro/80"
                >
                  <MousePointerClick className="h-3 w-3" />
                  Pick it visually instead
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
