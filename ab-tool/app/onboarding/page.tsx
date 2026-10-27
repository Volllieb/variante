'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { PandaLogo } from '@/components/PandaLogo'
import { Check, Copy, Globe, ArrowRight, ChevronLeft, Loader2 } from 'lucide-react'
import { SNIPPET_CODE, personalizedSnippet } from '@/lib/snippetCode'
import { Button, Card } from '@/app/components'

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
  // eslint-disable-next-line react-hooks/immutability -- intentional: ref must track latest state for interval callback
  useEffect(() => { checkStateRef.current = checkState }, [checkState])

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

  if (!sessionChecked) return <div className="flex min-h-screen items-center justify-center bg-bg-0"><p className="text-text-3 text-body">Loading…</p></div>

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
              <h1 className="text-display sm:text-display-lg font-semibold tracking-tight text-text">
                Install the snippet
              </h1>
              <p className="mt-3 text-body sm:text-title text-white/55 max-w-lg mx-auto">
                Paste this snippet into your site&apos;s{' '}
                <code className="text-white/80 bg-white/5 px-1.5 py-0.5 rounded text-body">&lt;head&gt;</code>{' '}
                tag. It loads async (~12 KB gzipped) — no impact on your page speed.
              </p>

              {/* Domain hint: enter domain to personalize */}
              <div className="mt-6 max-w-md mx-auto">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="yoursite.com (optional, personalizes snippet)"
                    value={domainUrl}
                    aria-label="Your domain (optional)"
                    onChange={(e) => setDomainUrl(e.target.value)}
                    className="flex-1 rounded-md border border-border bg-bg-1 px-4 py-2.5 text-body text-text placeholder:text-text-3 transition-colors focus:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30"
                  />
                </div>
              </div>

              <div className="mt-8 text-left">
                <Card className="relative">
                  <pre className="overflow-x-auto text-body text-white/80 font-mono leading-relaxed whitespace-pre-wrap break-all">
                    {snippetForDomain}
                  </pre>
                  <Button variant="secondary" size="sm"
                    onClick={handleCopy}
                    className="absolute top-3 right-3 border-transparent bg-text/10 text-text-2 hover:bg-text/20 hover:text-text"
                  >
                    {copied ? (
                      <><Check className="h-3.5 w-3.5 text-ok" /> Copied!</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> Copy</>
                    )}
                  </Button>
                </Card>
                <p className="mt-3 text-small text-text-3">
                  Works with any stack: Next.js, WordPress, Webflow, Shopify, and more.
                </p>
              </div>

              <div className="mt-8 space-y-3">
                <Button
                  variant="primary"
                  onClick={() => setStep(2)}
                  className="gap-2 rounded-full px-8 py-3.5 text-body hover:bg-white/90"
                >
                  I&apos;ve installed it
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="text-small text-text-3">
                  Make sure the snippet is in your site&apos;s <code className="text-white/80 bg-white/5 px-1 rounded text-meta">&lt;head&gt;</code> before continuing.
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
                isFound ? 'bg-ok/10 text-ok' : isNotFound ? 'bg-pro/10 text-pro' : 'bg-white/10 text-white/70'
              }`}>
                {isFound ? <Check className="h-6 w-6" /> : <Globe className="h-6 w-6" />}
              </span>
              <h1 className="text-display sm:text-display-lg font-semibold tracking-tight text-text">
                {isFound ? 'Snippet detected!' : isNotFound ? 'Not detected yet' : 'Verify installation'}
              </h1>
              <p className="mt-3 text-body sm:text-title text-white/55 max-w-lg mx-auto">
                {isFound
                  ? <>Your site <strong className="text-white/80">{normalized}</strong> is connected. Redirecting…</>
                  : isNotFound
                  ? <>No snippet found on <strong className="text-white/80">{normalized}</strong> yet — that&apos;s completely normal if you haven&apos;t deployed it to your live site. Deploy the snippet, then re-check. You can also finish this anytime from your dashboard.</>
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
                      aria-label="Domain to verify"
                      aria-describedby="onboarding-domain-error"
                      className="flex-1 rounded-md border border-border bg-bg-1 px-4 py-3 text-body text-text placeholder:text-text-3 transition-colors focus:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 disabled:opacity-50"
                    />
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={isChecking || !domainUrl.trim()}
                      className="gap-1.5 px-5 py-3 text-body hover:bg-white/90"
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
                    </Button>
                  </div>
                  {domainErr && (
                    <p id="onboarding-domain-error" role="alert" className="mt-2 text-small text-err text-left">{domainErr}</p>
                  )}
                </form>
              )}

              {/* Checking animation */}
              {checkState.phase === 'checking' && (
                <div className="mt-6 max-w-md mx-auto">
                  <div className="rounded-md border border-pro/20 bg-pro/[0.04] p-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-pro shrink-0" />
                      <div className="text-left">
                        <p className="text-body font-medium text-text">
                          Looking for your snippet on {normalized}…
                        </p>
                        <p className="text-meta text-text-3 mt-0.5">
                          This may take a few seconds. Make sure your site is live.
                        </p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div
                      role="progressbar"
                      aria-valuenow={checkState.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Verification progress: ${checkState.progress}%`}
                      className="mt-3 h-1 w-full rounded-full bg-bg-2 overflow-hidden"
                    >
                      <div
                        className="h-full rounded-full bg-pro transition-[width] duration-[var(--duration-slow)]"
                        style={{ width: `${checkState.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Found — success state */}
              {isFound && (
                <div className="mt-6 max-w-md mx-auto">
                  <div className="rounded-md border border-ok/20 bg-ok/[0.05] p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ok opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-ok" />
                      </span>
                      <span className="text-small font-medium text-ok">Live connection established</span>
                    </div>
                    <p className="text-body text-white/70">
                      Your site is ready for A/B testing. Taking you to the dashboard…
                    </p>
                  </div>
                </div>
              )}

              {/* Not found — troubleshooting */}
              {isNotFound && (
                <div className="mt-6 max-w-md mx-auto text-left space-y-4">
                  <Card>
                    <p className="text-small font-medium text-text mb-2">Checklist — make sure:</p>
                    <ul className="space-y-1.5 text-meta text-text-2">
                      <li className="flex items-start gap-2">
                        <span className="text-text-3 mt-0.5 shrink-0">•</span>
                        The snippet must be in the <code className="text-white/80 bg-white/5 px-1 rounded text-meta">&lt;head&gt;</code> of every page
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-text-3 mt-0.5 shrink-0">•</span>
                        Your site must be publicly accessible (no localhost, no login wall)
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-text-3 mt-0.5 shrink-0">•</span>
                        Deploy your changes — local edits won&apos;t be detected
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-text-3 mt-0.5 shrink-0">•</span>
                        Check for CSP or adblockers that might block third-party scripts
                      </li>
                    </ul>
                  </Card>

                  {/* Show personalized snippet for re-copy */}
                  <Card>
                    <p className="text-meta text-text-3 mb-2">
                      Your snippet for <strong className="text-text-2">{normalized}</strong>:
                    </p>
                    <pre className="overflow-x-auto text-meta text-white/70 font-mono leading-relaxed whitespace-pre-wrap break-all">
                      {snippetForDomain}
                    </pre>
                    <Button variant="secondary" size="sm"
                      onClick={handleCopy}
                      className="mt-3 border-transparent bg-text/10 text-text-2 hover:bg-text/20 hover:text-text"
                    >
                      {copied ? <><Check className="h-3 w-3 text-ok" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy snippet</>}
                    </Button>
                  </Card>

                  <div className="flex items-center gap-3 pt-1">
                    <Button
                      variant="secondary" size="sm"
                      onClick={handleRetry}
                      className="text-small"
                    >
                      <Loader2 className="h-3.5 w-3.5" />
                      Check again
                    </Button>
                    <span className="text-meta text-text-3">
                      Auto-checking every 8s for 40s…
                    </span>
                  </div>
                </div>
              )}

              {/* Manual continue — only shown if not yet checking/found */}
              {!isFound && !isChecking && (
                <div className="mt-8">
                  <Button
                    variant="ghost"
                    onClick={() => setStep(3)}
                    className="text-body"
                  >
                    I&apos;ll verify later →
                  </Button>
                  <p className="mt-1 text-meta text-text-3/60">
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
            className="flex items-center gap-2.5 text-[1.1rem] font-semibold tracking-tight text-text transition-opacity duration-200 hover:opacity-80"
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
            <h1 className="text-display sm:text-display-lg font-semibold tracking-tight text-text">
              {checkState.phase === 'found' ? <>You&apos;re all set!</> : <>Almost there!</>}
            </h1>
            <p className="mt-3 text-body sm:text-title text-white/55 max-w-lg mx-auto">
              {checkState.phase === 'found'
                ? 'Head to the dashboard to create your first A/B test.'
                : 'Install the snippet on your site to finish setup. You can verify later in the dashboard.'}
            </p>

            <div className="mt-8 space-y-3 text-left max-w-md mx-auto">
              <Card className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
                <div>
                  <p className="text-body font-semibold text-text">Snippet ready</p>
                  <p className="text-small text-text-3 mt-0.5">
                    {domainUrl.trim()
                      ? <>Installed for <strong className="text-text-2">{normalize(domainUrl)}</strong></>
                      : 'Paste it into your site\'s <head> to start tracking.'}
                  </p>
                </div>
              </Card>
              <Card className="flex items-start gap-3">
                {checkState.phase === 'found' ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
                ) : (
                  <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-text-3" />
                )}
                <div>
                  <p className="text-body font-semibold text-text">
                    {checkState.phase === 'found' ? 'Snippet verified' : 'Verification pending'}
                  </p>
                  <p className="text-small text-text-3 mt-0.5">
                    {checkState.phase === 'found'
                      ? 'Live connection confirmed.'
                      : 'Check in the dashboard after installing the snippet.'}
                  </p>
                </div>
              </Card>
            </div>

            <div className="mt-8">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-fill-invert px-8 py-3.5 text-body font-semibold text-text-on-invert transition-all hover:bg-white/90 active:scale-[0.98]"
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
            className="flex items-center gap-2.5 text-[1.1rem] font-semibold tracking-tight text-text transition-opacity duration-200 hover:opacity-80"
          >
            <PandaLogo size="md" />
            variante
          </Link>
          {step > 1 && (
            <Button
              variant="ghost" size="sm"
              onClick={() => setStep((step - 1) as Step)}
              className="rounded-full text-body hover:bg-white/[0.04]"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard')}
          aria-label="Skip onboarding and go to dashboard"
          className="rounded-full px-4 py-1.5 text-body hover:bg-white/[0.04]"
        >
          Skip to dashboard
        </Button>
      </div>
    </header>
  )
}

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8" role="list" aria-label="Onboarding progress">
      {([1, 2, 3] as const).map((s) => (
        <div key={s} className="flex items-center gap-2" role="listitem">
          <div
            aria-current={s === step ? 'step' : undefined}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-meta font-semibold transition-colors ${
              s === step
                ? 'bg-fill-invert text-text-on-invert'
                : s < step
                ? 'bg-ok/20 text-ok'
                : 'bg-bg-2 text-text-3'
            }`}
          >
            {s < step ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : s}
          </div>
          {s < 3 && <div className={`h-px w-8 sm:w-12 ${s < step ? 'bg-ok/40' : 'bg-border'}`} aria-hidden="true" />}
        </div>
      ))}
    </div>
  )
}
