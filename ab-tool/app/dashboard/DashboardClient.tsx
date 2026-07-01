'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { PandaLogo } from '@/components/PandaLogo'
import {
  Copy,
  Check,
  ChevronDown,
  LogOut,
  Zap,
  FlaskConical,
  Users,
  TrendingUp,
  ArrowRight,
  Shield,
} from 'lucide-react'

type TestRow = {
  id: string
  name: string
  site_url: string | null
  status: string
  visitors_a: number
  visitors_b: number
  conversions_a: number
  conversions_b: number
  winner: string | null
}

const SNIPPET_CODE = `<!-- A/B Testing: universal snippet — paste in <head> on EVERY page -->
<link rel="preconnect" href="https://www.getvariante.com">
<style id="__ab_hide">html.__ab_pending{opacity:0!important}</style>
<script>document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)<\/script>
<script async src="https://www.getvariante.com/ab.js"><\/script>`

export function DashboardClient({
  email,
  plan,
  apiToken,
  tests,
}: {
  email: string
  plan: string
  apiToken: string
  tests: TestRow[]
}) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [snippetCopied, setSnippetCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [snippetOpen, setSnippetOpen] = useState(false)
  const isPro = plan === 'pro' || plan === 'agency'

  async function logout() {
    await getBrowserSupabase().auth.signOut()
    router.push('/login')
    router.refresh()
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

  async function billing(path: 'checkout' | 'portal') {
    setBusy(true)
    try {
      const res = await fetch(`/api/billing/${path}`, { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error || 'Error')
    } finally {
      setBusy(false)
    }
  }

  /* ── Aggregate stats ── */
  const totalVisitors = tests.reduce((s, t) => s + (t.visitors_a ?? 0) + (t.visitors_b ?? 0), 0)
  const totalConversions = tests.reduce((s, t) => s + (t.conversions_a ?? 0) + (t.conversions_b ?? 0), 0)
  const running = tests.filter(t => t.status === 'active').length
  const lifts = tests
    .map(t => {
      const crA = (t.visitors_a ?? 0) > 0 ? (t.conversions_a ?? 0) / (t.visitors_a ?? 0) : 0
      const crB = (t.visitors_b ?? 0) > 0 ? (t.conversions_b ?? 0) / (t.visitors_b ?? 0) : 0
      return crA > 0 ? (crB - crA) / crA : null
    })
    .filter((l): l is number => l !== null && isFinite(l))
  const avgLift = lifts.length > 0 ? lifts.reduce((s, l) => s + l, 0) / lifts.length : null

  return (
    <div className="relative min-h-screen bg-[#06050f] font-[family-name:var(--font-sans)] text-white/80 antialiased">
      {/* Aurora */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-32 top-0 h-[32rem] w-[32rem] rounded-full bg-violet-700/15 blur-[130px]" />
        <div className="absolute -right-20 bottom-0 h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/10 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.28) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="relative z-10">
        {/* ── Top bar ── */}
        <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#06050f]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
            <Link
              href="/"
              className="flex items-center gap-2 font-[family-name:var(--font-display)] text-[1rem] font-bold text-white transition-opacity hover:opacity-75"
            >
              <PandaLogo className="h-7 w-7 rounded-lg p-1 shadow-md shadow-fuchsia-500/25" />
              variante
            </Link>

            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-white/45 sm:block">{email}</span>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  isPro
                    ? 'bg-fuchsia-500/15 text-fuchsia-300'
                    : 'bg-white/[0.07] text-white/50'
                }`}
              >
                {plan}
              </span>
              <button
                onClick={logout}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50 transition-all duration-200 hover:border-white/20 hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" />
                Log out
              </button>
            </div>
          </div>
        </header>

        {/* ── Main content ── */}
        <main className="mx-auto max-w-5xl px-6 py-10 space-y-6">

          {/* Page title */}
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-white">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-white/40">{email}</p>
          </div>

          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              icon={FlaskConical}
              value={tests.length}
              label="Experiments"
              accent={tests.length > 0 ? 'violet' : 'default'}
            />
            <StatCard
              icon={Zap}
              value={running}
              label="Running"
              accent={running > 0 ? 'emerald' : 'default'}
            />
            <StatCard
              icon={Users}
              value={totalVisitors.toLocaleString()}
              label="Total visitors"
              accent="default"
            />
            <StatCard
              icon={TrendingUp}
              value={avgLift !== null ? `${avgLift > 0 ? '+' : ''}${(avgLift * 100).toFixed(1)}%` : '—'}
              label="Avg lift"
              accent={avgLift !== null && avgLift > 0 ? 'emerald' : avgLift !== null && avgLift < 0 ? 'rose' : 'default'}
            />
          </div>

          {/* ── Plan + Token row ── */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Plan card */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-md">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">
                    Current plan
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold text-white uppercase">
                    {plan}
                  </p>
                  <p className="mt-1.5 text-xs text-white/45">
                    {isPro
                      ? 'Unlimited experiments, full statistics, no badge.'
                      : '1 active experiment · "Powered by Variante" badge.'}
                  </p>
                </div>
                {isPro ? (
                  <button
                    onClick={() => billing('portal')}
                    disabled={busy}
                    className="shrink-0 cursor-pointer rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 transition-all duration-200 hover:border-white/30 hover:text-white disabled:opacity-50"
                  >
                    Manage
                  </button>
                ) : (
                  <button
                    onClick={() => billing('checkout')}
                    disabled={busy}
                    className="group shrink-0 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-fuchsia-500/25 transition-all duration-200 hover:scale-[1.03] disabled:opacity-50"
                  >
                    Upgrade to Pro
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Plugin Token card */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-md">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">
                Plugin token
              </p>
              <p className="mt-1 text-xs text-white/45">
                Paste once into the Figma plugin to link your tests.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <code className="flex-1 overflow-x-auto truncate rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5 font-mono text-xs text-emerald-300">
                  {apiToken}
                </code>
                <button
                  onClick={copyToken}
                  className="flex cursor-pointer shrink-0 h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white/60 transition-all duration-200 hover:border-fuchsia-400/30 hover:bg-fuchsia-500/10 hover:text-fuchsia-300"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* ── Snippet installation card ── */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-md overflow-hidden">
            <button
              onClick={() => setSnippetOpen(o => !o)}
              className="flex w-full cursor-pointer items-center justify-between px-6 py-5 text-left transition-colors duration-200 hover:bg-white/[0.02]"
            >
              <div>
                <p className="text-sm font-semibold text-white">Snippet installation</p>
                <p className="mt-0.5 text-xs text-white/40">
                  Paste one block into your site&apos;s{' '}
                  <code className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-fuchsia-200">&lt;head&gt;</code>
                  {' '}— universal, framework-agnostic
                </p>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-white/40 transition-transform duration-200 ${snippetOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {snippetOpen && (
              <div className="border-t border-white/[0.07] px-6 pb-6 pt-5 space-y-5">
                {/* Main snippet */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white/60">Universal snippet</span>
                    <button
                      onClick={copySnippet}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/60 transition-all duration-200 hover:border-fuchsia-400/30 hover:text-fuchsia-300"
                    >
                      {snippetCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {snippetCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <pre className="overflow-x-auto rounded-xl bg-black/40 px-4 py-4 text-[11px] leading-relaxed text-emerald-300 ring-1 ring-white/[0.06]">
{SNIPPET_CODE}
                  </pre>
                </div>

                {/* Framework accordions */}
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
        <script async src="https://www.getvariante.com/ab.js" />
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
        <script async src="https://www.getvariante.com/ab.js" />
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
  <script async src="https://www.getvariante.com/ab.js"><\/script>
</head>
<body><!-- your content --></body>
</html>`,
                  },
                ].map(({ label, file, code }) => (
                  <details key={label} className="group rounded-xl border border-white/[0.07] [&_summary]:list-none">
                    <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 text-xs font-semibold text-white/60 transition-colors hover:text-white/80">
                      <span>{label}</span>
                      <span className="flex items-center gap-2">
                        <code className="rounded bg-white/[0.07] px-2 py-0.5 font-mono text-[10px] text-fuchsia-200/70">{file}</code>
                        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                      </span>
                    </summary>
                    <pre className="overflow-x-auto border-t border-white/[0.07] px-4 py-4 text-[11px] leading-relaxed text-emerald-300">
{code}
                    </pre>
                  </details>
                ))}

                {/* Other frameworks note */}
                <details className="group rounded-xl border border-white/[0.07] [&_summary]:list-none">
                  <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 text-xs font-semibold text-white/60 transition-colors hover:text-white/80">
                    <span>Vue · Svelte · Astro · others</span>
                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="border-t border-white/[0.07] px-4 py-4 text-xs text-white/45 leading-relaxed">
                    Inject the three lines into the{' '}
                    <code className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[10px] text-fuchsia-200">&lt;head&gt;</code>{' '}
                    of your root layout or template. The snippet is framework-agnostic. Make sure the
                    anti-flicker <code className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[10px] text-fuchsia-200">&lt;style&gt;</code> and
                    inline <code className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[10px] text-fuchsia-200">&lt;script&gt;</code> come{' '}
                    <strong className="text-white/70">before</strong> the async{' '}
                    <code className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[10px] text-fuchsia-200">ab.js</code> tag.
                  </p>
                </details>

                {/* Privacy note */}
                <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3.5">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/80" />
                  <p className="text-xs leading-relaxed text-amber-200/70">
                    <strong className="font-semibold text-amber-200/90">Privacy:</strong>{' '}
                    ab.js stores a random visitor ID in{' '}
                    <code className="rounded bg-amber-400/10 px-1 font-mono text-[10px]">localStorage</code> (no cookies).
                    No personal data is collected or transmitted. The snippet only sends: current URL,
                    visitor ID, and click events on test elements.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Experiments ── */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-white">
                Your Experiments
              </h2>
              {totalConversions > 0 && (
                <span className="text-xs text-white/40">
                  {totalConversions.toLocaleString()} total conversions
                </span>
              )}
            </div>

            {tests.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.12] py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
                  <FlaskConical className="h-5 w-5 text-white/30" />
                </div>
                <p className="mt-4 text-sm font-medium text-white/50">No experiments yet</p>
                <p className="mt-1.5 max-w-xs text-xs text-white/30">
                  Create your first test in the Figma plugin — paste the plugin token above to get
                  started.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tests.map(t => {
                  const va = t.visitors_a ?? 0
                  const vb = t.visitors_b ?? 0
                  const ca = t.conversions_a ?? 0
                  const cb = t.conversions_b ?? 0
                  const crA = va > 0 ? ca / va : 0
                  const crB = vb > 0 ? cb / vb : 0
                  const uplift = crA > 0 ? ((crB - crA) / crA) * 100 : null
                  const totalV = va + vb
                  const pctA = totalV > 0 ? (va / totalV) * 100 : 50
                  const pctB = 100 - pctA

                  const statusColor =
                    t.status === 'active'
                      ? 'bg-emerald-400/15 text-emerald-300'
                      : t.winner === 'B'
                      ? 'bg-fuchsia-400/15 text-fuchsia-300'
                      : 'bg-white/[0.07] text-white/50'

                  return (
                    <Link
                      key={t.id}
                      href={`/results/${t.id}`}
                      className="group block rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 backdrop-blur-md transition-all duration-200 hover:border-white/15 hover:bg-white/[0.04]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-[family-name:var(--font-display)] text-base font-bold text-white group-hover:text-fuchsia-100 transition-colors duration-200">
                            {t.name}
                          </p>
                          {t.site_url && (
                            <p className="mt-0.5 truncate text-xs text-white/35">{t.site_url}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {uplift !== null && uplift !== 0 && (
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                uplift > 0
                                  ? 'bg-emerald-400/15 text-emerald-300'
                                  : 'bg-rose-400/15 text-rose-300'
                              }`}
                            >
                              {uplift > 0 ? '+' : ''}{uplift.toFixed(1)}%
                            </span>
                          )}
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusColor}`}>
                            {t.winner === 'B' ? 'B won' : t.status}
                          </span>
                        </div>
                      </div>

                      {/* A vs B visitor bar */}
                      {totalV > 0 && (
                        <div className="mt-4">
                          <div className="flex h-1.5 overflow-hidden rounded-full">
                            <div
                              className="bg-white/30 transition-all"
                              style={{ width: `${pctA}%` }}
                            />
                            <div
                              className="bg-gradient-to-r from-violet-500 to-fuchsia-500"
                              style={{ width: `${pctB}%` }}
                            />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-white/40">
                            <span>
                              A: {va.toLocaleString()} visitors
                              {crA > 0 && <span className="ml-1 text-white/55">{(crA * 100).toFixed(1)}% CR</span>}
                            </span>
                            <span>
                              {crB > 0 && <span className="mr-1 text-fuchsia-300/80">{(crB * 100).toFixed(1)}% CR</span>}
                              B: {vb.toLocaleString()} visitors
                            </span>
                          </div>
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  value,
  label,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>
  value: string | number
  label: string
  accent: 'violet' | 'emerald' | 'rose' | 'default'
}) {
  const accents = {
    violet: { icon: 'text-violet-300', bg: 'bg-violet-500/10' },
    emerald: { icon: 'text-emerald-300', bg: 'bg-emerald-500/10' },
    rose: { icon: 'text-rose-300', bg: 'bg-rose-500/10' },
    default: { icon: 'text-white/40', bg: 'bg-white/[0.05]' },
  }
  const a = accents[accent]

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 backdrop-blur-md">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${a.bg}`}>
        <Icon className={`h-4 w-4 ${a.icon}`} />
      </div>
      <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-white">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-white/40">{label}</p>
    </div>
  )
}
