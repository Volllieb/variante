'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { PandaLogo } from '@/components/PandaLogo'
import { Play, MousePointer2, Image, Sparkles, Target, Code2, BarChart3, Trophy, FlaskConical } from 'lucide-react'

/* ── Types ── */

type Step = 'welcome' | 'element' | 'variant' | 'generate' | 'goal' | 'snippet' | 'dashboard'
type DashboardPhase = 'counting' | 'done'

/* ── Animation tick data ── */

const TICK_DATA = [
  { va: 30, vb: 28, ca: 3, cb: 4 },
  { va: 85, vb: 82, ca: 9, cb: 13 },
  { va: 160, vb: 158, ca: 18, cb: 26 },
  { va: 250, vb: 248, ca: 28, cb: 42 },
  { va: 340, vb: 338, ca: 38, cb: 56 },
  { va: 400, vb: 400, ca: 48, cb: 70 },
  { va: 410, vb: 415, ca: 51, cb: 76 },
  { va: 423, vb: 424, ca: 53, cb: 79 },
]

function derived(va: number, vb: number, ca: number, cb: number) {
  const cra = va > 0 ? (ca / va) * 100 : 0
  const crb = vb > 0 ? (cb / vb) * 100 : 0
  const lift = cra > 0 ? ((crb - cra) / cra) * 100 : 0
  // Simplified p-value approximation based on sample size + difference
  const n = va + vb
  const diff = Math.abs(crb - cra)
  const p = Math.max(0.01, 1 / (1 + Math.exp((diff - 5) * 0.3 + (n - 200) * 0.002)))
  const significant = p < 0.05
  const winner = significant ? (crb > cra ? 'B' : 'A') : null
  return { cra, crb, lift, p, significant, winner }
}

/* ── Playground page ── */

export default function PlaygroundPage() {
  const [step, setStep] = useState<Step>('welcome')
  const [dashboardPhase, setDashboardPhase] = useState<DashboardPhase>('counting')
  const [visitorsA, setVisitorsA] = useState(0)
  const [visitorsB, setVisitorsB] = useState(0)
  const [convA, setConvA] = useState(0)
  const [convB, setConvB] = useState(0)
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [copiedSnippet, setCopiedSnippet] = useState(false)
  const [showSnippet, setShowSnippet] = useState(false)
  const [scope, setScope] = useState<'all' | 'text' | 'color'>('all')
  const [generating, setGenerating] = useState(false)
  const [genDone, setGenDone] = useState(false)
  const tickRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Dashboard animation ──
  const startAnimation = useCallback(() => {
    tickRef.current = 0
    setDashboardPhase('counting')
    setVisitorsA(0)
    setVisitorsB(0)
    setConvA(0)
    setConvB(0)

    intervalRef.current = setInterval(() => {
      if (tickRef.current >= TICK_DATA.length) {
        clearInterval(intervalRef.current!)
        setDashboardPhase('done')
        return
      }
      const d = TICK_DATA[tickRef.current]
      setVisitorsA(d.va)
      setVisitorsB(d.vb)
      setConvA(d.ca)
      setConvB(d.cb)
      tickRef.current++
    }, 500)
  }, [])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // Start animation when entering dashboard
  useEffect(() => {
    if (step === 'dashboard') startAnimation()
  }, [step, startAnimation])

  // Reset generation state when entering generate step
  useEffect(() => {
    if (step === 'generate') {
      setGenerating(false)
      setGenDone(false)
    }
  }, [step])

  // ── Navigation ──
  const goTo = (s: Step) => {
    setStep(s)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const reset = () => {
    setStep('welcome')
    setDashboardPhase('counting')
    setVisitorsA(0)
    setVisitorsB(0)
    setConvA(0)
    setConvB(0)
    setCopiedPrompt(false)
    setCopiedSnippet(false)
    setShowSnippet(false)
    setScope('all')
    setGenerating(false)
    setGenDone(false)
    if (intervalRef.current) clearInterval(intervalRef.current!)
  }

  // ── Derived dashboard values ──
  const d = derived(visitorsA, visitorsB, convA, convB)
  const totalVisitors = visitorsA + visitorsB
  const status = dashboardPhase === 'counting' ? 'Running' : 'Done'

  // ── Copy handlers ──
  const copyPrompt = () => {
    const prompt = `Add this script to the <head> of every page on my site:\n\n<script src="https://cdn.getvariante.com/ab.js" data-test="demo-abc123"></script>\n\nIt enables A/B testing with Variante.`
    navigator.clipboard.writeText(prompt).then(() => {
      setCopiedPrompt(true)
      setTimeout(() => setCopiedPrompt(false), 2000)
    })
  }

  const copySnippet = () => {
    navigator.clipboard.writeText(
      '<script src="https://cdn.getvariante.com/ab.js" data-test="demo-abc123"></script>'
    ).then(() => {
      setCopiedSnippet(true)
      setTimeout(() => setCopiedSnippet(false), 2000)
    })
  }

  /* ── Explanation content per step ── */

  const explanations: Record<Step, { icon: React.ReactNode; title: string; body: React.ReactNode }> = {
    welcome: {
      icon: <Play className="h-4 w-4 text-text-2 shrink-0" />,
      title: 'Your first A/B test — in 2 minutes',
      body: (
        <>
          <p className="mb-3">
            Full workflow, end-to-end: <strong>pick → design → generate → ship → measure.</strong>
          </p>
          <p className="mb-3">
            Sandbox demo. Pre-loaded test site, no Figma needed. Same flow on your site —
            just with your designs and your data.
          </p>
          <p>
            Click <strong>Try the demo</strong> to walk through it.
          </p>
        </>
      ),
    },
    element: {
      icon: <MousePointer2 className="h-4 w-4 text-text-2 shrink-0" />,
      title: 'Pick an element',
      body: (
        <>
          <p className="mb-3">
            <strong>One click.</strong> The picker captures HTML, CSS, and context —
            button, headline, hero section. No selector hunting.
          </p>
          <p>
            We&apos;ve pre-picked a &ldquo;Get Started&rdquo; button. Click{' '}
            <strong>Continue</strong> to design Variant B.
          </p>
        </>
      ),
    },
    variant: {
      icon: <Image className="h-4 w-4 text-text-2 shrink-0" />,
      title: 'Design Variant B in Figma',
      body: (
        <>
          <p className="mb-3">
            Click any Figma layer as Variant B. Colors, fonts, spacing read directly.
            The AI uses your layer as the blueprint — <strong>no code required.</strong>
          </p>
          <p>
            Layer is pre-selected here. Click <strong>Continue</strong> to scope generation.
          </p>
        </>
      ),
    },
    generate: {
      icon: <Sparkles className="h-4 w-4 text-text-2 shrink-0" />,
      title: 'Scope & generate Variant B',
      body: (
        <>
          <p className="mb-3">
            Choose what the AI changes — <strong>everything, text only, or colors only.</strong>{' '}
            Then generate. AI produces clean HTML with your Figma design as the blueprint.
          </p>
          <p>
            Scope is set to Everything. Click <strong>Generate</strong>, then set your goal.
          </p>
        </>
      ),
    },
    goal: {
      icon: <Target className="h-4 w-4 text-text-2 shrink-0" />,
      title: 'Set your conversion goal',
      body: (
        <>
          <p className="mb-3">
            Default: a <strong>click on the tested element</strong>. Simple and usually
            what you want. Also supports custom CSS selectors for any element.
          </p>
          <p>
            Goal is pre-set. Click <strong>Continue</strong> to install the snippet.
          </p>
        </>
      ),
    },
    snippet: {
      icon: <Code2 className="h-4 w-4 text-text-2 shrink-0" />,
      title: 'One script tag. Done.',
      body: (
        <>
          <p className="mb-3">
            Paste <strong>one <code className="text-xs bg-[#111] px-1.5 py-0.5 rounded">&lt;script&gt;</code> tag</strong> into
            your <code className="text-xs bg-[#111] px-1.5 py-0.5 rounded">&lt;head&gt;</code>.
            No deploy. No npm. No DNS.
          </p>
          <p>
            The snippet handles traffic split, variant serving, and conversion tracking.
            Click <strong>View Results</strong> — here comes the payoff.
          </p>
        </>
      ),
    },
    dashboard: {
      icon: dashboardPhase === 'done'
        ? <Trophy className="h-4 w-4 text-text-2 shrink-0" />
        : <BarChart3 className="h-4 w-4 text-text-2 shrink-0" />,
      title: dashboardPhase === 'done'
        ? `Variant B wins — +${d.lift.toFixed(0)}% more conversions`
        : 'Watch the numbers climb',
      body: dashboardPhase === 'done' ? (
        <>
          <p className="mb-3">
            You just ran an <strong>entire A/B test</strong> — Figma to 95% significance —
            in under a minute.
          </p>
          <p className="mb-3">
            On your site, same setup: 2 minutes for the snippet. Then design variants in Figma
            whenever. No dev. No deploy.
          </p>
          <p className="font-semibold">That&apos;s the product. Ready for your own site?</p>
        </>
      ) : (
        <>
          <p className="mb-3">
            Visitors flow. Conversions climb. Significance builds — seconds, not days.
            <strong> Sped up ~1000×</strong> for the demo.
          </p>
          <p>
            Watch the left panel. Variante declares a winner at 95% confidence.
            Real traffic takes hours or days — dashboard refreshes every 30s (Free) or 10s (Pro).
          </p>
        </>
      ),
    },
  }

  const currentStepIndex =
    step === 'welcome' ? 1 : step === 'element' ? 2 : step === 'variant' ? 3 : step === 'generate' ? 4 : step === 'goal' ? 5 : step === 'snippet' ? 6 : 7

  /* ── Render ── */

  return (
    <div className="min-h-screen bg-bg-0 text-white/80 antialiased">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-bg-0/95">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="flex items-center gap-2.5 text-[1.1rem] font-semibold tracking-tight text-white transition-opacity duration-200 hover:opacity-80"
            >
              <PandaLogo className="h-7 w-7 rounded-lg p-1" />
              variante
            </a>
            <span className="hidden text-sm text-white/40 sm:inline">/</span>
            <span className="hidden text-sm font-medium text-white/80 sm:inline">Playground</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/signup"
              className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90"
            >
              Sign up free
            </a>
          </div>
        </nav>
      </header>

      {/* ── Sandbox Banner ── */}
      <div className="border-b border-pro/20 bg-pro-bg">
        <div className="mx-auto max-w-6xl px-4 py-2.5 text-center text-sm font-medium text-pro/90 sm:px-6">
          <FlaskConical className="inline h-3.5 w-3.5 -mt-0.5 mr-1.5" />
          Sandbox — demo only. Not a real test.
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        <div className="flex flex-col items-start gap-8 lg:flex-row lg:gap-12">
          {/* ── Plugin Box ── */}
          <div className="mx-auto w-full max-w-[360px] shrink-0 lg:mx-0">
            <div className="overflow-hidden rounded-[10px] border border-gray-300" style={{ background: '#ffffff' }}>
              <PluginBox
                step={step}
                dashboardPhase={dashboardPhase}
                visitorsA={visitorsA}
                visitorsB={visitorsB}
                convA={convA}
                convB={convB}
                d={d}
                totalVisitors={totalVisitors}
                status={status}
                copiedPrompt={copiedPrompt}
                copiedSnippet={copiedSnippet}
                showSnippet={showSnippet}
                scope={scope}
                generating={generating}
                genDone={genDone}
                onGo={goTo}
                onSetScope={setScope}
                onGenerate={() => {
                  setGenerating(true)
                  setTimeout(() => {
                    setGenerating(false)
                    setGenDone(true)
                  }, 1500)
                }}
                onCopyPrompt={copyPrompt}
                onCopySnippet={copySnippet}
                onToggleSnippet={() => setShowSnippet(!showSnippet)}
              />
            </div>
            {/* Reset button */}
            <button
              onClick={reset}
              className="mt-3 w-full rounded-[6px] border border-border py-2 text-[13px] font-medium text-text-3 transition-colors hover:border-border-strong hover:text-text"
            >
              ↺ Start over
            </button>
          </div>

          {/* ── Explanation Panel ── */}
          <div className="flex-1 min-w-0">
            <div className="rounded-[10px] border border-border bg-bg-1 p-6">
              <h2 className="text-[15px] font-semibold text-text flex items-center gap-2">
                {explanations[step].icon}
                {explanations[step].title}
              </h2>
              <div className="mt-3 text-sm text-text-2 leading-relaxed">
                {explanations[step].body}
              </div>
              {/* Step indicator */}
              <div className="mt-5 flex items-center gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <div
                    key={n}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      n <= currentStepIndex ? 'bg-white' : 'bg-white/15'
                    }`}
                  />
                ))}
                <span className="ml-2 text-xs text-text-3">
                  Step {currentStepIndex} of 7
                </span>
              </div>
            </div>

            {/* CTA section */}
            <div className="mt-6 rounded-[10px] border border-border bg-bg-1 p-6 text-center">
              <p className="mb-4 text-sm font-semibold text-text">
                Ready to do this on your own site?
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <a
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-[6px] bg-white px-6 py-2.5 text-[13px] font-semibold text-black transition-opacity hover:opacity-85"
                >
                  Create free account →
                </a>
                <a
                  href="https://www.figma.com/community/plugin/1653734891132085565"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-[6px] border border-border px-6 py-2.5 text-[13px] font-medium text-text transition-colors hover:border-border-strong hover:bg-bg-2"
                >
                  Figma Plugin →
                </a>
              </div>
              <p className="mt-3 text-xs text-text-3">
                Free tier: 1 experiment · No credit card · 2 min setup
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Plugin Box — 360×560px, white background, Figma-style
═════════════════════════════════════════════════════════════════ */

type PluginBoxProps = {
  step: Step
  dashboardPhase: DashboardPhase
  visitorsA: number; visitorsB: number; convA: number; convB: number
  d: ReturnType<typeof derived>
  totalVisitors: number
  status: string
  copiedPrompt: boolean; copiedSnippet: boolean; showSnippet: boolean
  scope: 'all' | 'text' | 'color'
  generating: boolean; genDone: boolean
  onGo: (s: Step) => void
  onSetScope: (s: 'all' | 'text' | 'color') => void
  onGenerate: () => void
  onCopyPrompt: () => void
  onCopySnippet: () => void
  onToggleSnippet: () => void
}

function PluginBox({
  step, dashboardPhase, visitorsA, visitorsB, convA, convB,
  d, totalVisitors, status,
  copiedPrompt, copiedSnippet, showSnippet,
  scope, generating, genDone,
  onGo, onSetScope, onGenerate,
  onCopyPrompt, onCopySnippet, onToggleSnippet,
}: PluginBoxProps) {
  /* Common styles matching the Figma plugin */
  const boxBtn = 'w-full cursor-pointer rounded-[6px] py-2.5 text-[13px] font-semibold transition-opacity hover:opacity-85'
  const boxBtnPrimary = `${boxBtn} bg-[#0D99FF] text-white`
  const boxBtnSecondary = `${boxBtn} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50`
  const boxBtnGhost = 'cursor-pointer text-[12px] font-medium text-gray-400 hover:text-gray-600 transition-colors'
  const screenHdr = 'flex items-center justify-between px-4 py-3 border-b border-gray-100'
  const screenBody = 'flex-1 overflow-y-auto px-4 py-4'

  return (
    <div className="flex h-[560px] flex-col font-sans text-gray-900" style={{ fontSize: '13px' }}>
      {step === 'welcome' && (
        <div className="flex flex-1 flex-col justify-center px-4 py-5">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0D99FF]/10">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0D99FF" strokeWidth="2.5" strokeLinecap="round">
                <rect x="2" y="4" width="8" height="16" rx="1.5" />
                <rect x="14" y="4" width="8" height="16" rx="1.5" />
              </svg>
            </div>
            <div className="text-xl font-semibold tracking-tight text-gray-900">variante</div>
            <p className="mt-3 text-[13px] text-gray-500 leading-relaxed">
              Design a variant in Figma.<br />Ship it. Watch conversions climb.
            </p>
            <p className="mt-1 text-[12px] text-gray-400">
              No dev. No deploy. Just results.
            </p>
          </div>
          <div className="mt-8 space-y-3">
            <button className={boxBtnPrimary} onClick={() => onGo('element')}>
              Try the demo →
            </button>
            <p className="text-[11px] text-gray-300 text-center">
              In the real plugin, connect your account here.
            </p>
          </div>
        </div>
      )}

      {step === 'element' && (
        <>
          <div className={screenHdr}>
            <span className="text-[13px] font-semibold text-gray-500">Pick Element</span>
            <span className="text-[11px] text-gray-300">2 / 7</span>
          </div>
          <div className="flex gap-0.5 px-4 pt-2">
            {[1, 2].map((n) => (
              <div key={n} className="h-1 flex-1 rounded-full bg-[#0D99FF]" />
            ))}
            {[3, 4, 5, 6, 7].map((n) => (
              <div key={n} className="h-1 flex-1 rounded-full bg-gray-100" />
            ))}
          </div>
          <div className={screenBody}>
            {/* Built-in picker card */}
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
              <div className="flex items-start gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-200">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                    <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-gray-700">Built-in Picker</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    Runs directly in your browser via the snippet. No separate install needed.
                  </p>
                  <div className="mt-2 rounded bg-gray-100 px-2 py-1.5 text-[11px] text-gray-400 italic">
                    (skipped in demo)
                  </div>
                </div>
              </div>
            </div>

            {/* Selected element */}
            <div className="mt-3 rounded-lg border border-gray-200 p-3">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Selected element</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-100">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                  </svg>
                </div>
                <div>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-500">BUTTON</span>
                  <span className="ml-1.5 text-[13px] font-medium text-gray-800">&ldquo;Get Started&rdquo;</span>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 px-4 py-3">
            <button className={boxBtnPrimary} onClick={() => onGo('variant')}>
              Continue to Variant B →
            </button>
          </div>
        </>
      )}

      {step === 'variant' && (
        <>
          <div className={screenHdr}>
            <span className="text-[13px] font-semibold text-gray-500">Variant B in Figma</span>
            <span className="text-[11px] text-gray-300">3 / 7</span>
          </div>
          <div className="flex gap-0.5 px-4 pt-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-1 flex-1 rounded-full bg-[#0D99FF]" />
            ))}
            {[4, 5, 6, 7].map((n) => (
              <div key={n} className="h-1 flex-1 rounded-full bg-gray-100" />
            ))}
          </div>
          <div className={screenBody}>
            <p className="text-[12px] text-gray-500 leading-relaxed">
              Click any layer in Figma that represents Variant B — a single button, heading, or section.
            </p>

            <div className="mt-4 rounded-lg border border-gray-200 p-3">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Layer selected</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-[#0D99FF]/10">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0D99FF" strokeWidth="2">
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                  </svg>
                </div>
                <div>
                  <span className="rounded bg-[#0D99FF]/10 px-1.5 py-0.5 text-[11px] font-medium text-[#0D99FF]">BUTTON</span>
                  <span className="ml-1.5 text-[13px] font-medium text-gray-800">&ldquo;Start free trial&rdquo;</span>
                  <p className="text-[11px] text-gray-400">Frame: hero &gt; cta-section</p>
                </div>
              </div>
            </div>

            <button className="mt-3 text-[11px] text-gray-300 cursor-default" disabled>
              Reselect (disabled in demo)
            </button>
          </div>
          <div className="border-t border-gray-100 px-4 py-3">
            <button className={boxBtnPrimary} onClick={() => onGo('generate')}>
              Continue to Generate →
            </button>
          </div>
        </>
      )}

      {step === 'generate' && (
        <>
          <div className={screenHdr}>
            <span className="text-[13px] font-semibold text-gray-500">Generate Variant B</span>
            <span className="text-[11px] text-gray-300">4 / 7</span>
          </div>
          <div className="flex gap-0.5 px-4 pt-2">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-1 flex-1 rounded-full bg-[#0D99FF]" />
            ))}
            {[5, 6, 7].map((n) => (
              <div key={n} className="h-1 flex-1 rounded-full bg-gray-100" />
            ))}
          </div>
          <div className={screenBody}>
            {!genDone && (
              <>
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Scope</span>
                <div className="mt-2 flex gap-1.5" role="radiogroup" aria-label="Generation scope">
                  {(['all', 'text', 'color'] as const).map((s) => (
                    <button
                      key={s}
                      className={`flex-1 rounded-[6px] py-1.5 text-[12px] font-medium transition-colors ${
                        scope === s
                          ? 'bg-[#0D99FF] text-white'
                          : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                      onClick={() => onSetScope(s)}
                      role="radio"
                      aria-checked={scope === s}
                    >
                      {s === 'all' ? 'Everything' : s === 'text' ? 'Text only' : 'Colors only'}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-gray-400">
                  {scope === 'all' ? 'Full visual redesign — layout, colors, and copy can all change.' :
                   scope === 'text' ? 'Only copy changes. Layout and colors stay the same.' :
                   'Only colors change. Text and layout remain untouched.'}
                </p>
              </>
            )}

            {generating && (
              <div className="mt-6 flex flex-col items-center gap-3 py-6" role="status" aria-live="polite">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0D99FF] border-t-transparent" />
                <span className="text-[12px] text-gray-400">AI generating Variant B… (up to 30s)</span>
              </div>
            )}

            {genDone && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Preview</span>
                  <div className="flex rounded-md border border-gray-200 overflow-hidden">
                    <button className="px-2.5 py-1 text-[11px] font-medium bg-gray-100 text-gray-400 cursor-default">A</button>
                    <button className="px-2.5 py-1 text-[11px] font-medium bg-[#0D99FF] text-white">B</button>
                  </div>
                </div>
                {/* Simulated variant B preview */}
                <div className="rounded-lg border border-gray-200 bg-white p-4 text-center overflow-hidden">
                  <p className="text-[11px] text-gray-300 mb-2">Variant B (preview)</p>
                  <div className="inline-block rounded-md bg-[#0D99FF] px-6 py-2.5 text-[13px] font-semibold text-white shadow-sm">
                    Start free trial →
                  </div>
                  <p className="mt-1.5 text-[10px] text-gray-400">
                    Design-based · generated from Figma layer
                  </p>
                </div>

                <details className="mt-2 rounded-lg border border-gray-200">
                  <summary className="px-3 py-2 text-[11px] text-gray-400 cursor-pointer">Show generated HTML</summary>
                  <pre className="px-3 pb-3 text-[10px] text-gray-500 overflow-auto">
{`<button class="cta-btn blue">
  Start free trial →
</button>`}
                  </pre>
                </details>
              </>
            )}
          </div>
          <div className="border-t border-gray-100 px-4 py-3">
            {!genDone ? (
              <button className={boxBtnPrimary} onClick={onGenerate}>
                Generate Variant B →
              </button>
            ) : (
              <button className={boxBtnPrimary} onClick={() => {
                onGo('goal')
              }}>
                Continue to Goal →
              </button>
            )}
          </div>
        </>
      )}

      {step === 'goal' && (
        <>
          <div className={screenHdr}>
            <span className="text-[13px] font-semibold text-gray-500">Conversion Goal</span>
            <span className="text-[11px] text-gray-300">5 / 7</span>
          </div>
          <div className="flex gap-0.5 px-4 pt-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-1 flex-1 rounded-full bg-[#0D99FF]" />
            ))}
            {[6, 7].map((n) => (
              <div key={n} className="h-1 flex-1 rounded-full bg-gray-100" />
            ))}
          </div>
          <div className={screenBody}>
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Conversion goal</span>

            {/* Option 1: Click on tested element — selected by default */}
            <div className="mt-2 rounded-lg border border-[#0D99FF]/30 bg-[#0D99FF]/5 p-3" role="radio" aria-checked="true">
              <label className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-[#0D99FF]">
                  <div className="h-2 w-2 rounded-full bg-[#0D99FF]" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-gray-800">Click on the tested element</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    When a visitor clicks the BUTTON &ldquo;Get Started&rdquo;
                  </p>
                </div>
              </label>
            </div>

            {/* Option 2: Another element — disabled in demo */}
            <div className="mt-2 rounded-lg border border-gray-200/50 p-3 opacity-50">
              <label className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-gray-300" />
                <div>
                  <p className="text-[12px] font-medium text-gray-600">Another element on the page</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Pick any clickable element in your browser.</p>
                </div>
              </label>
            </div>

            {/* Advanced settings */}
            <button className="mt-3 flex items-center gap-1.5 text-[11px] text-gray-300 cursor-default" disabled>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m9 18 6-6-6-6" />
              </svg>
              Advanced settings
            </button>
          </div>
          <div className="border-t border-gray-100 px-4 py-3">
            <button className={boxBtnPrimary} onClick={() => onGo('snippet')}>
              Continue →
            </button>
          </div>
        </>
      )}

      {step === 'snippet' && (
        <>
          <div className={screenHdr}>
            <span className="text-[13px] font-semibold text-gray-500">Install Snippet</span>
            <span className="text-[11px] text-gray-300">6 / 7</span>
          </div>
          <div className="flex gap-0.5 px-4 pt-2">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-1 flex-1 rounded-full bg-[#0D99FF]" />
            ))}
            <div className="h-1 flex-1 rounded-full bg-gray-100" />
          </div>
          <div className={screenBody}>
            {/* Success notice */}
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2fd76c" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <div>
                <p className="text-[12px] font-medium text-green-800">One snippet — every page</p>
                <p className="text-[11px] text-green-600">Add it once in &lt;head&gt;.</p>
              </div>
            </div>

            {/* Copy prompt */}
            <div className="mt-3">
              <button
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2.5 transition-colors hover:bg-gray-50 cursor-pointer"
                onClick={onCopyPrompt}
              >
                <span className="text-[12px] font-medium text-gray-700">
                  {copiedPrompt ? '✓ Copied' : 'Copy prompt'}
                </span>
                <span className="text-[11px] text-gray-400">
                  For Cursor, Copilot, ChatGPT
                </span>
              </button>
            </div>

            {/* Copy snippet manually */}
            <div className="mt-2">
              <div className="flex rounded-lg border border-gray-200 bg-gray-50/50 overflow-hidden">
                <button
                  className="flex-1 flex items-center px-3 py-2.5 text-[12px] font-medium text-gray-700 transition-colors hover:bg-gray-50 cursor-pointer"
                  onClick={onCopySnippet}
                >
                  {copiedSnippet ? '✓ Copied!' : 'Copy snippet manually'}
                </button>
                <button
                  className="flex items-center gap-1 px-3 py-2.5 text-[11px] text-gray-400 transition-colors hover:bg-gray-100 cursor-pointer border-l border-gray-200"
                  onClick={onToggleSnippet}
                  aria-expanded={showSnippet}
                  aria-label={showSnippet ? 'Hide snippet code' : 'Show snippet code'}
                >
                  {showSnippet ? '▲' : '▶'} Show
                </button>
              </div>
            </div>

            {showSnippet && (
              <div className="mt-2 rounded-lg border border-gray-200 bg-gray-100 p-3">
                <code className="text-[11px] text-gray-600 break-all leading-relaxed">
                  {'<script src="https://cdn.getvariante.com/ab.js" data-test="demo-abc123"></script>'}
                </code>
              </div>
            )}
          </div>
          <div className="border-t border-gray-100 px-4 py-3">
            <button className={boxBtnPrimary} onClick={() => onGo('dashboard')}>
              View Results →
            </button>
          </div>
        </>
      )}

      {step === 'dashboard' && (
        <>
          <div className={screenHdr}>
            <span className="text-[13px] font-semibold text-gray-500">Results</span>
            <span className="text-[11px] text-gray-300">7 / 7</span>
          </div>
          <div className="flex gap-0.5 px-4 pt-2">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <div key={n} className="h-1 flex-1 rounded-full bg-[#0D99FF]" />
            ))}
          </div>
          <div className={screenBody}>
            {/* Test info */}
            <p className="text-[12px] font-medium text-gray-700">Button &ldquo;Get Started&rdquo;</p>
            <p className="text-[11px] text-gray-400">herocta · getvariante.com</p>

            <div className="mt-3 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                dashboardPhase === 'counting'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-green-50 text-green-700'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  dashboardPhase === 'counting' ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
                }`} />
                {status}
              </span>
              <span className="text-[11px] text-gray-400">{totalVisitors} visitors</span>
            </div>

            {/* Winner banner */}
            {dashboardPhase === 'done' && (
              <div className="mt-3 animate-[fadeIn_0.4s_ease-out] rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                <p className="text-[12px] font-semibold text-green-800 flex items-center justify-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5" />
                  Variant B is winning
                </p>
                <p className="text-[11px] text-green-600">Significant at 95%</p>
              </div>
            )}

            {/* A/B stats */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              {/* Variant A */}
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">A</p>
                <div className="mt-2 space-y-1.5">
                  <div>
                    <p className="text-[10px] text-gray-400">Visitors</p>
                    <p className="text-[18px] font-semibold text-gray-800 tabular-nums">{visitorsA.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Conversions</p>
                    <p className="text-[15px] font-medium text-gray-700 tabular-nums">{convA.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">CR</p>
                    <p className="text-[15px] font-medium text-gray-700 tabular-nums">{d.cra.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
              {/* Variant B */}
              <div>
                <p className="text-[11px] font-semibold text-[#0D99FF] uppercase tracking-wide">B</p>
                <div className="mt-2 space-y-1.5">
                  <div>
                    <p className="text-[10px] text-gray-400">Visitors</p>
                    <p className="text-[18px] font-semibold text-gray-800 tabular-nums">{visitorsB.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Conversions</p>
                    <p className="text-[15px] font-medium text-gray-700 tabular-nums">{convB.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">CR</p>
                    <p className="text-[15px] font-semibold text-[#0D99FF] tabular-nums">{d.crb.toFixed(1)}%</p>

                  </div>
                </div>
              </div>
            </div>

            {/* Significance row */}
            {totalVisitors > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-3">
                <p className={`text-[12px] font-medium tabular-nums ${
                  d.significant ? 'text-green-700' : 'text-gray-500'
                }`}>
                  {d.lift > 0 ? '▲' : '▼'} {d.lift > 0 ? '+' : ''}{d.lift.toFixed(1)}% lift
                  <span className="ml-2 text-[11px] text-gray-400">
                    (p = {d.p.toFixed(d.p < 0.01 ? 3 : 2)})
                  </span>
                </p>
                {d.significant && (
                  <p className="text-[11px] font-medium text-green-600 mt-0.5">Significant at 95%</p>
                )}
              </div>
            )}
          </div>
          <div className="border-t border-gray-100 px-4 py-3">
            <a
              href="/signup"
              className={`flex w-full items-center justify-center rounded-[6px] py-2.5 text-[13px] font-semibold transition-opacity hover:opacity-85 ${
                dashboardPhase === 'done'
                  ? 'bg-[#0D99FF] text-white cursor-pointer'
                  : 'bg-gray-100 text-gray-300 cursor-default pointer-events-none'
              }`}
            >
              Try it yourself →
            </a>
          </div>
        </>
      )}
    </div>
  )
}
