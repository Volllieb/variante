'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { PandaLogo } from '@/components/PandaLogo'
import { Check, Copy, Globe, ArrowRight, ChevronLeft, Loader2, X } from 'lucide-react'
import { SNIPPET_CODE, personalizedSnippet } from '@/lib/snippetCode'

type Step = 1 | 2 | 3

type CheckState =
  | { phase: 'input'; error?: string }
  | { phase: 'saving' }
  | { phase: 'checking'; progress: number }
  | { phase: 'found' }
  | { phase: 'not-found'; retries: number }

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [copied, setCopied] = useState(false)
  const [domainUrl, setDomainUrl] = useState('')
  const [domainErr, setDomainErr] = useState('')
  const [checkState, setCheckState] = useState<CheckState>({ phase: 'input' })
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  // Session check — if no session, redirect to /signup
  useEffect(() => {
    getBrowserSupabase().auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/signup')
        return
      }
      setSessionChecked(true)
    }).catch(() => {
      router.push('/signup')
    })
  }, [router])

  // Cleanup polling on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // ── Snippet helpers ──
  const snippetForDomain = domainUrl.trim()
    ? personalizedSnippet(domainUrl.trim().replace(/^https?:\/\//, '').replace(/\/+$/, ''))
    : SNIPPET_CODE

  const handleCopy = useCallback(async () => {
    const code = snippetForDomain
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const el = document.createElement('textarea')
      el.value = code
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [snippetForDomain])

  // ── Domain verification ──
  const normalize = (raw: string) =>
    raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '')

  const checkSnippet = useCallback(async (url: string, retries = 0) => {
    try {
      const res = await fetch('/api/snippet-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_url: url }),
      })
      if (!mountedRef.current) return
      const json = await res.json()
      if (json.detected) {
        if (pollRef.current) clearInterval(pollRef.current)
        setCheckState({ phase: 'found' })
        // Auto-advance to Step 3 after the success animation
        setTimeout(() => {
          if (mountedRef.current) setStep(3)
        }, 2000)
      } else {
        setCheckState({ phase: 'not-found', retries })
      }
    } catch {
      if (mountedRef.current) {
        setCheckState({ phase: 'not-found', retries })
      }
    }
  }, [])

  const submitDomain = useCallback(async () => {
    const normalized = normalize(domainUrl)
    if (!normalized || !normalized.includes('.')) {
      setDomainErr('Please enter a valid domain (e.g. yoursite.com)')
      return
    }
    setDomainErr('')
    setCheckState({ phase: 'saving' })

    // Save domain
    try {
      const saveRes = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized }),
      })
      if (!mountedRef.current) return
      if (saveRes.status === 402) {
        const d = await saveRes.json().catch(() => ({ error: 'Domain limit reached.' }))
        setDomainErr(d.error || 'Domain limit reached.')
        setCheckState({ phase: 'input' })
        return
      }
      if (!saveRes.ok && saveRes.status !== 409) {
        const d = await saveRes.json().catch(() => ({}))
        setDomainErr(d.error || 'Failed to save domain.')
        setCheckState({ phase: 'input' })
        return
      }
    } catch {
      if (!mountedRef.current) return
      setDomainErr('Connection failed. Check your internet.')
      setCheckState({ phase: 'input' })
      return
    }

    // Start checking with progress animation
    setCheckState({ phase: 'checking', progress: 0 })
    let p = 0
    const progressTimer = setInterval(() => {
      p = Math.min(p + 20, 90)
      if (mountedRef.current && checkStateRef.current.phase === 'checking') {
        setCheckState({ phase: 'checking', progress: p })
      }
    }, 600)

    // First check
    await checkSnippet(normalized, 0)
    clearInterval(progressTimer)

    // If not found, start polling every 8 seconds, up to 5 retries
    if (mountedRef.current) {
      const state = checkStateRef.current
      if (state.phase === 'not-found' && state.retries < 5) {
        let retries = state.retries
        pollRef.current = setInterval(async () => {
          retries++
          if (!mountedRef.current) {
            if (pollRef.current) clearInterval(pollRef.current)
            return
          }
          const s = checkStateRef.current
          if (s.phase !== 'not-found') {
            if (pollRef.current) clearInterval(pollRef.current)
            return
          }
          setCheckState({ phase: 'checking', progress: 0 })
          await checkSnippet(normalized, retries)
        }, 8000)
      }
    }
  }, [domainUrl, checkSnippet])

  // Keep a ref to checkState so the interval callback reads fresh state
  const checkStateRef = useRef(checkState)
  checkStateRef.current = checkState

  // Cleanup polling
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const handleRetry = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    const normalized = normalize(domainUrl)
    if (normalized) {
      setCheckState({ phase: 'checking', progress: 0 })
      checkSnippet(normalized, 0)
    }
  }

  if (!sessionChecked) return <div className="flex min-h-screen items-center justify-center bg-bg-0"><p className="text-text-3 text-sm">Loading…</p></div>

  // ── Step 1: Install snippet ──
  if (step === 1) {
    return (
      <div className="min-h-screen bg-bg-0 text-white/80 antialiased flex flex-col">
        <OnboardingHeader step={step} setStep={setStep} router={router} />
        <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
          <div className="w-full max-w-2xl mx-auto">
            <StepIndicator step={1} />
            <div className="text-center">
              <span className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-white/10 text-white/70 mb-5">
                <Globe className="h-6 w-6" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Install the snippet
              </h1>
              <p className="mt-3 text-sm sm:text-base text-white/55 max-w-lg mx-auto">
                Paste this one line into your site&apos;s{' '}
                <code className="text-white/80 bg-white/5 px-1.5 py-0.5 rounded text-[13px]">&lt;head&gt;</code>{' '}
                tag. It loads async at 5 KB — zero impact on performance.
              </p>

              {/* Domain hint: enter domain to personalize */}
              <div className="mt-6 max-w-md mx-auto">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="yoursite.com (optional, personalizes snippet)"
                    value={domainUrl}
                    onChange={(e) => setDomainUrl(e.target.value)}
                    className="flex-1 rounded-[6px] border border-border bg-bg-1 px-4 py-2.5 text-sm text-white placeholder:text-text-3 transition-colors focus:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40"
                  />
                </div>
              </div>

              <div className="mt-8 text-left">
                <div className="relative rounded-[10px] border border-border bg-bg-1 p-4">
                  <pre className="overflow-x-auto text-[13px] text-white/80 font-mono leading-relaxed whitespace-pre-wrap break-all">
                    {snippetForDomain}
                  </pre>
                  <button
                    onClick={handleCopy}
                    className="absolute top-3 right-3 flex items-center gap-1.5 rounded-[6px] bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/80 transition-colors hover:bg-white/20"
                  >
                    {copied ? (
                      <><Check className="h-3.5 w-3.5 text-ok" /> Copied!</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> Copy</>
                    )}
                  </button>
                </div>
                <p className="mt-3 text-xs text-text-3">
                  Works with any stack: Next.js, WordPress, Webflow, Shopify, and more.
                </p>
              </div>

              <div className="mt-8 space-y-3">
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98]"
                >
                  I&apos;ve installed it
                  <ArrowRight className="h-4 w-4" />
                </button>
                <p className="text-xs text-text-3">
                  Make sure the snippet is in your site&apos;s <code className="text-white/80 bg-white/5 px-1 rounded text-[11px]">&lt;head&gt;</code> before continuing.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── Step 2: Verify installation ──
  if (step === 2) {
    const isChecking = checkState.phase === 'saving' || checkState.phase === 'checking'
    const isFound = checkState.phase === 'found'
    const isNotFound = checkState.phase === 'not-found'
    const normalized = normalize(domainUrl)

    return (
      <div className="min-h-screen bg-bg-0 text-white/80 antialiased flex flex-col">
        <OnboardingHeader step={step} setStep={setStep} router={router} />
        <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
          <div className="w-full max-w-2xl mx-auto">
            <StepIndicator step={2} />
            <div className="text-center">
              <span className={`inline-flex items-center justify-center h-12 w-12 rounded-full mb-5 ${
                isFound ? 'bg-ok/10 text-ok' : isNotFound ? 'bg-err/10 text-err' : 'bg-white/10 text-white/70'
              }`}>
                {isFound ? <Check className="h-6 w-6" /> : isNotFound ? <X className="h-6 w-6" /> : <Globe className="h-6 w-6" />}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {isFound ? 'Snippet detected!' : isNotFound ? 'Snippet not found' : 'Verify installation'}
              </h1>
              <p className="mt-3 text-sm sm:text-base text-white/55 max-w-lg mx-auto">
                {isFound
                  ? <>Your site <strong className="text-white/80">{normalized}</strong> is connected. Redirecting…</>
                  : isNotFound
                  ? <>We couldn&apos;t find the snippet on <strong className="text-white/80">{normalized}</strong>. Let&apos;s fix that.</>
                  : 'Enter your domain to check if the snippet is installed correctly.'}
              </p>

              {/* Domain input + Check button */}
              {!isFound && (
                <form
                  onSubmit={(e) => { e.preventDefault(); submitDomain() }}
                  className="mt-8 max-w-md mx-auto"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="yoursite.com"
                      value={domainUrl}
                      onChange={(e) => {
                        setDomainUrl(e.target.value)
                        setDomainErr('')
                        if (checkState.phase !== 'input') setCheckState({ phase: 'input' })
                      }}
                      disabled={isChecking}
                      className="flex-1 rounded-[6px] border border-border bg-bg-1 px-4 py-3 text-sm text-white placeholder:text-text-3 transition-colors focus:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={isChecking || !domainUrl.trim()}
                      className="inline-flex items-center gap-1.5 rounded-[6px] bg-white px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:opacity-50"
                    >
                      {isChecking ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {checkState.phase === 'checking'
                            ? `Checking… ${checkState.progress}%`
                            : 'Saving…'}
                        </>
                      ) : isNotFound ? (
                        'Re-check'
                      ) : (
                        'Check'
                      )}
                    </button>
                  </div>
                  {domainErr && (
                    <p className="mt-2 text-xs text-err text-left">{domainErr}</p>
                  )}
                </form>
              )}

              {/* Checking animation */}
              {checkState.phase === 'checking' && (
                <div className="mt-6 max-w-md mx-auto">
                  <div className="rounded-[10px] border border-pro/20 bg-pro/[0.04] p-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-pro shrink-0" />
                      <div className="text-left">
                        <p className="text-[13px] font-medium text-white">
                          Looking for your snippet on {normalized}…
                        </p>
                        <p className="text-[11px] text-text-3 mt-0.5">
                          This may take a few seconds. Make sure your site is live.
                        </p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 h-1 w-full rounded-full bg-bg-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-pro transition-all duration-500"
                        style={{ width: `${checkState.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Found — success state */}
              {isFound && (
                <div className="mt-6 max-w-md mx-auto">
                  <div className="rounded-[10px] border border-ok/20 bg-ok/[0.05] p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ok opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-ok" />
                      </span>
                      <span className="text-[12px] font-medium text-ok">Live connection established</span>
                    </div>
                    <p className="text-[13px] text-white/70">
                      Your site is ready for A/B testing. Taking you to the dashboard…
                    </p>
                  </div>
                </div>
              )}

              {/* Not found — troubleshooting */}
              {isNotFound && (
                <div className="mt-6 max-w-md mx-auto text-left space-y-4">
                  <div className="rounded-[10px] border border-err/20 bg-err/[0.04] p-4">
                    <p className="text-[12px] font-medium text-white mb-2">Common issues:</p>
                    <ul className="space-y-1.5 text-[11px] text-text-2">
                      <li className="flex items-start gap-2">
                        <span className="text-err mt-0.5 shrink-0">•</span>
                        The snippet must be in the <code className="text-white/80 bg-white/5 px-1 rounded text-[10px]">&lt;head&gt;</code> of every page
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-err mt-0.5 shrink-0">•</span>
                        Your site must be publicly accessible (no localhost, no login wall)
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-err mt-0.5 shrink-0">•</span>
                        Deploy your changes — local edits won&apos;t be detected
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-err mt-0.5 shrink-0">•</span>
                        Check for CSP or adblockers that might block third-party scripts
                      </li>
                    </ul>
                  </div>

                  {/* Show personalized snippet for re-copy */}
                  <div className="rounded-[10px] border border-border bg-bg-1 p-4">
                    <p className="text-[11px] text-text-3 mb-2">
                      Your snippet for <strong className="text-text-2">{normalized}</strong>:
                    </p>
                    <pre className="overflow-x-auto text-[11px] text-white/70 font-mono leading-relaxed whitespace-pre-wrap break-all">
                      {snippetForDomain}
                    </pre>
                    <button
                      onClick={handleCopy}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-[6px] bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/80 transition-colors hover:bg-white/20"
                    >
                      {copied ? <><Check className="h-3 w-3 text-ok" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy snippet</>}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={handleRetry}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-border px-3 py-1.5 text-[12px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text"
                    >
                      <Loader2 className="h-3.5 w-3.5" />
                      Check again
                    </button>
                    <span className="text-[11px] text-text-3">
                      Auto-checking every 8s for 40s…
                    </span>
                  </div>
                </div>
              )}

              {/* Manual continue — only shown if not yet checking/found */}
              {!isFound && !isChecking && (
                <div className="mt-8">
                  <button
                    onClick={() => setStep(3)}
                    className="text-[13px] font-medium text-text-3 transition-colors hover:text-text-2"
                  >
                    I&apos;ll verify later →
                  </button>
                  <p className="mt-1 text-[11px] text-text-3/60">
                    You can always check in the dashboard.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── Step 3: Ready ──
  return (
    <div className="min-h-screen bg-bg-0 text-white/80 antialiased flex flex-col">
      <header className="shrink-0 border-b border-border bg-bg-0/95 px-4 sm:px-6">
        <div className="flex items-center justify-between py-2.5 sm:py-3 max-w-6xl mx-auto w-full">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[1.1rem] font-semibold tracking-tight text-white transition-opacity duration-200 hover:opacity-80"
          >
            <PandaLogo size="md" />
            variante
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-2xl mx-auto">
          <StepIndicator step={3} />
          <div className="text-center">
            <span className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-ok/[0.1] text-ok mb-5">
              <Check className="h-7 w-7" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              You&apos;re all set!
            </h1>
            <p className="mt-3 text-sm sm:text-base text-white/55 max-w-lg mx-auto">
              Head to the dashboard to create your first A/B test.
            </p>

            <div className="mt-8 space-y-3 text-left max-w-md mx-auto">
              <div className="flex items-start gap-3 rounded-[10px] border border-border bg-bg-1 p-4">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
                <div>
                  <p className="text-sm font-semibold text-white">Snippet ready</p>
                  <p className="text-xs text-text-3 mt-0.5">
                    {domainUrl.trim()
                      ? <>Installed for <strong className="text-text-2">{normalize(domainUrl)}</strong></>
                      : 'Paste it into your site\'s <head> to start tracking.'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-[10px] border border-border bg-bg-1 p-4">
                {checkState.phase === 'found' ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
                ) : (
                  <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-text-3" />
                )}
                <div>
                  <p className="text-sm font-semibold text-white">
                    {checkState.phase === 'found' ? 'Snippet verified' : 'Verification pending'}
                  </p>
                  <p className="text-xs text-text-3 mt-0.5">
                    {checkState.phase === 'found'
                      ? 'Live connection confirmed.'
                      : 'Check in the dashboard after installing the snippet.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98]"
              >
                Go to dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ── Shared sub-components ──

function OnboardingHeader({
  step,
  setStep,
  router,
}: {
  step: Step
  setStep: (s: Step) => void
  router: ReturnType<typeof useRouter>
}) {
  return (
    <header className="shrink-0 border-b border-border bg-bg-0/95 px-4 sm:px-6">
      <div className="flex items-center justify-between py-2.5 sm:py-3 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[1.1rem] font-semibold tracking-tight text-white transition-opacity duration-200 hover:opacity-80"
          >
            <PandaLogo size="md" />
            variante
          </Link>
          {step > 1 && (
            <button
              onClick={() => setStep((step - 1) as Step)}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-text-3 transition-colors hover:text-text-2 hover:bg-white/[0.04]"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          )}
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="rounded-full px-4 py-1.5 text-sm font-medium text-text-3 transition-colors hover:text-text-2 hover:bg-white/[0.04]"
        >
          Skip to dashboard
        </button>
      </div>
    </header>
  )
}

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {([1, 2, 3] as const).map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
              s === step
                ? 'bg-white text-black'
                : s < step
                ? 'bg-ok/20 text-ok'
                : 'bg-bg-2 text-text-3'
            }`}
          >
            {s < step ? <Check className="h-3.5 w-3.5" /> : s}
          </div>
          {s < 3 && <div className={`h-px w-8 sm:w-12 ${s < step ? 'bg-ok/40' : 'bg-border'}`} />}
        </div>
      ))}
    </div>
  )
}
