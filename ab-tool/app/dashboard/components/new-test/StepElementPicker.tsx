'use client'

/**
 * StepElementPicker — Step 1: Element auf der Live-Site wählen.
 *
 * Zwei Modi:
 * 1. AI-Vorauswahl aktiv: Zeigt das von Step 0 vorausgewählte Element mit
 *    "Weiter mit diesem Element" (Primary) + "Anderes Element auswählen" (Secondary)
 * 2. Picker-Mode: Öffnet User-Site in neuem Tab mit ab.js Picker.
 *    Kommunikation per postMessage.
 */

import { useState, useEffect, useCallback } from 'react'
import { ExternalLink, Loader2, Check, MousePointerClick } from 'lucide-react'
import type { ElementSelection } from '../NewTestDrawer'

interface StepElementPickerProps {
  url: string
  preSelectedElement: {
    selector: string | null
    element: string
    rationale: string
    elementType: string
  } | null
  selectedElement: ElementSelection | null
  onElementSelected: (el: ElementSelection) => void
  onConfirm: () => void
}

export function StepElementPicker({
  url, preSelectedElement, selectedElement, onElementSelected, onConfirm,
}: StepElementPickerProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [waitingForPicker, setWaitingForPicker] = useState(false)

  // Listen for postMessage from ab.js picker
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      // Only accept messages from same origin or from the user's site
      if (!e.data || e.data.type !== 'ab-pick') return

      const { selector, html, tagName, text } = e.data
      if (!selector) return

      onElementSelected({
        selector,
        originalHtml: html ?? '',
        elementType: tagName?.toLowerCase() === 'button' ? 'button'
          : tagName?.toLowerCase()?.match(/^h[1-6]$/) ? 'headline'
          : 'element',
        elementName: text ?? selector,
      })
      setWaitingForPicker(false)
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onElementSelected])

  // Open picker on user's site
  const openPicker = useCallback(() => {
    if (!url) return
    const finalUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`
    const pickerUrl = `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}ab_pick=new`
    window.open(pickerUrl, 'ab-picker', 'width=1200,height=800')
    setPickerOpen(true)
    setWaitingForPicker(true)
  }, [url])

  const hasPreSelection = preSelectedElement && preSelectedElement.selector

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] leading-relaxed text-text-2">
          {hasPreSelection
            ? 'The AI picked the best element to test. You can use it or choose another.'
            : 'Select the element you want to test on your live site.'}
        </p>
      </div>

      {/* AI Pre-Selection */}
      {hasPreSelection && !selectedElement && (
        <div className="rounded-[10px] border border-accent/20 bg-accent/5 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-accent/15">
              <MousePointerClick className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-text">{preSelectedElement.element}</p>
              <p className="mt-1 text-[12px] text-text-2">{preSelectedElement.rationale}</p>
              <code className="mt-2 inline-block rounded-[4px] bg-bg-1 px-2 py-0.5 text-[10px] text-text-3 font-mono">
                {preSelectedElement.selector}
              </code>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => onElementSelected({
                selector: preSelectedElement.selector!,
                originalHtml: '',
                elementType: preSelectedElement.elementType,
                elementName: preSelectedElement.element,
              })}
              className="flex items-center gap-1.5 rounded-[6px] bg-fill-invert px-4 py-2 text-[12px] font-semibold text-text-on-invert transition-opacity hover:opacity-90 cursor-pointer"
            >
              Use this element
            </button>
            <button
              onClick={openPicker}
              className="flex items-center gap-1.5 rounded-[6px] border border-border px-4 py-2 text-[12px] text-text-2 transition-colors hover:border-border-strong hover:text-text cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Pick on site
            </button>
          </div>
        </div>
      )}

      {/* No pre-selection: direct picker */}
      {!hasPreSelection && !selectedElement && (
        <div className="rounded-[10px] border border-border bg-bg-1 p-6 text-center">
          <MousePointerClick className="mx-auto mb-3 h-8 w-8 text-text-3" />
          <p className="text-[13px] font-medium text-text">Open your site to pick an element</p>
          <p className="mt-1 text-[12px] text-text-3">
            The built-in picker lets you click any element on your live site.
          </p>
          <button
            onClick={openPicker}
            disabled={!url}
            className="mt-4 inline-flex items-center gap-1.5 rounded-[6px] bg-fill-invert px-4 py-2 text-[12px] font-semibold text-text-on-invert transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open site picker
          </button>
        </div>
      )}

      {/* Waiting for picker */}
      {waitingForPicker && (
        <div className="flex items-center gap-2 rounded-[7px] border border-accent/15 bg-accent/5 px-3 py-2.5">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          <p className="text-[12px] text-text-2">
            Waiting for element selection… Click any element on the opened page.
          </p>
        </div>
      )}

      {/* Selected element (from picker) */}
      {selectedElement && (
        <div className="rounded-[10px] border border-ok/20 bg-ok/5 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-ok/15">
              <Check className="h-4 w-4 text-ok" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-text">{selectedElement.elementName}</p>
              <p className="mt-1 text-[12px] text-text-2">{selectedElement.elementType}</p>
              <code className="mt-2 inline-block rounded-[4px] bg-bg-1 px-2 py-0.5 text-[10px] text-text-3 font-mono">
                {selectedElement.selector}
              </code>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={onConfirm}
              className="flex items-center gap-1.5 rounded-[6px] bg-ok px-4 py-2 text-[12px] font-semibold text-black transition-opacity hover:opacity-90 cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              Confirm &amp; continue
            </button>
            <button
              onClick={openPicker}
              className="flex items-center gap-1.5 rounded-[6px] border border-border px-4 py-2 text-[12px] text-text-2 transition-colors hover:border-border-strong hover:text-text cursor-pointer"
            >
              Pick different element
            </button>
          </div>
        </div>
      )}

      {/* Note about picker */}
      {pickerOpen && !waitingForPicker && !selectedElement && (
        <p className="text-[11px] text-text-3">
          If the picker didn&apos;t open, make sure your site allows pop-ups from this domain.
        </p>
      )}
    </div>
  )
}
