'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { useTestsInsert } from '@/lib/useRealtime'
import { FlaskConical, Loader2, Check, Copy, Puzzle, Code, X, Bot, Sparkles, Palette } from 'lucide-react'

/* ── Token palette ── */
const T = {
  bg1: '#0a0a0a', bg2: '#111111', text: '#ededed',
  ok: '#2fd76c', pro: '#f5a623', err: '#f5455c',
}

type FlowState = 'choice' | 'idle' | 'awaiting_figma' | 'test_received' | 'timeout' | 'error' | 'plan_limit'

type NewTestFlowProps = {
  apiToken: string
  hasFigmaPlugin: boolean
  isAtFreeLimit: boolean
  onClose: () => void
}

export function NewTestFlow({ apiToken, hasFigmaPlugin, isAtFreeLimit, onClose }: NewTestFlowProps) {
  const router = useRouter()
  const [state, setState] = useState<FlowState>(
    isAtFreeLimit ? 'plan_limit' : hasFigmaPlugin ? 'awaiting_figma' : 'choice'
  )
  const [busy, setBusy] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [copied, setCopied] = useState(false)
  const [testName, setTestName] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const TIMEOUT_S = 120

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // User-ID für Realtime-Filter
  useEffect(() => {
    getBrowserSupabase().auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [])

  // Timer
  useEffect(() => {
    if (state !== 'awaiting_figma') return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [state])

  // Realtime: neuer Test via Figma-Plugin → sofort reagieren
  useTestsInsert(userId, (name) => {
    if (!mountedRef.current) return
    if (state === 'awaiting_figma') {
      setState('test_received')
      setTestName(name)
    }
  })

  // Timeout nach 120s
  useEffect(() => {
    if (state !== 'awaiting_figma') return
    const timeout = setTimeout(() => {
      if (mountedRef.current && state === 'awaiting_figma') setState('timeout')
    }, TIMEOUT_S * 1000)
    return () => clearTimeout(timeout)
  }, [state])

  function copyToken() {
    navigator.clipboard.writeText(apiToken).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function goToTest() {
    router.push('/dashboard?tab=tests&new=1')
    router.refresh()
    onClose()
  }

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`

  return (
    <div className="relative mb-4 overflow-hidden rounded-[12px] border border-white/10 bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-white">
            <FlaskConical className="h-4 w-4 text-black" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#ededed]">New test</p>
            <p className="text-[11px] text-[#ededed]/40">
              {state === 'choice' ? 'Choose your workflow' : 'via Figma plugin'}
            </p>
          </div>
        </div>
        <button onClick={onClose}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[6px] text-[#ededed]/40 transition-colors hover:bg-white/[0.04] hover:text-[#ededed]">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-4 py-4">
        {/* ── State: choice (pick Figma or Auto) ── */}
        {state === 'choice' && (
          <div className="space-y-4">
            <p className="text-[12px] leading-relaxed text-[#ededed]/50">
              How would you like to create your first test?
            </p>

            {/* Option 1: Figma */}
            <button
              onClick={() => setState('idle')}
              className="flex w-full cursor-pointer items-start gap-3 rounded-[8px] border border-white/10 bg-[#111111] px-4 py-3.5 text-left transition-colors hover:border-white/[0.18]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px]" style={{ background: `${T.pro}1a` }}>
                <Palette className="h-4.5 w-4.5" style={{ color: T.pro }} />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-[#ededed]">Start with Figma</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[#ededed]/45">
                  Design variants visually in Figma and sync them to variante. Best for designers who work in Figma daily.
                </p>
                <p className="mt-1.5 text-[10px] text-[#ededed]/30">
                  Requires Figma plugin installation
                </p>
              </div>
            </button>

            {/* Option 2: Auto-Optimize */}
            <button
              onClick={onClose}
              className="flex w-full cursor-pointer items-start gap-3 rounded-[8px] border border-white/10 bg-[#111111] px-4 py-3.5 text-left transition-colors hover:border-white/[0.18]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px]" style={{ background: '#7c3aed1a' }}>
                <Bot className="h-4.5 w-4.5 text-[#a78bfa]" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-[#ededed]">Start with Auto-Optimize</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[#ededed]/45">
                  Our AI scans your site, finds the top 3 optimizations, generates variants and creates A/B tests — in 30 seconds. No Figma needed.
                </p>
                <p className="mt-1.5 flex items-center gap-1 text-[10px] text-[#a78bfa]/80">
                  <Sparkles className="h-3 w-3" />
                  AI-powered — works with just ab.js
                </p>
              </div>
            </button>
          </div>
        )}

        {/* ── State: idle (no Figma detected) ── */}
        {state === 'idle' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-[8px] px-3 py-3"
              style={{ background: `${T.pro}0f`, border: `1px solid ${T.pro}33` }}>
              <Puzzle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: T.pro }} />
              <div>
                <p className="text-[12px] font-semibold text-[#ededed]">Figma plugin required</p>
                <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: `${T.pro}b3` }}>
                  Tests are created in the Figma plugin and synced to your dashboard.
                  Follow the steps below to connect and create your first test.
                </p>
              </div>
            </div>

            {/* Step-by-step */}
            <ol className="space-y-2.5">
              {[
                { step: '1', text: 'Copy your plugin token', el: (
                  <div className="mt-1.5 flex items-center gap-2">
                    <code className="flex-1 overflow-x-auto truncate rounded-[6px] border border-white/10 bg-black px-3 py-2 font-mono text-[13px] text-[#ededed]/62">
                      {apiToken}
                    </code>
                    <button onClick={copyToken}
                      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-white/10 bg-white/[0.05] text-[#ededed]/62 transition-colors hover:border-white/[0.18] hover:text-[#ededed]">
                      {copied ? <Check className="h-4 w-4" style={{ color: T.ok }} /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                )},
                { step: '2', text: 'Open the Variante Figma plugin and paste the token', el: (
                  <p className="mt-1 text-[11px] text-[#ededed]/40">
                    <a
                      href="https://www.figma.com/community/plugin/1653734891132085565"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline transition-colors hover:opacity-80"
                    >
                      Install from Figma Community
                    </a>
                  </p>
                ) },
                { step: '3', text: 'Select a frame, create a variant, and publish it', el: null },
              ].map((s) => (
                <li key={s.step} className="flex items-start gap-2.5 rounded-[6px] px-3 py-2.5" style={{ background: '#111111' }}>
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-black mt-px">
                    {s.step}
                  </span>
                  <div className="flex-1">
                    <p className="text-[12px] text-[#ededed]/62">{s.text}</p>
                    {s.el}
                  </div>
                </li>
              ))}
            </ol>

            <button onClick={() => setState('awaiting_figma')}
              className="w-full cursor-pointer rounded-[6px] bg-white py-2.5 text-[13px] font-semibold text-black transition-opacity hover:opacity-85">
              I&apos;m ready — start listening
            </button>

            <button onClick={() => setState('choice')}
              className="w-full cursor-pointer rounded-[6px] border border-white/10 py-2 text-[12px] font-semibold text-[#ededed]/62 transition-colors hover:border-white/[0.18] hover:text-[#ededed]">
              ← Back
            </button>
          </div>
        )}

        {/* ── State: awaiting_figma ── */}
        {state === 'awaiting_figma' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black">
                <Loader2 className="h-6 w-6 animate-spin text-[#ededed]/40" />
              </div>
              <p className="mt-4 text-[15px] font-semibold text-[#ededed]">Listening for new tests…</p>
              <p className="mt-1 text-[13px] text-[#ededed]/40">
                Create a test in the Figma plugin — it will appear here.
              </p>
              <div className="mt-3 flex items-center gap-3 text-[11px] text-[#ededed]/40">
                <div className="flex items-center gap-1.5">
                  <Puzzle className="h-3 w-3" /> Figma plugin
                </div>
                <span>·</span>
                <span>{timeStr} elapsed</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-[6px] px-3 py-2.5" style={{ background: '#111111' }}>
              <Code className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ededed]/40" />
              <div>
                <p className="text-[11px] font-semibold text-[#ededed]/62">What to do in Figma</p>
                <ol className="mt-1 space-y-1 text-[11px] text-[#ededed]/40">
                  <li>1. Open the Variante plugin in Figma</li>
                  <li>2. Select a frame to test</li>
                  <li>3. Create a variant and publish</li>
                </ol>
              </div>
            </div>

            <button onClick={() => setState('choice')}
              className="w-full cursor-pointer rounded-[6px] border border-white/10 py-2 text-[12px] font-semibold text-[#ededed]/62 transition-colors hover:border-white/[0.18] hover:text-[#ededed]">
              Cancel
            </button>
          </div>
        )}

        {/* ── State: test_received ── */}
        {state === 'test_received' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: `${T.ok}1f` }}>
                <Check className="h-6 w-6" style={{ color: T.ok }} />
              </div>
              <p className="mt-4 text-[15px] font-semibold text-[#ededed]">Test received!</p>
              <p className="mt-1 text-[13px] text-[#ededed]/62">&ldquo;{testName}&rdquo;</p>
              <p className="mt-0.5 text-[11px] text-[#ededed]/40">
                Your Figma test was synced successfully.
              </p>
            </div>

            <button onClick={goToTest}
              className="w-full cursor-pointer rounded-[6px] bg-white py-2.5 text-[13px] font-semibold text-black transition-opacity hover:opacity-85">
              View in Tests tab
            </button>
          </div>
        )}

        {/* ── State: timeout ── */}
        {state === 'timeout' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: `${T.pro}1f` }}>
                <X className="h-6 w-6" style={{ color: T.pro }} />
              </div>
              <p className="mt-4 text-[15px] font-semibold text-[#ededed]">Nothing received</p>
              <p className="mt-1 text-[13px] text-[#ededed]/40">
                No new test detected after {TIMEOUT_S} seconds.
              </p>
              <p className="mt-0.5 text-[11px] text-[#ededed]/40">
                Make sure the plugin token is pasted in the Figma plugin.
              </p>
            </div>

            <button onClick={() => { setState('awaiting_figma'); setElapsed(0) }}
              className="w-full cursor-pointer rounded-[6px] bg-white py-2.5 text-[13px] font-semibold text-black transition-opacity hover:opacity-85">
              Try again
            </button>
          </div>
        )}

        {/* ── State: plan_limit ── */}
        {state === 'plan_limit' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: `${T.pro}1f` }}>
                <FlaskConical className="h-6 w-6" style={{ color: T.pro }} />
              </div>
              <p className="mt-4 text-[15px] font-semibold text-[#ededed]">Free plan limit reached</p>
              <p className="mt-1 text-[13px] text-[#ededed]/40">
                The Free plan allows 1 active experiment. Upgrade to Pro for unlimited tests.
              </p>
            </div>

            <button
              onClick={async () => {
                setBusy(true)
                try {
                  const res = await fetch('/api/billing/checkout', { method: 'POST' })
                  const data = await res.json()
                  if (data.url) window.location.href = data.url
                } finally {
                  setBusy(false)
                }
              }}
              disabled={busy}
              className="w-full cursor-pointer rounded-[6px] bg-white py-2.5 text-[13px] font-semibold text-black transition-opacity hover:opacity-85 disabled:opacity-50"
            >
              {busy ? 'Redirecting…' : 'Upgrade to Pro'}
            </button>
            <button onClick={onClose}
              className="w-full cursor-pointer rounded-[6px] border border-white/10 py-2 text-[12px] font-semibold text-[#ededed]/62 transition-colors hover:border-white/[0.18] hover:text-[#ededed]">
              Close
            </button>
          </div>
        )}

        {/* ── State: error ── */}
        {state === 'error' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: `${T.err}1f` }}>
                <X className="h-6 w-6" style={{ color: T.err }} />
              </div>
              <p className="mt-4 text-[15px] font-semibold text-[#ededed]">Something went wrong</p>
              <p className="mt-1 text-[13px] text-[#ededed]/40">
                Could not connect to the server. Check your connection.
              </p>
            </div>

            <button onClick={() => { setState('awaiting_figma'); setElapsed(0) }}
              className="w-full cursor-pointer rounded-[6px] bg-white py-2.5 text-[13px] font-semibold text-black transition-opacity hover:opacity-85">
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
