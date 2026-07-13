'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Lightbulb, Sparkles, Globe, Lock, Loader2, RefreshCw } from 'lucide-react'

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

export function WhatToTestNext({ siteUrl, plan, setupComplete }: Props) {
  const isPro = plan === 'pro' || plan === 'agency'

  // Nur anzeigen wenn Setup komplett ist
  if (!setupComplete) return null

  // Free Tier → geblurrter Teaser
  if (!isPro) {
    return <FreeTeaser />
  }

  // Ohne siteUrl können wir nicht analysieren
  if (!siteUrl) {
    return <NoUrlPrompt />
  }

  return <ProSuggestions siteUrl={siteUrl} />
}

/* ── Free Tier: Geblurrter Teaser ── */

function FreeTeaser() {
  return (
    <div className="mb-3 mt-6">
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
                  <span className="font-medium text-[#8b5cf6]">"{tip.variant}"</span>
                </p>
                <p className="mt-0.5 text-[10px] text-[#ededed]/30">{tip.why}</p>
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
    </div>
  )
}

/* ── Keine URL vorhanden ── */

function NoUrlPrompt() {
  return (
    <div className="mb-3 mt-6">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-[#f5a623]" />
        <h2 className="text-[13px] font-semibold text-[#ededed]">What to test next</h2>
        <span className="rounded-full border border-[#f5a623]/30 bg-[#f5a623]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#f5a623]">PRO</span>
      </div>
      <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-4 text-center">
        <Globe className="mx-auto h-4 w-4 text-[#ededed]/30" />
        <p className="mt-2 text-[12px] text-[#ededed]/50">
          Add a website and create a test first — then AI can analyze your page for specific suggestions.
        </p>
      </div>
    </div>
  )
}

/* ── Pro: Echte AI-Suggestions ── */

type FetchState = 'idle' | 'loading' | 'done' | 'error'

function ProSuggestions({ siteUrl }: { siteUrl: string }) {
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
    <div className="mb-3 mt-6">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-[#8b5cf6]" />
        <h2 className="text-[13px] font-semibold text-[#ededed]">What to test next</h2>
        <span className="rounded-full border border-[#8b5cf6]/30 bg-[#8b5cf6]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#8b5cf6]">AI</span>
      </div>

      <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-3.5">
        {/* Loading */}
        {state === 'loading' && (
          <div className="flex flex-col items-center gap-2 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-[#8b5cf6]/60" />
            <p className="text-[11px] text-[#ededed]/40">Analyzing {siteUrl.replace(/^https?:\/\//, '')}…</p>
          </div>
        )}

        {/* Done */}
        {state === 'done' && (
          <div className="space-y-2.5">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2 rounded-[6px] border border-[#8b5cf6]/10 bg-[#8b5cf6]/[0.03] px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[#8b5cf6]/60">
                    {s.element}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#ededed]/80">
                    Test{' '}
                    <span className="font-medium text-[#ededed]/90 line-through decoration-[#f5455c]/40">"{s.original}"</span>
                    {' '}vs{' '}
                    <span className="font-medium text-[#2fd76c]">"{s.variant}"</span>
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-[#ededed]/35">{s.why}</p>
                </div>
              </div>
            ))}
            <button
              onClick={fetchSuggestions}
              className="flex w-full items-center justify-center gap-1.5 rounded-[6px] border border-white/[0.08] py-1.5 text-[11px] text-[#ededed]/40 transition-colors hover:border-white/[0.15] hover:text-[#ededed]/60 cursor-pointer"
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
              className="flex items-center gap-1.5 rounded-[6px] border border-white/[0.08] px-3 py-1.5 text-[11px] text-[#ededed]/50 transition-colors hover:border-white/[0.15] hover:text-[#ededed]/70 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
