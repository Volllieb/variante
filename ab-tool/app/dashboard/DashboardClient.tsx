'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { PandaLogo } from '@/components/PandaLogo'
import {
  Copy,
  Check,
  ChevronDown,
  LogOut,
  FlaskConical,
  Users,
  TrendingUp,
  ArrowRight,
  Shield,
  List,
  BarChart3,
  Globe,
  KeyRound,
  CreditCard,
  Lock,
  Search,
  Plus,
  Zap,
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
  const [query, setQuery] = useState('')
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

  const filteredTests = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tests
    return tests.filter(
      t => t.name.toLowerCase().includes(q) || (t.site_url ?? '').toLowerCase().includes(q)
    )
  }, [tests, query])

  return (
    <div className="min-h-screen bg-black font-[family-name:var(--font-sans)] text-white/80 antialiased">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-50 flex items-center gap-4 border-b border-white/10 bg-black/95 px-5 py-3 backdrop-blur-xl">
        <Link
          href="/"
          className="flex items-center gap-2 font-[family-name:var(--font-display)] text-[15px] font-bold text-white transition-opacity hover:opacity-75"
        >
          <PandaLogo className="h-6 w-6 rounded-md" />
          variante
        </Link>
        <span className="rounded-md border border-white/15 bg-white/[0.05] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/50">
          {plan}
        </span>
        <div className="flex-1" />
        <span className="hidden text-sm text-white/45 sm:block">{email}</span>
        <button
          onClick={logout}
          className="flex cursor-pointer items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/50 transition-colors duration-150 hover:border-white/25 hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" />
          Log out
        </button>
      </header>

      <div className="mx-auto flex max-w-[1400px]">
        {/* ── Sidebar ── */}
        <aside className="sticky top-[49px] hidden h-[calc(100vh-49px)] w-56 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-white/10 p-3 md:flex">
          <NavLink icon={FlaskConical} label="Tests" href="/dashboard" active />
          <NavLink icon={List} label="Activity log" state="soon" />
          <NavLink
            icon={BarChart3}
            label="Analytics"
            state={isPro ? undefined : 'locked'}
            onClick={!isPro ? () => billing('checkout') : undefined}
          />
          <NavLink icon={Globe} label="Domains" state="soon" />

          <div className="my-2 h-px bg-white/10" />

          <NavLink icon={KeyRound} label="Plugin token" anchor="#plugin-token" />
          <NavLink icon={Users} label="Team" state="agency" />

          <div className="my-2 h-px bg-white/10" />

          <NavLink icon={CreditCard} label="Usage & billing" anchor="#billing" />
        </aside>

        {/* ── Main content ── */}
        <main className="min-w-0 flex-1 space-y-8 px-5 py-6 sm:px-8">
          {/* Page header row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-white">Tests</h1>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Find test…"
                  className="w-full rounded-md border border-white/10 bg-white/[0.03] py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none sm:w-56"
                />
              </div>
              <a
                href="#plugin-token"
                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-bold text-black transition-opacity duration-150 hover:opacity-85"
              >
                <Plus className="h-3.5 w-3.5" />
                New test
              </a>
            </div>
          </div>

          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={FlaskConical} value={tests.length} label="Experiments" />
            <StatCard
              icon={Zap}
              value={isPro ? running : `${running} / 1`}
              label="Running"
              accent={running > 0 ? 'emerald' : 'default'}
            />
            <StatCard icon={Users} value={totalVisitors.toLocaleString()} label="Total visitors" />
            <StatCard
              icon={TrendingUp}
              value={avgLift !== null ? `${avgLift > 0 ? '+' : ''}${(avgLift * 100).toFixed(1)}%` : '—'}
              label="Avg lift"
              accent={avgLift !== null && avgLift > 0 ? 'emerald' : avgLift !== null && avgLift < 0 ? 'rose' : 'default'}
            />
          </div>

          {/* ── Plan + Token row ── */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Plan / Billing card */}
            <div id="billing" className="scroll-mt-24 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">Current plan</p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold uppercase text-white">
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
                    className="shrink-0 cursor-pointer rounded-md border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 transition-colors duration-150 hover:border-white/30 hover:text-white disabled:opacity-50"
                  >
                    Manage
                  </button>
                ) : (
                  <button
                    onClick={() => billing('checkout')}
                    disabled={busy}
                    className="group inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-white px-4 py-2 text-xs font-bold text-black transition-opacity duration-150 hover:opacity-85 disabled:opacity-50"
                  >
                    Upgrade to Pro
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Plugin Token card */}
            <div id="plugin-token" className="scroll-mt-24 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">Plugin token</p>
              <p className="mt-1 text-xs text-white/45">
                Paste once into the Figma plugin to link your tests — this is where new tests are created.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <code className="flex-1 overflow-x-auto truncate rounded-md border border-white/10 bg-black px-3 py-2.5 font-mono text-xs text-white/70">
                  {apiToken}
                </code>
                <button
                  onClick={copyToken}
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-white/[0.05] text-white/60 transition-colors duration-150 hover:border-white/25 hover:text-white"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* ── Significance upsell (free only) ── */}
          {!isPro && (
            <div className="flex flex-col items-start gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">See when a variant actually wins</p>
                <p className="mt-1 max-w-md text-xs text-white/45">
                  Free shows raw visitor and conversion counts. Pro calculates statistical significance and
                  declares a winner automatically.
                </p>
              </div>
              <button
                onClick={() => billing('checkout')}
                disabled={busy}
                className="shrink-0 cursor-pointer rounded-md border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 transition-colors duration-150 hover:border-white/30 hover:text-white disabled:opacity-50"
              >
                Upgrade to Pro
              </button>
            </div>
          )}

          {/* ── Snippet installation card ── */}
          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
            <button
              onClick={() => setSnippetOpen(o => !o)}
              className="flex w-full cursor-pointer items-center justify-between px-6 py-5 text-left transition-colors duration-150 hover:bg-white/[0.02]"
            >
              <div>
                <p className="text-sm font-semibold text-white">Snippet installation</p>
                <p className="mt-0.5 text-xs text-white/40">
                  Paste one block into your site&apos;s{' '}
                  <code className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-white/70">
                    &lt;head&gt;
                  </code>{' '}
                  — universal, framework-agnostic
                </p>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-white/40 transition-transform duration-150 ${snippetOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {snippetOpen && (
              <div className="space-y-5 border-t border-white/10 px-6 pb-6 pt-5">
                {/* Main snippet */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/60">Universal snippet</span>
                    <button
                      onClick={copySnippet}
                      className="flex cursor-pointer items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/60 transition-colors duration-150 hover:border-white/25 hover:text-white"
                    >
                      {snippetCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {snippetCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <pre className="overflow-x-auto rounded-md bg-black px-4 py-4 text-[11px] leading-relaxed text-white/70 ring-1 ring-white/10">
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
                  <details key={label} className="group rounded-md border border-white/10 [&_summary]:list-none">
                    <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 text-xs font-semibold text-white/60 transition-colors hover:text-white/85">
                      <span>{label}</span>
                      <span className="flex items-center gap-2">
                        <code className="rounded bg-white/[0.07] px-2 py-0.5 font-mono text-[10px] text-white/50">{file}</code>
                        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                      </span>
                    </summary>
                    <pre className="overflow-x-auto border-t border-white/10 px-4 py-4 text-[11px] leading-relaxed text-white/70">
{code}
                    </pre>
                  </details>
                ))}

                {/* Other frameworks note */}
                <details className="group rounded-md border border-white/10 [&_summary]:list-none">
                  <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 text-xs font-semibold text-white/60 transition-colors hover:text-white/85">
                    <span>Vue · Svelte · Astro · others</span>
                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="border-t border-white/10 px-4 py-4 text-xs leading-relaxed text-white/45">
                    Inject the three lines into the{' '}
                    <code className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[10px] text-white/70">&lt;head&gt;</code>{' '}
                    of your root layout or template. The snippet is framework-agnostic. Make sure the
                    anti-flicker <code className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[10px] text-white/70">&lt;style&gt;</code> and
                    inline <code className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[10px] text-white/70">&lt;script&gt;</code> come{' '}
                    <strong className="text-white/70">before</strong> the async{' '}
                    <code className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[10px] text-white/70">ab.js</code> tag.
                  </p>
                </details>

                {/* Privacy note */}
                <div className="flex items-start gap-3 rounded-md border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3.5">
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

          {/* ── Tests grid ── */}
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-white">Results</h2>
                <p className="mt-1 text-xs text-white/35">
                  {running > 0 ? `${running} active now` : 'No active experiments right now'}
                </p>
              </div>
              {totalConversions > 0 && (
                <span className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/45">
                  {totalConversions.toLocaleString()} total conversions
                </span>
              )}
            </div>

            {tests.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/15 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04]">
                  <FlaskConical className="h-5 w-5 text-white/30" />
                </div>
                <p className="mt-4 text-sm font-medium text-white/50">No experiments yet</p>
                <p className="mt-1.5 max-w-xs text-xs text-white/30">
                  Create your first test in the Figma plugin — paste the plugin token above to get started.
                </p>
              </div>
            ) : filteredTests.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/15 py-16 text-center">
                <p className="text-sm font-medium text-white/50">No tests match &ldquo;{query}&rdquo;</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredTests.map(t => {
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
                      ? 'bg-white/10 text-white/70'
                      : 'bg-white/[0.06] text-white/45'

                  return (
                    <Link
                      key={t.id}
                      href={`/results/${t.id}`}
                      className="group block rounded-xl border border-white/10 bg-white/[0.02] p-5 transition-colors duration-150 hover:border-white/25 hover:bg-white/[0.04]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-[family-name:var(--font-display)] text-base font-bold text-white">
                            {t.name}
                          </p>
                          {t.site_url && <p className="mt-0.5 truncate text-xs text-white/35">{t.site_url}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {uplift !== null && uplift !== 0 && (
                            <span
                              className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${
                                uplift > 0 ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-300'
                              }`}
                            >
                              {uplift > 0 ? '+' : ''}
                              {uplift.toFixed(1)}%
                            </span>
                          )}
                          <span className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusColor}`}>
                            {t.winner === 'B' ? 'B won' : t.status}
                          </span>
                        </div>
                      </div>

                      {/* A vs B visitor bar */}
                      {totalV > 0 && (
                        <div className="mt-4">
                          <div className="flex h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                            <div className="bg-white/30 transition-all" style={{ width: `${pctA}%` }} />
                            <div className="bg-white transition-all" style={{ width: `${pctB}%` }} />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-white/40">
                            <span>
                              A: {va.toLocaleString()} visitors
                              {crA > 0 && <span className="ml-1 text-white/55">{(crA * 100).toFixed(1)}% CR</span>}
                            </span>
                            <span>
                              {crB > 0 && <span className="mr-1 text-white/70">{(crB * 100).toFixed(1)}% CR</span>}
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

function NavLink({
  icon: Icon,
  label,
  href,
  anchor,
  active,
  state,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href?: string
  anchor?: string
  active?: boolean
  state?: 'soon' | 'locked' | 'agency'
  onClick?: () => void
}) {
  const base = `flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors duration-150 ${
    active ? 'bg-white/10 font-medium text-white' : 'text-white/60 hover:bg-white/[0.05] hover:text-white/85'
  }`
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-2.5">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      {state === 'soon' && (
        <span className="shrink-0 rounded border border-white/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-white/30">
          Soon
        </span>
      )}
      {state === 'locked' && <Lock className="h-3 w-3 shrink-0 text-white/30" />}
      {state === 'agency' && (
        <span className="shrink-0 rounded border border-white/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-white/30">
          Agency
        </span>
      )}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={base}>
        {content}
      </Link>
    )
  }
  if (anchor) {
    return (
      <a href={anchor} className={base}>
        {content}
      </a>
    )
  }
  if (onClick) {
    return (
      <button onClick={onClick} className={`${base} cursor-pointer text-left`}>
        {content}
      </button>
    )
  }
  return <div className={`${base} cursor-default opacity-60`}>{content}</div>
}

function StatCard({
  icon: Icon,
  value,
  label,
  accent = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>
  value: string | number
  label: string
  accent?: 'emerald' | 'rose' | 'default'
}) {
  const accents = {
    emerald: 'text-emerald-300',
    rose: 'text-rose-300',
    default: 'text-white/40',
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05]">
        <Icon className={`h-4 w-4 ${accents[accent]}`} />
      </div>
      <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-white">{value}</p>
      <p className="mt-0.5 text-xs text-white/40">{label}</p>
    </div>
  )
}
