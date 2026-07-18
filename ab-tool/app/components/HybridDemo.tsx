'use client'

// Hybrid-Onboarding auf der Landingpage (Plan §2.3): URL rein → zwei echte
// Page-Renders → A/B-Toggle → Gate. Value vor Snippet.
//
// Bewusst simpel gehalten: die Preview ist EIN <img>, dessen src zwischen zwei
// URLs wechselt. Kein Overlay, kein position:absolute, kein boundingBox-Mapping
// — die gesamte Komplexität liegt serverseitig, wo sie hingehört (Plan §3.5).

import { useState, useEffect, useRef } from 'react'
import { ArrowRight, Sparkles, RefreshCw } from 'lucide-react'
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
  originalScreenshotUrl: string
  variantScreenshotUrl: string
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

// Die Schritte laufen zeitgesteuert durch, nicht synchron zum Server — der
// Request ist ein einzelner Round-Trip. Sie zeigen ehrlich WAS gerade passiert
// (Screenshot → Analyse → Render), nur ohne exakte Übergänge. Der Punkt ist
// gefühlter Fortschritt statt Spinner-Starre (Plan §5).
const STEP_MS = 4000

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
  // Temp-Session-Token über mehrere Previews hinweg wiederverwenden: alle Tests
  // dieses Besuchers hängen dann an EINER Session — der Claim beim Sign-up holt
  // sie alle, statt nur den letzten (frühere blieben sonst verwaist bis zum Cron).
  const tempTokenRef = useRef<string>('')

  // Loading-Schritte durchlaufen lassen; beim letzten stehen bleiben.
  useEffect(() => {
    if (state !== 'loading') return
    setStep(0)
    const timers = [
      setTimeout(() => setStep(1), STEP_MS),
      setTimeout(() => setStep(2), STEP_MS * 2),
    ]
    return () => timers.forEach(clearTimeout)
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
      setData(json as PreviewResponse)
      setState('preview')
      setTimeout(() => setShowingVariant(true), 600)
    } catch {
      setError(cp.demo.errGeneric)
      setState('error')
    }
  }

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
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

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
                  <div className="overflow-hidden rounded-[10px] border border-border-strong bg-bg-0">
                    <div className="flex items-center gap-1.5 border-b border-border bg-bg-2 px-3 py-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                      <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                      <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                      <span className="ml-3 truncate text-[11px] text-text-3">{data.summary}</span>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element -- Supabase-Storage-URL, kein next/image-Loader */}
                    <img
                      src={showingVariant ? data.variantScreenshotUrl : data.originalScreenshotUrl}
                      alt={showingVariant ? cp.demo.tabVariant : cp.demo.tabOriginal}
                      width={data.screenshotWidth}
                      height={data.screenshotHeight}
                      className="w-full transition-opacity duration-200"
                    />
                  </div>
                </div>

                {data.degraded && (
                  <p className="mx-auto mt-3 max-w-2xl text-center text-[11px] text-text-3">{data.degraded}</p>
                )}

                {/* Change-Liste */}
                <div className="mx-auto mt-6 max-w-2xl">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-text-3">
                    {cp.demo.changesHeading}
                  </h3>
                  <ul className="mt-3 space-y-2.5">
                    {data.changes.map((c) => (
                      <li key={c.id} className="flex items-start gap-2.5 text-sm text-white/60">
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
                    className="inline-flex rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all hover:bg-white/90"
                  >
                    {cp.demo.goLive} →
                  </a>
                  <p className="mt-2.5 text-[11px] text-text-3">{cp.demo.goLiveHint}</p>
                  <button
                    onClick={reset}
                    className="mt-4 text-[11px] text-text-3 underline transition-colors hover:text-text-2"
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
  return (
    <div className="mx-auto mt-8 max-w-xl space-y-2.5">
      {steps.map((label, i) => (
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
          <span className="shrink-0">
            {i < current ? '✓' : i === current ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : '○'}
          </span>
          {label}
        </div>
      ))}
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
          className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-white/90"
        >
          {cp.demo.spaCta} →
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
