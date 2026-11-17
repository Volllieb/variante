'use client'

/**
 * Try-Flow der Landingpage: URL eingeben → echte KI-Varianten für Headline und
 * Haupt-Button der eigenen Seite, noch vor dem Signup (/api/landing-demo).
 *
 * Die gewählte Variante merkt sich das Cookie `variante_demo_choice`; beim
 * Signup legt lib/demoClaim.ts daraus den ersten Test-Entwurf an.
 * Vorher zeigte der Flow nur eine Elementzählung — kein Aha-Moment.
 */

import { useState } from 'react'
import { ArrowRight, Loader2, Globe, Check, AlertCircle, Sparkles } from 'lucide-react'
import { LEVER_LABELS, type LeverId } from '@/lib/copyLevers'
import { cn } from '@/lib/utils'

const STEPS = [
  'Reading your page',
  'Understanding what you offer',
  'Writing headline ideas',
  'Writing button ideas',
]

interface Variant { text: string; lever: LeverId; why: string }
interface ElementResult { original: string; selector: string; tag: string; variants: Variant[] }
interface DemoResponse {
  url: string
  title?: string
  headline?: ElementResult | null
  cta?: ElementResult | null
  reason?: 'fetch_failed' | 'no_elements' | 'ai_failed' | 'busy'
}

const REASON_TEXT: Record<NonNullable<DemoResponse['reason']>, string> = {
  fetch_failed: "We couldn't read this page — some sites block automated visits. Sign up and pick elements directly on your site instead.",
  no_elements: "We couldn't find a clear headline or button on this page. Sign up and pick any element directly on your site.",
  ai_failed: "The AI couldn't write good variants for this page right now. Sign up and try it on any element of your site.",
  busy: 'Lots of people are trying Variante right now. Sign up and get suggestions for your own page in the dashboard.',
}

function setChoice(kind: 'h' | 'c', index: number) {
  try {
    document.cookie = `variante_demo_choice=${kind}:${index}; Path=/; Max-Age=86400; SameSite=Lax; Secure`
  } catch { /* Cookies blockiert — dann gilt die erste Variante */ }
}

export function LandingTrySite() {
  const [url, setUrl] = useState('')
  const [phase, setPhase] = useState<'input' | 'submitting' | 'success' | 'error'>('input')
  const [errMsg, setErrMsg] = useState('')
  const [stepIndex, setStepIndex] = useState(0)
  const [result, setResult] = useState<DemoResponse | null>(null)
  const [choice, setChoiceState] = useState<{ kind: 'h' | 'c'; index: number }>({ kind: 'h', index: 0 })

  function isValidUrl(raw: string): boolean {
    const normalized = raw.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
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
    setResult(null)
    setPhase('submitting')
    setStepIndex(0)
    // Grobe Taktung: Lesen + Briefing ~5 s, Varianten ~6–10 s
    const stepTimer = setInterval(() => {
      setStepIndex((prev) => (prev >= STEPS.length - 1 ? prev : prev + 1))
    }, 3500)

    try {
      const res = await fetch('/api/landing-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      clearInterval(stepTimer)
      const data = await res.json().catch(() => ({})) as DemoResponse & { error?: string }
      if (!res.ok) {
        setErrMsg(data.error || 'Something went wrong. Try again.')
        setPhase('error')
        return
      }
      setResult(data)
      const first = data.headline ? 'h' : 'c'
      setChoiceState({ kind: first, index: 0 })
      if (data.headline || data.cta) setChoice(first, 0)
      setPhase('success')
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
    setResult(null)
  }

  function choose(kind: 'h' | 'c', index: number) {
    setChoiceState({ kind, index })
    setChoice(kind, index)
  }

  const normalized = url.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
  const signupHref = `/signup?demo_url=${encodeURIComponent(normalized)}`
  const hasVariants = !!(result?.headline || result?.cta)

  return (
    <section className="section !pt-10 !pb-12">
      <div className="container-wide text-center">
        <span className={cn(
          'mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors',
          phase === 'success' ? 'bg-ok/10 text-ok' : phase === 'error' ? 'bg-err/10 text-err' : 'bg-white/5 text-white/50',
        )}>
          {phase === 'success' ? <Check className="h-5 w-5" /> : phase === 'error' ? <AlertCircle className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
        </span>

        <h2 className="text-heading font-semibold tracking-tight text-white sm:text-display">
          {phase === 'success' && hasVariants ? `Test ideas for ${result?.url}` : 'See better copy for your page'}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-body text-white/45">
          {phase === 'success' && hasVariants
            ? 'Each idea tests a different reason to click. Pick the one you want to test first.'
            : phase === 'success'
              ? REASON_TEXT[result?.reason ?? 'ai_failed']
              : 'Enter your site URL. Variante reads your page and writes headline and button variants you can A/B test — no account needed.'}
        </p>

        {(phase === 'input' || phase === 'error') && (
          <form onSubmit={handleSubmit} className="mx-auto mt-5 max-w-sm">
            <div className="flex gap-snug">
              <input
                type="text"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setErrMsg(''); if (phase === 'error') setPhase('input') }}
                placeholder="yoursite.com"
                autoComplete="url"
                aria-label="Your site URL"
                className={cn(
                  'h-[42px] flex-1 rounded-md border bg-bg-1 px-4 text-small text-white transition-colors placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-text/30',
                  phase === 'error' ? 'border-err/40' : 'border-border focus:border-border-strong',
                )}
              />
              <button
                type="submit"
                disabled={!url.trim()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-fill-invert px-5 py-2.5 text-small font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover disabled:opacity-30"
              >
                Try it
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            {errMsg && (
              <div className="mt-2 flex items-start gap-1.5 text-left">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-err" />
                <p className="text-meta text-err">{errMsg}</p>
              </div>
            )}
          </form>
        )}

        {phase === 'submitting' && (
          <div className="mx-auto mt-5 max-w-sm" role="status">
            <div className="space-y-3 rounded-lg border border-border bg-bg-1 p-5">
              {STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-3">
                  <span className={cn(
                    'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors',
                    i < stepIndex ? 'bg-ok/20 text-ok' : i === stepIndex ? 'bg-white/10 text-white/70' : 'bg-bg-2 text-text-3',
                  )}>
                    {i < stepIndex ? <Check className="h-3 w-3" /> : i === stepIndex ? <Loader2 className="h-3 w-3 animate-spin" /> : i + 1}
                  </span>
                  <span className={cn('text-meta transition-colors', i <= stepIndex ? 'text-white/60' : 'text-text-3')}>{step}</span>
                </div>
              ))}
              <p className="pt-1 text-left text-meta text-text-3">Takes about 15 seconds.</p>
            </div>
          </div>
        )}

        {phase === 'success' && (
          <div className="mx-auto mt-5 max-w-lg space-y-3 text-left">
            {result?.headline && (
              <IdeaCard
                label="Your headline"
                result={result.headline}
                selectedIndex={choice.kind === 'h' ? choice.index : -1}
                onSelect={(i) => choose('h', i)}
              />
            )}
            {result?.cta && (
              <IdeaCard
                label="Your main button"
                result={result.cta}
                selectedIndex={choice.kind === 'c' ? choice.index : -1}
                onSelect={(i) => choose('c', i)}
              />
            )}

            <div className="rounded-lg border border-ok/20 bg-ok/[0.04] p-4">
              <p className="text-small text-white/70">
                {hasVariants
                  ? <>Sign up free and <strong className="text-white/85">{result?.url}</strong> is connected to your account — your picked idea is ready as your first A/B test. Add one snippet to your site and it runs against your original.</>
                  : <>Sign up free and <strong className="text-white/85">{result?.url}</strong> is connected to your account.</>}
              </p>
            </div>

            <a
              href={signupHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-6 py-3 text-small font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98]"
            >
              {hasVariants ? 'Sign up free — test this idea' : 'Sign up free — connect your site'}
              <ArrowRight className="h-4 w-4" />
            </a>
            <div className="text-center">
              <button onClick={handleRetry} className="text-meta text-text-3 transition-colors hover:text-text-2">
                Try a different URL
              </button>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="mt-3">
            <button onClick={handleRetry} className="text-meta text-text-3 transition-colors hover:text-text-2">
              Clear and try again
            </button>
          </div>
        )}

        <p className="mt-4 text-[11px] text-text-3">
          No account needed to try. Ideas only use facts from your page.
        </p>
      </div>
    </section>
  )
}

function IdeaCard({
  label, result, selectedIndex, onSelect,
}: {
  label: string
  result: ElementResult
  selectedIndex: number
  onSelect: (index: number) => void
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-1 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-3">{label}</p>
      <p className="mt-1 text-body italic leading-relaxed text-white/55">&ldquo;{result.original}&rdquo;</p>
      <div className="mt-3 flex flex-col gap-snug" role="radiogroup" aria-label={`${label} — ideas to test`}>
        {result.variants.map((v, i) => {
          const selected = i === selectedIndex
          return (
            <button
              key={v.text}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(i)}
              className={cn(
                'rounded-md border p-3 text-left transition-colors',
                selected ? 'border-border-strong bg-bg-2' : 'border-border hover:border-border-strong',
              )}
            >
              <span className="flex flex-wrap items-center gap-snug">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-pro" />
                <span className="text-body font-semibold text-white">{v.text}</span>
                <span className="rounded-sm bg-bg-2 px-1.5 py-0.5 text-meta text-text-2">{LEVER_LABELS[v.lever] ?? v.lever}</span>
                {selected && <Check className="ml-auto h-3.5 w-3.5 text-ok" aria-hidden="true" />}
              </span>
              <span className="mt-1 block text-meta leading-relaxed text-text-3">{v.why}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
