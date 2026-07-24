'use client'

import { useState } from 'react'
import { ArrowRight, Loader2, Globe, Check, AlertCircle, FileText, MousePointerClick } from 'lucide-react'

const STEPS = [
  'Fetching your page',
  'Analyzing headlines and CTAs',
  'Identifying testable elements',
  'Preparing your first draft',
]

interface PagePreview {
  title: string
  elementCounts: { buttons: number; headings: number; links: number; images: number }
}

export function LandingTrySite() {
  const [url, setUrl] = useState('')
  const [phase, setPhase] = useState<'input' | 'submitting' | 'success' | 'error'>('input')
  const [errMsg, setErrMsg] = useState('')
  const [stepIndex, setStepIndex] = useState(0)
  const [preview, setPreview] = useState<PagePreview | null>(null)

  function isValidUrl(raw: string): boolean {
    const trimmed = raw.trim()
    if (!trimmed) return false
    const normalized = trimmed.replace(/^https?:\/\//, '').replace(/\/+$/, '')
    return normalized.includes('.') && normalized.length >= 3
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return

    if (!isValidUrl(trimmed)) {
      setErrMsg("That URL doesn't look right. Try something like yoursite.com")
      setPhase('error')
      return
    }

    setErrMsg('')
    setPreview(null)
    setPhase('submitting')
    setStepIndex(0)

    // Step-through animation: show analysis steps
    const stepTimer = setInterval(() => {
      setStepIndex((prev) => {
        if (prev >= STEPS.length - 1) {
          clearInterval(stepTimer)
          return prev
        }
        return prev + 1
      })
    }, 700)

    try {
      const res = await fetch('/api/landing-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })

      clearInterval(stepTimer)

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setErrMsg(d.error || 'Something went wrong. Try again.')
        setPhase('error')
        return
      }

      const data = await res.json()
      if (data.preview) setPreview(data.preview)

      // Show all steps complete, then transition to success
      setStepIndex(STEPS.length - 1)
      setTimeout(() => setPhase('success'), 400)
    } catch {
      clearInterval(stepTimer)
      setErrMsg('Connection failed. Check your internet and try again.')
      setPhase('error')
    }
  }

  function handleRetry() {
    setPhase('input')
    setErrMsg('')
    setStepIndex(0)
    setPreview(null)
  }

  const normalized = url.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
  const signupHref = `/signup?demo_url=${encodeURIComponent(normalized)}`

  return (
    <section className="section !pt-10 !pb-12">
      <div className="container-wide text-center">
        {/* Icon */}
        <span className={`inline-flex items-center justify-center h-10 w-10 rounded-full mb-4 transition-colors ${
          phase === 'success' ? 'bg-ok/10 text-ok' : phase === 'error' ? 'bg-err/10 text-err' : 'bg-white/5 text-white/50'
        }`}>
          {phase === 'success' ? <Check className="h-5 w-5" /> : phase === 'error' ? <AlertCircle className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
        </span>

        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
          {phase === 'success' ? (preview ? `Found ${preview.elementCounts.headings + preview.elementCounts.buttons} testable elements on ${normalized}` : `URL saved — you're one step away`) : 'See what you can test'}
        </h2>
        <p className="mt-2 text-sm text-white/45 max-w-md mx-auto">
          {phase === 'success'
            ? preview
              ? `Variante can test headlines, buttons, and more on ${normalized}. Create an account to start your first experiment.`
              : `We'll prepare a draft test for ${normalized} as soon as you sign up.`
            : 'Enter your site URL — we\'ll save it and prepare your first draft test after signup.'}
        </p>

        {/* Input form (idle & error states) */}
        {phase !== 'success' && phase !== 'submitting' && (
          <form onSubmit={handleSubmit} className="mt-5 max-w-sm mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setErrMsg(''); if (phase === 'error') setPhase('input') }}
                placeholder="yoursite.com"
                autoComplete="url"
                className={`flex-1 h-[42px] rounded-[6px] border px-4 text-sm text-white placeholder:text-text-3 bg-bg-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-text/20 ${
                  phase === 'error' ? 'border-err/40' : 'border-border focus:border-border-strong'
                }`}
              />
              <button
                type="submit"
                disabled={!url.trim()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-[6px] bg-fill-invert px-5 py-2.5 text-sm font-semibold text-text-on-invert transition-opacity hover:opacity-85 disabled:opacity-30"
              >
                Try it
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            {errMsg && (
              <div className="mt-2 flex items-start gap-1.5 text-left">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-err mt-0.5" />
                <p className="text-xs text-err">{errMsg}</p>
              </div>
            )}
          </form>
        )}

        {/* Submitting — step animation */}
        {phase === 'submitting' && (
          <div className="mt-5 max-w-sm mx-auto">
            <div className="rounded-[10px] border border-border bg-bg-1 p-5 space-y-3">
              {STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-3">
                  <span className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-semibold transition-colors ${
                    i < stepIndex ? 'bg-ok/20 text-ok' : i === stepIndex ? 'bg-white/10 text-white/70' : 'bg-bg-2 text-text-3'
                  }`}>
                    {i < stepIndex ? <Check className="h-3 w-3" /> : i === stepIndex ? <Loader2 className="h-3 w-3 animate-spin" /> : i + 1}
                  </span>
                  <span className={`text-xs transition-colors ${
                    i <= stepIndex ? 'text-white/60' : 'text-text-3'
                  }`}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success — show preview + CTA to signup */}
        {phase === 'success' && (
          <div className="mt-5 max-w-sm mx-auto space-y-3">
            {/* Page preview card — the "Aha moment" */}
            {preview && (
              <div className="rounded-[10px] border border-border bg-bg-1 p-4 text-left">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] bg-bg-2">
                    <span className="text-[10px] font-semibold uppercase text-text-3">
                      {normalized.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-text truncate">
                      {preview.title || normalized}
                    </p>
                    <p className="text-[10px] text-text-3 truncate">{normalized}</p>
                  </div>
                </div>

                {/* Element counts */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 rounded-[6px] bg-bg-2 px-3 py-2">
                    <MousePointerClick className="h-3.5 w-3.5 text-pro shrink-0" />
                    <div>
                      <p className="text-[13px] font-semibold text-text tabular-nums">{preview.elementCounts.buttons}</p>
                      <p className="text-[9px] text-text-3">Buttons</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-[6px] bg-bg-2 px-3 py-2">
                    <FileText className="h-3.5 w-3.5 text-text-3 shrink-0" />
                    <div>
                      <p className="text-[13px] font-semibold text-text tabular-nums">{preview.elementCounts.headings}</p>
                      <p className="text-[9px] text-text-3">Headlines</p>
                    </div>
                  </div>
                </div>
                <p className="mt-2.5 text-[10px] text-text-3">
                  {preview.elementCounts.links} links &middot; {preview.elementCounts.images} images found — all testable
                </p>
              </div>
            )}

            {/* Status badge */}
            <div className="rounded-[10px] border border-ok/20 bg-ok/[0.04] p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ok opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-ok" />
                </span>
                <span className="text-[12px] font-medium text-ok">Ready when you are</span>
              </div>
              <p className="text-[13px] text-white/70">
                After signup, Variante will read <strong className="text-white/85">{normalized}</strong> and prepare your first draft variant — pick any element to test.
              </p>
            </div>

            <a
              href={signupHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[6px] bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98]"
            >
              Continue to signup — it&rsquo;s free
              <ArrowRight className="h-4 w-4" />
            </a>
            <button
              onClick={handleRetry}
              className="text-xs text-text-3 hover:text-text-2 transition-colors"
            >
              Try a different URL
            </button>
          </div>
        )}

        {/* Error state: retry button */}
        {phase === 'error' && (
          <div className="mt-3">
            <button
              onClick={handleRetry}
              className="text-xs text-text-3 hover:text-text-2 transition-colors"
            >
              Clear and try again
            </button>
          </div>
        )}

        <p className="mt-4 text-[11px] text-text-3">
          No account needed to try — we&rsquo;ll save your URL for after signup.
        </p>
      </div>
    </section>
  )
}
