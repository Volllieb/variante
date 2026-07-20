'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { PandaLogo } from '@/components/PandaLogo'
import { Check, Copy, Globe, ArrowRight, ChevronLeft, Loader2 } from 'lucide-react'

type Step = 1 | 2 | 3

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [apiToken, setApiToken] = useState('')
  const [copied, setCopied] = useState(false)
  const [domainUrl, setDomainUrl] = useState('')
  const [domainErr, setDomainErr] = useState('')
  const [domainLoading, setDomainLoading] = useState(false)
  const [domainAdded, setDomainAdded] = useState(false)

  // Session check — if no session, redirect to /signup
  useEffect(() => {
    getBrowserSupabase().auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push('/signup')
        return
      }
      // Load API token from profile
      const supabase = getBrowserSupabase()
      const { data: profile } = await supabase
        .from('profiles')
        .select('api_token')
        .eq('user_id', session.user.id)
        .single()
      if (profile?.api_token) {
        setApiToken(profile.api_token)
      }
      setSessionChecked(true)
    }).catch(() => {
      router.push('/signup')
    })
  }, [router])

  const snippet = apiToken
    ? `<script src="https://www.getvariante.com/ab.js" data-variante-token="${apiToken}" defer></script>`
    : ''

  const handleCopy = useCallback(async () => {
    if (!snippet) return
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const el = document.createElement('textarea')
      el.value = snippet
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [snippet])

  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault()
    setDomainErr('')
    setDomainLoading(true)
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: domainUrl }),
      })
      if (!res.ok) {
        const data = await res.json()
        setDomainErr(data.error || 'Something went wrong. Try again.')
        setDomainLoading(false)
        return
      }
      setDomainAdded(true)
    } catch {
      setDomainErr('Connection failed. Check your internet and try again.')
    }
    setDomainLoading(false)
  }

  if (!sessionChecked) return null

  return (
    <div className="min-h-screen bg-bg-0 text-white/80 antialiased flex flex-col">
      {/* Minimal-Header */}
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
                onClick={() => setStep((s) => (s - 1) as Step)}
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

      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-2xl mx-auto">
          {/* Step indicator */}
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

          {/* Step 1: Snippet */}
          {step === 1 && (
            <div className="text-center">
              <span className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-white/10 text-white/70 mb-5">
                <Globe className="h-6 w-6" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Install the snippet
              </h1>
              <p className="mt-3 text-sm sm:text-base text-white/55 max-w-lg mx-auto">
                Paste this one line into your site&apos;s <code className="text-white/80 bg-white/5 px-1.5 py-0.5 rounded text-[13px]">&lt;head&gt;</code> tag. It loads async at 5 KB — zero impact on performance.
              </p>

              <div className="mt-8 text-left">
                <div className="relative rounded-[10px] border border-border bg-bg-1 p-4">
                  <pre className="overflow-x-auto text-[13px] text-white/80 font-mono leading-relaxed whitespace-pre-wrap break-all">
                    {snippet || 'Loading…'}
                  </pre>
                  <button
                    onClick={handleCopy}
                    disabled={!snippet}
                    className="absolute top-3 right-3 flex items-center gap-1.5 rounded-[6px] bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/80 transition-colors hover:bg-white/20 disabled:opacity-40"
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

              <div className="mt-8">
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98]"
                >
                  Next step
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Domain (optional) */}
          {step === 2 && (
            <div className="text-center">
              <span className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-white/10 text-white/70 mb-5">
                <Globe className="h-6 w-6" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Add your website
              </h1>
              <p className="mt-3 text-sm sm:text-base text-white/55 max-w-lg mx-auto">
                Tell us where you&apos;ll run tests. You can always add more domains later.
              </p>

              {domainAdded ? (
                <div className="mt-8 rounded-[10px] border border-ok/20 bg-ok/[0.05] p-5 text-center">
                  <Check className="mx-auto h-8 w-8 text-ok" />
                  <p className="mt-3 text-sm font-semibold text-white">Domain added!</p>
                  <p className="mt-1 text-xs text-text-3">You can verify it later in the dashboard.</p>
                </div>
              ) : (
                <form onSubmit={handleAddDomain} className="mt-8 max-w-md mx-auto">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="mysite.com"
                      value={domainUrl}
                      onChange={(e) => setDomainUrl(e.target.value)}
                      className="flex-1 rounded-[6px] border border-border bg-bg-1 px-4 py-3 text-sm text-white placeholder:text-text-3 transition-colors focus:border-border-strong focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={domainLoading}
                      className="inline-flex items-center gap-1.5 rounded-[6px] bg-white px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:opacity-50"
                    >
                      {domainLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                    </button>
                  </div>
                  {domainErr && (
                    <p className="mt-2 text-xs text-err text-left">{domainErr}</p>
                  )}
                  <p className="mt-2 text-xs text-text-3 text-left">
                    Just the domain name — no protocol needed.
                  </p>
                </form>
              )}

              <div className="mt-8">
                <button
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98]"
                >
                  {domainAdded ? 'Continue' : 'Skip this step'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Ready */}
          {step === 3 && (
            <div className="text-center">
              <span className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-ok/[0.1] text-ok mb-5">
                <Check className="h-7 w-7" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                You&apos;re all set!
              </h1>
              <p className="mt-3 text-sm sm:text-base text-white/55 max-w-lg mx-auto">
                {apiToken
                  ? 'Your snippet is ready to paste. Head to the dashboard to create your first test.'
                  : 'Your account is ready. Head to the dashboard to get started.'}
              </p>

              <div className="mt-8 space-y-3 text-left max-w-md mx-auto">
                <div className="flex items-start gap-3 rounded-[10px] border border-border bg-bg-1 p-4">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
                  <div>
                    <p className="text-sm font-semibold text-white">Snippet copied</p>
                    <p className="text-xs text-text-3 mt-0.5">Paste it into your site to start tracking.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-[10px] border border-border bg-bg-1 p-4">
                  {domainAdded ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
                  ) : (
                    <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-text-3" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {domainAdded ? 'Domain added' : 'Domain not yet added'}
                    </p>
                    <p className="text-xs text-text-3 mt-0.5">
                      {domainAdded ? 'Ready for testing.' : 'Add one in the dashboard to start.'}
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
          )}
        </div>
      </main>
    </div>
  )
}
