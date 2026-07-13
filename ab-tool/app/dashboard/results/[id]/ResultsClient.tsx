'use client'

import { ExperimentData } from '@/lib/getExperimentStats'
import { VariantPreview } from '@/app/components/VariantPreview'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTestUpdate } from '@/lib/useRealtime'
import Link from 'next/link'
import {
  ArrowLeft,
  RefreshCw,
  Users,
  Target,
  Lock,
  Check,
  Pause,
  Play,
  Pencil,
  X,
  Trash2,
  Activity,
  BarChart3,
  Table2,
} from 'lucide-react'

const T = {
  ok: '#2fd76c',
  pro: '#f5a623',
  err: '#f5455c',
}

function formatCreatedAt(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  if (m > 0) return `${m}m ago`
  return 'just now'
}

type DailyRow = {
  date: string
  visitors_a: number
  visitors_b: number
  conversions_a: number
  conversions_b: number
}

type AnalyticsData = {
  current: {
    visitors_a: number
    visitors_b: number
    conversions_a: number
    conversions_b: number
    significance: number
    winner: string | null
  }
  daily: DailyRow[]
}

export function ResultsClient({ initial, experimentId }: { initial: ExperimentData; experimentId: string }) {
  const [data, setData] = useState(initial)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false)
  const [minVisitors, setMinVisitors] = useState(initial.minVisitors)
  const [minUplift, setMinUplift] = useState(initial.minUplift)
  const [saved, setSaved] = useState(false)
  const [editingB, setEditingB] = useState(false)
  const [draftB, setDraftB] = useState(initial.variantBHtml || '')
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showRawData, setShowRawData] = useState(false)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const backHref = from === 'tests' ? '/dashboard/tests' : '/dashboard'

  useEffect(() => {
    if (deleteError) {
      const t = setTimeout(() => setDeleteError(null), 6000)
      return () => clearTimeout(t)
    }
  }, [deleteError])

  // Fetch analytics (Pro only, 402 if not)
  useEffect(() => {
    if (!data.pro || analyticsLoaded) return
    fetch(`/api/analytics/${experimentId}`)
      .then(res => res.ok ? res.json() : null)
      .then(json => { if (json) setAnalytics(json) })
      .finally(() => setAnalyticsLoaded(true))
  }, [experimentId, data.pro, analyticsLoaded])

  async function upgrade() {
    setBusy(true)
    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setBusy(false)
    }
  }

  async function deleteTest() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/tests/${experimentId}?confirm=true`, { method: 'DELETE' })
      if (res.ok) {
        router.push(backHref)
        router.refresh()
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to delete test' }))
        setDeleteError(err.error || 'Failed to delete test')
      }
    } finally {
      setDeleting(false)
    }
  }

  async function refresh() {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/results/${experimentId}`)
      if (res.ok) setData(await res.json())
    } catch {}
    setRefreshing(false)
  }

  // Realtime: DB-Update → refreshen mit 2s Debounce (ersetzt setInterval-Polling)
  const refreshDebounced = useCallback(() => {
    if (refreshTimer.current) return
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null
      refresh()
    }, 2000)
  }, [])

  useTestUpdate(experimentId, refreshDebounced)

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
    }
  }, [])

  const { name, status, significance, winner, variants, pro, created_at } = data
  const [a, b] = variants
  const totalVisitors = a.views + b.views
  const done = status === 'done' || !!winner
  const visitorPct = Math.min(100, Math.round((totalVisitors / Math.max(1, minVisitors)) * 100))

  const lift = a.views > 0 && a.conversions > 0
    ? ((b.cr - a.cr) / a.cr) * 100
    : null

  // Sparkline helpers — cumulative daily totals
  const cumA = (analytics?.daily || []).map((d) => d.visitors_a)
  const cumB = (analytics?.daily || []).map((d) => d.visitors_b)
  const cumConvA = (analytics?.daily || []).map((d) => d.conversions_a)
  const cumConvB = (analytics?.daily || []).map((d) => d.conversions_b)
  const cumTotal = cumA.map((v, i) => v + cumB[i])
  const allValues = [...cumA, ...cumB]
  const sparkMax = Math.max(1, ...allValues)
  const dates = (analytics?.daily || []).map((d) => {
    const date = new Date(d.date)
    return `${date.getDate()}.${date.getMonth() + 1}.`
  })

  async function saveConfig() {
    try {
      await fetch(`/api/tests/${experimentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ min_visitors: minVisitors, min_uplift: minUplift }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
  }

  async function saveVariantB() {
    try {
      await fetch(`/api/tests/${experimentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant_b_html: draftB || null }),
      })
      setEditingB(false)
      await refresh()
    } catch {}
  }

  async function toggleStatus(next: 'active' | 'paused') {
    await fetch(`/api/tests/${experimentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    refresh()
  }

  const statusColor =
    status === 'active'
      ? 'bg-ok-bg text-ok'
      : status === 'paused'
      ? 'bg-pro-bg text-pro'
      : 'bg-bg-2 text-text-3'

  return (
    <div className="text-[#ededed] antialiased">
      {/* Test toolbar */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="flex items-center gap-1.5 rounded-[6px] border border-white/10 px-3 py-1.5 text-xs text-[#ededed]/40 transition-colors duration-200 hover:border-white/[0.18] hover:text-[#ededed]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {from === 'tests' ? 'Tests' : 'Dashboard'}
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-semibold text-[#ededed]">
              {name}
            </h1>
            <span className="text-[11px] text-[#ededed]/30">
              Created {formatCreatedAt(created_at)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-[6px] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusColor}`}>
            {winner ? `${winner} won` : status}
          </span>
          {status === 'active' && (
            <button
              onClick={() => toggleStatus('paused')}
              className="flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-pro/20 bg-pro-bg px-3 py-1.5 text-xs text-pro transition-colors hover:bg-pro/10"
            >
              <Pause className="h-3 w-3" /> Pause
            </button>
          )}
          {status === 'paused' && (
            <button
              onClick={() => toggleStatus('active')}
              className="flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-ok/20 bg-ok-bg px-3 py-1.5 text-xs text-ok transition-colors hover:bg-ok/10"
            >
              <Play className="h-3 w-3" /> Resume
            </button>
          )}
          <button
            onClick={refresh}
            className="flex cursor-pointer h-8 w-8 items-center justify-center rounded-[6px] border border-white/10 text-[#ededed]/40 transition-colors hover:border-white/[0.18] hover:text-[#ededed]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex cursor-pointer h-8 w-8 items-center justify-center rounded-[6px] border border-white/10 text-[#ededed]/40 transition-colors hover:border-err/30 hover:text-err"
              aria-label="Delete experiment"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-[6px] border border-err/20 bg-err-bg px-3 py-1.5">
              <button
                onClick={deleteTest}
                disabled={deleting}
                className="cursor-pointer text-xs font-semibold text-err transition-colors hover:opacity-80 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                disabled={deleting}
                className="cursor-pointer text-xs text-text-3 transition-colors hover:text-text disabled:opacity-30"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error toast */}
      {deleteError && (
        <div className="mx-auto max-w-2xl px-6 pt-5">
          <div className="flex items-center gap-3 rounded-[10px] border border-[#f5455c]/20 bg-[#f5455c]/5 px-5 py-3.5">
            <X className="h-4 w-4 shrink-0 text-[#f5455c]" />
            <p className="flex-1 text-[13px] text-[#f5455c]">{deleteError}</p>
            <button onClick={() => setDeleteError(null)} className="cursor-pointer text-[#f5455c]/60 hover:text-[#f5455c]">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-2xl px-6 py-8 space-y-5">

        {/* Hero stat */}
        <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-6 text-center">
          {done && winner ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">
                {winner} is leading
              </p>
              <p className={`mt-3 text-5xl font-bold tracking-tight ${lift !== null && lift > 0 ? 'text-ok' : lift !== null && lift < 0 ? 'text-err' : 'text-[#ededed]'}`}>
                {lift !== null ? `${lift > 0 ? '+' : ''}${lift.toFixed(1)}%` : '—'}
              </p>
              <p className="mt-2 text-[13px] text-[#ededed]/62">
                {lift !== null
                  ? `Conversion rate uplift vs Variant ${winner === 'B' ? 'A' : 'B'}`
                  : 'Not enough data yet'}
              </p>
            </>
          ) : !done && lift !== null ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">
                {lift > 0 ? 'B ahead' : lift < 0 ? 'A ahead' : 'Tied'}
              </p>
              <p className={`mt-3 text-5xl font-bold tracking-tight ${lift > 0 ? 'text-ok' : lift < 0 ? 'text-pro' : 'text-[#ededed]'}`}>
                {lift > 0 ? '+' : ''}{lift.toFixed(1)}%
              </p>
              <p className="mt-2 text-[13px] text-[#ededed]/62">
                B conversion uplift over A · {totalVisitors.toLocaleString()} visitors
              </p>
            </>
          ) : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">
                Collecting data
              </p>
              <p className="mt-3 text-5xl font-bold tracking-tight text-[#ededed]/30">
                {totalVisitors.toLocaleString()}
              </p>
              <p className="mt-2 text-[13px] text-[#ededed]/62">
                visitors so far
              </p>
            </>
          )}
          {/* Visitor bar */}
          <div className="mx-auto mt-5 max-w-[240px]">
            <div className="mb-1 flex justify-between text-[10px] text-[#ededed]/30">
              <span>Towards significance</span>
              <span>{visitorPct}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-[#111111]">
              <div
                className="h-full rounded-full bg-[#ededed]/20 transition-all duration-500"
                style={{ width: `${visitorPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Sparkline (Pro only) */}
        {pro && analytics && analytics.daily.length >= 2 ? (
          <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-3.5 w-3.5 text-[#ededed]/40" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">
                Daily Visitors
              </span>
            </div>
            <div className="relative h-[100px] w-full">
              <svg viewBox={`0 0 ${analytics.daily.length - 1} 100`} preserveAspectRatio="none" className="h-full w-full">
                {/* Grid lines */}
                {[25, 50, 75].map((y) => (
                  <line key={y} x1={0} y1={y} x2={analytics.daily.length - 1} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
                ))}
                {/* B line */}
                <polyline
                  fill="none"
                  stroke={T.pro}
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                  points={cumB.map((v, i) => `${i},${100 - (v / sparkMax) * 100}`).join(' ')}
                />
                {/* A line */}
                <polyline
                  fill="none"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                  points={cumA.map((v, i) => `${i},${100 - (v / sparkMax) * 100}`).join(' ')}
                />
              </svg>
            </div>
            <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-[#ededed]/40">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: T.pro }} /> B
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} /> A
              </span>
            </div>
          </div>
        ) : pro && analyticsLoaded ? (
          <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-5">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-[#ededed]/40" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">
                Daily Visitors
              </span>
              <span className="ml-auto text-[11px] text-[#ededed]/30">Not enough data yet</span>
            </div>
          </div>
        ) : !pro ? (
          <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-5">
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-[#ededed]/40" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">
                Daily Analytics
              </span>
              <span className="ml-auto text-[11px] text-[#ededed]/30">Pro feature</span>
            </div>
          </div>
        ) : null}

        {/* Significance donut */}
        <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-3.5 w-3.5 text-[#ededed]/40" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">
              Significance
            </span>
          </div>
          <div className={`flex items-center justify-center${!pro ? ' relative' : ''}`}>
            <div className="relative h-[120px] w-[120px]">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                <circle
                  cx="18" cy="18" r="14"
                  fill="none"
                  stroke="#111111"
                  strokeWidth="3"
                />
                <circle
                  cx="18" cy="18" r="14"
                  fill="none"
                  stroke={significance >= 0.95 ? T.ok : significance >= 0.7 ? T.pro : 'rgba(255,255,255,0.2)'}
                  strokeWidth="3"
                  strokeDasharray={`${significance * 87.96} 87.96`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold ${significance >= 0.95 ? 'text-ok' : significance >= 0.7 ? 'text-pro' : 'text-[#ededed]/40'}`}>
                  {Math.round(significance * 100)}%
                </span>
                <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#ededed]/30">Confidence</span>
              </div>
            </div>
            {/* Free tier: semi-transparent overlay */}
            {!pro && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[10px] bg-black/60 backdrop-blur-[1px]">
                <Lock className="h-4 w-4 text-[#ededed]/50" />
                <p className="mt-1.5 text-[11px] font-medium text-[#ededed]/50">Pro feature</p>
                <button
                  onClick={upgrade}
                  disabled={busy}
                  className="mt-2 cursor-pointer rounded-[6px] bg-white px-3 py-1 text-[11px] font-semibold text-black transition-colors hover:bg-white/90 disabled:opacity-50"
                >
                  {busy ? '…' : 'Upgrade to Pro'}
                </button>
              </div>
            )}
          </div>
          <p className="mt-3 text-center text-[12px] text-[#ededed]/40">
            {significance >= 0.95
              ? 'Statistical significance reached — result is reliable.'
              : significance >= 0.7
              ? 'Approaching significance — more data needed.'
              : 'Not enough data for a reliable conclusion yet.'}
          </p>
        </div>

        {/* A/B Stats cards */}
        <div className="grid grid-cols-2 gap-4">
          {[a, b].map((v, i) => {
            const isWinner = winner === v.id
            const isVariantB = i === 1
            return (
              <div
                key={v.id}
                className={`rounded-[10px] border p-6 transition-all ${
                  isWinner
                    ? 'border-ok/30 bg-ok-bg'
                    : 'border-white/10 bg-[#0a0a0a]'
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className={`rounded-[6px] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                    isVariantB
                      ? 'bg-pro-bg text-pro'
                      : 'bg-[#111111] text-[#ededed]/40'
                  }`}>
                    Variant {v.label}
                  </span>
                  {isWinner && (
                    <span className="flex items-center gap-1 rounded-[6px] bg-ok-bg px-2.5 py-1 text-[11px] font-semibold text-ok">
                      <Check className="h-3 w-3" /> Winner
                    </span>
                  )}
                </div>

                <p className="text-4xl font-semibold text-[#ededed]">
                  {v.cr}%
                </p>
                <p className="mt-0.5 text-xs text-[#ededed]/40">Conversion Rate</p>

                <div className="mt-4 space-y-1.5 text-xs text-[#ededed]/40">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {v.views.toLocaleString()} visitors
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" />
                    {v.conversions.toLocaleString()} conversions
                  </div>
                </div>

                {lift !== null && isVariantB && (
                  <div className={`mt-4 rounded-[6px] px-3 py-2 text-xs font-semibold ${
                    lift > 0
                      ? 'bg-ok-bg text-ok'
                      : 'bg-err-bg text-err'
                  }`}>
                    {lift > 0 ? '+' : ''}{lift.toFixed(1)}% vs A
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Raw data table (Pro only) */}
        {pro && analytics && analytics.daily.length > 0 && (
          <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-5">
            <button
              onClick={() => setShowRawData(!showRawData)}
              className="flex w-full items-center gap-2 cursor-pointer"
            >
              <Table2 className="h-3.5 w-3.5 text-[#ededed]/40" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">
                Raw Data
              </span>
              <span className="ml-auto text-[11px] text-[#ededed]/20">
                {analytics.daily.length} days
              </span>
            </button>
            {showRawData && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-[#ededed]/30">
                      <th className="pb-2 pr-3 font-medium">Date</th>
                      <th className="pb-2 pr-3 font-medium text-right">Vis A</th>
                      <th className="pb-2 pr-3 font-medium text-right">Vis B</th>
                      <th className="pb-2 pr-3 font-medium text-right">CR A</th>
                      <th className="pb-2 pr-3 font-medium text-right">CR B</th>
                      <th className="pb-2 font-medium text-right">Lift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.daily.map((row: DailyRow) => {
                      const crA = row.visitors_a > 0 ? ((row.conversions_a / row.visitors_a) * 100).toFixed(1) : '—'
                      const crB = row.visitors_b > 0 ? ((row.conversions_b / row.visitors_b) * 100).toFixed(1) : '—'
                      const rowLift = row.visitors_a > 0 && row.conversions_a > 0 && row.visitors_b > 0
                        ? (((row.conversions_b / row.visitors_b) - (row.conversions_a / row.visitors_a)) / (row.conversions_a / row.visitors_a)) * 100
                        : null
                      return (
                        <tr key={row.date} className="border-b border-white/5 text-[#ededed]/50 hover:text-[#ededed]/80">
                          <td className="py-1.5 pr-3">{new Date(row.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</td>
                          <td className="py-1.5 pr-3 text-right">{row.visitors_a.toLocaleString()}</td>
                          <td className="py-1.5 pr-3 text-right">{row.visitors_b.toLocaleString()}</td>
                          <td className="py-1.5 pr-3 text-right">{crA}%</td>
                          <td className="py-1.5 pr-3 text-right">{crB}%</td>
                          <td className={`py-1.5 text-right ${rowLift !== null ? (rowLift > 0 ? 'text-ok' : rowLift < 0 ? 'text-err' : '') : ''}`}>
                            {rowLift !== null ? `${rowLift > 0 ? '+' : ''}${rowLift.toFixed(1)}%` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        {(data.originalHtml || data.variantBHtml || editingB) && (
          <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-6">
            <h2 className="mb-4 text-sm font-semibold text-[#ededed]">Preview</h2>
            <div className="grid grid-cols-2 gap-4">
              {data.originalHtml && (
                <VariantPreview
                  html={data.originalHtml}
                  css={data.siteCss}
                  label="A (Original)"
                  winner={winner === 'A'}
                />
              )}
              {!editingB && data.variantBHtml && (
                <div>
                  <VariantPreview
                    html={data.variantBHtml}
                    css={data.siteCss}
                    label="B (Variant)"
                    winner={winner === 'B'}
                  />
                  <button
                    onClick={() => { setDraftB(data.variantBHtml || ''); setEditingB(true) }}
                    className="mt-2 flex cursor-pointer items-center gap-1 text-xs text-[#ededed]/30 transition-colors hover:text-[#ededed]/60"
                  >
                    <Pencil className="h-3 w-3" /> Edit HTML
                  </button>
                </div>
              )}
              {!editingB && !data.variantBHtml && data.originalHtml && (
                <div className="flex items-center justify-center rounded-xl border border-dashed border-white/[0.10] p-6">
                  <button
                    onClick={() => { setDraftB('<div class="ab-v">\n  <style>\n    .ab-v { /* your styles */ }\n  </style>\n</div>'); setEditingB(true) }}
                    className="cursor-pointer text-xs text-[#ededed]/30 transition-colors hover:text-[#ededed]/60"
                  >
                    + Add Variant B HTML
                  </button>
                </div>
              )}
              {editingB && (
                <div className="rounded-[6px] border border-white/10 bg-[#111111] p-4">
                  <p className="mb-2 text-xs font-semibold text-[#ededed]/62">Edit Variant B HTML</p>
                  <textarea
                    value={draftB}
                    onChange={e => setDraftB(e.target.value)}
                    className="w-full rounded-[6px] border border-white/10 bg-[#0a0a0a] px-3 py-2 font-mono text-xs text-ok focus:border-[#ededed]/30 focus:outline-none focus:ring-1 focus:ring-[#ededed]/10"
                    rows={10}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={saveVariantB}
                      className="cursor-pointer rounded-[6px] bg-white px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-white/90"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingB(false)}
                      className="cursor-pointer rounded-[6px] border border-white/10 px-3 py-1.5 text-xs text-[#ededed]/40 transition-colors hover:text-[#ededed]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Auto-winner */}
        {pro && (
          <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-6">
            <h2 className="mb-1 text-sm font-semibold text-[#ededed]">Auto Winner</h2>
            {done ? (
              <p className="mt-2 text-[13px] text-ok">
                ✓ Test complete —{' '}
                {winner
                  ? `Variant ${winner} wins and is now served to all visitors.`
                  : 'no winner declared.'}
              </p>
            ) : (
              <>
                <p className="mt-1 text-xs text-[#ededed]/40 leading-relaxed">
                  Once both thresholds are met, Variant B automatically becomes the winner and is served to all new visitors.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[#ededed]/62">Min Visitors</span>
                    <input
                      type="number"
                      min={1}
                      value={minVisitors}
                      onChange={e => setMinVisitors(Number(e.target.value))}
                      className="w-full rounded-[6px] border border-white/10 bg-[#111111] px-3 py-2 text-sm text-[#ededed] focus:border-[#ededed]/30 focus:outline-none focus:ring-1 focus:ring-[#ededed]/10"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[#ededed]/62">Min Uplift B (%)</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={Math.round(minUplift * 100)}
                      onChange={e => setMinUplift(Number(e.target.value) / 100)}
                      className="w-full rounded-[6px] border border-white/10 bg-[#111111] px-3 py-2 text-sm text-[#ededed] focus:border-[#ededed]/30 focus:outline-none focus:ring-1 focus:ring-[#ededed]/10"
                    />
                  </label>
                </div>

                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs text-[#ededed]/40">
                    <span>Visitor threshold</span>
                    <span>{totalVisitors.toLocaleString()} / {minVisitors.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#111111]">
                    <div
                      className="h-full rounded-full bg-[#ededed] transition-all duration-500"
                      style={{ width: `${visitorPct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={saveConfig}
                    className="cursor-pointer rounded-[6px] bg-white px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-white/90"
                  >
                    Save
                  </button>
                  {saved && (
                    <span className="flex items-center gap-1 text-xs text-ok">
                      <Check className="h-3.5 w-3.5" /> Saved
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {!pro && (
          <div className="rounded-[10px] border border-dashed border-white/10 p-6 text-center">
            <h2 className="text-sm font-semibold text-[#ededed]">Auto Winner</h2>
            <p className="mt-2 text-xs text-[#ededed]/40">
              Statistical significance and the auto-winner are available from the Pro plan onward.
            </p>
            <button
              onClick={upgrade}
              disabled={busy}
              className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] bg-white px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:opacity-50"
            >
              {busy ? 'Redirecting…' : 'Upgrade to Pro'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
