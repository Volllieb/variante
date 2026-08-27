'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { deriveDecisions, sortByDecisionReadiness } from '@/lib/decisions'
import { aggregatePeriod, buildTrend, type DailyStatRow } from '@/lib/dashboardStats'
import { usePersistedValue } from '@/lib/usePersistedValue'
import { Tooltip } from '@/app/components/Tooltip'
import { NewTestDrawer } from './components/NewTestDrawer'
import { TestCard, type TestRow } from './components/TestCard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { WhatToTestNext } from './components/WhatToTestNext'
import { AgentPanel } from './components/AgentPanel'
import { DecisionList } from './components/DecisionList'
import { PeriodSelector, parsePeriod, periodLabel, periodNote, trendLabel, type Period } from './components/PeriodSelector'
import { TrendChart } from './components/TrendChart'
import {
  FlaskConical,
  Plus,
  Check,
  Globe,
  ChevronDown,
} from 'lucide-react'
import { SnippetStatusBadge } from './components/SnippetStatusBadge'
import { PlanUsageBar } from './components/PlanUsageBar'

/** So viele Tests zeigt die Overview — die vollständige Liste lebt in /dashboard/tests. */
const TOP_TESTS = 5

// ponytail: apiToken/hasFigmaPlugin/email waren tote Props — nie im Body
// verwendet, aber vom Server in den HTML-Payload serialisiert. Bei apiToken
// war das ein Secret ohne Grund im Client-Markup (Plan SEC-10/CODE-01).
export function DashboardClient({
  plan,
  tests,
  dailyStats,
  hasVerifiedDomain,
  primaryDomain,
  verifiedAt,
  allVerifiedDomains,
  domainCount,
  highlightNew,
  upgraded,
  openNewTest,
  userId,
}: {
  plan: string
  tests: TestRow[]
  /** Tagesdeltas der letzten 60 Tage (Migration 039) — Basis für Zeitraum und Trend. */
  dailyStats: DailyStatRow[]
  hasVerifiedDomain: boolean
  primaryDomain: string | null
  verifiedAt: string | null
  allVerifiedDomains: { url: string; verifiedAt: string | null }[]
  domainCount: number
  highlightNew?: boolean
  upgraded?: boolean
  openNewTest?: boolean
  userId: string
}) {
  const router = useRouter()
  const [newTestOpen, setNewTestOpen] = useState(openNewTest ?? false)
  const [resumeTest, setResumeTest] = useState<TestRow | null>(null)
  const [drawerOpenCount, setDrawerOpenCount] = useState(0)
  const isPro = plan === 'pro' || plan === 'agency'

  // ── Scope selector (localStorage-persisted) ──
  const [storedScope, setScopeAndPersist] = usePersistedValue(`dashboard-scope:${userId}`)

  const domainOptions = useMemo(() => {
    const urls = allVerifiedDomains.map((d) => d.url)
    return ['all', ...urls]
  }, [allVerifiedDomains])

  // ponytail: Eine geloeschte Domain machte den gespeicherten Scope ungueltig.
  // Vorher korrigierte das ein Effect — also ein Render mit ungueltigem Scope
  // (leeres Dashboard), dann ein zweiter mit 'all'. Jetzt abgeleitet: ein Render.
  const scope = storedScope && domainOptions.includes(storedScope) ? storedScope : 'all'

  // ── Zeitraum (localStorage-persisted, nach demselben Muster) ──
  const [storedPeriod, setStoredPeriod] = usePersistedValue(`dashboard-period:${userId}`)
  const period = parsePeriod(storedPeriod)
  const setPeriodAndPersist = (val: Period) => setStoredPeriod(String(val))

  // ── Testliste ──
  // Die Overview filtert und sortiert nicht mehr selbst (das ist die Aufgabe
  // von /dashboard/tests), braucht aber weiterhin lokale Mutationen: der
  // NewTestDrawer und die Karten-Menüs melden Anlegen und Löschen zurück.
  const [testList, setTestList] = useState(tests)
  const [prevTests, setPrevTests] = useState(tests)
  if (prevTests !== tests) {
    // Frische Server-Daten nach router.refresh() im Render übernehmen statt
    // per Effect — sonst rendert die Seite erst mit der alten Liste.
    setPrevTests(tests)
    setTestList(tests)
  }

  const handleDeleteTest = useCallback((id: string) => {
    setTestList((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addTest = useCallback((test: TestRow) => {
    setTestList((prev) => [test, ...prev])
  }, [])

  const scopedTests = useMemo(() => {
    if (scope === 'all') return testList
    return testList.filter((t) => t.site_url === scope || t.site_url?.includes(scope))
  }, [testList, scope])

  const openDraftWizard = useCallback((testId: string) => {
    const test = testList.find((t) => t.id === testId)
    if (!test) return
    setResumeTest(test)
    setNewTestOpen(true)
    setDrawerOpenCount((c) => c + 1)
  }, [testList])

  // Deep-Link ?newTest=1 waehrend Client-Navigation: Prop-Wechsel im Render
  // auswerten statt per Effect (sonst blitzt das Dashboard ohne Drawer auf).
  const [prevOpenNewTest, setPrevOpenNewTest] = useState(openNewTest)
  if (prevOpenNewTest !== openNewTest) {
    setPrevOpenNewTest(openNewTest)
    if (openNewTest) setNewTestOpen(true)
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

  /* ── Ebene 2: Entscheidungen ── */
  const decisions = useMemo(() => deriveDecisions(scopedTests), [scopedTests])

  /* ── Ebene 3: Aggregate stats (scoped, zeitraumbezogen) ── */
  const activeTests = scopedTests.filter((t) => t.status === 'active').length
  const lifetimeVisitors = scopedTests.reduce((s, t) => s + (t.visitors_a ?? 0) + (t.visitors_b ?? 0), 0)
  const lifetimeConversions = scopedTests.reduce((s, t) => s + (t.conversions_a ?? 0) + (t.conversions_b ?? 0), 0)

  const scopedIds = useMemo(() => scopedTests.map((t) => t.id), [scopedTests])

  // "All time" liest die Zähler aus `tests` statt aus daily_stats: ein heute
  // angelegter Test hat noch keine Tageszeile, und die Kachel muss zu dem
  // passen, was auf der Testkarte steht. Für 7/30 Tage ist daily_stats die
  // einzige Quelle mit Zeitbezug.
  const periodStats = useMemo(
    () => (period === 'all' ? null : aggregatePeriod(dailyStats, scopedIds, period)),
    [dailyStats, scopedIds, period]
  )

  const visitors = periodStats ? periodStats.current.visitors : lifetimeVisitors
  const conversions = periodStats ? periodStats.current.conversions : lifetimeConversions
  const overallCR = visitors > 0 ? (conversions / visitors) * 100 : 0

  /* ── Ebene 4: Trend ── */
  const trend = useMemo(
    () => buildTrend(dailyStats, scopedIds, period === 'all' ? 60 : period),
    [dailyStats, scopedIds, period]
  )
  const hasTrendData = trend.length >= 2 && trend.some((p) => p.visitors > 0 || p.conversions > 0)

  // ponytail: Der Durchschnitt lief vorher über ALLE Tests — auch über solche
  // mit zwölf Besuchern, deren "Uplift" reines Rauschen ist. Eine Kachel, die
  // "+340 %" zeigt, weil ein Draft zufällig eine Conversion mehr hat, ist keine
  // Kennzahl, sondern eine Falschaussage. Gemittelt wird nur über entschiedene
  // Tests — die einzigen, deren Uplift belastbar ist.
  const lifts = scopedTests
    .filter((t) => t.winner !== null)
    .map((t) => {
      const crA = (t.visitors_a ?? 0) > 0 ? (t.conversions_a ?? 0) / (t.visitors_a ?? 0) : 0
      const crB = (t.visitors_b ?? 0) > 0 ? (t.conversions_b ?? 0) / (t.visitors_b ?? 0) : 0
      return crA > 0 ? ((crB - crA) / crA) * 100 : null
    })
    .filter((l): l is number => l !== null && isFinite(l))
  const avgUplift = lifts.length > 0 ? lifts.reduce((s, l) => s + l, 0) / lifts.length : null

  const winningTests = scopedTests.filter((t) => t.winner !== null).length

  /* ── Ebene 5: Top-Tests nach Entscheidungsreife ── */
  const topTests = useMemo(
    () => sortByDecisionReadiness(scopedTests, decisions).slice(0, TOP_TESTS),
    [scopedTests, decisions]
  )

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
        <div className="mb-5 flex items-center gap-3 rounded-[var(--radius-lg)] border border-ok/20 bg-ok/[0.05] px-5 py-3.5">
          <Check className="h-4 w-4 shrink-0 text-ok" />
          <p className="text-[13px] text-ok">
            You&apos;re now on <strong className="font-semibold">Pro</strong> — unlimited experiments, full statistics, no badge.
          </p>
        </div>
      )}

      {/* ── Ebene 0: Kontextleiste — Domain-Scope + CTA ── */}
      {/* A11Y-05: Bei mehreren Domains ersetzte das <select> das <h1> — die Seite
          hatte dann gar keine Überschrift. sr-only-h1 sorgt für einen stabilen
          Einstiegspunkt, unabhängig von der Domain-Zahl. */}
      <h1 className="sr-only">Dashboard</h1>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="relative min-w-0">
          {domainOptions.length > 1 ? (
            <select
              value={scope}
              onChange={(e) => setScopeAndPersist(e.target.value)}
              aria-label="Filter by domain"
              className="appearance-none bg-transparent text-[15px] font-semibold text-text pr-5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0"
            >
              <option value="all">All domains</option>
              {domainOptions.filter((d) => d !== 'all').map((url) => (
                <option key={url} value={url}>{url}</option>
              ))}
            </select>
          ) : (
            <p className="text-[15px] font-semibold text-text">
              {primaryDomain ? primaryDomain : 'All domains'}
            </p>
          )}
          {domainOptions.length > 1 && (
            <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3" />
          )}
          {hasVerifiedDomain && (
            <p className="text-[12px] text-text-3 mt-0.5">
              {scopedTests.length} test{scopedTests.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {scopedTests.length > 0 && (
            <PeriodSelector period={period} onChange={setPeriodAndPersist} />
          )}
          <Tooltip content={hasVerifiedDomain ? 'Create new test' : 'Saved as draft until snippet is installed'}>
            <button
              onClick={() => setNewTestOpen(true)}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] bg-fill-invert px-3 py-2 text-[12px] font-semibold text-text-on-invert transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-text/20 focus-visible:outline-none"
            >
              <Plus className="h-3.5 w-3.5" />
              New test
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ── Ebene 1: genau EIN Blocker ──
          Verifiziert ist der Snippet-Status Kontext (kompakter Badge), sonst ist
          er DER offene Schritt. Der Preview-Draft ersetzt den Setup-Banner, statt
          sich darüber zu stapeln: zwei Banner untereinander, die dasselbe fordern,
          sind kein doppelter Hinweis, sondern ein halber. */}
      {pendingPreviewTest ? (
        <PreviewReadyBlocker test={pendingPreviewTest} />
      ) : (
        <SnippetStatusBadge
          hasVerifiedDomain={hasVerifiedDomain}
          primaryDomain={primaryDomain}
          verifiedAt={verifiedAt}
          allVerifiedDomains={allVerifiedDomains}
          onDomainVerified={() => router.refresh()}
        />
      )}

      {/* Free plan usage — proactive limit visibility before hitting a wall */}
      <PlanUsageBar plan={plan} activeTests={activeTests} domainCount={domainCount} />

      {/* ── Ebene 2: Entscheidungen ── */}
      <DecisionList decisions={decisions} onFinishDraft={openDraftWizard} />

      {/* ── Ebene 3: KPI-Grid ── */}
      {scopedTests.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <OverviewCard
            label="Active Tests"
            value={activeTests.toString()}
            tone={activeTests > 0 ? 'ok' : undefined}
          />
          <OverviewCard
            label="Visitors"
            value={visitors.toLocaleString()}
            hint={periodLabel(period)}
            hintTitle={periodNote(period)}
            delta={periodStats ? { value: periodStats.delta.visitors, unit: '%' } : undefined}
          />
          <OverviewCard
            label="Winning Tests"
            value={winningTests.toString()}
            tone={winningTests > 0 ? 'ok' : undefined}
          />
          <OverviewCard
            label="Avg Conv Rate"
            value={`${overallCR.toFixed(1)}%`}
            hint={periodLabel(period)}
            hintTitle={periodNote(period)}
            delta={periodStats ? { value: periodStats.delta.crPoints, unit: 'pp' } : undefined}
          />
          <OverviewCard
            label="Avg Uplift"
            value={avgUplift !== null ? `${avgUplift > 0 ? '+' : ''}${avgUplift.toFixed(1)}%` : '—'}
            hint={avgUplift !== null ? `Across ${lifts.length} decided test${lifts.length !== 1 ? 's' : ''}` : 'No decided test yet'}
            tone={avgUplift !== null && avgUplift > 0 ? 'ok' : avgUplift !== null && avgUplift < 0 ? 'err' : undefined}
          />
        </div>
      )}

      {/* ── Ebene 4: Trend ── */}
      {hasTrendData && <TrendChart data={trend} label={trendLabel(period)} />}

      {/* New test flow — Drawer Wizard. Liegt außerhalb der Test-Karte, damit er
          auch im Leerzustand und aus der Entscheidungs-Liste heraus öffnen kann. */}
      <NewTestDrawer
        key={`drawer-${newTestOpen ? 'open' : 'closed'}-${drawerOpenCount}`}
        isOpen={newTestOpen}
        onClose={() => { setNewTestOpen(false); setResumeTest(null) }}
        userId={userId}
        resumeTest={resumeTest}
        onTestCreated={(createdTest) => {
          setNewTestOpen(false)
          setResumeTest(null)
          setDrawerOpenCount((c) => c + 1)
          if (resumeTest) {
            // Resume: update the existing draft test in the list
            setTestList((prev) => prev.map((t) =>
              t.id === resumeTest.id
                ? { ...t, name: createdTest.name, site_url: createdTest.site_url, status: createdTest.status, health_status: null, health_issues: null }
                : t
            ))
          } else {
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
          }
        }}
        verifiedDomains={allVerifiedDomains}
      />

      {/* ── Ebene 5: die dringendsten Tests ── */}
      <div className="mb-6 rounded-[var(--radius-lg)] border border-border bg-bg-1">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-text-3">
            Your tests
          </h2>
          {scopedTests.length > 0 && (
            <a
              href="/dashboard/tests"
              className="text-[12px] font-medium text-text-3 transition-colors hover:text-text-2"
            >
              View all {scopedTests.length} →
            </a>
          )}
        </div>

        <div className="p-4">
          {scopedTests.length === 0 ? (
            <EmptyDashboard
              hasVerifiedDomain={hasVerifiedDomain}
              isPro={isPro}
              onNewTest={() => setNewTestOpen(true)}
            />
          ) : (
            <ErrorBoundary label="Tests">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {topTests.map((t, i) => (
                  <TestCard key={t.id} t={t} highlight={highlightNew && i === 0} onDelete={handleDeleteTest} from="overview" onCompleteDraft={(test) => { setResumeTest(test); setNewTestOpen(true); setDrawerOpenCount((c) => c + 1) }} />
                ))}
              </div>
            </ErrorBoundary>
          )}
        </div>
      </div>

      {/* ── Ebene 6: Agent + AI-Vorschläge ── */}
      {hasVerifiedDomain && (
        <div className="mb-6">
          <AgentPanel
            domain={primaryDomain}
            hasVerifiedDomain={hasVerifiedDomain}
          />
        </div>
      )}

      {scopedTests.length > 0 && (
        <div className="mb-6">
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

/**
 * Der Blocker für den Hybrid-Onboarding-Fall: Variante existiert schon, das
 * Snippet fehlt. Ersetzt den Snippet-Banner, statt ihn zu verdoppeln — die
 * Verifikation selbst läuft dann über /dashboard/account.
 */
function PreviewReadyBlocker({ test }: { test: TestRow }) {
  return (
    <div className="mb-5 flex flex-col gap-4 rounded-[var(--radius-lg)] border border-pro/25 bg-pro/[0.05] p-4 sm:flex-row sm:items-center">
      {test.preview_variant_screenshot_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={test.preview_variant_screenshot_url} alt="" className="h-20 w-32 shrink-0 rounded-[var(--radius-md)] border border-border object-cover object-top" />
      )}
      <div className="min-w-0 flex-1">
        <h2 className="text-[14px] font-semibold text-text">Your variant is ready — one step left</h2>
        <p className="mt-1 text-[12px] text-text-2">
          <span className="font-medium text-text">{test.name}</span> is saved as a draft. Add the one-line snippet to your site and this test goes live.
        </p>
      </div>
      <a href="/dashboard/account" className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] bg-fill-invert px-4 py-2.5 text-[12px] font-semibold text-text-on-invert transition-opacity hover:opacity-85">
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
  hint,
  hintTitle,
  delta,
  tone,
}: {
  label: string
  value: string
  hint?: string
  /** Erklärung zum Zeitbezug, als title auf der Hint-Zeile. */
  hintTitle?: string
  /** Veränderung zur Vorperiode. `value: null` = keine Vorperiode zum Vergleichen. */
  delta?: { value: number | null; unit: '%' | 'pp' }
  tone?: 'ok' | 'pro' | 'err'
}) {
  const colorClass = tone === 'ok' ? 'text-ok' : tone === 'pro' ? 'text-pro' : tone === 'err' ? 'text-err' : 'text-text'
  const bgTint = tone === 'ok' ? 'bg-ok/[0.04]' : tone === 'err' ? 'bg-err/[0.04]' : ''

  // Ein Δ von exakt 0 ist eine Aussage ("unverändert"), null dagegen heißt:
  // die Vorperiode war leer — dann ist jede Prozentangabe erfunden.
  const d = delta?.value ?? null
  const deltaClass = d === null || Math.abs(d) < 0.05 ? 'text-text-3' : d > 0 ? 'text-ok' : 'text-err'

  return (
    <div className={`relative rounded-[var(--radius-lg)] border border-border bg-bg-1 p-4 ${bgTint}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-text-3">{label}</span>
      </div>
      <p className={`text-[24px] font-semibold tabular-nums leading-none tracking-tight ${colorClass}`}>
        {value}
      </p>
      {(hint || delta) && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-text-3">
          {delta && (
            <span className={`tabular-nums font-medium ${deltaClass}`}>
              {d === null ? '—' : `${d > 0 ? '+' : ''}${d.toFixed(1)}${delta.unit}`}
            </span>
          )}
          {hint && <span className="truncate" title={hintTitle}>{hint}</span>}
        </p>
      )}
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
      <h2 className="text-[15px] font-semibold text-text">Create your first test</h2>
      <p className="mt-1.5 text-[13px] text-text-2 max-w-sm mx-auto">
        {hasVerifiedDomain
          ? 'Run your first A/B test in minutes. Pick a page element, let the AI generate a variant, and go live.'
          : 'Tests are saved as drafts until you install the snippet on your site.'}
      </p>
      <div className="mt-5 flex items-center justify-center gap-3">
        <button
          onClick={onNewTest}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-fill-invert px-4 py-2.5 text-[13px] font-semibold text-text-on-invert transition-opacity hover:opacity-85"
        >
          <Plus className="h-4 w-4" />
          New test
        </button>
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
