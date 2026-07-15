'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { useTestList } from '@/lib/useTestList'
import { useToast } from '@/app/components/Toast'
import { Tooltip } from '@/app/components/Tooltip'
import { EmptyState } from '@/app/components/EmptyState'
import { NewTestFlow } from './NewTestFlow'
import { TestCard, type TestRow } from './components/TestCard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { WhatToTestNext } from './components/WhatToTestNext'
import {
  FilterDropdown,
} from './components/FilterDropdown'
import { PandaLogo } from '@/components/PandaLogo'
import {
  Check,
  X,
  FlaskConical,
  Users,
  TrendingUp,
  Percent,
  Globe,
  Search,
  ArrowUpDown,
  RefreshCw,
  Plus,
  Sparkles,
  Code2,
  Settings,
  CreditCard,
  HeartPulse,
} from 'lucide-react'

/* ── Token palette (docs/brandguidelines.md §2) ── */
const T = {
  bg1: '#0a0a0a',
  bg2: '#111111',
  text: '#ededed',
  ok: '#2fd76c',
  pro: '#f5a623',
  err: '#f5455c',
}

/* ── Demo data — sample tests shown when user has none ── */
const DEMO_TESTS: TestRow[] = [
  {
    id: 'demo-1',
    name: 'Hero CTA — "Get Started" vs "Try Free"',
    site_url: 'demo.getvariante.com',
    status: 'active',
    health_status: 'healthy',
    health_issues: null,
    visitors_a: 1247,
    visitors_b: 1231,
    conversions_a: 53,
    conversions_b: 78,
    winner: null,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'demo-2',
    name: 'Pricing headline — benefit vs feature',
    site_url: 'demo.getvariante.com',
    status: 'done',
    health_status: 'healthy',
    health_issues: null,
    visitors_a: 3420,
    visitors_b: 3398,
    conversions_a: 89,
    conversions_b: 134,
    winner: 'B',
    created_at: new Date(Date.now() - 21 * 86400000).toISOString(),
  },
  {
    id: 'demo-3',
    name: 'Signup form — 3 fields vs 2 fields',
    site_url: 'demo.getvariante.com',
    status: 'paused',
    health_status: 'warning',
    health_issues: ['missing_goal'],
    visitors_a: 560,
    visitors_b: 0,
    conversions_a: 12,
    conversions_b: 0,
    winner: null,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
]

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
  email,
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
  email: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [newTestOpen, setNewTestOpen] = useState(openNewTest ?? false)
  const [showDemo, setShowDemo] = useState(false)
  const isPro = plan === 'pro' || plan === 'agency'
  const setupComplete = hasVerifiedDomain && hasFigmaPlugin

  // siteUrl fuer WhatToTestNext: erster aktiver Test > erster Test > primaryDomain
  const siteUrl =
    tests.find(t => t.status === 'active')?.site_url ??
    tests[0]?.site_url ??
    primaryDomain

  const {
    testList,
    setTestList,
    query,
    setQuery,
    filter,
    setFilter,
    sortAsc,
    setSortAsc,
    filteredTests,
    handleDeleteTest,
  } = useTestList({ initial: tests, sort: true })

  useEffect(() => {
    if (openNewTest) setNewTestOpen(true)
  }, [openNewTest])

  useEffect(() => { setTestList(tests) }, [tests])

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
      else toast('error', data.error || 'Something went wrong. Please try again.')
    } catch {
      toast('error', 'Connection failed. Check your internet and try again.')
    } finally {
      setBusy(false)
    }
  }

  /* ── Aggregate stats (use demo data when enabled and no real tests) ── */
  const demoActive = showDemo && testList.length === 0
  const activeTests = demoActive ? DEMO_TESTS : testList
  const totalVisitors = activeTests.reduce((s, t) => s + (t.visitors_a ?? 0) + (t.visitors_b ?? 0), 0)
  const totalConversions = activeTests.reduce((s, t) => s + (t.conversions_a ?? 0) + (t.conversions_b ?? 0), 0)
  const running = activeTests.filter((t) => t.status === 'active').length
  const overallCR = totalVisitors > 0 ? (totalConversions / totalVisitors) * 100 : 0

  const lifts = activeTests
    .map((t) => {
      const crA = (t.visitors_a ?? 0) > 0 ? (t.conversions_a ?? 0) / (t.visitors_a ?? 0) : 0
      const crB = (t.visitors_b ?? 0) > 0 ? (t.conversions_b ?? 0) / (t.visitors_b ?? 0) : 0
      return crA > 0 ? ((crB - crA) / crA) * 100 : null
    })
    .filter((l): l is number => l !== null && isFinite(l))
  const avgUplift = lifts.length > 0 ? lifts.reduce((s, l) => s + l, 0) / lifts.length : null

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

        {/* Demo mode banner */}
        {demoActive && (
          <div className="mb-5 flex items-center gap-3 rounded-[10px] border border-[#f5a623]/20 bg-[#f5a623]/5 px-5 py-3.5">
            <Sparkles className="h-4 w-4 shrink-0 text-[#f5a623]" />
            <p className="flex-1 text-[13px] text-[#f5a623]">
              <strong className="font-semibold">Demo mode</strong> — sample data. These aren&apos;t real tests.
            </p>
            <button onClick={() => setShowDemo(false)} className="cursor-pointer text-[#f5a623]/60 hover:text-[#f5a623]">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── Three-column layout ── */}
        <div className="flex gap-5">
          {/* ═══ COLUMN 1 (22%) — Overview + Navigation ═══ */}
          <ErrorBoundary label="Overview">
          <div className="w-[22%] shrink-0 flex flex-col gap-4">
            {/* Overview */}
            <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-4">
              <h2 className="mb-3 text-[13px] font-semibold text-[#ededed]">Overview</h2>
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
              <div className="rounded-[8px] border border-[#f5a623]/20 bg-[#f5a623]/5 px-3 py-2.5">
                <p className="text-[11px] leading-relaxed text-[#f5a623]/80">
                  No conversions yet. Make sure your{' '}
                  <a href="/docs#goals" target="_blank" className="underline hover:opacity-80">conversion goal</a>{' '}
                  is set up — without it, variante can&apos;t track results.
                </p>
              </div>
            )}

            {/* Navigation card — bottom of column */}
            <NavCard
              email={email}
              plan={plan}
              hasVerifiedDomain={hasVerifiedDomain}
              hasFigmaPlugin={hasFigmaPlugin}
            />
          </div>
          </ErrorBoundary>

          {/* ═══ COLUMN 2 (28%) — AI: What to test next + Auto-optimize ═══ */}
          <ErrorBoundary label="AI">
          <div className="w-[28%] shrink-0">
            <WhatToTestNext
              siteUrl={siteUrl}
              plan={plan}
              setupComplete={setupComplete}
              domain={primaryDomain}
            />
          </div>
          </ErrorBoundary>

          {/* ═══ COLUMN 3 (50%) — Tests ═══ */}
          <ErrorBoundary label="Tests">
          <div className="w-[50%] shrink-0 min-w-0">
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
              <Tooltip content={sortAsc ? 'Newest first' : 'Oldest first'}>
                <button
                  onClick={() => setSortAsc((v) => !v)}
                  className="flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-white/10 bg-[#0a0a0a] text-[#ededed]/62 transition-colors hover:border-white/[0.18] hover:text-[#ededed]"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
              <FilterDropdown filter={filter} onChange={setFilter} />
              <Tooltip content="Refresh test list">
                <button
                  onClick={() => router.refresh()}
                  className="flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-white/10 bg-[#0a0a0a] text-[#ededed]/62 transition-colors hover:border-white/[0.18] hover:text-[#ededed]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
              <Tooltip content={hasVerifiedDomain ? 'Create new test' : 'Add your website first'}>
                <button
                  onClick={() => hasVerifiedDomain && setNewTestOpen(true)}
                  disabled={!hasVerifiedDomain}
                  className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[6px] bg-white px-3 py-1.5 text-[11px] font-semibold text-black transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-25"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New test
                </button>
              </Tooltip>
            </div>

            {/* New test flow overlay */}
            {newTestOpen && (
              <NewTestFlow
                apiToken={apiToken}
                hasFigmaPlugin={hasFigmaPlugin}
                isAtFreeLimit={!isPro && testList.filter(t => t.status !== 'done').length >= 1}
                onClose={() => setNewTestOpen(false)}
              />
            )}

            {/* Test grid, empty state, or demo cards */}
            {demoActive ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {DEMO_TESTS.map((t) => (
                  <TestCard key={t.id} t={t} highlight={false} onDelete={handleDeleteTest} from="overview" />
                ))}
              </div>
            ) : testList.length === 0 ? (
              <OnboardingCards onNewTest={() => setNewTestOpen(true)} hasFigmaPlugin={hasFigmaPlugin} hasVerifiedDomain={hasVerifiedDomain} onLoadDemo={() => setShowDemo(true)} />
            ) : filteredTests.length === 0 ? (
              <EmptyState
                icon={Search}
                title={query ? `No tests match "${query}"` : 'No tests found'}
                description={query ? 'Try a different search term or clear the filter.' : 'Create your first test to get started.'}
              >
                {!query && (
                  <button
                    onClick={() => hasVerifiedDomain && setNewTestOpen(true)}
                    disabled={!hasVerifiedDomain}
                    className="inline-flex items-center gap-1.5 rounded-[6px] bg-white px-3.5 py-2 text-[12px] font-semibold text-black transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-25"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New test
                  </button>
                )}
              </EmptyState>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredTests.map((t, i) => (
                  <TestCard key={t.id} t={t} highlight={highlightNew && i === 0} onDelete={handleDeleteTest} from="overview" />
                ))}
              </div>
            )}
          </div>
          </ErrorBoundary>
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

function OnboardingCards({ onNewTest, hasFigmaPlugin, hasVerifiedDomain, onLoadDemo }: { onNewTest: () => void; hasFigmaPlugin: boolean; hasVerifiedDomain: boolean; onLoadDemo: () => void }) {
  const setupReady = hasVerifiedDomain && hasFigmaPlugin

  return (
    <div className="space-y-4">
      {/* Demo card — always shown, most prominent */}
      <div className="rounded-[10px] border border-[#f5a623]/15 bg-[#f5a623]/[0.03] p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#f5a623]/10">
            <Sparkles className="h-5 w-5 text-[#f5a623]" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#ededed]">See how it works — in 10 seconds</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#ededed]/60">
              Load sample test data and explore the full dashboard. No setup, no snippet, no real visitors.
            </p>
            <button
              onClick={onLoadDemo}
              className="mt-3 inline-flex items-center gap-1.5 rounded-[6px] bg-white px-3.5 py-2 text-[12px] font-semibold text-black transition-opacity hover:opacity-85"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Load demo data
            </button>
          </div>
        </div>
      </div>

      {/* Quick-start guide */}
      <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-5">
        <p className="text-[13px] font-semibold text-[#ededed]">Quick-start guide</p>
        <p className="mt-1 text-[12px] text-[#ededed]/60">Three steps to your first real test.</p>

        <div className="mt-4 space-y-2.5">
          {/* Step 1: Add website */}
          <StepRow
            num={1}
            label="Add your website"
            hint="Connect a domain to run tests on"
            done={hasVerifiedDomain}
            action={hasVerifiedDomain ? null : { label: 'Add website', href: '/dashboard/account' }}
            icon={Globe}
          />
          {/* Step 2: Install snippet */}
          <StepRow
            num={2}
            label="Install the snippet"
            hint="One line in &lt;head&gt; enables A/B testing"
            done={hasFigmaPlugin}
            action={hasFigmaPlugin ? null : { label: 'Run setup check', href: '/dashboard/setup' }}
            icon={Code2}
          />
          {/* Step 3: Create first test */}
          <StepRow
            num={3}
            label="Create your first test"
            hint="Pick an element, design a variant, ship it"
            done={false}
            action={setupReady ? { label: 'New test', onClick: onNewTest } : null}
            icon={FlaskConical}
            locked={!setupReady}
          />
        </div>
      </div>
    </div>
  )
}

function StepRow({ num, label, hint, done, action, icon: Icon, locked }: {
  num: number
  label: string
  hint: string
  done: boolean
  action: { label: string; href?: string; onClick?: () => void } | null
  icon: React.ComponentType<{ className?: string }>
  locked?: boolean
}) {
  return (
    <div className={`flex items-center gap-3 rounded-[8px] border px-4 py-3 ${
      done ? 'border-[#2fd76c]/15 bg-[#2fd76c]/[0.04]' : 'border-white/[0.06] bg-[#111111]'
    }`}>
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
        done ? 'bg-[#2fd76c] text-black' : locked ? 'bg-white/[0.06] text-[#ededed]/30' : 'bg-white/[0.08] text-[#ededed]'
      }`}>
        {done ? <Check className="h-3 w-3" /> : num}
      </div>
      <Icon className={`h-3.5 w-3.5 shrink-0 ${done ? 'text-[#2fd76c]/80' : locked ? 'text-[#ededed]/30' : 'text-[#ededed]/55'}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-[12px] font-medium ${locked ? 'text-[#ededed]/30' : done ? 'text-[#2fd76c]' : 'text-[#ededed]'}`}>{label}</p>
        <p className={`text-[11px] ${done ? 'text-[#2fd76c]/70' : 'text-[#ededed]/55'}`}>{hint}</p>
      </div>
      {action && !done && (
        action.href ? (
          <Link href={action.href} className="shrink-0 rounded-[5px] border border-white/[0.12] px-2.5 py-1.5 text-[11px] font-medium text-[#ededed]/70 transition-colors hover:border-white/25 hover:text-[#ededed]">
            {action.label}
          </Link>
        ) : action.onClick ? (
          <button onClick={action.onClick} className="shrink-0 cursor-pointer rounded-[5px] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-black transition-opacity hover:opacity-85">
            {action.label}
          </button>
        ) : null
      )}
    </div>
  )
}
/* ── Navigation card (replaces sidebar) ── */

function avatarColor(email: string): string {
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash)
  const colors = ['#2fd76c', '#f5a623', '#f5455c', '#ededed']
  return colors[Math.abs(hash) % colors.length]
}

function initials(email: string): string {
  const [name] = email.split('@')
  return name.slice(0, 2).toUpperCase()
}

function NavCard({ email, plan, hasVerifiedDomain, hasFigmaPlugin }: {
  email: string
  plan: string
  hasVerifiedDomain: boolean
  hasFigmaPlugin: boolean
}) {
  const isPro = plan === 'pro' || plan === 'agency'
  const setupOk = hasVerifiedDomain && hasFigmaPlugin
  const setupPartial = hasVerifiedDomain || hasFigmaPlugin

  return (
    <div className="mt-auto rounded-[10px] border border-white/10 bg-[#0a0a0a] p-4">
      {/* Logo row */}
      <Link href="/dashboard" className="flex items-center gap-2 mb-4">
        <PandaLogo className="h-5 w-5 rounded-[5px]" />
        <span className="text-[13px] font-medium text-[#ededed]">variante</span>
        {isPro && (
          <span className="ml-auto rounded-[4px] border border-white/[0.15] px-1.5 py-0.5 text-[9px] font-semibold uppercase text-[#ededed]/50">
            {plan}
          </span>
        )}
      </Link>

      {/* Nav links */}
      <div className="space-y-0.5">
        <NavRow icon={CreditCard} label="Billing" href="/dashboard/billing" />
        <NavRow icon={Settings} label="Account" href="/dashboard/account" />
        <NavRow
          icon={HeartPulse}
          label="Setup"
          href="/dashboard/setup"
          dot={setupOk ? 'ok' : setupPartial ? 'pro' : 'err'}
        />
      </div>

      {/* Divider + profile */}
      <div className="mt-3 border-t border-white/[0.06] pt-3">
        <Link
          href="/dashboard/account"
          className="flex items-center gap-2.5 rounded-[6px] p-[5px] transition-colors duration-150 hover:bg-[#111111]"
        >
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
            style={{ background: `${avatarColor(email)}1f`, color: avatarColor(email) }}
          >
            {initials(email)}
          </div>
          <span className="truncate text-[11px] font-medium text-[#ededed]/50">{email}</span>
        </Link>
      </div>
    </div>
  )
}

function NavRow({ icon: Icon, label, href, dot }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  dot?: 'ok' | 'pro' | 'err'
}) {
  const dotColor = dot === 'ok' ? T.ok : dot === 'pro' ? T.pro : dot === 'err' ? T.err : undefined
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-[6px] px-[9px] py-[7px] text-[12px] text-[#ededed]/55 transition-colors duration-150 hover:bg-[#111111] hover:text-[#ededed]/80"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
      {dot && (
        <span
          className="ml-auto h-2 w-2 shrink-0 rounded-full"
          style={{ background: dotColor }}
        />
      )}
    </Link>
  )
}