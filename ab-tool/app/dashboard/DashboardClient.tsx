'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { useTestList } from '@/lib/useTestList'
import { useToast } from '@/app/components/Toast'
import { Tooltip } from '@/app/components/Tooltip'
import { EmptyState } from '@/app/components/EmptyState'
import { TestCreationPanel } from './TestCreationPanel'
import { TestCard, type TestRow } from './components/TestCard'
import { ErrorBoundary } from './components/ErrorBoundary'
import {
  FilterDropdown,
} from './components/FilterDropdown'
import {
  FlaskConical,
  Users,
  TrendingUp,
  Percent,
  Search,
  ArrowUpDown,
  RefreshCw,
  Plus,
  Check,
  Globe,
} from 'lucide-react'

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
  userId,
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
  userId: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [newTestOpen, setNewTestOpen] = useState(openNewTest ?? false)
  const isPro = plan === 'pro' || plan === 'agency'

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

  /* ── Aggregate stats ── */
  const activeTests = testList.filter((t) => t.status === 'active').length
  const totalVisitors = testList.reduce((s, t) => s + (t.visitors_a ?? 0) + (t.visitors_b ?? 0), 0)
  const totalConversions = testList.reduce((s, t) => s + (t.conversions_a ?? 0) + (t.conversions_b ?? 0), 0)
  const overallCR = totalVisitors > 0 ? (totalConversions / totalVisitors) * 100 : 0

  const lifts = testList
    .map((t) => {
      const crA = (t.visitors_a ?? 0) > 0 ? (t.conversions_a ?? 0) / (t.visitors_a ?? 0) : 0
      const crB = (t.visitors_b ?? 0) > 0 ? (t.conversions_b ?? 0) / (t.visitors_b ?? 0) : 0
      return crA > 0 ? ((crB - crA) / crA) * 100 : null
    })
    .filter((l): l is number => l !== null && isFinite(l))
  const avgUplift = lifts.length > 0 ? lifts.reduce((s, l) => s + l, 0) / lifts.length : null

  const winningTests = testList.filter((t) => t.winner !== null).length
  const hasHealthWarnings = testList.some((t) => t.health_status === 'warning' || (t.health_issues && t.health_issues.length > 0))

  /* Hybrid-Onboarding: der User hat seine Variante schon VOR dem Sign-up gesehen,
     aber ohne Snippet geht sie nie live. Das ist der einzige Schritt der jetzt noch
     zählt — also prominent, nicht als Zeile im Test-Grid (Plan §5, "Snippet wird
     nie installiert"). */
  const pendingPreviewTest = !hasVerifiedDomain
    ? testList.find((t) => t.status === 'draft' && t.preview_variant_screenshot_url)
    : undefined

  return (
    <div className="px-5 py-6 sm:px-8">
      {/* Upgraded banner */}
      {upgraded && (
        <div className="mb-5 flex items-center gap-3 rounded-[10px] border border-ok/20 bg-ok/[0.05] px-5 py-3.5">
          <Check className="h-4 w-4 shrink-0 text-ok" />
          <p className="text-[13px] text-ok">
            You&apos;re now on <strong className="font-semibold">Pro</strong> — unlimited experiments, full statistics, no badge.
          </p>
        </div>
      )}

      {/* Hybrid-Onboarding: Variante fertig, Snippet fehlt */}
      {pendingPreviewTest && <PreviewReadyBanner test={pendingPreviewTest} />}

      {/* Content header: scope selector + CTA */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-text">
            {primaryDomain ? primaryDomain : 'All sites'}
          </h1>
          {hasVerifiedDomain && (
            <p className="text-[12px] text-text-3 mt-0.5">
              {testList.length} test{testList.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Tooltip content={hasVerifiedDomain ? 'Create new test' : 'Add your website first'}>
          <button
            onClick={() => hasVerifiedDomain && setNewTestOpen(true)}
            disabled={!hasVerifiedDomain}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[6px] bg-fill-invert px-3 py-2 text-[12px] font-semibold text-text-on-invert transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-25"
          >
            <Plus className="h-3.5 w-3.5" />
            New test
          </button>
        </Tooltip>
      </div>

      {/* Overview cards */}
      {testList.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <OverviewCard
            icon={FlaskConical}
            label="Active Tests"
            value={activeTests.toString()}
          />
          <OverviewCard
            icon={Users}
            label="Visitors"
            value={totalVisitors.toLocaleString()}
          />
          <OverviewCard
            icon={TrendingUp}
            label="Winning Tests"
            value={winningTests.toString()}
            tone={winningTests > 0 ? 'ok' : undefined}
          />
          <OverviewCard
            icon={Percent}
            label="Avg Conv Rate"
            value={`${overallCR.toFixed(1)}%`}
          />
          <OverviewCard
            icon={TrendingUp}
            label="Avg Uplift"
            value={avgUplift !== null ? `${avgUplift > 0 ? '+' : ''}${avgUplift.toFixed(1)}%` : '—'}
            tone={avgUplift !== null && avgUplift > 0 ? 'ok' : avgUplift !== null && avgUplift < 0 ? 'err' : undefined}
          />
        </div>
      )}

      {/* Health warnings */}
      {hasHealthWarnings && (
        <div className="mb-5 rounded-[10px] border border-pro/20 bg-pro/[0.05] px-4 py-3">
          <p className="text-[12px] text-pro/90">
            Some tests have health warnings. Check the test list below for details.
          </p>
        </div>
      )}

      {/* Tests section */}
      <div className="rounded-[10px] border border-border bg-bg-1">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tests…"
              className="w-full h-[30px] rounded-[6px] border border-border bg-bg-0 py-1.5 pl-8 pr-3 text-[13px] text-text placeholder:text-text-3 focus:border-border-strong focus:outline-none"
            />
          </div>
          <Tooltip content={sortAsc ? 'Newest first' : 'Oldest first'}>
            <button
              onClick={() => setSortAsc((v) => !v)}
              className="flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-border bg-bg-0 text-text-2 transition-colors hover:border-border-strong hover:text-text"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <FilterDropdown filter={filter} onChange={setFilter} />
          <Tooltip content="Refresh test list">
            <button
              onClick={() => router.refresh()}
              className="flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-border bg-bg-0 text-text-2 transition-colors hover:border-border-strong hover:text-text"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* New test flow overlay */}
          {newTestOpen && (
            <TestCreationPanel
              apiToken={apiToken}
              onClose={() => setNewTestOpen(false)}
            />
          )}

          {testList.length === 0 ? (
            <EmptyDashboard
              hasVerifiedDomain={hasVerifiedDomain}
              isPro={isPro}
              onNewTest={() => setNewTestOpen(true)}
            />
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
                  className="inline-flex items-center gap-1.5 rounded-[6px] bg-fill-invert px-3.5 py-2 text-[12px] font-semibold text-text-on-invert transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-25"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New test
                </button>
              )}
            </EmptyState>
          ) : (
            <ErrorBoundary label="Tests">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredTests.map((t, i) => (
                  <TestCard key={t.id} t={t} highlight={highlightNew && i === 0} onDelete={handleDeleteTest} from="overview" />
                ))}
              </div>
            </ErrorBoundary>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function PreviewReadyBanner({ test }: { test: TestRow }) {
  return (
    <div className="mb-5 flex flex-col gap-4 rounded-[10px] border border-pro/25 bg-pro/[0.05] p-4 sm:flex-row sm:items-center">
      {test.preview_variant_screenshot_url && (
        // eslint-disable-next-line @next/next/no-img-element -- Supabase-Storage-URL, kein next/image-Loader nötig
        <img
          src={test.preview_variant_screenshot_url}
          alt=""
          className="h-20 w-32 shrink-0 rounded-[6px] border border-border object-cover object-top"
        />
      )}
      <div className="min-w-0 flex-1">
        <h2 className="text-[14px] font-semibold text-text">Your variant is ready — one step left</h2>
        <p className="mt-1 text-[12px] text-text-2">
          <span className="font-medium text-text">{test.name}</span> is saved as a draft. Add the
          one-line snippet to your site and this test goes live — real visitors, real numbers.
        </p>
      </div>
      <a
        href="/dashboard/health"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-[6px] bg-fill-invert px-4 py-2.5 text-[12px] font-semibold text-text-on-invert transition-opacity hover:opacity-85"
      >
        <Globe className="h-3.5 w-3.5" />
        Install snippet
      </a>
    </div>
  )
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  tone?: 'ok' | 'pro' | 'err'
}) {
  const colorClass = tone === 'ok' ? 'text-ok' : tone === 'pro' ? 'text-pro' : tone === 'err' ? 'text-err' : 'text-text'
  return (
    <div className="rounded-[10px] border border-border bg-bg-1 p-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0 text-text-3" />
        <span className="text-[11px] text-text-3 truncate">{label}</span>
      </div>
      <p className={`text-[18px] font-semibold tabular-nums leading-tight ${colorClass}`}>
        {value}
      </p>
    </div>
  )
}

function EmptyDashboard({
  hasVerifiedDomain,
  isPro,
  onNewTest,
}: {
  hasVerifiedDomain: boolean
  isPro: boolean
  onNewTest: () => void
}) {
  return (
    <div className="py-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-bg-2">
        <FlaskConical className="h-6 w-6 text-text-3" />
      </div>
      <h2 className="text-[15px] font-semibold text-text">
        {hasVerifiedDomain ? 'Create your first test' : 'Add your website'}
      </h2>
      <p className="mt-1.5 text-[13px] text-text-2 max-w-sm mx-auto">
        {hasVerifiedDomain
          ? 'Run your first A/B test in minutes. Pick a page element, let the AI generate a variant, and go live.'
          : 'Connect a domain to start testing. Paste a one-line snippet into your site\'s <head> — done.'}
      </p>
      <div className="mt-5">
        {hasVerifiedDomain ? (
          <button
            onClick={onNewTest}
            className="inline-flex items-center gap-1.5 rounded-[6px] bg-fill-invert px-4 py-2.5 text-[13px] font-semibold text-text-on-invert transition-opacity hover:opacity-85"
          >
            <Plus className="h-4 w-4" />
            New test
          </button>
        ) : (
          <a
            href="/dashboard/health"
            className="inline-flex items-center gap-1.5 rounded-[6px] bg-fill-invert px-4 py-2.5 text-[13px] font-semibold text-text-on-invert transition-opacity hover:opacity-85"
          >
            <Globe className="h-4 w-4" />
            Run health check
          </a>
        )}
      </div>
      {!isPro && (
        <p className="mt-3 text-[11px] text-text-3">
          Free plan: 1 active test, 1 domain.{' '}
          <a href="/dashboard/billing" className="underline hover:text-text-2 transition-colors">Upgrade</a>
        </p>
      )}
    </div>
  )
}
