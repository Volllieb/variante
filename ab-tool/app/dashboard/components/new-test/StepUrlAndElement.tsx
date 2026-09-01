'use client'

/**
 * StepUrlAndElement — Step 0: URL eingeben + Element auf Live-Site wählen.
 *
 * Zwei Modi:
 *   picker — Öffnet die Seite mit ?ab_pick=1 (benötigt installiertes Snippet auf der Zielseite)
 *   manual — CSS-Selektor manuell eingeben (z. B. wenn Element hinter Login, in Shadow-DOM,
 *            oder Selektor bereits bekannt ist)
 *
 * Domain-Connect ist inline im URL-Feld verankert statt als eigene Banner-Box darüber —
 * vorher gab es zwei URL-Eingaben auf einem Screen (Banner + Feld), was redundant wirkte.
 * Ohne verbundene Domain leitet sich der zu verbindende Hostname direkt aus dem getippten
 * URL-Feld ab; es gibt kein zweites Eingabefeld dafür.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Globe, ExternalLink, Loader2, Check, MousePointerClick, ChevronDown, Code2, Sparkles, AlertCircle, Zap } from 'lucide-react'
import type { ElementSelection } from '../NewTestDrawer'
import { validateManualSelector } from '@/lib/manualSelector'
import { usePickerBridge } from '@/lib/pickerBridge'

type DomainConnectState = 'idle' | 'saving' | 'not-found' | 'verified'

interface StepUrlAndElementProps {
  url: string
  onUrlChange: (url: string) => void
  selectedElement: ElementSelection | null
  onElementSelected: (el: ElementSelection) => void
  onConfirm: () => void
  verifiedDomains: { url: string; verifiedAt: string | null }[]
  domainConnectState: DomainConnectState
  domainConnectError: string
  connectingDomain: string
  onConnectDomain: (hostname: string) => void
}

type PickerMode = 'picker' | 'manual'

// ─── AI Scan Types ───

interface ScanSuggestion {
  selector: string | null
  element: string
  rationale: string
  elementType: string
}

type ScanState = 'idle' | 'loading' | 'success' | 'error'

interface ScanResult {
  suggestions: ScanSuggestion[]
  primarySuggestion: ScanSuggestion | null
}

function deriveHostname(raw: string): string | null {
  if (!raw) return null
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    return parsed.hostname.replace(/^www\./, '') || null
  } catch {
    return null
  }
}

export function StepUrlAndElement({
  url, onUrlChange, selectedElement, onElementSelected, onConfirm, verifiedDomains,
  domainConnectState, domainConnectError, connectingDomain, onConnectDomain,
}: StepUrlAndElementProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [waitingForPicker, setWaitingForPicker] = useState(false)
  const [pickerBlocked, setPickerBlocked] = useState(false)
  const [mode, setMode] = useState<PickerMode>(verifiedDomains.length > 0 ? 'picker' : 'manual')
  // Manual mode fields
  const [manualSelector, setManualSelector] = useState('')
  const [manualSelectorError, setManualSelectorError] = useState('')
  const [manualElementType, setManualElementType] = useState('element')
  const [manualElementName, setManualElementName] = useState('')
  const [manualHtml, setManualHtml] = useState('')
  const [showMoreOptions, setShowMoreOptions] = useState(false)

  // ── AI Scan State ──
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [scanError, setScanError] = useState('')

  // Ref haelt den aktuellen Callback, ohne den postMessage-Listener bei jeder
  // neuen Callback-Identitaet neu aufzubauen. Schreiben MUSS im Effect passieren:
  // im Render ist es ein Seiteneffekt, den React 19 verwerfen darf.
  const onElementSelectedRef = useRef(onElementSelected)
  useEffect(() => {
    onElementSelectedRef.current = onElementSelected
  })

  // Picker timeout ref — bricht Warte-Status nach 30s ab
  const pickerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Picker Mode: Auswahl aus ab.js entgegennehmen ──
  // Beide Transportwege (postMessage + /picker-return via localStorage) liegen
  // in usePickerBridge — window.opener allein war zu unzuverlässig.
  usePickerBridge({
    url,
    mode: 'element',
    onPick: (p) => {
      const tag = (p.tagName ?? '').toLowerCase()
      onElementSelectedRef.current({
        selector: p.selector,
        originalHtml: p.html ?? '',
        // Nur dieser Pfad liefert die Styles der Zielseite. AI-Scan und der
        // manuelle Modus lassen sie leer — StepReview zeigt dort den Textvergleich.
        // styleContext (neues ab.js) hat Vorrang, flaches css deckt alte
        // Snippet-Versionen ab, die es vor dem Rollout gab.
        originalCss: p.styleContext?.css ?? p.css ?? '',
        elementType: tag === 'button' ? 'button'
          : /^h[1-6]$/.test(tag) ? 'headline'
          : 'element',
        elementName: p.text || p.selector,
        styleContext: p.styleContext,
      })
      setPickerOpen(false)
      setWaitingForPicker(false)
      if (pickerTimeoutRef.current) { clearTimeout(pickerTimeoutRef.current); pickerTimeoutRef.current = null }
    },
  })

  // ── Picker Mode: Open picker on user's site ──
  const openPicker = useCallback(() => {
    if (!url) return
    const finalUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`
    const target = new URL(finalUrl)
    target.searchParams.set('ab_pick', '1')
    const popup = window.open(target.toString(), 'ab-picker', 'width=1200,height=800')
    if (!popup || popup.closed) {
      setPickerBlocked(true)
      setWaitingForPicker(false)
      return
    }
    setPickerBlocked(false)
    setPickerOpen(true)
    setWaitingForPicker(true)
    if (pickerTimeoutRef.current) clearTimeout(pickerTimeoutRef.current)
    pickerTimeoutRef.current = setTimeout(() => {
      setWaitingForPicker(false)
    }, 30000)
  }, [url])

  // ── Helpers ──
  function isValidUrl(str: string): boolean {
    if (/^https?:\/\//i.test(str)) {
      try { new URL(str); return true } catch { return false }
    }
    return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(str)
  }

  const urlValid = url.trim() && isValidUrl(url.trim())

  // ── AI Scan: Page-Analyse via /api/test-wizard/scan ──

  const runScan = useCallback(async () => {
    if (!url || !urlValid) return
    setScanState('loading')
    setScanError('')
    setScanResult(null)

    try {
      const res = await fetch('/api/test-wizard/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: /^https?:\/\//i.test(url) ? url : `https://${url}` }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Scan failed' }))
        setScanError(err.message ?? err.error ?? 'Page analysis failed')
        setScanState('error')
        return
      }

      const data = await res.json()
      const suggestions: ScanSuggestion[] = [data.primarySuggestion, ...(data.suggestions ?? [])]
        .filter(Boolean)
        // dedup by element name
        .filter((s: ScanSuggestion, i: number, arr: ScanSuggestion[]) =>
          arr.findIndex((x) => x.element === s.element) === i
        )
        .slice(0, 3)

      if (suggestions.length === 0) {
        setScanError('No elements found to test on this page. Try picking manually.')
        setScanState('error')
        return
      }

      setScanResult({ suggestions, primarySuggestion: data.primarySuggestion ?? suggestions[0] })
      setScanState('success')
    } catch {
      setScanError('Network error — please try again.')
      setScanState('error')
    }
  }, [url, urlValid])

  function applySuggestion(s: ScanSuggestion) {
    const sel = s.selector ?? ''
    onElementSelected({
      selector: sel,
      originalHtml: '', // AI doesn't provide HTML — user can add manually if needed
      originalCss: '',
      elementType: s.elementType || 'element',
      elementName: s.element,
    })
    setScanState('idle') // collapse scan results after selection
  }

  // ── Manual Mode: Confirm manual element selection ──
  const confirmManual = useCallback(() => {
    const result = validateManualSelector(manualSelector)
    if (!result.ok) {
      setManualSelectorError(result.error ?? 'Invalid CSS selector.')
      return
    }
    setManualSelectorError('')
    onElementSelected({
      selector: result.selector,
      originalHtml: manualHtml.trim() || `<${manualElementType}>…</${manualElementType}>`,
      originalCss: '',
      elementType: manualElementType,
      elementName: manualElementName.trim() || result.selector,
    })
  }, [manualSelector, manualHtml, manualElementType, manualElementName, onElementSelected])

  const hasSnippet = verifiedDomains.length > 0
  const showPickerMode = mode === 'picker'

  // Does the current URL point at an already-connected domain? If so we lock
  // the domain and only let the user edit the path — that's the one thing
  // that was genuinely ambiguous before: whether to type "example.com" or
  // "example.com/about" into a single free-text field.
  const matchedDomain = verifiedDomains.find((d) => {
    const withProtocol = `https://${d.url}`
    return url === withProtocol || url.startsWith(`${withProtocol}/`)
  })
  // Ein Test gehoert auf GENAU EINE Seite. Der Wizard erzeugt deshalb immer
  // einen Pfad; '/' ist die Startseite. Das Backend kann zwar weiterhin
  // sitewide (site_url ohne Pfad, pathOf -> ''), aber nur fuer Bestandstests —
  // anbieten tun wir es nicht mehr: ein Selektor wie '.cta' trifft auf jeder
  // Unterseite etwas anderes, und die Zaehler mischen dann Publikum, das nie
  // dieselbe Seite gesehen hat.
  const pathValue = matchedDomain ? url.slice(`https://${matchedDomain.url}`.length) || '/' : ''

  // Inline domain-connect status for the CURRENTLY typed hostname. If the user
  // edits the URL after a connect attempt, the status reverts to idle rather
  // than showing a stale result for a different domain.
  const currentHostname = deriveHostname(url)
  const connectState: DomainConnectState =
    currentHostname && currentHostname === connectingDomain ? domainConnectState : 'idle'

  return (
    <div className="space-y-5">
      <p className="text-[13px] leading-relaxed text-text-2">
        Choose the page where your element lives, then pick it.
      </p>

      {/* ── Page URL ── */}
      <div>
        {verifiedDomains.length > 0 && (
          <label className="mb-1.5 block text-[11px] font-medium text-text-3 uppercase tracking-wider">Domain</label>
        )}

        {verifiedDomains.length > 0 && (
          <div className="relative mb-2.5">
            <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
            <select
              value={matchedDomain?.url ?? ''}
              onChange={(e) => {
                // Mit trailing slash = Startseite. Seit pathOf() die Wurzel als
                // '/' erhaelt, meint dieser Default genau das, was er aussieht.
                const nextUrl = e.target.value ? `https://${e.target.value}/` : ''
                onUrlChange(nextUrl)
                setScanState('idle'); setScanResult(null); setScanError('')
                if (selectedElement) {
                  onElementSelected({ selector: '', originalHtml: '', originalCss: '', elementType: 'element', elementName: '' })
                }
              }}
              className="w-full appearance-none rounded-[7px] border border-border bg-bg-1 py-2.5 pl-9 pr-8 text-[13px] text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:border-border-strong focus:ring-2 focus:ring-text/10 cursor-pointer"
            >
              {verifiedDomains.map((d) => (
                <option key={d.url} value={d.url}>{d.url}</option>
              ))}
              <option value="">Other domain…</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3" />
          </div>
        )}

        {/* Page: locked domain-prefix + path-only input once a connected site is
            selected — structurally impossible to type the domain twice. Falls
            back to one plain full-URL field only when there's no connected
            domain to lock to yet. */}
        {matchedDomain ? (
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-text-3 uppercase tracking-wider">Page</label>
            <div className="flex items-stretch overflow-hidden rounded-[7px] border border-border bg-bg-1 focus-within:border-border-strong focus-within:ring-2 focus-within:ring-text/10">
              <span className="flex shrink-0 select-none items-center border-r border-border bg-bg-2 px-3 text-[13px] text-text-3">
                {matchedDomain.url}
              </span>
              <input
                type="text"
                value={pathValue}
                onChange={(e) => {
                  const raw = e.target.value
                  // Leeres Feld faellt auf die Startseite zurueck, nicht auf
                  // "ganze Domain" — der Test soll immer eine Seite meinen.
                  const path = raw === '' ? '/' : raw.startsWith('/') ? raw : `/${raw}`
                  onUrlChange(`https://${matchedDomain.url}${path}`)
                  if (scanState !== 'idle') { setScanState('idle'); setScanResult(null); setScanError('') }
                }}
                placeholder="/pricing"
                className="w-full min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[13px] text-text placeholder:text-text-3 focus-visible:outline-none"
              />
            </div>
            <p className="mt-1 text-[10px] text-text-3">
              {pathValue === '/'
                ? 'Runs on the homepage only.'
                : `Runs on ${pathValue.replace(/\/+$/, '')} and everything below it.`}
            </p>
          </div>
        ) : (
          <div>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  onUrlChange(e.target.value)
                  if (scanState !== 'idle') { setScanState('idle'); setScanResult(null); setScanError('') }
                }}
                placeholder="https://example.com/pricing"
                className="w-full rounded-[7px] border border-border bg-bg-1 py-2.5 pl-9 pr-3 text-[13px] text-text placeholder:text-text-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:border-border-strong focus:ring-2 focus:ring-text/10"
              />
            </div>

            {/* Inline domain-connect — derives the hostname from the URL already
                typed above instead of asking for it a second time. */}
            {urlValid && currentHostname && (
              <div className="mt-1.5 text-[11px]">
                {connectState === 'verified' ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-ok">
                    <Check className="h-3 w-3" /> {currentHostname} connected
                  </span>
                ) : connectState === 'saving' ? (
                  <span className="inline-flex items-center gap-1.5 text-text-3">
                    <Loader2 className="h-3 w-3 animate-spin" /> Checking {currentHostname}…
                  </span>
                ) : connectState === 'not-found' ? (
                  <span className="inline-flex flex-wrap items-center gap-x-1.5 text-pro/90">
                    Snippet not found on {currentHostname} — paste it in your site&apos;s &lt;head&gt;, then{' '}
                    <button onClick={() => onConnectDomain(currentHostname)} className="underline hover:text-pro cursor-pointer">retry</button>.
                  </span>
                ) : (
                  <button
                    onClick={() => onConnectDomain(currentHostname)}
                    className="inline-flex items-center gap-1.5 text-text-3 transition-colors hover:text-pro cursor-pointer"
                  >
                    <Globe className="h-3 w-3" />
                    Connect {currentHostname} to go live later
                  </button>
                )}
                {domainConnectError && connectState === 'idle' && (
                  <span className="ml-1.5 text-err/80">{domainConnectError}</span>
                )}
              </div>
            )}

            <p className="mt-1 text-[10px] text-text-3">Full URL of the exact page — the element you pick must be on it.</p>
          </div>
        )}
      </div>

      {/* ── AI Suggestion — a single inline trigger instead of its own card,
          so it doesn't visually compete with picking the element yourself. ── */}
      {urlValid && (
        <div className="text-[12px]">
          {scanState === 'idle' && (
            <button
              onClick={runScan}
              className="inline-flex items-center gap-1.5 text-pro transition-colors hover:text-pro/80 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Not sure which element? Let AI suggest one
            </button>
          )}
          {scanState === 'loading' && (
            <span className="inline-flex items-center gap-1.5 text-text-3">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              AI is scanning the page structure, CTAs, and headlines…
            </span>
          )}
          {scanState === 'error' && (
            <span className="inline-flex items-center gap-1.5 text-err/80">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {scanError}{' '}
              <button onClick={runScan} className="underline hover:text-err cursor-pointer">Try again</button>
            </span>
          )}
        </div>
      )}

      {/* Scan results — compact list, no extra wrapping card */}
      {scanState === 'success' && scanResult && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-pro" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-pro">AI suggestions</p>
          </div>
          {scanResult.suggestions.map((s, i) => {
            const isPrimary = scanResult.primarySuggestion?.element === s.element
            return (
              <button
                key={s.element}
                onClick={() => applySuggestion(s)}
                className={`flex w-full cursor-pointer items-start gap-2.5 rounded-[var(--radius-md)] px-3 py-2.5 text-left transition-colors ${
                  isPrimary
                    ? 'border border-pro/25 bg-pro/[0.05] hover:bg-pro/[0.09]'
                    : 'border border-border hover:border-border-strong'
                }`}
              >
                <div className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                  isPrimary ? 'bg-pro/15 text-pro' : 'bg-bg-2 text-text-3'
                }`}>
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[12px] font-semibold text-text">{s.element}</p>
                    {isPrimary && (
                      <span className="shrink-0 rounded-full bg-pro/15 px-1.5 py-0.5 text-[9px] font-semibold text-pro">
                        Best pick
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[11px] leading-relaxed text-text-3">{s.rationale}</p>
                </div>
              </button>
            )
          })}
          <button
            onClick={() => setScanState('idle')}
            className="text-[11px] text-text-3 transition-colors hover:text-text-2 cursor-pointer"
          >
            Dismiss suggestions
          </button>
        </div>
      )}

      {/* ── Mode Toggle ── */}
      <div className="flex rounded-[var(--radius-md)] border border-border bg-bg-1 p-0.5">
        <button
          onClick={() => { setMode('picker'); if (selectedElement) onElementSelected({ selector: '', originalHtml: '', originalCss: '', elementType: 'element', elementName: '' }) }}
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
          onClick={() => { setMode('manual'); if (selectedElement) onElementSelected({ selector: '', originalHtml: '', originalCss: '', elementType: 'element', elementName: '' }) }}
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

      {/* Note about picker popup */}
      {pickerOpen && !waitingForPicker && !selectedElement && (
        <p className="text-[11px] text-text-3">
          If the picker didn&apos;t open, make sure your site allows pop-ups from this domain.
        </p>
      )}
    </div>
  )
}
