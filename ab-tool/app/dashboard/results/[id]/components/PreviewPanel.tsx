'use client'

import { VariantPreview } from '@/app/components/VariantPreview'
import { extractTextFromHtml } from '@/lib/previewDoc'
import { Pencil, X } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import type { ExperimentData } from '@/lib/getExperimentStats'
import { TextPane } from './TextPane'

/** Vorschau A/B (iframe oder Text-Fallback ohne site_css) und HTML-Editor für B. */
export function PreviewPanel({
  data,
  editingB,
  hasSiteCss,
  winner,
  setDraftB,
  setEditingB,
  draftB,
  saveVariantB,
  busy,
}: {
  data: ExperimentData
  editingB: boolean
  hasSiteCss: boolean
  winner: string | null
  setDraftB: Dispatch<SetStateAction<string>>
  setEditingB: Dispatch<SetStateAction<boolean>>
  draftB: string
  saveVariantB: () => Promise<void>
  busy: boolean
}) {
  return (
    <>
      {/* Preview */}
      {(data.originalHtml || data.variantBHtml || editingB) && (
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text">Preview</h2>
            <span className="text-[10px] text-text-3">
              {hasSiteCss ? 'Live rendering of your variants' : 'Text-only — no site styles captured'}
            </span>
          </div>
          {!hasSiteCss && (data.originalHtml || data.variantBHtml) && !editingB ? (
            /* Ohne die Styles der Zielseite wuerde das iframe einen nackten
               Browser-Default rendern, der mit dem echten Element nichts zu tun
               hat. Tests, die vor 08/2026 im Wizard angelegt wurden, haben kein
               site_css — dort ist der Textvergleich die ehrlichere Auskunft. */
            <div>
              <div className="grid grid-cols-2 gap-5">
                <TextPane label="A · Original" value={extractTextFromHtml(data.originalHtml || '')} />
                <TextPane label="B · Variant" value={extractTextFromHtml(data.variantBHtml || '')} />
              </div>
              <p className="mt-2 text-[11px] text-[#ededed]/40">
                This test was created without the visual picker, so your site&apos;s styles for
                this element were never captured. Re-pick the element to get a rendered preview.
              </p>
            </div>
          ) : (
          <div className="grid grid-cols-2 gap-5">
            {data.originalHtml && (
              <VariantPreview
                html={data.originalHtml}
                css={data.siteCss}
                label="A · Original"
                winner={winner === 'A'}
              />
            )}
            {!editingB && data.variantBHtml && (
              <div className="space-y-2">
                <VariantPreview
                  html={data.variantBHtml}
                  css={data.siteCss}
                  variantCss={data.variantBCss}
                  label="B · Variant"
                  winner={winner === 'B'}
                />
                <button
                  onClick={() => { setDraftB(data.variantBHtml || ''); setEditingB(true) }}
                  className="flex cursor-pointer items-center gap-1.5 text-xs text-text-3 transition-colors hover:text-text-2"
                >
                  <Pencil className="h-3 w-3" /> Edit Variant B HTML
                </button>
              </div>
            )}
            {!editingB && !data.variantBHtml && data.originalHtml && (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] min-h-[280px]">
                <button
                  onClick={() => { setDraftB('<div class="ab-v">\n  <style>\n    .ab-v { /* your styles */ }\n  </style>\n</div>'); setEditingB(true) }}
                  className="cursor-pointer text-xs text-text-3 transition-colors hover:text-text-2"
                >
                  + Add Variant B HTML
                </button>
              </div>
            )}
            {editingB && (
              <div className="rounded-[var(--radius-md)] border border-border bg-bg-2 p-4">
                <p className="mb-2 text-xs font-semibold text-text-2">Edit Variant B HTML</p>
                <textarea
                  value={draftB}
                  onChange={e => setDraftB(e.target.value)}
                  className="w-full rounded-[var(--radius-md)] border border-border bg-bg-1 px-3 py-2 font-mono text-xs text-ok focus:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:ring-1 focus:ring-border-strong"
                  rows={10}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={saveVariantB}
                    disabled={busy}
                    className="cursor-pointer rounded-[var(--radius-md)] bg-white px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingB(false)}
                    className="cursor-pointer rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-xs text-text-3 transition-colors hover:text-text"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      )}
    </>
  )
}
