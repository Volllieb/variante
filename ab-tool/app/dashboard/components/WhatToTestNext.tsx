'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Lightbulb, Sparkles, Globe, Lock, Loader2, RefreshCw, Bot, CheckCircle2, XCircle, Search, FlaskConical, Wand2 } from 'lucide-react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'

interface Suggestion {
  element: string
  original: string
  variant: string
  why: string
}

interface Props {
  siteUrl: string | null
  plan: string
  setupComplete: boolean
  domain: string | null
}

// Statische Vorschlaege als Teaser-Inhalt (wird im Free-Tier geblurred).
// Werden nie live angezeigt — nur als Silhouette hinter dem Blur.
const TEASER_SUGGESTIONS: Suggestion[] = [
  { element: 'Hero Headline', original: 'Welcome to Acme', variant: 'Double Your Revenue in 30 Days — or It\'s Free', why: 'Nutzenorientierte Headlines konvertieren bis zu 40% besser als willkommensorientierte.' },
  { element: 'CTA Button', original: 'Sign Up', variant: 'Start Free Trial — No Credit Card', why: 'Die Risikofreiheit-Botschaft senkt die Einstiegshürde. Kein "kostenlos" ohne Garantie.' },
  { element: 'Pricing Section', original: 'Monthly billing default', variant: 'Annual billing default + 20% savings badge', why: 'Jährliche Abrechnung verdreifacht den Customer Lifetime Value. Der Badge macht den Vorteil sichtbar.' },
  { element: 'Footer / Trust', original: 'No social proof present', variant: 'Customer logo bar: "Trusted by 2,000+ teams"', why: 'Social Proof ist der stärkste Vertrauenstreiber. Logos + Zahl schaffen Glaubwürdigkeit in Millisekunden.' },
]

const T = {
  bg1: '#0a0a0a',
  bg2: '#111111',
  text: '#ededed',
  ok: '#2fd76c',
  pro: '#f5a623',
  err: '#f5455c',
  accent: '#8b5cf6', // violett für AI
}

export function WhatToTestNext({ siteUrl, plan, setupComplete, domain }: Props) {
  const isPro = plan === 'pro' || plan === 'agency'

  // Nur anzeigen wenn Setup komplett ist
  if (!setupComplete) return null

  // Free Tier → geblurrter Teaser
  if (!isPro) {
    return <FreeTeaser domain={domain} />
  }

  // Ohne siteUrl können wir nicht analysieren
  if (!siteUrl) {
    return <NoUrlPrompt domain={domain} />
  }

  return <ProSuggestions siteUrl={siteUrl} domain={domain} />
}

/* ── Free Tier: Geblurrter Teaser ── */

function FreeTeaser({ domain }: { domain: string | null }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-[#f5a623]" />
        <h2 className="text-[13px] font-semibold text-[#ededed]">What to test next</h2>
        <span className="rounded-full border border-[#f5a623]/30 bg-[#f5a623]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#f5a623]">PRO</span>
      </div>

      {/* Geblurrter Inhalt */}
      <div className="relative overflow-hidden rounded-[10px] border border-white/10 bg-[#0a0a0a]">
        {/* Blur-Layer */}
        <div className="pointer-events-none select-none px-3.5 py-3 space-y-2.5 blur-[6px]">
          {TEASER_SUGGESTIONS.map((tip) => (
            <div key={tip.element} className="flex items-start gap-2 rounded-[6px] border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] leading-relaxed text-[#ededed]/70">
                  Test <span className="font-medium text-[#ededed]/90">"{tip.original}"</span> vs{' '}
                  <span className="font-medium text-[#a78bfa]">"{tip.variant}"</span>
                </p>
                <p className="mt-0.5 text-[10px] text-[#ededed]/50">{tip.why}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Paywall Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0a0a0a]/70 backdrop-blur-[2px]">
          <Lock className="h-5 w-5 text-[#f5a623]" />
          <p className="text-[12px] font-medium text-[#ededed]">Page-specific AI suggestions</p>
          <p className="max-w-[200px] text-center text-[11px] leading-relaxed text-[#ededed]/45">
            Our AI analyzes your page and suggests what to test next — specific to your site, not generic tips.
          </p>
          <Link
            href="/dashboard/billing"
            className="mt-1 inline-flex items-center gap-1.5 rounded-[6px] bg-[#f5a623] px-3 py-1.5 text-[11px] font-semibold text-black transition-opacity hover:opacity-85"
          >
            <Sparkles className="h-3 w-3" />
            Upgrade to Pro
          </Link>
        </div>
      </div>

      {/* Auto-optimize teaser */}
      {domain && (
        <div className="mt-3 flex items-center gap-2.5 rounded-[8px] border border-[#f5a623]/10 bg-[#f5a623]/[0.02] px-3 py-2.5">
          <Bot className="h-3.5 w-3.5 shrink-0 text-[#f5a623]/40" />
          <p className="flex-1 text-[11px] text-[#ededed]/40">Auto-optimize {domain.replace(/^https?:\/\//, '')} — creates tests in one click</p>
          <span className="shrink-0 rounded-full border border-[#f5a623]/20 px-1.5 py-0.5 text-[9px] font-semibold text-[#f5a623]/60">PRO</span>
        </div>
      )}
    </div>
  )
}

/* ── Keine URL vorhanden ── */

function NoUrlPrompt({ domain }: { domain: string | null }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-[#f5a623]" />
        <h2 className="text-[13px] font-semibold text-[#ededed]">What to test next</h2>
        <span className="rounded-full border border-[#f5a623]/30 bg-[#f5a623]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#f5a623]">PRO</span>
      </div>
      <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-4 text-center">
        <Globe className="mx-auto h-4 w-4 text-[#ededed]/50" />
        <p className="mt-2 text-[12px] text-[#ededed]/50">
          Add a website and create a test first — then AI can analyze your page for specific suggestions.
        </p>
      </div>
    </div>
  )
}

/* ── Pro: Echte AI-Suggestions ── */

type FetchState = 'idle' | 'loading' | 'done' | 'error'

function ProSuggestions({ siteUrl, domain }: { siteUrl: string; domain: string | null }) {
  const [state, setState] = useState<FetchState>('idle')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [error, setError] = useState('')

  const fetchSuggestions = useCallback(async () => {
    setState('loading')
    setError('')
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: siteUrl }),
      })

      if (res.status === 402) {
        setError('Pro plan required')
        setState('error')
        return
      }

      if (res.status === 429) {
        setError('Monthly AI budget reached. Resets on the 1st.')
        setState('error')
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to generate suggestions')
        setState('error')
        return
      }

      const data = await res.json()
      if (data.suggestions?.length > 0) {
        setSuggestions(data.suggestions)
        setState('done')
      } else {
        setError('No suggestions generated')
        setState('error')
      }
    } catch {
      setError('Connection failed. Check your internet.')
      setState('error')
    }
  }, [siteUrl])

  // Auto-fetch on mount
  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-[#a78bfa]" />
        <h2 className="text-[13px] font-semibold text-[#ededed]">What to test next</h2>
        <span className="rounded-full border border-[#8b5cf6]/30 bg-[#8b5cf6]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#a78bfa]">AI</span>
      </div>

      <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-3.5">
        {/* Loading */}
        {state === 'loading' && (
          <div className="flex flex-col items-center gap-2 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-[#a78bfa]" />
            <p className="text-[11px] text-[#ededed]/60">Analyzing {siteUrl.replace(/^https?:\/\//, '')}…</p>
          </div>
        )}

        {/* Done */}
        {state === 'done' && (
          <div className="space-y-2.5">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2 rounded-[6px] border border-[#8b5cf6]/10 bg-[#8b5cf6]/[0.03] px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[#a78bfa]">
                    {s.element}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#ededed]/80">
                    Test{' '}
                    <span className="font-medium text-[#ededed]/90 line-through decoration-[#f5455c]/40">"{s.original}"</span>
                    {' '}vs{' '}
                    <span className="font-medium text-[#2fd76c]">"{s.variant}"</span>
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-[#ededed]/50">{s.why}</p>
                </div>
              </div>
            ))}
            <button
              onClick={fetchSuggestions}
              className="flex w-full items-center justify-center gap-1.5 rounded-[6px] border border-white/[0.08] py-1.5 text-[11px] text-[#ededed]/60 transition-colors hover:border-white/[0.15] hover:text-[#ededed]/70 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              Regenerate
            </button>
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div className="flex flex-col items-center gap-2 py-3">
            <p className="text-[11px] text-[#f5455c]/70">{error}</p>
            <button
              onClick={fetchSuggestions}
              className="flex items-center gap-1.5 rounded-[6px] border border-white/[0.08] px-3 py-1.5 text-[11px] text-[#ededed]/60 transition-colors hover:border-white/[0.15] hover:text-[#ededed]/70 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Auto-optimize agent */}
      {domain && <MiniAgent domain={domain} />}
    </div>
  )
}

/* ── MiniAgent: Compact inline agent runner ── */

const TOOL_LABELS: Record<string, { icon: typeof Globe; running: string; done: string }> = {
  'tool-fetchSite': { icon: Globe, running: 'Loading page…', done: 'Page loaded' },
  'tool-analyzeCRO': { icon: Search, running: 'Analyzing CRO potential…', done: 'Analysis complete' },
  'tool-generateVariant': { icon: Wand2, running: 'Generating variant…', done: 'Variant generated' },
  'tool-createTest': { icon: FlaskConical, running: 'Creating test…', done: 'Test created' },
}

function MiniAgent({ domain }: { domain: string }) {
  const router = useRouter()
  const host = domain.replace(/^https?:\/\//, '')

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: '/api/agent' }),
  })

  const isRunning = status === 'submitted' || status === 'streaming'
  const hasRun = messages.length > 0
  const isDone = hasRun && status === 'ready'

  const prevStatus = useRef(status)
  useEffect(() => {
    if (prevStatus.current === 'streaming' && status === 'ready') router.refresh()
    prevStatus.current = status
  }, [status, router])

  const handleRun = () => {
    setMessages([])
    sendMessage(
      { text: `Analysiere ${domain} und erstelle A/B-Tests.` },
      { body: { domain, pageGoal: 'signups' } }
    )
  }

  return (
    <div className="mt-3 rounded-[8px] border border-[#8b5cf6]/10 bg-[#8b5cf6]/[0.02] p-3">
      <div className="flex items-center gap-2 mb-2">
        <Bot className="h-3.5 w-3.5 text-[#a78bfa]" />
        <p className="text-[11px] font-medium text-[#ededed]">Auto-optimize</p>
      </div>

      {!hasRun && !isRunning && (
        <div>
          <p className="text-[11px] leading-relaxed text-[#ededed]/45">
            One click. Agent scans {host}, finds optimizations, generates variants, creates tests.
          </p>
          <button
            onClick={handleRun}
            className="mt-2.5 inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] bg-[#7c3aed] px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-85"
          >
            <Sparkles className="h-3 w-3" />
            Optimize {host}
          </button>
        </div>
      )}

      {hasRun && (
        <div className="space-y-1.5">
          {messages
            .filter((m) => m.role === 'assistant')
            .map((m) => (
              <div key={m.id} className="space-y-1">
                {m.parts.map((part, i) => {
                  if (part.type === 'text' && part.text.trim()) {
                    return (
                      <p key={i} className="text-[11px] leading-relaxed text-[#ededed]/75">
                        {part.text}
                      </p>
                    )
                  }
                  const info = TOOL_LABELS[part.type]
                  if (info && 'state' in part) {
                    const state = part.state as string
                    const done = state === 'output-available'
                    const failed = state === 'output-error'
                    const Icon = info.icon
                    const label = done ? info.done : info.running
                    return (
                      <p
                        key={i}
                        className={`flex items-center gap-1.5 text-[10px] ${
                          done ? 'text-[#2fd76c]/70' : failed ? 'text-[#f5455c]/70' : 'text-[#a78bfa]/70'
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                        ) : failed ? (
                          <XCircle className="h-3 w-3 shrink-0" />
                        ) : (
                          <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                        )}
                        {label}
                      </p>
                    )
                  }
                  return null
                })}
              </div>
            ))}

          {isRunning && (
            <div className="flex items-center gap-2 py-1 text-[11px] text-[#a78bfa]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Working…
            </div>
          )}

          {error && (
            <p className="text-[11px] text-[#f5455c]/70 flex items-center gap-1.5">
              <XCircle className="h-3 w-3 shrink-0" />
              {error.message || 'Agent run failed'}
            </p>
          )}

          {(isDone || error) && (
            <button
              onClick={handleRun}
              className="mt-1 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[5px] border border-white/[0.08] py-1.5 text-[11px] text-[#ededed]/55 transition-colors hover:border-white/[0.15] hover:text-[#ededed]/70"
            >
              <RefreshCw className="h-3 w-3" />
              Run again
            </button>
          )}
        </div>
      )}
    </div>
  )
}
