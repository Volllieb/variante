'use client'

/**
 * StepUrlAndElement — Step 0: URL eingeben + Element auf Live-Site wählen.
 *
 * Zwei Modi:
 *   picker — Öffnet die Seite mit ?ab_pick=1 (benötigt installiertes Snippet auf der Zielseite)
 *   manual — CSS-Selektor manuell eingeben (z. B. wenn Element hinter Login, in Shadow-DOM,
 *            oder Selektor bereits bekannt ist)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Globe, ExternalLink, Loader2, Check, MousePointerClick, ChevronDown, Code2 } from 'lucide-react'
import type { ElementSelection } from '../NewTestDrawer'

interface StepUrlAndElementProps {
  url: string
  onUrlChange: (url: string) => void
  selectedElement: ElementSelection | null
  onElementSelected: (el: ElementSelection) => void
  onConfirm: () => void
  verifiedDomains: { url: string; verifiedAt: string | null }[]
}

type PickerMode = 'picker' | 'manual'

// Einfache CSS-Selektor-Validierung: lehnt offensichtlich invalide Strings ab
function isValidCssSelector(sel: string): boolean {
  if (!sel || sel.length < 2) return false
  if (sel.length > 512) return false
  // Keine Zeichen, die in CSS-Selektoren nichts zu suchen haben
  if (/[<>{};]/.test(sel)) return false
  // Muss mit einem gültigen Selektor-Zeichen beginnen
  if (!/^[.#[a-zA-Z_*]/.test(sel)) return false
  // Keine Whitespace-only Selektoren
  if (!/\S/.test(sel)) return false
  try {
    // Prüfe ob der Selektor parsbar ist (document.querySelector wirft bei invaliden Selektoren)
    document.querySelector(sel)
    return true
  } catch {
    return false
  }
}

export function StepUrlAndElement({
  url, onUrlChange, selectedElement, onElementSelected, onConfirm, verifiedDomains,
}: StepUrlAndElementProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [waitingForPicker, setWaitingForPicker] = useState(false)
  const [mode, setMode] = useState<PickerMode>(verifiedDomains.length > 0 ? 'picker' : 'manual')
  // Manual mode fields
  const [manualSelector, setManualSelector] = useState('')
  const [manualSelectorError, setManualSelectorError] = useState('')
  const [manualElementType, setManualElementType] = useState('element')
  const [manualElementName, setManualElementName] = useState('')
  const [manualHtml, setManualHtml] = useState('')

  // Ref haelt den aktuellen Callback, ohne den postMessage-Listener bei jeder
  // neuen Callback-Identitaet neu aufzubauen. Schreiben MUSS im Effect passieren:
  // im Render ist es ein Seiteneffekt, den React 19 verwerfen darf.
  const onElementSelectedRef = useRef(onElementSelected)
  useEffect(() => {
    onElementSelectedRef.current = onElementSelected
  })

  // ── Picker Mode: Listen for postMessage from ab.js picker ──
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      // SECURITY: Nur Nachrichten von der Seite des Users akzeptieren.
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

  // ── Picker Mode: Open picker on user's site ──
  const openPicker = useCallback(() => {
    if (!url) return
    const finalUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`
    const target = new URL(finalUrl)
    target.searchParams.set('ab_pick', '1')
    window.open(target.toString(), 'ab-picker', 'width=1200,height=800')
    setPickerOpen(true)
    setWaitingForPicker(true)
  }, [url])

  // ── Manual Mode: Confirm manual element selection ──
  const confirmManual = useCallback(() => {
    const sel = manualSelector.trim()
    if (!sel) {
      setManualSelectorError('Please enter a CSS selector.')
      return
    }
    if (!isValidCssSelector(sel)) {
      setManualSelectorError('Invalid CSS selector. Try something like: .my-class, #my-id, button.cta')
      return
    }
    setManualSelectorError('')
    onElementSelected({
      selector: sel,
      originalHtml: manualHtml.trim() || `<${manualElementType}>…</${manualElementType}>`,
      elementType: manualElementType,
      elementName: manualElementName.trim() || sel,
    })
  }, [manualSelector, manualHtml, manualElementType, manualElementName, onElementSelected])

  function isValidUrl(str: string): boolean {
    if (/^https?:\/\//i.test(str)) {
      try { new URL(str); return true } catch { return false }
    }
    return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(str)
  }

  const urlValid = url.trim() && isValidUrl(url.trim())

  const hasSnippet = verifiedDomains.length > 0
  const showPickerMode = mode === 'picker'

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

      {/* Mode Toggle — always available. Visual Picker uses the snippet for point-and-click; Manual Selector for when you know the CSS selector. */}
      <div className="flex rounded-[6px] border border-border bg-bg-1 p-0.5">
        <button
          onClick={() => { setMode('picker'); if (selectedElement) onElementSelected({ selector: '', originalHtml: '', elementType: 'element', elementName: '' }) }}
          className={`flex-1 rounded-[5px] py-1.5 text-[12px] font-medium transition-colors cursor-pointer ${
            mode === 'picker'
              ? 'bg-bg-2 text-text'
              : 'text-text-3 hover:text-text-2'
          }`}
        >
          <MousePointerClick className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
          Visual Picker
        </button>
        <button
          onClick={() => { setMode('manual'); if (selectedElement) onElementSelected({ selector: '', originalHtml: '', elementType: 'element', elementName: '' }) }}
          className={`flex-1 rounded-[5px] py-1.5 text-[12px] font-medium transition-colors cursor-pointer ${
            mode === 'manual'
              ? 'bg-bg-2 text-text'
              : 'text-text-3 hover:text-text-2'
          }`}
        >
          <Code2 className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
          Manual Selector
        </button>
      </div>

      {/* ── PICKER MODE ── */}
      {showPickerMode && (
        <>
          {/* URL Input */}
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

          {/* Visual Picker hint — shown when snippet not installed and in picker mode */}
          {!hasSnippet && !waitingForPicker && !selectedElement && (
            <div className="rounded-[7px] border border-pro/15 bg-pro/[0.03] px-3 py-2.5">
              <p className="text-[11px] text-pro/80">
                <strong>The Visual Picker uses the snippet</strong> to let you click elements on your site.{' '}
                Install the snippet first, or{' '}
                <button onClick={() => setMode('manual')} className="underline hover:text-pro cursor-pointer">enter a CSS selector manually</button>.
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

          {/* URL entered but no element yet */}
          {url.trim() && !selectedElement && !waitingForPicker && (
            <div className="rounded-[10px] border border-border bg-bg-1 p-6 text-center">
              <MousePointerClick className="mx-auto mb-3 h-8 w-8 text-text-3" />
              <p className="text-[13px] font-medium text-text">Open your site to pick an element</p>
              <p className="mt-1 text-[12px] text-text-3">
                Click the button above to open your page. Then click any element to select it for testing.
              </p>
            </div>
          )}
        </>
      )}

      {/* ── MANUAL MODE ── */}
      {!showPickerMode && (
        <div className="space-y-3">
          {/* URL Input (also needed in manual mode) */}
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-text-3 uppercase tracking-wider">Page URL</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
              <input
                type="url"
                value={url}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="https://example.com/landing"
                className="w-full rounded-[7px] border border-border bg-bg-1 py-2.5 pl-9 pr-3 text-[13px] text-text placeholder:text-text-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:border-border-strong"
              />
            </div>
          </div>

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
              className="w-full rounded-[7px] border border-border bg-bg-1 py-2.5 px-3 text-[13px] text-text font-mono placeholder:text-text-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:border-border-strong"
            />
            {manualSelectorError && (
              <p className="mt-1 text-[11px] text-err">{manualSelectorError}</p>
            )}
            <p className="mt-1 text-[11px] text-text-3">
              Examples: <code className="text-text-2 bg-bg-2 px-1 rounded text-[10px]">.my-class</code>,{' '}
              <code className="text-text-2 bg-bg-2 px-1 rounded text-[10px]">#my-id</code>,{' '}
              <code className="text-text-2 bg-bg-2 px-1 rounded text-[10px]">button.cta</code>,{' '}
              <code className="text-text-2 bg-bg-2 px-1 rounded text-[10px]">h1.hero-title</code>
            </p>
          </div>

          {/* Element Type + Name (optional, for better AI context) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-text-3 uppercase tracking-wider">
                Element Type
              </label>
              <select
                value={manualElementType}
                onChange={(e) => setManualElementType(e.target.value)}
                className="w-full rounded-[7px] border border-border bg-bg-1 py-2.5 px-3 text-[13px] text-text cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40"
              >
                <option value="element">Generic Element</option>
                <option value="button">Button</option>
                <option value="headline">Headline</option>
                <option value="image">Image</option>
                <option value="paragraph">Text / Paragraph</option>
                <option value="form">Form</option>
                <option value="link">Link</option>
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
                className="w-full rounded-[7px] border border-border bg-bg-1 py-2.5 px-3 text-[13px] text-text placeholder:text-text-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40"
              />
            </div>
          </div>

          {/* Original HTML (optional) */}
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-text-3 uppercase tracking-wider">
              Original HTML{' '}
              <span className="font-normal text-text-3/60">(optional — helps AI generate better variants)</span>
            </label>
            <textarea
              value={manualHtml}
              onChange={(e) => setManualHtml(e.target.value)}
              placeholder='<button class="cta">Get Started</button>'
              rows={3}
              className="w-full rounded-[7px] border border-border bg-bg-1 py-2.5 px-3 text-[12px] text-text font-mono placeholder:text-text-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40 resize-none"
            />
          </div>

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

      {/* ── Selected element (shared between both modes) ── */}
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
            {showPickerMode ? (
              <button
                onClick={openPicker}
                className="flex items-center gap-1.5 rounded-[6px] border border-border px-4 py-2 text-[12px] text-text-2 transition-colors hover:border-border-strong hover:text-text cursor-pointer"
              >
                Pick different element
              </button>
            ) : (
              <button
                onClick={() => onElementSelected({ selector: '', originalHtml: '', elementType: 'element', elementName: '' })}
                className="flex items-center gap-1.5 rounded-[6px] border border-border px-4 py-2 text-[12px] text-text-2 transition-colors hover:border-border-strong hover:text-text cursor-pointer"
              >
                Change element
              </button>
            )}
          </div>
        </div>
      )}

      {/* Note about picker popup */}
      {pickerOpen && !waitingForPicker && !selectedElement && (
        <p className="text-[11px] text-text-3">
          If the picker didn&apos;t open, make sure your site allows pop-ups from this domain.
        </p>
      )}
    </div>
  )
}
