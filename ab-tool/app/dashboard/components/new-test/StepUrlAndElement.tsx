'use client'

/**
 * StepUrlAndElement — Step 0: URL eingeben + Element auf Live-Site wählen.
 *
 * Kein KI-Scan. User gibt URL ein, öffnet die Seite im Picker und wählt
 * selbst das zu testende Element aus.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Globe, ExternalLink, Loader2, Check, MousePointerClick, ChevronDown } from 'lucide-react'
import type { ElementSelection } from '../NewTestDrawer'

interface StepUrlAndElementProps {
  url: string
  onUrlChange: (url: string) => void
  selectedElement: ElementSelection | null
  onElementSelected: (el: ElementSelection) => void
  onConfirm: () => void
  verifiedDomains: { url: string; verifiedAt: string | null }[]
}

export function StepUrlAndElement({
  url, onUrlChange, selectedElement, onElementSelected, onConfirm, verifiedDomains,
}: StepUrlAndElementProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [waitingForPicker, setWaitingForPicker] = useState(false)
  // Ref haelt den aktuellen Callback, ohne den postMessage-Listener bei jeder
  // neuen Callback-Identitaet neu aufzubauen. Schreiben MUSS im Effect passieren:
  // im Render ist es ein Seiteneffekt, den React 19 verwerfen darf.
  const onElementSelectedRef = useRef(onElementSelected)
  useEffect(() => {
    onElementSelectedRef.current = onElementSelected
  })

  // Listen for postMessage from ab.js picker
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      // SECURITY: Nur Nachrichten von der Seite des Users akzeptieren.
      // ponytail: Vorher galt `(!userSiteOrigin) || … || e.origin === ourOrigin`.
      // Der erste Zweig vertraute JEDER Origin, sobald die eingegebene URL nicht
      // parsebar war; der letzte war nur für den entfernten picker-bridge-Proxy
      // nötig (Plan SEC-02). Jetzt: exakter Origin-Match, sonst verwerfen.
      let userSiteOrigin: string | null = null
      try {
        userSiteOrigin = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).origin
      } catch {
        userSiteOrigin = null
      }
      if (!userSiteOrigin || e.origin !== userSiteOrigin) return

      if (!e.data || e.data.type !== 'ab-pick') return

      const { selector, html, tagName, text } = e.data
      if (!selector) return

      onElementSelectedRef.current({
        selector,
        originalHtml: html ?? '',
        elementType: tagName?.toLowerCase() === 'button' ? 'button'
          : tagName?.toLowerCase()?.match(/^h[1-6]$/) ? 'headline'
          : 'element',
        elementName: text ?? selector,
      })
      setPickerOpen(false)
      setWaitingForPicker(false)
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [url])

  // Open picker on user's site
  const openPicker = useCallback(() => {
    if (!url) return
    const finalUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`
    // ponytail: Vorher lief das über /api/picker-bridge — einen Proxy, der die
    // fremde Seite unter UNSERER Origin auslieferte (Plan SEC-02). Jetzt wird
    // die Kundenseite direkt geöffnet; ab.js erkennt ?ab_pick= und startet den
    // Picker. Setzt voraus, dass das Snippet installiert ist — genau das ist
    // ohnehin Voraussetzung dafür, dass der Test später ausgeliefert wird.
    const target = new URL(finalUrl)
    target.searchParams.set('ab_pick', '1')
    window.open(target.toString(), 'ab-picker', 'width=1200,height=800')
    setPickerOpen(true)
    setWaitingForPicker(true)
  }, [url])

  function isValidUrl(str: string): boolean {
    if (/^https?:\/\//i.test(str)) {
      try { new URL(str); return true } catch { return false }
    }
    return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(str)
  }

  const urlValid = url.trim() && isValidUrl(url.trim())

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] leading-relaxed text-text-2">
          Enter your page URL, then pick the element you want to test.
        </p>
      </div>

      {/* Domain selector (if verified domains exist) */}
      {verifiedDomains.length > 0 && (
        <div>
          <label className="mb-1.5 block text-[11px] font-medium text-text-3 uppercase tracking-wider">Your site</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
            <select
              value={url}
              onChange={(e) => {
                onUrlChange(e.target.value)
                // Reset element selection when domain changes
                if (selectedElement) {
                  onElementSelected({ selector: '', originalHtml: '', elementType: 'element', elementName: '' })
                }
              }}
              className="w-full appearance-none rounded-[7px] border border-border bg-bg-1 py-2.5 pl-9 pr-8 text-[13px] text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:border-border-strong focus:ring-2 focus:ring-text/10 cursor-pointer"
            >
              <option value="">Enter custom URL…</option>
              {verifiedDomains.map((d) => (
                <option key={d.url} value={`https://${d.url}`}>
                  {d.url}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3" />
          </div>
        </div>
      )}

      {/* URL Input (shown when no domain selected or no verified domains) */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          {verifiedDomains.length === 0 && (
            <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
          )}
          <input
            type="url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && urlValid && openPicker()}
            placeholder="https://example.com/landing"
            className={`w-full rounded-[7px] border border-border bg-bg-1 py-2.5 text-[13px] text-text placeholder:text-text-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:border-border-strong focus:ring-2 focus:ring-text/10 ${
              verifiedDomains.length > 0 ? 'pl-3 pr-3' : 'pl-9 pr-3'
            }`}
          />
        </div>
        <button
          onClick={openPicker}
          disabled={!urlValid || waitingForPicker}
          className="flex shrink-0 items-center gap-1.5 rounded-[7px] bg-fill-invert px-5 py-2.5 text-[13px] font-semibold text-text-on-invert transition-opacity hover:opacity-90 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
        >
          <ExternalLink className="h-4 w-4" />
          Open Page
        </button>
      </div>

      {/* Waiting for picker */}
      {waitingForPicker && (
        <div className="flex items-center gap-2 rounded-[7px] border border-border-strong bg-bg-2 px-3 py-2.5">
          <Loader2 className="h-4 w-4 animate-spin text-text" />
          <p className="text-[12px] text-text-2">
            Waiting for element selection… Click any element on the opened page.
          </p>
        </div>
      )}

      {/* No URL yet — prompt to enter */}
      {!url.trim() && !selectedElement && (
        <div className="rounded-[10px] border border-border bg-bg-1 p-6 text-center">
          <MousePointerClick className="mx-auto mb-3 h-8 w-8 text-text-3" />
          <p className="text-[13px] font-medium text-text">Enter a URL to get started</p>
          <p className="mt-1 text-[12px] text-text-3">
            Type your page address above, then click &quot;Open Page&quot; to pick an element.
          </p>
        </div>
      )}

      {/* URL entered but no element yet — prompt to pick */}
      {url.trim() && !selectedElement && !waitingForPicker && (
        <div className="rounded-[10px] border border-border bg-bg-1 p-6 text-center">
          <MousePointerClick className="mx-auto mb-3 h-8 w-8 text-text-3" />
          <p className="text-[13px] font-medium text-text">Open your site to pick an element</p>
          <p className="mt-1 text-[12px] text-text-3">
            Click the button above to open your page. Then click any element to select it for testing.
          </p>
        </div>
      )}

      {/* Selected element */}
      {selectedElement && (
        <div className="rounded-[10px] border border-ok/20 bg-ok/5 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-ok/15">
              <Check className="h-4 w-4 text-ok" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-text">{selectedElement.elementName}</p>
              <p className="mt-1 text-[12px] text-text-2 capitalize">{selectedElement.elementType}</p>
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
