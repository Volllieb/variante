'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import {
  Copy,
  Check,
  ChevronDown,
  FlaskConical,
  Users,
  TrendingUp,
  Zap,
  Shield,
  Search,
  Plus,
  Plug,
  ListFilter,
  Puzzle,
  ExternalLink,
} from 'lucide-react'

/* ── Token palette (brandguidelines.md §2) — literal hex/rgba, not Tailwind defaults ── */
const T = {
  bg1: '#0a0a0a',
  bg2: '#111111',
  text: '#ededed',
  ok: '#2fd76c',
  pro: '#f5a623',
  err: '#f5455c',
}

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
  created_at: string
}

const SNIPPET_CODE = `<!-- A/B Testing: universal snippet — paste in <head> on EVERY page -->
<link rel="preconnect" href="https://www.getvariante.com">
<style id="__ab_hide">html.__ab_pending{opacity:0!important}</style>
<script>document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)<\/script>
<script async src="https://www.getvariante.com/ab.js" integrity="sha384-IRhfYvegwpNV4YFObew04X1nQgyv7Mty9M5VWzJoOFry54oKIx4qIJg7lN1igh/T" crossorigin="anonymous"><\/script>`

const STATUS_FILTERS = ['all', 'active', 'draft', 'done'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function DashboardClient({
  plan,
  apiToken,
  tests,
}: {
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const isPro = plan === 'pro' || plan === 'agency'

  // Multi-Tab-Sync: Logout in Tab B → Tab A redirectet auf Landingpage
  useEffect(() => {
    const supabase = getBrowserSupabase()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        window.location.href = '/'
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function billing(path: 'checkout' | 'portal') {
    setBusy(true)
    try {
      const res = await fetch(`/api/billing/${path}`, { method: 'POST' })
      if (res.status === 401) { router.push('/login'); return }
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

  function cycleFilter() {
    setStatusFilter(f => STATUS_FILTERS[(STATUS_FILTERS.indexOf(f) + 1) % STATUS_FILTERS.length])
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
    return tests.filter(t => {
      const matchesQuery = !q || t.name.toLowerCase().includes(q) || (t.site_url ?? '').toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [tests, query, statusFilter])

  const recent = tests.slice(0, 3)

  return (
    <>
      <main className="grid min-w-0 flex-1 grid-cols-1 gap-5 px-5 py-6 sm:px-8 md:grid-cols-[38%_1fr]">
          {/* ═══ Left column: Usage / Significance / Recent activity ═══ */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="mb-2 text-[13px] font-medium text-[#ededed]">Usage</p>
              <div id="usage" className="scroll-mt-24 rounded-[10px] border border-white/10 bg-[#0a0a0a] p-3.5">
                <p className="mb-2.5 text-[13px] font-medium text-[#ededed]">Last 30 days</p>
                <div className="flex flex-col divide-y divide-white/[0.06]">
                  <QuotaRow
                    icon={FlaskConical}
                    label="Active experiments"
                    value={isPro ? `${running}` : `${running} / 1`}
                    atLimit={!isPro && running >= 1}
                  />
                  <QuotaRow icon={Users} label="Total experiments" value={`${tests.length}`} />
                  <QuotaRow icon={TrendingUp} label="Total visitors" value={totalVisitors.toLocaleString()} />
                  <QuotaRow icon={Zap} label="Total conversions" value={totalConversions.toLocaleString()} />
                  {avgLift !== null && (
                    <QuotaRow
                      icon={TrendingUp}
                      label="Avg lift"
                      value={`${avgLift > 0 ? '+' : ''}${(avgLift * 100).toFixed(1)}%`}
                      tone={avgLift > 0 ? 'ok' : avgLift < 0 ? 'err' : undefined}
                    />
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <span className="text-[11px] text-[#ededed]/40">
                    Plan: <span className="text-[#ededed]/62">{plan.toUpperCase()}</span>
                  </span>
                  {isPro ? (
                    <button
                      onClick={() => billing('portal')}
                      disabled={busy}
                      className="cursor-pointer text-[11px] font-semibold text-[#ededed]/62 transition-colors hover:text-[#ededed] disabled:opacity-50"
                    >
                      Manage →
                    </button>
                  ) : (
                    <button
                      onClick={() => billing('checkout')}
                      disabled={busy}
                      className="cursor-pointer rounded-[5px] bg-white px-2.5 py-1 text-[11px] font-semibold text-black transition-opacity duration-150 hover:opacity-85 disabled:opacity-50"
                    >
                      Upgrade
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[13px] font-medium text-[#ededed]">Significance</p>
              {isPro ? (
                <div className="flex items-center gap-2.5 rounded-[10px] border border-white/10 bg-[#0a0a0a] p-3.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: T.ok }} />
                  <p className="text-[13px] text-[#ededed]/62">
                    Enabled — winners are detected and declared automatically.
                  </p>
                </div>
              ) : (
                <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-3.5">
                  <p className="text-[13px] font-semibold text-[#ededed]">See when a variant actually wins</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#ededed]/40">
                    Free shows raw visitor and conversion counts. Pro calculates statistical significance
                    and declares a winner automatically.
                  </p>
                  <button
                    onClick={() => billing('checkout')}
                    disabled={busy}
                    className="mt-3 cursor-pointer rounded-[6px] border border-white/[0.18] px-3 py-1.5 text-[11px] font-semibold text-[#ededed] transition-colors duration-150 hover:border-white/25 disabled:opacity-50"
                  >
                    Upgrade to Pro
                  </button>
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-[13px] font-medium text-[#ededed]">Recent activity</p>
              {recent.length === 0 ? (
                <p className="text-[11px] text-[#ededed]/40">No tests yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {recent.map(t => (
                    <Link
                      key={t.id}
                      href={`/dashboard/results/${t.id}`}
                      className="block rounded-[10px] border border-white/10 bg-[#0a0a0a] p-3 transition-colors duration-150 hover:border-white/[0.18]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13px] font-medium text-[#ededed]">{t.name}</span>
                        <StatusDot status={t.status} winner={t.winner} />
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-[#ededed]/40">
                        {t.site_url ?? '—'} · {timeAgo(t.created_at)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ═══ Right column: Tests grid with toolbar ═══ */}
          <div className="min-w-0">
            <p className="mb-2 text-[13px] font-medium text-[#ededed]">Tests</p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#ededed]/40" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Find test…"
                  className="w-full rounded-[6px] border border-white/10 bg-[#0a0a0a] py-1.5 pl-8 pr-3 text-[13px] text-[#ededed] placeholder:text-[#ededed]/40 focus:border-white/[0.18] focus:outline-none"
                />
              </div>
              <button
                onClick={cycleFilter}
                title={`Filter: ${statusFilter}`}
                className="relative flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-white/10 bg-[#0a0a0a] text-[#ededed]/62 transition-colors duration-150 hover:border-white/[0.18] hover:text-[#ededed]"
              >
                <ListFilter className="h-3.5 w-3.5" />
                {statusFilter !== 'all' && (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full" style={{ background: T.pro }} />
                )}
              </button>
              <a
                href="#plugin-token"
                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[6px] bg-white px-3 py-1.5 text-[11px] font-semibold text-black transition-opacity duration-150 hover:opacity-85"
              >
                <Plus className="h-3.5 w-3.5" />
                New test
              </a>
            </div>

            {tests.length === 0 ? (
              <div className="mt-3 flex flex-col items-center justify-center rounded-[10px] border border-dashed border-white/[0.18] py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-white/[0.04]">
                  <FlaskConical className="h-5 w-5 text-[#ededed]/40" />
                </div>
                <p className="mt-4 text-[13px] font-medium text-[#ededed]/62">No experiments yet</p>
                <p className="mt-1.5 max-w-xs text-[11px] text-[#ededed]/40">
                  Create your first test in the Figma plugin — paste the plugin token below to get started.
                </p>
              </div>
            ) : filteredTests.length === 0 ? (
              <div className="mt-3 flex flex-col items-center justify-center rounded-[10px] border border-dashed border-white/[0.18] py-16 text-center">
                <p className="text-[13px] font-medium text-[#ededed]/62">
                  {query ? `No tests match “${query}”` : 'No tests in this filter'}
                </p>
              </div>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
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

                  return (
                    <Link
                      key={t.id}
                      href={`/dashboard/results/${t.id}`}
                      className="block rounded-[10px] border border-white/10 bg-[#0a0a0a] p-3.5 transition-colors duration-150 hover:border-white/[0.18]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-medium text-[#ededed]">{t.name}</p>
                          {t.site_url && <p className="mt-0.5 truncate text-[11px] text-[#ededed]/40">{t.site_url}</p>}
                        </div>
                        <StatusDot status={t.status} winner={t.winner} />
                      </div>

                      <div className="mt-2.5 flex items-center gap-2">
                        <span className="text-[11px] text-[#ededed]/62">{t.winner === 'B' ? 'B won' : t.status}</span>
                        {uplift !== null && uplift !== 0 && (
                          <span
                            className="rounded-[5px] px-2 py-0.5 text-[11px] font-semibold"
                            style={
                              uplift > 0
                                ? { background: `${T.ok}1f`, color: T.ok }
                                : { background: `${T.err}1f`, color: T.err }
                            }
                          >
                            {uplift > 0 ? '+' : ''}
                            {uplift.toFixed(1)}%
                          </span>
                        )}
                      </div>

                      {totalV > 0 && (
                        <div className="mt-3">
                          <div className="flex h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                            <div className="bg-white/30 transition-all" style={{ width: `${pctA}%` }} />
                            <div className="bg-white transition-all" style={{ width: `${pctB}%` }} />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-[#ededed]/40">
                            <span>
                              A: {va.toLocaleString()}
                              {crA > 0 && <span className="ml-1 text-[#ededed]/62">{(crA * 100).toFixed(1)}% CR</span>}
                            </span>
                            <span>
                              {crB > 0 && <span className="mr-1 text-[#ededed]/62">{(crB * 100).toFixed(1)}% CR</span>}
                              B: {vb.toLocaleString()}
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

          {/* ═══ Full width: Plugin token + Snippet installation ═══ */}
          <div className="flex flex-col gap-5 md:col-span-2">
            {/* Browser Extension */}
            <div id="browser-extension" className="scroll-mt-24 rounded-[10px] border border-white/10 bg-[#0a0a0a] p-3.5">
              <p className="text-[13px] font-medium text-[#ededed]">Browser Extension</p>
              <p className="mt-1 text-[11px] text-[#ededed]/40">
                Pick elements directly on your live site. Install once from the Chrome Web Store — the picker runs locally.
              </p>
              <a
                href="https://chromewebstore.google.com/detail/variante-—-ab-test-elemen/hopbdjfpmknemchgoonjommfemgihkbh"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-[6px] bg-white px-4 py-2 text-[11px] font-semibold text-black transition-colors duration-200 hover:bg-white/90"
              >
                <Puzzle className="h-3.5 w-3.5" />
                Install from Chrome Web Store
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </div>

            <div id="plugin-token" className="scroll-mt-24 rounded-[10px] border border-white/10 bg-[#0a0a0a] p-3.5">
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
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-white/10 bg-white/[0.05] text-[#ededed]/62 transition-colors duration-150 hover:border-white/[0.18] hover:text-[#ededed]"
                >
                  {copied ? <Check className="h-4 w-4" style={{ color: T.ok }} /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-[10px] border border-white/10 bg-[#0a0a0a]">
              <button
                onClick={() => setSnippetOpen(o => !o)}
                className="flex w-full cursor-pointer items-center justify-between px-3.5 py-3 text-left transition-colors duration-150 hover:bg-white/[0.02]"
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
                  className={`h-4 w-4 shrink-0 text-[#ededed]/40 transition-transform duration-150 ${snippetOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {snippetOpen && (
                <div className="space-y-4 border-t border-white/10 px-3.5 pb-4 pt-3.5">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#ededed]/62">Universal snippet</span>
                      <button
                        onClick={copySnippet}
                        className="flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-[#ededed]/62 transition-colors duration-150 hover:border-white/[0.18] hover:text-[#ededed]"
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
                          <code className="rounded-[5px] bg-white/[0.07] px-2 py-0.5 font-mono text-[11px] text-[#ededed]/40">{file}</code>
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
                      <code className="rounded-[5px] bg-white/[0.07] px-1.5 py-0.5 font-mono text-[11px] text-[#ededed]/62">&lt;head&gt;</code>{' '}
                      of your root layout or template. The snippet is framework-agnostic. Make sure the
                      anti-flicker <code className="rounded-[5px] bg-white/[0.07] px-1.5 py-0.5 font-mono text-[11px] text-[#ededed]/62">&lt;style&gt;</code> and
                      inline <code className="rounded-[5px] bg-white/[0.07] px-1.5 py-0.5 font-mono text-[11px] text-[#ededed]/62">&lt;script&gt;</code> come{' '}
                      <strong className="font-semibold text-[#ededed]/62">before</strong> the async{' '}
                      <code className="rounded-[5px] bg-white/[0.07] px-1.5 py-0.5 font-mono text-[11px] text-[#ededed]/62">ab.js</code> tag.
                    </p>
                  </details>

                  <div
                    className="flex items-start gap-3 rounded-[6px] px-4 py-3.5"
                    style={{ background: `${T.pro}0f`, border: `1px solid ${T.pro}33` }}
                  >
                    <Shield className="mt-0.5 h-4 w-4 shrink-0" style={{ color: T.pro }} />
                    <p className="text-[11px] leading-relaxed" style={{ color: `${T.pro}b3` }}>
                      <strong className="font-semibold">Privacy:</strong>{' '}
                      ab.js stores a random visitor ID in{' '}
                      <code className="rounded-[5px] px-1 font-mono text-[11px]" style={{ background: `${T.pro}1a` }}>
                        localStorage
                      </code>{' '}
                      (no cookies). No personal data is collected or transmitted. The snippet only sends:
                      current URL, visitor ID, and click events on test elements.
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

function QuotaRow({
  icon: Icon,
  label,
  value,
  atLimit,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  atLimit?: boolean
  tone?: 'ok' | 'err'
}) {
  const color = atLimit ? T.pro : tone === 'ok' ? T.ok : tone === 'err' ? T.err : undefined
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="flex items-center gap-2 text-[13px] text-[#ededed]/62">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </span>
      <span className="font-mono text-[13px] text-[#ededed]/62" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  )
}

function StatusDot({ status, winner }: { status: string; winner?: string | null }) {
  if (status === 'active') {
    return <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: T.ok }} />
  }
  if (status === 'paused') {
    return <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: T.pro }} />
  }
  if (status === 'done' || winner) {
    return <span className="h-2 w-2 shrink-0 rounded-full bg-[#ededed]/40" />
  }
  return <span className="h-2 w-2 shrink-0 rounded-full border border-dashed border-[#ededed]/40" />
}
