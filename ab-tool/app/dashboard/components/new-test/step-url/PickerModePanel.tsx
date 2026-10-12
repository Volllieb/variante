'use client'

import { ExternalLink, Loader2, AlertCircle } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import type { ElementSelection } from '../../NewTestDrawer'
import type { PickerMode } from './types'

/** Visueller Picker: Seite öffnen und eine Statuszeile für den aktuellen Zustand. */
export function PickerModePanel({
  url,
  selectedElement,
  waitingForPicker,
  pickerBlocked,
  setPickerBlocked,
  setMode,
  openPicker,
  urlValid,
  hasSnippet,
  showPickerMode,
}: {
  url: string
  selectedElement: ElementSelection | null
  waitingForPicker: boolean
  pickerBlocked: boolean
  setPickerBlocked: Dispatch<SetStateAction<boolean>>
  setMode: Dispatch<SetStateAction<PickerMode>>
  openPicker: () => void
  urlValid: string | boolean
  hasSnippet: boolean
  showPickerMode: boolean
}) {
  return (
    <>
      {/* ── PICKER MODE ── */}
      {showPickerMode && (
        <div className="space-y-2">
          <button
            onClick={openPicker}
            disabled={!urlValid || waitingForPicker}
            className="flex w-full items-center justify-center gap-2 rounded-[7px] bg-fill-invert px-5 py-2.5 text-[13px] font-semibold text-text-on-invert transition-opacity hover:opacity-90 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
          >
            <ExternalLink className="h-4 w-4" />
            Open page &amp; click element
          </button>

          {/* Single status slot — replaces four previously separate, differently
              colored boxes with one line that shows exactly what's relevant now. */}
          <div className="text-[11px]">
            {waitingForPicker ? (
              <span className="flex items-center gap-1.5 text-text-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Waiting for you to click an element on the opened page…
              </span>
            ) : pickerBlocked ? (
              <span className="flex items-start gap-1.5 text-err/80">
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  Pop-up blocked. <button onClick={openPicker} className="underline hover:text-err cursor-pointer">Try again</button>, or{' '}
                  <button onClick={() => { setMode('manual'); setPickerBlocked(false) }} className="underline hover:text-err cursor-pointer">enter the selector manually</button>.
                </span>
              </span>
            ) : !hasSnippet && !selectedElement ? (
              <span className="text-pro/80">
                Uses the snippet installed on your site. Install it first, or{' '}
                <button onClick={() => setMode('manual')} className="underline hover:text-pro cursor-pointer">enter a CSS selector manually</button>.
              </span>
            ) : !url.trim() ? (
              <span className="text-text-3">Enter a URL above, then open the page to click an element.</span>
            ) : !selectedElement ? (
              <span className="text-text-3">Opens your page in a new tab — click any element there to select it.</span>
            ) : null}
          </div>
        </div>
      )}
    </>
  )
}
