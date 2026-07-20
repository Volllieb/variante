'use client'

// Hybrid-Onboarding auf der Landingpage (Plan §2.3): URL rein → zwei echte
// Page-Renders → A/B-Toggle → Gate. Value vor Snippet.
//
// Bewusst simpel gehalten: die Preview ist EIN <img>, dessen src zwischen zwei
// URLs wechselt. Kein Overlay, kein position:absolute, kein boundingBox-Mapping
// — die gesamte Komplexität liegt serverseitig, wo sie hingehört (Plan §3.5).

import { useState, useEffect, useRef } from 'react'
import { ChevronRight, Code2, Sparkles, RefreshCw, ImageIcon, PenLine } from 'lucide-react'
import type { LandingCopy } from '@/lib/landingCopy'

interface Change {
  id: string
  selector: string
  css: string
  rationale: string
  highlightColor: string
}

interface PreviewResponse {
  previewId: string
  testId: string
  tempToken: string
  originalScreenshotUrl?: string
  variantScreenshotUrl?: string
  screenshotsPending?: boolean
  screenshotWidth: number
  screenshotHeight: number
  changes: Change[]
  summary: string
  degraded?: string
}

interface SpaResponse {
  isSpa: true
  spaType?: string
  originalScreenshotUrl: string
  message: string
}

type State = 'idle' | 'loading' | 'preview' | 'spa' | 'error'

// Code-Extraktion + KI sind ~3s, 2s pro Step ist realistisch.
const STEP_MS = 2000

// Screenshot-Polling: 30 Versuche à 2s = 60s Timeout.
const POLL_MAX = 30
const POLL_MS = 2000

export function HybridDemo({ cp, source, prefillUrl, plan }: { cp: LandingCopy; source?: string; prefillUrl?: string; plan?: string }) {
  const [state, setState] = useState<State>('idle')
  const [url, setUrl] = useState('')
  const [step, setStep] = useState(0)
  const [data, setData] = useState<PreviewResponse | null>(null)
  const [spa, setSpa] = useState<SpaResponse | null>(null)
  const [error, setError] = useState('')
  const [showingVariant, setShowingVariant] = useState(false)
  const [refineOpen, setRefineOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [refining, setRefining] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)
  const tempTokenRef = useRef<string>('')
  // Code-First: Screenshots werden asynchron nachgeliefert
  const [screenshotsPending, setScreenshotsPending] = useState(false)
  const [screenshotsReady, setScreenshotsReady] = useState(false)
  const [screenshotUrls, setScreenshotUrls] = useState<{ original: string; variant: string } | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Loading-Schritte durchlaufen lassen (2 Steps: Code extrahieren → KI analysiert).
  useEffect(() => {
    if (state !== 'loading') return
    setStep(0)
    const timer = setTimeout(() => setStep(1), STEP_MS)
    return () => clearTimeout(timer)
  }, [state])

  // Nach dem Laden zum Ergebnis scrollen — der Aha-Moment soll nicht unter der
  // Falz liegen.
  useEffect(() => {
    if (state === 'preview' || state === 'spa') {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [state])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await doSubmit(url.trim())
  }

  async function doSubmit(trimmed: string) {
    if (!trimmed) return

    setState('loading')
    setError('')
    setData(null)
    setSpa(null)
    setShowingVariant(false)
    setRefineOpen(false)
    setScreenshotsPending(false)
    setScreenshotsReady(false)
    setScreenshotUrls(null)
    if (pollTimerRef.current) { clearTimeout(pollTimerRef.current); pollTimerRef.current = null }

    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed, temp_token: tempTokenRef.current || undefined }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.message || (res.status === 400 ? cp.demo.errUrl : cp.demo.errGeneric))
        setState('error')
        return
      }

      if (json.isSpa) {
        setSpa(json as SpaResponse)
        setState('spa')
        return
      }

      if (json.tempToken) tempTokenRef.current = json.tempToken
      const previewData = json as PreviewResponse
      setData(previewData)
      setState('preview')

      if (json.screenshotsPending) {
        // Code-First: Changes sind da, Screenshots werden asynchron nachgeliefert
        setScreenshotsPending(true)
        startPollingScreenshots(json.previewId, json.testId)
      } else {
        // Fallback/SPA: Screenshots waren schon in der Response
        setScreenshotsReady(true)
        if (json.originalScreenshotUrl && json.variantScreenshotUrl) {
          setScreenshotUrls({ original: json.originalScreenshotUrl, variant: json.variantScreenshotUrl })
        }
        setTimeout(() => setShowingVariant(true), 600)
      }
    } catch {
      setError(cp.demo.errGeneric)
      setState('error')
    }
  }

  function startPollingScreenshots(previewId: string, testId: string) {
    let attempts = 0

    async function poll() {
      attempts++
      try {
        const res = await fetch(`/api/preview/screenshots?previewId=${encodeURIComponent(previewId)}&testId=${encodeURIComponent(testId)}`)
        const json = await res.json()

        if (res.ok && json.originalUrl && json.variantUrl) {
          setScreenshotUrls({ original: json.originalUrl, variant: json.variantUrl })
          setScreenshotsPending(false)
          setScreenshotsReady(true)
          setShowingVariant(true)
          // Update data für refine (braucht variantScreenshotUrl)
          setData((prev) => prev ? { ...prev, originalScreenshotUrl: json.originalUrl, variantScreenshotUrl: json.variantUrl } : prev)
          return
        }
      } catch {
        // Netzwerkfehler → nächster Poll in 2s
      }

      if (attempts < POLL_MAX) {
        pollTimerRef.current = setTimeout(poll, POLL_MS)
      } else {
        // Timeout nach 60s — Screenshots bleiben unavailable
        setScreenshotsPending(false)
      }
    }

    pollTimerRef.current = setTimeout(poll, POLL_MS)
  }

  // Cleanup poll timer on unmount
  useEffect(() => {
    return () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current) }
  }, [])

  // Auto-submit wenn von der Landingpage mit URL-Param redirected
  useEffect(() => {
    if (prefillUrl && state === 'idle') {
      setUrl(prefillUrl)
      doSubmit(prefillUrl.trim())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillUrl])

  async function refine(e: React.FormEvent) {
    e.preventDefault()
    if (!data || !feedback.trim()) return
    setRefining(true)
    try {
      const res = await fetch('/api/preview/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: data.testId,
          previewId: data.previewId,
          feedback: feedback.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.message || cp.demo.errGeneric)
      } else {
        setData({ ...data, changes: json.changes, variantScreenshotUrl: json.variantScreenshotUrl, summary: json.summary })
        setShowingVariant(true)
        setFeedback('')
        setRefineOpen(false)
      }
    } catch {
      setError(cp.demo.errGeneric)
    } finally {
      setRefining(false)
    }
  }

  function signupHref(): string {
    if (!data) return '/signup'
    const params = new URLSearchParams({
      source: source || 'demo',
      temp_token: data.tempToken,
      test_id: data.testId,
    })
    if (plan) params.set('plan', plan)
    return `/signup?${params.toString()}`
  }

  function reset() {
    setState('idle')
    setData(null)
    setSpa(null)
    setError('')
  }

  return (
    <section id="demo-hybrid" className="section !pt-6">
      <div className="container-wide">
        <div className="rounded-[10px] border border-border bg-bg-1 p-5 sm:p-8">
          <h2 className="text-center text-xl font-semibold tracking-tight text-white sm:text-2xl">
            {cp.demo.heading}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-white/55">{cp.demo.sub}</p>

          {/* URL-Eingabe */}
          <form onSubmit={submit} className="mx-auto mt-6 flex max-w-xl flex-col gap-2 sm:flex-row">
            <input
              type="text"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={cp.demo.inputPlaceholder}
              aria-label={cp.demo.inputPlaceholder}
              disabled={state === 'loading'}
              className="h-12 flex-1 rounded-full border border-border bg-bg-0 px-5 text-sm text-white placeholder:text-text-3 transition-colors focus:border-border-strong focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={state === 'loading' || !url.trim()}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-black transition-all hover:bg-white/90 disabled:pointer-events-none disabled:opacity-40"
            >
              {cp.demo.submit}
              <ChevronRight className="h-4 w-4" />
            </button>
          </form>
          <p className="mx-auto mt-3 max-w-xl text-center text-[11px] text-text-3">
            {cp.demo.goLiveHint}
          </p>

          <div ref={resultRef}>
            {state === 'loading' && <LoadingSteps steps={cp.demo.loadingSteps} current={step} />}

            {state === 'error' && (
              <div className="mx-auto mt-6 max-w-xl text-center">
                <p className="rounded-[6px] border border-err/20 bg-err-bg px-4 py-3 text-xs text-err">{error}</p>
              </div>
            )}

            {state === 'spa' && spa && (
              <SpaFallback cp={cp} spa={spa} onReset={reset} source={source} />
            )}

            {state === 'preview' && data && (
              <div className="mt-8">
                {/* A/B-Toggle */}
                <div className="flex justify-center">
                  <div className="inline-flex rounded-full border border-border bg-bg-0 p-1">
                    <TabButton active={!showingVariant} onClick={() => setShowingVariant(false)}>
                      {cp.demo.tabOriginal}
                    </TabButton>
                    <TabButton active={showingVariant} onClick={() => setShowingVariant(true)}>
                      {cp.demo.tabVariant}
                    </TabButton>
                  </div>
                </div>

                {/* Screenshot im Laptop-Frame — "das ist wirklich meine Seite" */}
                <div className="mx-auto mt-5 max-w-4xl">
                  {!screenshotsReady ? (
                    <ScreenshotSkeleton />
                  ) : screenshotUrls ? (
                    <div className="overflow-hidden rounded-[10px] border border-border-strong bg-bg-0">
                      <div className="flex items-center gap-1.5 border-b border-border bg-bg-2 px-3 py-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                        <span className="ml-3 truncate text-[11px] text-text-3">{data.summary}</span>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element -- Supabase-Storage-URL, kein next/image-Loader */}
                      <img
                        src={showingVariant ? screenshotUrls.variant : screenshotUrls.original}
                        alt={showingVariant ? cp.demo.tabVariant : cp.demo.tabOriginal}
                        width={data.screenshotWidth}
                        height={data.screenshotHeight}
                        className="w-full transition-opacity duration-200"
                      />
                    </div>
                  ) : (
                    <p className="text-center text-xs text-text-3">{cp.demo.screenshotFailed}</p>
                  )}
                </div>

                {data.degraded && (
                  <p className="mx-auto mt-3 max-w-2xl text-center text-[11px] text-text-3">{data.degraded}</p>
                )}

                {/* Change-Liste */}
                <div className="mx-auto mt-6 max-w-2xl">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-3">
                    <PenLine className="h-3 w-3" />
                    {cp.demo.changesHeading}
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {data.changes.map((c) => (
                      <li key={c.id} className="flex items-start gap-2.5 rounded-[6px] border border-border bg-bg-0 px-3 py-2 text-sm text-white/60">
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          style={{ background: c.highlightColor }}
                        />
                        <span>{c.rationale}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Refine */}
                <div className="mx-auto mt-6 max-w-2xl">
                  {!refineOpen ? (
                    <button
                      onClick={() => setRefineOpen(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/55 transition-colors hover:text-white"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {cp.demo.refineToggle}
                    </button>
                  ) : (
                    <form onSubmit={refine} className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder={cp.demo.refinePlaceholder}
                        aria-label={cp.demo.refineToggle}
                        disabled={refining}
                        className="h-10 flex-1 rounded-[6px] border border-border bg-bg-0 px-4 text-sm text-white placeholder:text-text-3 focus:border-border-strong focus:outline-none disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={refining || !feedback.trim()}
                        className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[6px] border border-border-strong px-4 text-xs font-semibold text-white transition-colors hover:border-white/30 disabled:pointer-events-none disabled:opacity-40"
                      >
                        {refining ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            {cp.demo.refining}
                          </>
                        ) : (
                          cp.demo.refineSubmit
                        )}
                      </button>
                    </form>
                  )}
                </div>

                {/* Gate */}
                <div className="mt-8 text-center">
                  <a
                    href={signupHref()}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98]"
                  >
                    {cp.demo.goLive}
                    <ChevronRight className="h-4 w-4" />
                  </a>
                  <button
                    onClick={reset}
                    className="mt-3 text-[11px] text-text-3 underline transition-colors hover:text-text-2"
                  >
                    {cp.demo.tryAnother}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Sub-components ── */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-5 py-1.5 text-xs font-semibold transition-colors ${
        active ? 'bg-white text-black' : 'text-white/55 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function LoadingSteps({ steps, current }: { steps: readonly string[]; current: number }) {
  const icons = [Code2, Sparkles]

  return (
    <div className="mx-auto mt-8 max-w-xl space-y-2.5">
      {steps.map((label, i) => {
        const Icon = icons[i] ?? Sparkles
        return (
          <div
            key={label}
            className={`flex items-center gap-3 rounded-[6px] border px-4 py-3 text-sm transition-all duration-300 ${
              i === current
                ? 'border-border-strong bg-bg-2 text-white'
                : i < current
                  ? 'border-border bg-bg-1 text-white/40'
                  : 'border-border bg-bg-1 text-white/25'
            }`}
          >
            <span className="shrink-0 rounded-full bg-white/10 p-2 text-white/80">
              {i === current ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
            </span>
            {label}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Skeleton-Placeholder für den Screenshot-Bereich während des Pollings.
 * Zeigt einen animierten Puls-Effekt mit Image-Icon — signalisiert "Bilder
 * kommen noch", während die Changes schon sichtbar sind.
 */
function ScreenshotSkeleton() {
  return (
    <div className="overflow-hidden rounded-[10px] border border-border-strong bg-bg-0">
      <div className="flex items-center gap-1.5 border-b border-border bg-bg-2 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
      </div>
      <div className="flex flex-col items-center justify-center gap-3 py-16 animate-pulse">
        <ImageIcon className="h-8 w-8 text-white/20" />
        <span className="text-xs text-white/30">Rendering screenshots …</span>
      </div>
    </div>
  )
}

/**
 * SPA erkannt → Snippet-first (Plan §0b, Fallback 1). Der User sieht seinen
 * Screenshot (der Render funktioniert ja — nur das Auslesen der Elemente von
 * außen nicht) und bekommt den Weg zum Snippet erklärt.
 */
function SpaFallback({
  cp,
  spa,
  onReset,
  source,
}: {
  cp: LandingCopy
  spa: SpaResponse
  onReset: () => void
  source?: string
}) {
  const href = `/signup?source=${encodeURIComponent(source || 'demo-spa')}`
  return (
    <div className="mx-auto mt-8 max-w-2xl text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- Supabase-Storage-URL, kein next/image-Loader */}
      <img
        src={spa.originalScreenshotUrl}
        alt=""
        className="mx-auto w-full max-w-md rounded-[10px] border border-border"
      />
      <h3 className="mt-6 text-lg font-semibold text-white">{cp.demo.spaHeading}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-white/55">{spa.message}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm text-white/55">{cp.demo.spaBody}</p>
      <div className="mt-6 flex flex-col items-center gap-3">
        <a
          href={href}
          className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-white/90"
        >
          {cp.demo.spaCta}
          <ChevronRight className="h-4 w-4" />
        </a>
        <button
          onClick={onReset}
          className="text-[11px] text-text-3 underline transition-colors hover:text-text-2"
        >
          {cp.demo.tryAnother}
        </button>
      </div>
    </div>
  )
}
