'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { useTestList } from '@/lib/useTestList'
import { Tooltip } from '@/app/components/Tooltip'
import { EmptyState } from '@/app/components/EmptyState'
import { NewTestDrawer } from './components/NewTestDrawer'
import { TestCard, type TestRow } from './components/TestCard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { WhatToTestNext } from './components/WhatToTestNext'
import { AgentPanel } from './components/AgentPanel'
import {
  FilterDropdown,
} from './components/FilterDropdown'
import {
  FlaskConical,
  Search,
  ArrowUpDown,
  RefreshCw,
  Plus,
  Check,
  Globe,

  ChevronDown,
} from 'lucide-react'
import { SnippetStatusBadge } from './components/SnippetStatusBadge'

// ponytail: apiToken/hasFigmaPlugin/email waren tote Props — nie im Body
// verwendet, aber vom Server in den HTML-Payload serialisiert. Bei apiToken
// war das ein Secret ohne Grund im Client-Markup (Plan SEC-10/CODE-01).
export function DashboardClient({
  plan,
  tests,
  hasVerifiedDomain,
  primaryDomain,
  verifiedAt,
  allVerifiedDomains,
  highlightNew,
  upgraded,
  openNewTest,
  userId,
}: {
  plan: string
  tests: TestRow[]
  hasVerifiedDomain: boolean
  primaryDomain: string | null
  verifiedAt: string | null
  allVerifiedDomains: { url: string; verifiedAt: string | null }[]
  highlightNew?: boolean
  upgraded?: boolean
  openNewTest?: boolean
  userId: string
}) {
  const router = useRouter()
  const [newTestOpen, setNewTestOpen] = useState(openNewTest ?? false)
  const [drawerOpenCount, setDrawerOpenCount] = useState(0)
  const isPro = plan === 'pro' || plan === 'agency'

  // ── Scope selector (localStorage-persisted) ──
  const scopeKey = `dashboard-scope:${userId}`
  const [storedScope, setScope] = useState<string>(() => {
    if (typeof window === 'undefined') return 'all'
    return localStorage.getItem(scopeKey) ?? 'all'
  })

  const domainOptions = useMemo(() => {
    const urls = allVerifiedDomains.map((d) => d.url)
    return ['all', ...urls]
  }, [allVerifiedDomains])

  const setScopeAndPersist = (val: string) => {
    setScope(val)
    try { localStorage.setItem(scopeKey, val) } catch { /* noop */ }
  }

  // ponytail: Eine geloeschte Domain machte den gespeicherten Scope ungueltig.
  // Vorher korrigierte das ein Effect — also ein Render mit ungueltigem Scope
  // (leeres Dashboard), dann ein zweiter mit 'all'. Jetzt abgeleitet: ein Render.
  const scope = domainOptions.includes(storedScope) ? storedScope : 'all'

  const {
    testList,
    query,
    setQuery,
    filter,
    setFilter,
    sortAsc,
    setSortAsc,
    filteredTests,
    handleDeleteTest,
    addTest,
  } = useTestList({ initial: tests, sort: true })

  const scopedTests = useMemo(() => {
    if (scope === 'all') return testList
    return testList.filter((t) => t.site_url === scope || t.site_url?.includes(scope))
  }, [testList, scope])

  // Deep-Link ?newTest=1 waehrend Client-Navigation: Prop-Wechsel im Render
  // auswerten statt per Effect (sonst blitzt das Dashboard ohne Drawer auf).
  const [prevOpenNewTest, setPrevOpenNewTest] = useState(openNewTest)
  if (prevOpenNewTest !== openNewTest) {
    setPrevOpenNewTest(openNewTest)
    if (openNewTest) setNewTestOpen(true)
  }

  /* ── Aggregate stats (scoped) ── */

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

  /* ── Aggregate stats (scoped) ── */
  const activeTests = scopedTests.filter((t) => t.status === 'active').length
  const totalVisitors = scopedTests.reduce((s, t) => s + (t.visitors_a ?? 0) + (t.visitors_b ?? 0), 0)
  const totalConversions = scopedTests.reduce((s, t) => s + (t.conversions_a ?? 0) + (t.conversions_b ?? 0), 0)
  const overallCR = totalVisitors > 0 ? (totalConversions / totalVisitors) * 100 : 0

  const lifts = scopedTests
    .map((t) => {
      const crA = (t.visitors_a ?? 0) > 0 ? (t.conversions_a ?? 0) / (t.visitors_a ?? 0) : 0
      const crB = (t.visitors_b ?? 0) > 0 ? (t.conversions_b ?? 0) / (t.visitors_b ?? 0) : 0
      return crA > 0 ? ((crB - crA) / crA) * 100 : null
    })
    .filter((l): l is number => l !== null && isFinite(l))
  const avgUplift = lifts.length > 0 ? lifts.reduce((s, l) => s + l, 0) / lifts.length : null

  const winningTests = scopedTests.filter((t) => t.winner !== null).length
  const hasHealthWarnings = scopedTests.some((t) => t.health_status === 'warning' || (t.health_issues && t.health_issues.length > 0))

  /* Hybrid-Onboarding: der User hat seine Variante schon VOR dem Sign-up gesehen,
     aber ohne Snippet geht sie nie live. Das ist der einzige Schritt der jetzt noch
     zählt — also prominent, nicht als Zeile im Test-Grid (Plan §5, "Snippet wird
     nie installiert"). */
  const pendingPreviewTest = !hasVerifiedDomain
    ? scopedTests.find((t) => t.status === 'draft' && t.preview_variant_screenshot_url)
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

      {/* Snippet Status Badge — immer sichtbar */}
      <SnippetStatusBadge
        hasVerifiedDomain={hasVerifiedDomain}
        primaryDomain={primaryDomain}
        verifiedAt={verifiedAt}
        allVerifiedDomains={allVerifiedDomains}
        onDomainVerified={() => router.refresh()}
      />

      {/* Hybrid-Onboarding: Variante fertig, Snippet fehlt */}
      {pendingPreviewTest && <PreviewReadyBanner test={pendingPreviewTest} />}

      {/* Content header: scope selector + CTA */}
      <div className="mb-5 flex items-center justify-between">
        <div className="relative">
          {domainOptions.length > 1 ? (
            <select
              value={scope}
              onChange={(e) => setScopeAndPersist(e.target.value)}
              className="appearance-none bg-transparent text-[15px] font-semibold text-text pr-5 cursor-pointer outline-none"
            >
              <option value="all">All sites</option>
              {domainOptions.filter((d) => d !== 'all').map((url) => (
                <option key={url} value={url}>{url}</option>
              ))}
            </select>
          ) : (
            <h1 className="text-[15px] font-semibold text-text">
              {primaryDomain ? primaryDomain : 'All sites'}
            </h1>
          )}
          {domainOptions.length > 1 && (
            <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3" />
          )}
          {hasVerifiedDomain && (
            <p className="text-[12px] text-text-3 mt-0.5">
              {filteredTests.length} test{filteredTests.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Tooltip content={hasVerifiedDomain ? 'Create new test' : 'Add your website first'}>
          <button
            onClick={() => hasVerifiedDomain && setNewTestOpen(true)}
            disabled={!hasVerifiedDomain}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[6px] bg-fill-invert px-3 py-2 text-[12px] font-semibold text-text-on-invert transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-25 focus-visible:ring-2 focus-visible:ring-text/20 focus-visible:outline-none"
          >
            <Plus className="h-3.5 w-3.5" />
            New test
          </button>
        </Tooltip>
      </div>

      {/* Overview cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <OverviewCard
            label="Active Tests"
            value={activeTests.toString()}
            tone={activeTests > 0 ? 'ok' : undefined}
          />
          <OverviewCard
            label="Visitors"
            value={totalVisitors.toLocaleString()}
          />
          <OverviewCard
            label="Winning Tests"
            value={winningTests.toString()}
            tone={winningTests > 0 ? 'ok' : undefined}
          />
          <OverviewCard
            label="Avg Conv Rate"
            value={`${overallCR.toFixed(1)}%`}
          />
          <OverviewCard
            label="Avg Uplift"
            value={avgUplift !== null ? `${avgUplift > 0 ? '+' : ''}${avgUplift.toFixed(1)}%` : '—'}
            tone={avgUplift !== null && avgUplift > 0 ? 'ok' : avgUplift !== null && avgUplift < 0 ? 'err' : undefined}
          />
        </div>


      {/* Health warnings */}
      {hasHealthWarnings && (
        <div className="mb-5 rounded-[10px] border border-pro/20 bg-pro-bg px-4 py-3">
          <p className="text-[12px] text-pro/90">
            Some tests have health warnings. Check the test list below for details.
          </p>
        </div>
      )}

      {/* Tests section */}
      <div className="rounded-[10px] border border-border bg-bg-1">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tests…"
              className="w-full h-[36px] rounded-[6px] border border-border bg-bg-0 py-1.5 pl-8 pr-3 text-[13px] text-text placeholder:text-text-3 focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-text/15 focus-visible:outline-none"
            />
          </div>
          <Tooltip content={sortAsc ? 'Newest first' : 'Oldest first'}>
            <button
              onClick={() => setSortAsc((v) => !v)}
              aria-label={sortAsc ? 'Sort: newest first' : 'Sort: oldest first'}
              className="flex h-[36px] w-[36px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-border bg-bg-0 text-text-2 transition-colors hover:border-border-strong hover:text-text focus-visible:ring-2 focus-visible:ring-text/15 focus-visible:outline-none"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <FilterDropdown filter={filter} onChange={setFilter} />
          <Tooltip content="Refresh test list">
            <button
              onClick={() => router.refresh()}
              aria-label="Refresh test list"
              className="flex h-[36px] w-[36px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-border bg-bg-0 text-text-2 transition-colors hover:border-border-strong hover:text-text focus-visible:ring-2 focus-visible:ring-text/15 focus-visible:outline-none"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* New test flow — Drawer Wizard */}
          <NewTestDrawer
            key={`drawer-${newTestOpen ? 'open' : 'closed'}-${drawerOpenCount}`}
            isOpen={newTestOpen}
            onClose={() => setNewTestOpen(false)}
            userId={userId}
            onTestCreated={(createdTest) => {
              setNewTestOpen(false)
              setDrawerOpenCount((c) => c + 1)
              addTest({
                id: createdTest.id,
                name: createdTest.name,
                site_url: createdTest.site_url,
                status: createdTest.status,
                visitors_a: 0,
                visitors_b: 0,
                conversions_a: 0,
                conversions_b: 0,
                winner: null,
                created_at: new Date().toISOString(),
              })
            }}
            verifiedDomains={allVerifiedDomains}
          />

          {scopedTests.length === 0 ? (
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

      {/* Auto-Optimize Agent — available for all users */}
      {hasVerifiedDomain && (
        <div className="mt-6">
          <AgentPanel
            domain={primaryDomain}
            hasVerifiedDomain={hasVerifiedDomain}
          />
        </div>
      )}

      {/* What to test next — AI suggestions for Pro users */}
      {scopedTests.length > 0 && (
        <div className="mt-6">
          <WhatToTestNext
            siteUrl={primaryDomain ? `https://${primaryDomain}` : null}
            plan={plan}
            setupComplete={hasVerifiedDomain}
            domain={primaryDomain}
          />
        </div>
      )}
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
        href="/dashboard"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-[6px] bg-fill-invert px-4 py-2.5 text-[12px] font-semibold text-text-on-invert transition-opacity hover:opacity-85"
      >
        <Globe className="h-3.5 w-3.5" />
        Install snippet
      </a>
    </div>
  )
}

// ponytail: Die `icon`-Prop wurde durchgereicht, aber im Markup nie gerendert.
function OverviewCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'ok' | 'pro' | 'err'
}) {
  const colorClass = tone === 'ok' ? 'text-ok' : tone === 'pro' ? 'text-pro' : tone === 'err' ? 'text-err' : 'text-text'
  const bgTint = tone === 'ok' ? 'bg-ok/[0.04]' : tone === 'err' ? 'bg-err/[0.04]' : ''
  return (
    <div className={`relative rounded-[10px] border border-border bg-bg-1 p-4 ${bgTint}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-text-3">{label}</span>
      </div>
      <p className={`text-[24px] font-semibold tabular-nums leading-none tracking-tight ${colorClass}`}>
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
            Install snippet
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
