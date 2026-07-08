'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { calcSignificance } from '@/lib/significance'
import { NewTestFlow } from './NewTestFlow'
import { TestCard, StatusDot, type TestRow } from './components/TestCard'
import {
  Check,
  FlaskConical,
  Users,
  TrendingUp,
  Zap,
  Plus,
  ArrowRight,
  BarChart3,
  HeartPulse,
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
  highlightNew,
  upgraded,
  openNewTest,
}: {
  plan: string
  apiToken: string
  tests: TestRow[]
  hasFigmaPlugin: boolean
  highlightNew?: boolean
  upgraded?: boolean
  openNewTest?: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [newTestOpen, setNewTestOpen] = useState(openNewTest ?? false)
  const [testList, setTestList] = useState(tests)
  const isPro = plan === 'pro' || plan === 'agency'

  // Open NewTestFlow when ?newTest=1 is in URL
  useEffect(() => {
    if (openNewTest) setNewTestOpen(true)
  }, [openNewTest])

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

            {/* Test grid — empty state or top 3 cards */}
            {testList.length === 0 ? (
              <EmptyState onNewTest={() => setNewTestOpen(true)} hasFigmaPlugin={hasFigmaPlugin} />
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

        {/* ── Health check banner ── */}
        <HealthBanner testsExist={testList.length > 0} />
      </main>
    </>
  )
}

/* ── Sub-components ── */

/** Compact health banner linking to /dashboard/setup for full diagnostics. */
function HealthBanner({ testsExist }: { testsExist: boolean }) {
  return (
    <div className="mt-6 border-t border-white/10 pt-5">
      <Link
        href="/dashboard/setup"
        className="flex items-center gap-3 rounded-[8px] border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 transition-colors hover:border-white/[0.14]"
      >
        <HeartPulse className="h-4 w-4 shrink-0 text-[#ededed]/50" />
        <div className="flex-1">
          <span className="text-[12px] font-medium text-[#ededed]/70">Setup health check</span>
          <span className="ml-2 text-[11px] text-[#ededed]/40">
            {testsExist ? 'Verify snippet, plugin & extension status' : 'Run setup diagnostics to get started'}
          </span>
        </div>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#ededed]/30" />
      </Link>
    </div>
  )
}

/** Empty state when no tests exist — guides to /dashboard/setup. */
function EmptyState({ onNewTest, hasFigmaPlugin }: { onNewTest: () => void; hasFigmaPlugin: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-white/[0.18] py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-white/[0.04]">
        <FlaskConical className="h-5 w-5 text-[#ededed]/40" />
      </div>
      <p className="mt-4 text-[14px] font-medium text-[#ededed]">No tests yet</p>
      <p className="mt-1.5 max-w-[340px] text-[12px] leading-relaxed text-[#ededed]/40">
        {hasFigmaPlugin
          ? 'Create your first variant in Figma and push it here.'
          : 'Run the setup health check first — it walks you through snippet, plugin, and your first test.'}
      </p>
      <div className="mt-5 flex items-center gap-3">
        {!hasFigmaPlugin && (
          <Link
            href="/dashboard/setup"
            className="flex items-center gap-1.5 rounded-[6px] border border-white/[0.18] px-3.5 py-2 text-[12px] font-medium text-[#ededed]/70 transition-colors hover:border-white/25 hover:text-[#ededed]"
          >
            <HeartPulse className="h-3.5 w-3.5" />
            Run setup check
          </Link>
        )}
        {hasFigmaPlugin && (
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
