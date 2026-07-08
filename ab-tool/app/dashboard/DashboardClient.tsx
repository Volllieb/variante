'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { calcSignificance } from '@/lib/significance'
import { NewTestFlow } from './NewTestFlow'
import { TestCard, StatusDot, type TestRow } from './components/TestCard'
import {
  Copy,
  Check,
  ChevronDown,
  FlaskConical,
  Users,
  TrendingUp,
  Zap,
  Shield,
  Puzzle,
  ExternalLink,
  Plus,
  ArrowRight,
  Circle,
  CircleCheck,
  Code2,
  BarChart3,
} from 'lucide-react'

/* ── Token palette (brandguidelines.md §2) ── */
const T = {
  bg1: '#0a0a0a',
  bg2: '#111111',
  text: '#ededed',
  ok: '#2fd76c',
  pro: '#f5a623',
  err: '#f5455c',
}

const SNIPPET_CODE = `<!-- A/B Testing: universal snippet — paste in <head> on EVERY page -->
<link rel="preconnect" href="https://www.getvariante.com">
<style id="__ab_hide">html.__ab_pending{opacity:0!important}</style>
<script>document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)<\/script>
<script async src="https://www.getvariante.com/ab.js" integrity="sha384-IRhfYvegwpNV4YFObew04X1nQgyv7Mty9M5VWzJoOFry54oKIx4qIJg7lN1igh/T" crossorigin="anonymous"><\/script>`

export function DashboardClient({
  plan,
  apiToken,
  tests,
  hasFigmaPlugin,
  highlightNew,
  upgraded,
}: {
  plan: string
  apiToken: string
  tests: TestRow[]
  hasFigmaPlugin: boolean
  highlightNew?: boolean
  upgraded?: boolean
}) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [snippetCopied, setSnippetCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [snippetOpen, setSnippetOpen] = useState(false)
  const [newTestOpen, setNewTestOpen] = useState(false)
  const [testList, setTestList] = useState(tests)
  const isPro = plan === 'pro' || plan === 'agency'

  // Sync when server re-renders with fresh data
  useEffect(() => { setTestList(tests) }, [tests])

  function handleDeleteTest(id: string) {
    setTestList((prev) => prev.filter((t) => t.id !== id))
  }

  // Multi-Tab-Sync: Logout in Tab B → Tab A redirectet auf Landingpage
  useEffect(() => {
    const supabase = getBrowserSupabase()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/')
        router.refresh()
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  async function billing(path: 'checkout' | 'portal') {
    setBusy(true)
    try {
      const res = await fetch(`/api/billing/${path}`, { method: 'POST' })
      if (res.status === 401) {
        router.push('/login')
        return
      }
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error || 'Error')
    } catch {
      alert('Connection failed. Check your internet and try again.')
    } finally {
      setBusy(false)
    }
  }

  function copyToken() {
    navigator.clipboard.writeText(apiToken).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function copySnippet() {
    navigator.clipboard.writeText(SNIPPET_CODE).then(() => {
      setSnippetCopied(true)
      setTimeout(() => setSnippetCopied(false), 2000)
    })
  }

  // Setup-Checkliste: lokale Schritt-Verfolgung
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set())
  function toggleStep(n: number) { setDoneSteps((s) => { const ns = new Set(s); if (ns.has(n)) ns.delete(n); else ns.add(n); return ns }) }

  function handleSetupStep(step: 1 | 2 | 3) {
    if (step === 1) {
      setSnippetOpen(true)
      setTimeout(() => document.getElementById('snippet')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } else if (step === 2) {
      document.getElementById('plugin-token')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      setNewTestOpen(true)
    }
    toggleStep(step)
  }

  /* ── Aggregate stats ── */
  const totalVisitors = testList.reduce((s, t) => s + (t.visitors_a ?? 0) + (t.visitors_b ?? 0), 0)
  const totalConversions = testList.reduce((s, t) => s + (t.conversions_a ?? 0) + (t.conversions_b ?? 0), 0)
  const running = testList.filter((t) => t.status === 'active').length
  const lifts = testList
    .map((t) => {
      const crA = (t.visitors_a ?? 0) > 0 ? (t.conversions_a ?? 0) / (t.visitors_a ?? 0) : 0
      const crB = (t.visitors_b ?? 0) > 0 ? (t.conversions_b ?? 0) / (t.visitors_b ?? 0) : 0
      return crA > 0 ? (crB - crA) / crA : null
    })
    .filter((l): l is number => l !== null && isFinite(l))
  const avgLift = lifts.length > 0 ? lifts.reduce((s, l) => s + l, 0) / lifts.length : null

  // Winner alert (Pro only, active tests with a winner)
  const winnerTest = isPro ? testList.find((t) => t.winner && t.status !== 'done') : null

  // CRO-Snapshot
  const overallCR = totalVisitors > 0 ? (totalConversions / totalVisitors) * 100 : 0
  const positiveLifts = lifts.filter((l) => l > 0).length
  const top3 = useMemo(
    () => [...testList].sort((a, b) => ((b.visitors_a ?? 0) + (b.visitors_b ?? 0)) - ((a.visitors_a ?? 0) + (a.visitors_b ?? 0))).slice(0, 3),
    [testList]
  )

  return (
    <>
      <main className="min-w-0 flex-1 px-5 py-6 sm:px-8">
        <div className="space-y-6">
          {/* Upgraded banner — shown after successful Stripe checkout */}
          {upgraded && (
            <div className="flex items-center gap-3 rounded-[10px] border border-[#2fd76c]/20 bg-[#2fd76c]/5 px-5 py-3.5">
              <Check className="h-4 w-4 shrink-0 text-[#2fd76c]" />
              <p className="text-[13px] text-[#2fd76c]">
                You&apos;re now on <strong className="font-semibold">Pro</strong> — unlimited experiments, full statistics, no badge.
              </p>
            </div>
          )}

          {/* Stats bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
                label="Active tests"
                value={isPro ? `${running}` : `${running} / 1`}
                sub={!isPro && running >= 1 ? 'Upgrade for more' : undefined}
                icon={FlaskConical}
                tone={!isPro && running >= 1 ? 'pro' : 'ok'}
              />
              <StatCard label="Total visitors" value={totalVisitors.toLocaleString()} icon={Users} />
              <StatCard label="Conversions" value={totalConversions.toLocaleString()} icon={Zap} />
              <StatCard
                label="Plan"
                value={isPro ? 'Pro' : 'Free'}
                sub={!isPro ? 'Upgrade →' : undefined}
                icon={TrendingUp}
                tone={isPro ? 'ok' : 'pro'}
                onClick={!isPro ? () => billing('checkout') : undefined}
                clickable={!isPro}
              />
            </div>

            {/* CRO-Snapshot + Winner alert */}
            {testList.length > 0 && (
              <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-4">
                <div className="flex items-center gap-3 mb-3">
                  <BarChart3 className="h-3.5 w-3.5 text-[#ededed]/40" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">CRO Snapshot</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-2xl font-bold text-[#ededed]">{overallCR.toFixed(1)}%</p>
                    <p className="mt-0.5 text-[10px] text-[#ededed]/40">Overall CR</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#ededed]">{running}</p>
                    <p className="mt-0.5 text-[10px] text-[#ededed]/40">Running</p>
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${positiveLifts > 0 ? 'text-ok' : 'text-[#ededed]'}`}>{positiveLifts}</p>
                    <p className="mt-0.5 text-[10px] text-[#ededed]/40">Tests ahead</p>
                  </div>
                </div>
                {winnerTest && (
                  <Link
                    href={`/dashboard/results/${winnerTest.id}`}
                    className="mt-3 flex items-center gap-2.5 rounded-[6px] border border-ok/20 bg-ok-bg px-3 py-2 transition-colors hover:border-ok/30"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: T.ok }} />
                    <span className="flex-1 truncate text-[12px] text-ok">{winnerTest.name}: B leads — View →</span>
                  </Link>
                )}
                {isPro && !winnerTest && (
                  <p className="mt-3 text-[11px] text-[#ededed]/40">
                    <span className="inline-block h-1.5 w-1.5 rounded-full mr-1.5" style={{ background: T.ok }} />
                    Significance monitoring active — winners auto-detected.
                  </p>
                )}
                {!isPro && (
                  <button
                    onClick={() => billing('checkout')}
                    disabled={busy}
                    className="mt-3 cursor-pointer rounded-[6px] border border-white/[0.18] px-3 py-1.5 text-[11px] font-semibold text-[#ededed] transition-colors hover:border-white/25 disabled:opacity-50"
                  >
                    Upgrade to see significance →
                  </button>
                )}
              </div>
            )}

            {/* Overview info table — compact summary of all tests */}
            {testList.length > 0 && (
              <OverviewTable tests={testList} />
            )}

            {/* Test grid — empty state (setup checklist) or top 3 cards */}
            {testList.length === 0 ? (
              <SetupChecklist doneSteps={doneSteps} onStep={handleSetupStep} />
            ) : (
              <div>
                {/* Toolbar: New test + View all */}
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">
                    Top Tests
                  </span>
                  <div className="flex-1" />
                  <Link
                    href="/dashboard/tests"
                    className="flex items-center gap-1 text-[11px] font-medium text-[#ededed]/40 transition-colors hover:text-[#ededed]"
                  >
                    View all {testList.length} tests
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                  <button
                    onClick={() => setNewTestOpen(true)}
                    className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[6px] bg-white px-3 py-1.5 text-[11px] font-semibold text-black transition-opacity hover:opacity-85"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New test
                  </button>
                </div>

                {/* New test flow overlay */}
                {newTestOpen && (
                  <NewTestFlow
                    apiToken={apiToken}
                    currentTestCount={testList.length}
                    hasFigmaPlugin={hasFigmaPlugin}
                    isAtFreeLimit={!isPro && testList.filter(t => t.status !== 'done').length >= 1}
                    onClose={() => setNewTestOpen(false)}
                  />
                )}

                {/* Top 3 grid */}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {top3.map((t, i) => (
                    <TestCard key={t.id} t={t} highlight={highlightNew && i === 0} onDelete={handleDeleteTest} />
                  ))}
                </div>
              </div>
            )}
        </div>

        {/* ═══ Scroll sections ═══ */}
        <div className="mt-10 flex flex-col gap-5 border-t border-white/10 pt-8">
          {/* Plugin token + Extension side by side */}
          <div id="plugin-token" className="grid scroll-mt-24 gap-5 sm:grid-cols-2">
            <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-3.5">
              <p className="text-[13px] font-medium text-[#ededed]">Plugin token</p>
              <p className="mt-1 text-[11px] text-[#ededed]/40">
                Paste once into the Figma plugin to link your tests — this is where new tests are created.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 overflow-x-auto truncate rounded-[6px] border border-white/10 bg-black px-3 py-2.5 font-mono text-[13px] text-[#ededed]/62">
                  {apiToken}
                </code>
                <button
                  onClick={copyToken}
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-white/10 bg-white/[0.05] text-[#ededed]/62 transition-colors hover:border-white/[0.18] hover:text-[#ededed]"
                >
                  {copied ? <Check className="h-4 w-4" style={{ color: T.ok }} /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-3.5">
              <p className="text-[13px] font-medium text-[#ededed]">Browser Extension</p>
              <p className="mt-1 text-[11px] text-[#ededed]/40">
                Pick elements directly on your live site. Install once from the Chrome Web Store — the picker runs
                locally.
              </p>
              <a
                href="https://chromewebstore.google.com/detail/variante-—-ab-test-elemen/hopbdjfpmknemchgoonjommfemgihkbh"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-[6px] bg-white px-4 py-2 text-[11px] font-semibold text-black transition-colors hover:bg-white/90"
              >
                <Puzzle className="h-3.5 w-3.5" />
                Install from Chrome Web Store
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </div>
          </div>

          {/* Snippet */}
          <div id="snippet" className="scroll-mt-24 overflow-hidden rounded-[10px] border border-white/10 bg-[#0a0a0a]">
            <button
              onClick={() => setSnippetOpen((o) => !o)}
              className="flex w-full cursor-pointer items-center justify-between px-3.5 py-3 text-left transition-colors hover:bg-white/[0.02]"
            >
              <div>
                <p className="text-[13px] font-medium text-[#ededed]">Snippet installation</p>
                <p className="mt-0.5 text-[11px] text-[#ededed]/40">
                  Paste one block into your site&apos;s{' '}
                  <code className="rounded-[5px] bg-white/[0.08] px-1.5 py-0.5 font-mono text-[11px] text-[#ededed]/62">
                    &lt;head&gt;
                  </code>{' '}
                  — universal, framework-agnostic
                </p>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[#ededed]/40 transition-transform ${snippetOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {snippetOpen && (
              <div className="space-y-4 border-t border-white/10 px-3.5 pb-4 pt-3.5">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#ededed]/62">Universal snippet</span>
                    <button
                      onClick={copySnippet}
                      className="flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-[#ededed]/62 transition-colors hover:border-white/[0.18] hover:text-[#ededed]"
                    >
                      {snippetCopied ? <Check className="h-3.5 w-3.5" style={{ color: T.ok }} /> : <Copy className="h-3.5 w-3.5" />}
                      {snippetCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <pre className="overflow-x-auto rounded-[6px] bg-black px-4 py-4 text-[11px] leading-relaxed text-[#ededed]/62 ring-1 ring-white/10">
{SNIPPET_CODE}
                  </pre>
                </div>

                {[
                  {
                    label: 'Next.js App Router',
                    file: 'app/layout.tsx',
                    code: `// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://www.getvariante.com" />
        <style id="__ab_hide">{\`html.__ab_pending{opacity:0!important}\`}</style>
        <script dangerouslySetInnerHTML={{
          __html: \`document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)\`
        }} />
        <script async src="https://www.getvariante.com/ab.js" integrity="sha384-IRhfYvegwpNV4YFObew04X1nQgyv7Mty9M5VWzJoOFry54oKIx4qIJg7lN1igh/T" crossorigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  )
}`,
                  },
                  {
                    label: 'Next.js Pages Router',
                    file: 'pages/_document.tsx',
                    code: `// pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        <link rel="preconnect" href="https://www.getvariante.com" />
        <style id="__ab_hide">{\`html.__ab_pending{opacity:0!important}\`}</style>
        <script dangerouslySetInnerHTML={{
          __html: \`document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)\`
        }} />
        <script async src="https://www.getvariante.com/ab.js" integrity="sha384-IRhfYvegwpNV4YFObew04X1nQgyv7Mty9M5VWzJoOFry54oKIx4qIJg7lN1igh/T" crossorigin="anonymous" />
      </Head>
      <body><Main /><NextScript /></body>
    </Html>
  )
}`,
                  },
                  {
                    label: 'Plain HTML',
                    file: '<head>',
                    code: `<!DOCTYPE html>
<html>
<head>
  <link rel="preconnect" href="https://www.getvariante.com">
  <style id="__ab_hide">html.__ab_pending{opacity:0!important}</style>
  <script>document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)<\/script>
  <script async src="https://www.getvariante.com/ab.js" integrity="sha384-IRhfYvegwpNV4YFObew04X1nQgyv7Mty9M5VWzJoOFry54oKIx4qIJg7lN1igh/T" crossorigin="anonymous"><\/script>
</head>
<body><!-- your content --></body>
</html>`,
                  },
                ].map(({ label, file, code }) => (
                  <details key={label} className="group rounded-[6px] border border-white/10 [&_summary]:list-none">
                    <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 text-[11px] font-semibold text-[#ededed]/62 transition-colors hover:text-[#ededed]">
                      <span>{label}</span>
                      <span className="flex items-center gap-2">
                        <code className="rounded-[5px] bg-white/[0.07] px-2 py-0.5 font-mono text-[11px] text-[#ededed]/40">
                          {file}
                        </code>
                        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                      </span>
                    </summary>
                    <pre className="overflow-x-auto border-t border-white/10 px-4 py-4 text-[11px] leading-relaxed text-[#ededed]/62">
{code}
                    </pre>
                  </details>
                ))}

                <details className="group rounded-[6px] border border-white/10 [&_summary]:list-none">
                  <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 text-[11px] font-semibold text-[#ededed]/62 transition-colors hover:text-[#ededed]">
                    <span>Vue · Svelte · Astro · others</span>
                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="border-t border-white/10 px-4 py-4 text-[11px] leading-relaxed text-[#ededed]/40">
                    Inject the three lines into the{' '}
                    <code className="rounded-[5px] bg-white/[0.07] px-1.5 py-0.5 font-mono text-[11px] text-[#ededed]/62">
                      &lt;head&gt;
                    </code>{' '}
                    of your root layout or template. The snippet is framework-agnostic. Make sure the anti-flicker{' '}
                    <code className="rounded-[5px] bg-white/[0.07] px-1.5 py-0.5 font-mono text-[11px] text-[#ededed]/62">
                      &lt;style&gt;
                    </code>{' '}
                    and inline{' '}
                    <code className="rounded-[5px] bg-white/[0.07] px-1.5 py-0.5 font-mono text-[11px] text-[#ededed]/62">
                      &lt;script&gt;
                    </code>{' '}
                    come{' '}
                    <strong className="font-semibold text-[#ededed]/62">before</strong> the async{' '}
                    <code className="rounded-[5px] bg-white/[0.07] px-1.5 py-0.5 font-mono text-[11px] text-[#ededed]/62">
                      ab.js
                    </code>{' '}
                    tag.
                  </p>
                </details>

                <div
                  className="flex items-start gap-3 rounded-[6px] px-4 py-3.5"
                  style={{ background: `${T.pro}0f`, border: `1px solid ${T.pro}33` }}
                >
                  <Shield className="mt-0.5 h-4 w-4 shrink-0" style={{ color: T.pro }} />
                  <p className="text-[11px] leading-relaxed" style={{ color: `${T.pro}b3` }}>
                    <strong className="font-semibold">Privacy:</strong> ab.js stores a random visitor ID in{' '}
                    <code className="rounded-[5px] px-1 font-mono text-[11px]" style={{ background: `${T.pro}1a` }}>
                      localStorage
                    </code>{' '}
                    (no cookies). No personal data is collected or transmitted.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </>
  )
}

/* ── Sub-components ── */

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  onClick,
  clickable,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ComponentType<{ className?: string }>
  tone?: 'ok' | 'pro'
  onClick?: () => void
  clickable?: boolean
}) {
  const color = tone === 'ok' ? T.ok : tone === 'pro' ? T.pro : undefined
  return (
    <div
      onClick={onClick}
      className={`rounded-[10px] border border-white/10 bg-[#0a0a0a] p-3.5 ${clickable ? 'cursor-pointer transition-colors hover:border-white/[0.18]' : ''}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-[#ededed]/40" />
        <span className="text-[11px] text-[#ededed]/40">{label}</span>
      </div>
      <p className="text-[22px] font-medium text-[#ededed]" style={color ? { color } : undefined}>
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-[11px]" style={{ color: color ?? `${T.text}40` }}>
          {sub}
        </p>
      )}
    </div>
  )
}

function OverviewTable({ tests }: { tests: TestRow[] }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-white/10 bg-[#0a0a0a]">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
        <BarChart3 className="h-3.5 w-3.5 text-[#ededed]/40" />
        <span className="text-[13px] font-medium text-[#ededed]">Tests overview</span>
        <span className="ml-auto text-[11px] text-[#ededed]/40">{tests.length} total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.06] text-[11px] text-[#ededed]/40">
              <th className="py-2 pl-4 pr-3 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium text-right">Visitors</th>
              <th className="px-3 py-2 font-medium text-right">Conv.</th>
              <th className="px-3 py-2 font-medium text-right">Sig.</th>
              <th className="px-3 py-2 font-medium text-right">Lift</th>
              <th className="py-2 pl-3 pr-4 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {tests.map((t) => {
              const va = t.visitors_a ?? 0
              const vb = t.visitors_b ?? 0
              const ca = t.conversions_a ?? 0
              const cb = t.conversions_b ?? 0
              const totalV = va + vb
              const totalC = ca + cb
              const crA = va > 0 ? ca / va : 0
              const crB = vb > 0 ? cb / vb : 0
              const uplift = crA > 0 ? ((crB - crA) / crA) * 100 : null
              const sig = totalV > 0 ? calcSignificance(va, ca, vb, cb) : 0
              const sigPct = Math.round(sig * 100)

              // Use dynamic import - already available in scope
              return (
                <tr key={t.id} className="text-[12px] transition-colors hover:bg-white/[0.02]">
                  <td className="py-2.5 pl-4 pr-3">
                    <div className="max-w-[180px] truncate font-medium text-[#ededed]">{t.name}</div>
                    {t.site_url && (
                      <div className="mt-0.5 max-w-[180px] truncate text-[11px] text-[#ededed]/40">{t.site_url}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <StatusDot status={t.status} winner={t.winner} />
                      <span className="text-[#ededed]/62">
                        {t.winner === 'B' ? 'B won' : t.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[#ededed]/62">{totalV.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[#ededed]/62">{totalC.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    <span
                      className="font-semibold"
                      style={{ color: sig >= 0.95 ? T.ok : sig >= 0.7 ? T.pro : `${T.text}62` }}
                    >
                      {totalV > 0 ? `${sigPct}%` : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {uplift !== null && uplift !== 0 ? (
                      <span
                        className="font-semibold"
                        style={{ color: uplift > 0 ? T.ok : T.err }}
                      >
                        {uplift > 0 ? '+' : ''}{uplift.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-[#ededed]/40">—</span>
                    )}
                  </td>
                  <td className="py-2.5 pl-3 pr-4 text-right">
                    <Link
                      href={`/dashboard/results/${t.id}`}
                      className="text-[11px] font-medium text-[#ededed]/40 transition-colors hover:text-[#ededed]"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Setup-Checkliste (0-Test Empty State) ── */

/* ── Setup-Checkliste (0-Test Empty State) ── */

const SETUP_STEPS = [
  {
    n: 1,
    title: 'Install the snippet',
    desc: 'Paste one line into your site\'s <head> — universal, no framework lock-in.',
    action: 'Copy & install snippet',
    icon: Code2,
    target: '#snippet',
  },
  {
    n: 2,
    title: 'Connect Figma',
    desc: 'Install the Chrome extension and paste your token into the Figma plugin.',
    action: 'Copy token & open extension',
    icon: Puzzle,
    target: '#plugin-token',
  },
  {
    n: 3,
    title: 'Create your first test',
    desc: 'Select an element in Figma, describe your variant, and push it to your dashboard.',
    action: 'Start first test',
    icon: FlaskConical,
    target: null,
  },
] as const

function SetupChecklist({
  doneSteps,
  onStep,
}: {
  doneSteps: Set<number>
  onStep: (step: 1 | 2 | 3) => void
}) {
  return (
    <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]"
          style={{ background: `${T.ok}1f` }}
        >
          <FlaskConical className="h-4 w-4" style={{ color: T.ok }} />
        </span>
        <div>
          <p className="text-[13px] font-semibold text-[#ededed]">Get started in 3 steps</p>
          <p className="text-[11px] text-[#ededed]/40">
            {doneSteps.size === 3
              ? 'All done — your first test is live!'
              : `${3 - doneSteps.size} step${doneSteps.size === 2 ? '' : 's'} remaining`}
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="divide-y divide-white/[0.06]">
        {SETUP_STEPS.map((s) => {
          const done = doneSteps.has(s.n)
          const Icon = s.icon
          return (
            <div
              key={s.n}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]"
            >
              {/* Step number / check */}
              <button
                onClick={() => onStep(s.n as 1 | 2 | 3)}
                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors"
                style={{
                  background: done ? `${T.ok}1f` : '#111111',
                  border: done ? `1px solid ${T.ok}33` : '1px solid rgba(255,255,255,.10)',
                }}
              >
                {done ? (
                  <CircleCheck className="h-4 w-4" style={{ color: T.ok }} />
                ) : (
                  <Circle className="h-4 w-4 text-[#ededed]/25" />
                )}
              </button>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[13px] font-medium transition-colors"
                  style={{ color: done ? `${T.text}62` : T.text }}
                >
                  {s.title}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[#ededed]/40">{s.desc}</p>
              </div>

              {/* Action */}
              <button
                onClick={() => onStep(s.n as 1 | 2 | 3)}
                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
                style={{
                  background: done ? 'transparent' : '#ffffff',
                  color: done ? `${T.text}40` : '#000000',
                  border: done ? '1px solid rgba(255,255,255,.10)' : '1px solid transparent',
                }}
              >
                {done ? 'Done' : s.action}
                {!done && <ArrowRight className="h-3 w-3" />}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
