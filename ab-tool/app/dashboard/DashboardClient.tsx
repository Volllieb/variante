'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { NewTestFlow } from './NewTestFlow'
import { TestCard, type TestRow } from './components/TestCard'
import {
  FilterDropdown,
  type FilterState,
  DEFAULT_FILTER,
  getDateCutoff,
  hasActiveFilters,
} from './components/FilterDropdown'
import {
  Check,
  X,
  FlaskConical,
  Users,
  TrendingUp,
  Percent,
  LogIn,
  HeartPulse,
  Puzzle,
  Globe,
  Search,
  ArrowUpDown,
  RefreshCw,
  Plus,
  ArrowRight,
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

export function DashboardClient({
  plan,
  apiToken,
  tests,
  hasFigmaPlugin,
  hasVerifiedDomain,
  primaryDomain,
  highlightNew,
  upgraded,
  openNewTest,
}: {
  plan: string
  apiToken: string
  tests: TestRow[]
  hasFigmaPlugin: boolean
  hasVerifiedDomain: boolean
  primaryDomain: string | null
  highlightNew?: boolean
  upgraded?: boolean
  openNewTest?: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [newTestOpen, setNewTestOpen] = useState(openNewTest ?? false)
  const [testList, setTestList] = useState(tests)
  const [query, setQuery] = useState('')
  const [sortAsc, setSortAsc] = useState(false)
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER)
  const [billingError, setBillingError] = useState<string | null>(null)
  const isPro = plan === 'pro' || plan === 'agency'

  useEffect(() => {
    if (billingError) {
      const t = setTimeout(() => setBillingError(null), 6000)
      return () => clearTimeout(t)
    }
  }, [billingError])

  useEffect(() => {
    if (openNewTest) setNewTestOpen(true)
  }, [openNewTest])

  useEffect(() => { setTestList(tests) }, [tests])

  function handleDeleteTest(id: string) {
    setTestList((prev) => prev.filter((t) => t.id !== id))
  }

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
      else setBillingError(data.error || 'Something went wrong. Please try again.')
    } catch {
      setBillingError('Connection failed. Check your internet and try again.')
    } finally {
      setBusy(false)
    }
  }

  /* ── Aggregate stats ── */
  const totalVisitors = testList.reduce((s, t) => s + (t.visitors_a ?? 0) + (t.visitors_b ?? 0), 0)
  const totalConversions = testList.reduce((s, t) => s + (t.conversions_a ?? 0) + (t.conversions_b ?? 0), 0)
  const running = testList.filter((t) => t.status === 'active').length
  const overallCR = totalVisitors > 0 ? (totalConversions / totalVisitors) * 100 : 0

  const lifts = testList
    .map((t) => {
      const crA = (t.visitors_a ?? 0) > 0 ? (t.conversions_a ?? 0) / (t.visitors_a ?? 0) : 0
      const crB = (t.visitors_b ?? 0) > 0 ? (t.conversions_b ?? 0) / (t.visitors_b ?? 0) : 0
      return crA > 0 ? ((crB - crA) / crA) * 100 : null
    })
    .filter((l): l is number => l !== null && isFinite(l))
  const avgUplift = lifts.length > 0 ? lifts.reduce((s, l) => s + l, 0) / lifts.length : null

  // Sorting + Filtering
  const sortedTests = useMemo(() => {
    const sorted = [...testList].sort((a, b) => {
      const va = (a.visitors_a ?? 0) + (a.visitors_b ?? 0)
      const vb = (b.visitors_a ?? 0) + (b.visitors_b ?? 0)
      return sortAsc ? va - vb : vb - va
    })
    return sorted
  }, [testList, sortAsc])

  const filteredTests = useMemo(() => {
    const q = query.trim().toLowerCase()
    const dateCutoff = getDateCutoff(filter.date)

    let result = sortedTests

    // Text search
    if (q) {
      result = result.filter((t) =>
        t.name.toLowerCase().includes(q) || (t.site_url ?? '').toLowerCase().includes(q)
      )
    }

    // Status filter
    if (filter.status !== 'all') {
      result = result.filter((t) => t.status === filter.status)
    }

    // Date filter
    if (dateCutoff !== null) {
      result = result.filter((t) => new Date(t.created_at).getTime() >= dateCutoff)
    }

    // Winner filter
    if (filter.winner === 'yes') {
      result = result.filter((t) => t.winner !== null)
    } else if (filter.winner === 'inprogress') {
      result = result.filter((t) => t.winner === null)
    }

    return result
  }, [sortedTests, query, filter])

  return (
    <>
      <main className="min-w-0 flex-1 px-5 py-6 sm:px-8">
        {/* Upgraded banner */}
        {upgraded && (
          <div className="mb-5 flex items-center gap-3 rounded-[10px] border border-[#2fd76c]/20 bg-[#2fd76c]/5 px-5 py-3.5">
            <Check className="h-4 w-4 shrink-0 text-[#2fd76c]" />
            <p className="text-[13px] text-[#2fd76c]">
              You&apos;re now on <strong className="font-semibold">Pro</strong> — unlimited experiments, full statistics, no badge.
            </p>
          </div>
        )}

        {/* Error toast */}
        {billingError && (
          <div className="mb-5 flex items-center gap-3 rounded-[10px] border border-[#f5455c]/20 bg-[#f5455c]/5 px-5 py-3.5">
            <X className="h-4 w-4 shrink-0 text-[#f5455c]" />
            <p className="flex-1 text-[13px] text-[#f5455c]">{billingError}</p>
            <button onClick={() => setBillingError(null)} className="cursor-pointer text-[#f5455c]/60 hover:text-[#f5455c]">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── Two-column layout: 30% / 70% ── */}
        <div className="flex gap-5">
          {/* ═══ LEFT COLUMN (30%) ═══ */}
          <div className="w-[30%] shrink-0">
            {/* Overview */}
            <h2 className="mb-3 text-[13px] font-semibold text-[#ededed]">Overview</h2>
            <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-4">
              <div>
                <MetricRow icon={FlaskConical} label="Active Tests" value={isPro ? running.toString() : `${running} / 1`} />
                <MetricRow icon={Users} label="Total Visitors" value={totalVisitors.toLocaleString()} />
                <MetricRow icon={Percent} label="Overall CR" value={`${overallCR.toFixed(1)}%`} />
                <MetricRow
                  icon={TrendingUp}
                  label="Overall Uplift"
                  value={avgUplift !== null ? `${avgUplift > 0 ? '+' : ''}${avgUplift.toFixed(1)}%` : '—'}
                  tone={avgUplift !== null && avgUplift > 0 ? 'ok' : avgUplift !== null && avgUplift < 0 ? 'err' : undefined}
                />
              </div>
            </div>

            {/* 0-conversions guidance */}
            {totalConversions === 0 && running > 0 && (
              <div className="mt-3 rounded-[8px] border border-[#f5a623]/20 bg-[#f5a623]/5 px-3 py-2.5">
                <p className="text-[11px] leading-relaxed text-[#f5a623]/80">
                  No conversions yet. Make sure your{' '}
                  <a href="/docs#goals" target="_blank" className="underline hover:opacity-80">conversion goal</a>{' '}
                  is set up — without it, variante can&apos;t track results.
                </p>
              </div>
            )}

            {/* Setup — compact 3-step checklist */}
            <div className="mb-3 mt-6 flex items-center gap-2">
              <h2 className="text-[13px] font-semibold text-[#ededed]">Setup</h2>
              <ArrowRight className="h-3.5 w-3.5 text-[#ededed]/25" />
            </div>
            <Link
              href="/dashboard/setup"
              className="block rounded-[10px] border border-white/10 bg-[#0a0a0a] p-4 transition-colors hover:border-white/[0.18]"
            >
              <div>
                <MetricRow
                  icon={LogIn}
                  label="Login"
                  value={<Check className="h-3.5 w-3.5 text-[#2fd76c]" />}
                />
                <MetricRow
                  icon={Globe}
                  label="Connect Website"
                  value={hasVerifiedDomain && primaryDomain ? <span className="text-[11px]">{primaryDomain}</span> : <X className="h-3.5 w-3.5 text-[#f5455c]" />}
                />
                <MetricRow
                  icon={Puzzle}
                  label="Figma Plugin"
                  value={hasFigmaPlugin ? <Check className="h-3.5 w-3.5 text-[#2fd76c]" /> : <X className="h-3.5 w-3.5 text-[#f5455c]" />}
                />
              </div>
            </Link>
          </div>

          {/* ═══ RIGHT COLUMN (70%) ═══ */}
          <div className="w-[70%] shrink-0 min-w-0">
            {/* Tests heading */}
            <h2 className="mb-3 text-[13px] font-semibold text-[#ededed]">Tests</h2>

            {/* Toolbar */}
            <div className="mb-4 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#ededed]/40" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search tests…"
                  className="w-full h-[30px] rounded-[6px] border border-white/10 bg-[#0a0a0a] py-1.5 pl-8 pr-3 text-[13px] text-[#ededed] placeholder:text-[#ededed]/40 focus:border-white/[0.18] focus:outline-none"
                />
              </div>
              <button
                onClick={() => setSortAsc((v) => !v)}
                title={sortAsc ? 'Sort: ascending' : 'Sort: descending'}
                className="flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-white/10 bg-[#0a0a0a] text-[#ededed]/62 transition-colors hover:border-white/[0.18] hover:text-[#ededed]"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </button>
              <FilterDropdown filter={filter} onChange={setFilter} />
              <button
                onClick={() => router.refresh()}
                title="Refresh test list"
                className="flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-white/10 bg-[#0a0a0a] text-[#ededed]/62 transition-colors hover:border-white/[0.18] hover:text-[#ededed]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => hasVerifiedDomain && setNewTestOpen(true)}
                disabled={!hasVerifiedDomain}
                title={hasVerifiedDomain ? undefined : 'Add your website first'}
                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[6px] bg-white px-3 py-1.5 text-[11px] font-semibold text-black transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-25"
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

            {/* Test grid or empty */}
            {testList.length === 0 ? (
              <EmptyState onNewTest={() => setNewTestOpen(true)} hasFigmaPlugin={hasFigmaPlugin} hasVerifiedDomain={hasVerifiedDomain} />
            ) : filteredTests.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-white/[0.18] py-16 text-center">
                <p className="text-[13px] font-medium text-[#ededed]/62">
                  {query ? `No tests match "${query}"` : 'No tests found'}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredTests.map((t, i) => (
                  <TestCard key={t.id} t={t} highlight={highlightNew && i === 0} onDelete={handleDeleteTest} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}

/* ── Sub-components ── */

function MetricRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  tone?: 'ok' | 'pro' | 'err'
}) {
  const color = tone === 'ok' ? T.ok : tone === 'pro' ? T.pro : tone === 'err' ? T.err : undefined
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] py-2.5 last:border-b-0">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-3.5 w-3.5 shrink-0 text-[#ededed]/40" />
        <span className="truncate text-[12px] text-[#ededed]/62">{label}</span>
      </div>
      <span
        className="ml-3 flex shrink-0 items-center text-[12px] font-medium tabular-nums text-[#ededed]"
        style={typeof value === 'string' && color ? { color } : undefined}
      >
        {value}
      </span>
    </div>
  )
}

function EmptyState({ onNewTest, hasFigmaPlugin, hasVerifiedDomain }: { onNewTest: () => void; hasFigmaPlugin: boolean; hasVerifiedDomain: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-white/[0.18] py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-white/[0.04]">
        <FlaskConical className="h-5 w-5 text-[#ededed]/40" />
      </div>
      <p className="mt-4 text-[14px] font-medium text-[#ededed]">No tests yet</p>
      <p className="mt-1.5 max-w-[340px] text-[12px] leading-relaxed text-[#ededed]/40">
        {!hasVerifiedDomain
          ? 'Add your website first — tests only run on verified domains.'
          : hasFigmaPlugin
            ? 'Create your first variant in Figma and push it here.'
            : 'Run the setup health check first — it walks you through snippet, plugin, and your first test.'}
      </p>
      <div className="mt-5 flex items-center gap-3">
        {!hasVerifiedDomain && (
          <Link
            href="/dashboard/account"
            className="flex items-center gap-1.5 rounded-[6px] bg-white px-3.5 py-2 text-[12px] font-semibold text-black transition-opacity hover:opacity-85"
          >
            <Globe className="h-3.5 w-3.5" />
            Add website
          </Link>
        )}
        {hasVerifiedDomain && !hasFigmaPlugin && (
          <Link
            href="/dashboard/setup"
            className="flex items-center gap-1.5 rounded-[6px] border border-white/[0.18] px-3.5 py-2 text-[12px] font-medium text-[#ededed]/70 transition-colors hover:border-white/25 hover:text-[#ededed]"
          >
            <HeartPulse className="h-3.5 w-3.5" />
            Run setup check
          </Link>
        )}
        {hasVerifiedDomain && hasFigmaPlugin && (
          <button
            onClick={onNewTest}
            className="flex items-center gap-1.5 rounded-[6px] bg-white px-3.5 py-2 text-[12px] font-semibold text-black transition-opacity hover:opacity-85"
          >
            <Plus className="h-3.5 w-3.5" />
            New test
          </button>
        )}
      </div>
    </div>
  )
}
