'use client'

import { ExperimentData } from '@/lib/getExperimentStats'
import { VariantPreview } from '@/app/components/VariantPreview'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTestUpdate } from '@/lib/useRealtime'
import { Breadcrumbs } from '@/app/components/Breadcrumbs'
import { Tooltip } from '@/app/components/Tooltip'
import { useToast } from '@/app/components/Toast'
import { calcSignificance, MIN_VISITORS_PER_ARM, MIN_CONVERSIONS_PER_ARM, MIN_RUNTIME_DAYS } from '@/lib/significance'
import {
  RefreshCw,
  Users,
  Target,
  Check,
  Pause,
  Play,
  Pencil,
  X,
  Trash2,
  BarChart3,
  Table2,
  TrendingUp,
  Download,
  MousePointerClick,
  Globe,
  Clock,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
} from 'recharts'
// ponytail: echte Recharts-Typen statt `as any`-Kaskaden. Bricht ein
// Major-Update die Signatur, meldet das jetzt der Typecheck und nicht der
// zahlende Pro-Kunde, der auf ein leeres Chart schaut.
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'

const C = {
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

function exportCsv(daily: DailyRow[], testName: string) {
  const rows = [['Date', 'Visitors A', 'Visitors B', 'Conversions A', 'Conversions B', 'CR A', 'CR B', 'Lift']]
  for (const d of daily) {
    const crA = d.visitors_a > 0 ? ((d.conversions_a / d.visitors_a) * 100).toFixed(1) : '—'
    const crB = d.visitors_b > 0 ? ((d.conversions_b / d.visitors_b) * 100).toFixed(1) : '—'
    const lift = d.visitors_a > 0 && d.conversions_a > 0 && d.visitors_b > 0
      ? (((d.conversions_b / d.visitors_b) - (d.conversions_a / d.visitors_a)) / (d.conversions_a / d.visitors_a) * 100).toFixed(1)
      : '—'
    rows.push([
      new Date(d.date).toISOString().slice(0, 10),
      String(d.visitors_a),
      String(d.visitors_b),
      String(d.conversions_a),
      String(d.conversions_b),
      crA,
      crB,
      lift,
    ])
  }
  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${testName.replace(/[^a-zA-Z0-9]/g, '_')}_data.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── V4: Time-to-significance Schätzung ──
// Schätzt, wie viele Tage es bei aktuellem täglichem Traffic-Durchschnitt
// noch bis zur 95%-Signifikanz dauert. Konservativ: nimmt an, dass der
// z-Wert mit sqrt(n) wächst (gültig für moderate Effektstärken).
function estimateDaysToSignificance(
  totalVisitors: number,
  significance: number,
  createdAt: string,
  targetSignificance: number,
  nowTs: number
): number | null {
  if (significance <= 0 || significance >= targetSignificance) return null
  if (totalVisitors < 100) return null

  // Tage seit Teststart
  const daysRunning = Math.max(1, (nowTs - new Date(createdAt).getTime()) / 86_400_000)

  // z-Werte: aktuell und Ziel
  // significance = 1 - 2*(1-Phi(z)), also Phi(z) = 1 - (1-sig)/2 = (1+sig)/2
  // Näherung: z ≈ sqrt(2) * erfinv(2*significance - 1)
  // Für unsere Zwecke reicht eine einfache Tabelle:
  function zForSig(s: number): number {
    // Lineare Interpolation für typische Werte
    const pairs = [
      [0.50, 0.0], [0.60, 0.253], [0.70, 0.524], [0.75, 0.674],
      [0.80, 0.842], [0.85, 1.036], [0.90, 1.282], [0.92, 1.405],
      [0.95, 1.645], [0.98, 2.054], [0.99, 2.326],
    ]
    for (let i = 0; i < pairs.length - 1; i++) {
      if (s <= pairs[i + 1][0]) {
        const t = (s - pairs[i][0]) / (pairs[i + 1][0] - pairs[i][0])
        return Number(pairs[i][1]) + t * (Number(pairs[i + 1][1]) - Number(pairs[i][1]))
      }
    }
    return 2.5
  }

  const zNow = zForSig(significance)
  const zTarget = zForSig(targetSignificance)
  if (zNow <= 0) return null

  // z ~ sqrt(n) * (pB - pA) / se₀
  // zTarget / zNow = sqrt(nTarget / nNow)
  // nTarget = nNow * (zTarget / zNow)²
  const ratio = (zTarget / zNow) ** 2
  const additionalVisitorsNeeded = totalVisitors * (ratio - 1)
  const dailyTraffic = totalVisitors / daysRunning

  if (dailyTraffic <= 0) return null
  const daysEstimate = Math.ceil(additionalVisitorsNeeded / dailyTraffic)
  return Math.max(1, daysEstimate)
}

// ── V3: Multi-Kriterien-Progress ──
function progressPct(current: number, target: number): number {
  return Math.min(100, Math.round((current / Math.max(1, target)) * 100))
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

/** Parse DB goal format into UI state. Format: null=element is goal, "click:sel"=click goal, "url:/path"=URL goal */
function parseGoal(dbGoal: string | null): { type: 'element' | 'click' | 'url'; value: string } {
  if (!dbGoal) return { type: 'element', value: '' }
  if (dbGoal.startsWith('click:')) return { type: 'click', value: dbGoal.slice(6) }
  if (dbGoal.startsWith('url:')) return { type: 'url', value: dbGoal.slice(4) }
  return { type: 'element', value: dbGoal }
}

/** Format UI state back into DB goal format */
function formatGoal(type: 'element' | 'click' | 'url', value: string): string | null {
  if (type === 'element') return null
  if (type === 'click') return value ? `click:${value}` : null
  if (type === 'url') return value ? `url:${value}` : null
  return null
}

export function ResultsClient({ initial, experimentId, pro }: { initial: ExperimentData; experimentId: string; pro: boolean }) {
  const [data, setData] = useState(initial)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false)
  const [minVisitors, setMinVisitors] = useState(initial.minVisitors)
  const [minUplift, setMinUplift] = useState(initial.minUplift)
  const [significanceLevel, setSignificanceLevel] = useState(initial.significanceLevel ?? 0.95)
  const [saved, setSaved] = useState(false)
  const [editingB, setEditingB] = useState(false)
  const [draftB, setDraftB] = useState(initial.variantBHtml || '')
  const [refreshing, setRefreshing] = useState(false)
  const [now, setNow] = useState(0) // updated in refresh() + realtime callback
  const [busy, setBusy] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showRawData, setShowRawData] = useState(false)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalType, setGoalType] = useState<'element' | 'click' | 'url'>(() => parseGoal(initial.goal).type)
  const [goalValue, setGoalValue] = useState(() => parseGoal(initial.goal).value)
  const [goalSaving, setGoalSaving] = useState(false)
  const [goalSaved, setGoalSaved] = useState(false)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const backHref = from === 'tests' ? '/dashboard/tests' : '/dashboard'

  // Fetch analytics — available for all plans.
  // `now` is initialized in the .finally() to satisfy react-hooks/set-state-in-effect
  // (setState must be async, not sync in the effect body).
  useEffect(() => {
    if (analyticsLoaded) return
    fetch(`/api/analytics/${experimentId}`)
      .then(res => res.ok ? res.json() : null)
      .then(json => { if (json) setAnalytics(json) })
      .finally(() => { setAnalyticsLoaded(true); setNow(Date.now()) })
  }, [experimentId, analyticsLoaded])

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
        toast('error', err.error || 'Failed to delete test')
      }
    } finally {
      setDeleting(false)
    }
  }

  async function refresh() {
    setRefreshing(true)
    setAnalyticsLoaded(false) // Win #5: Re-fetch analytics when user manually refreshes
    setNow(Date.now())        // V3: Update time reference for purity-compliant duration calc
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

  useTestUpdate(experimentId, () => {
    setAnalyticsLoaded(false) // Win #5: Re-fetch analytics on realtime updates too
    setNow(Date.now())        // V3: Update time reference
    refreshDebounced()
  })

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
    }
  }, [])

  const { name, status, significance, winner, variants, created_at } = data
  const [a, b] = variants
  const totalVisitors = a.views + b.views
  const done = status === 'done' || !!winner
  const visitorPct = Math.min(100, Math.round((totalVisitors / Math.max(1, minVisitors)) * 100))

  // Win #4: Uplift erst anzeigen wenn beide Arme genug Conversions haben.
  // Bei < 10 Conversions pro Arm ist die Uplift-Schätzung statistisches Rauschen
  // und führt zu Fehlinterpretationen ("+50%!" bei 2 vs 3 Conversions).
  const MIN_CONV_FOR_UPLIFT = 10
  const enoughDataForUplift = a.conversions >= MIN_CONV_FOR_UPLIFT && b.conversions >= MIN_CONV_FOR_UPLIFT
  const lift = a.views > 0 && a.conversions > 0 && enoughDataForUplift
    ? ((b.cr - a.cr) / a.cr) * 100
    : null

  // ── V3: Multi-Kriterien-Progress ──
  const visitorsPerArm = Math.min(a.views, b.views)
  const convPerArm = Math.min(a.conversions, b.conversions)
  const visitorsProgress = progressPct(visitorsPerArm, Math.max(minVisitors, MIN_VISITORS_PER_ARM))
  const convProgress = progressPct(convPerArm, MIN_CONVERSIONS_PER_ARM)
  const daysRunning = Math.max(0, (now - new Date(created_at).getTime()) / 86_400_000)
  const runtimeProgress = progressPct(daysRunning, MIN_RUNTIME_DAYS)
  const allCriteriaMet = visitorsProgress >= 100 && convProgress >= 100 && runtimeProgress >= 100

  // ── V4: Time-to-significance Schätzung ──
  const daysToSig = !done && significance > 0 && significance < (significanceLevel)
    ? estimateDaysToSignificance(totalVisitors, significance, created_at, significanceLevel, now)
    : null

  // UX-07: Diese drei Handler hatten keinen Busy-Guard — die Buttons blieben
  // klickbar. Ungeduldiges Mehrfachklicken feuerte mehrere PATCHes; bei
  // toggleStatus konnte ein Race den Test im falschen Zustand hinterlassen.
  async function saveConfig() {
    if (busy) return
    setBusy(true)
    try {
      await fetch(`/api/tests/${experimentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ min_visitors: minVisitors, min_uplift: minUplift, significance_level: significanceLevel }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {} finally {
      setBusy(false)
    }
  }

  async function saveVariantB() {
    if (busy) return
    setBusy(true)
    try {
      await fetch(`/api/tests/${experimentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant_b_html: draftB || null }),
      })
      setEditingB(false)
      await refresh()
    } catch {} finally {
      setBusy(false)
    }
  }

  async function saveGoal() {
    setGoalSaving(true)
    try {
      await fetch(`/api/tests/${experimentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: formatGoal(goalType, goalValue) }),
      })
      setEditingGoal(false)
      setGoalSaved(true)
      setTimeout(() => setGoalSaved(false), 2000)
      await refresh()
    } catch {} finally {
      setGoalSaving(false)
    }
  }

  async function toggleStatus(next: 'active' | 'paused') {
    if (busy) return
    setBusy(true)
    try {
      await fetch(`/api/tests/${experimentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      await refresh()
    } catch {} finally {
      setBusy(false)
    }
  }

  const statusColor =
    status === 'active'
      ? 'bg-ok-bg text-ok'
      : status === 'paused'
      ? 'bg-pro-bg text-pro'
      : 'bg-bg-2 text-text-3'

  return (
    <div className="text-[#ededed] antialiased">
      {/* A11Y-05: Die Seite hatte kein h1 — höchste Überschrift war <h2>Preview</h2>,
          der Testname stand nur im Breadcrumb. */}
      <h1 className="sr-only">{name} — Results</h1>
      {/* Test toolbar */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
        <div className="flex items-center gap-3">
          <Breadcrumbs items={[{ label: from === 'tests' ? 'Tests' : 'Dashboard', href: backHref }, { label: name }]} />
          <span className="text-[11px] text-[#ededed]/50 ml-3">
            Created {formatCreatedAt(created_at)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-[6px] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusColor}`}>
            {winner ? `${winner} won` : status}
          </span>
          {status === 'active' && (
            <button
              onClick={() => toggleStatus('paused')}
              disabled={busy}
              className="flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-pro/20 bg-pro-bg px-3 py-1.5 text-xs text-pro transition-colors hover:bg-pro/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Pause className="h-3 w-3" /> Pause
            </button>
          )}
          {status === 'paused' && (
            <button
              onClick={() => toggleStatus('active')}
              disabled={busy}
              className="flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-ok/20 bg-ok-bg px-3 py-1.5 text-xs text-ok transition-colors hover:bg-ok/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="h-3 w-3" /> Resume
            </button>
          )}
          <Tooltip content="Refresh data">
            <button
              onClick={refresh}
              className="flex cursor-pointer h-8 w-8 items-center justify-center rounded-[6px] border border-white/10 text-[#ededed]/40 transition-colors hover:border-white/[0.18] hover:text-[#ededed]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </Tooltip>
          {!deleteConfirm ? (
            <Tooltip content="Delete experiment">
              <button
                onClick={() => setDeleteConfirm(true)}
                className="flex cursor-pointer h-8 w-8 items-center justify-center rounded-[6px] border border-white/10 text-[#ededed]/40 transition-colors hover:border-err/30 hover:text-err"
                aria-label="Delete experiment"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
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

      <div className="mx-auto max-w-6xl px-6 py-8 space-y-5">

        {/* ── Hero stat (V2: Significance-first layout) ── */}
        <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Left: Significance donut */}
            <div className="flex flex-col items-center">
              <div className="relative h-[100px] w-[100px]">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#111111" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="14" fill="none"
                    stroke={significance >= significanceLevel ? C.ok : significance >= 0.7 ? C.pro : 'rgba(255,255,255,0.2)'}
                    strokeWidth="3"
                    strokeDasharray={`${Math.max(0.01, significance) * 87.96} 87.96`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-xl font-bold ${significance >= significanceLevel ? 'text-ok' : significance >= 0.7 ? 'text-pro' : 'text-[#ededed]/50'}`}>
                    {Math.round(significance * 100)}%
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-[#ededed]/50">Confidence</span>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-center text-[#ededed]/40 leading-relaxed max-w-[160px]">
                {significance >= significanceLevel
                  ? 'Statistically significant'
                  : significance >= 0.7
                  ? 'Approaching significance'
                  : 'Collecting data'}
              </p>
            </div>

            {/* Center: Primary stat — uplift or visitors */}
            <div className="text-center">
              {done && winner ? (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">
                    {winner} won
                  </p>
                  <p className={`mt-1 text-4xl font-bold tracking-tight ${lift !== null && lift > 0 ? 'text-ok' : lift !== null && lift < 0 ? 'text-err' : 'text-[#ededed]'}`}>
                    {lift !== null ? `${lift > 0 ? '+' : ''}${lift.toFixed(1)}%` : '—'}
                  </p>
                  <p className="mt-1 text-[12px] text-[#ededed]/50">
                    {lift !== null ? 'Conversion uplift' : 'Not enough data'}
                  </p>
                  <p className="mt-1 text-[11px] text-[#ededed]/40">
                    {totalVisitors.toLocaleString()} visitors · {a.conversions + b.conversions} conversions
                  </p>
                </>
              ) : !done && lift !== null ? (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">
                    {lift > 0 ? 'B ahead' : lift < 0 ? 'A ahead' : 'Tied'}
                  </p>
                  <p className={`mt-1 text-4xl font-bold tracking-tight ${lift > 0 ? 'text-ok' : lift < 0 ? 'text-pro' : 'text-[#ededed]'}`}>
                    {lift > 0 ? '+' : ''}{lift.toFixed(1)}%
                  </p>
                  <p className="mt-1 text-[12px] text-[#ededed]/50">
                    Uplift · {totalVisitors.toLocaleString()} visitors
                  </p>
                  <p className="mt-1 text-[11px] text-[#ededed]/40">
                    A: {a.cr}% CR · B: {b.cr}% CR
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">
                    Collecting data
                  </p>
                  <p className="mt-1 text-4xl font-bold tracking-tight text-[#ededed]/50">
                    {totalVisitors.toLocaleString()}
                  </p>
                  <p className="mt-1 text-[12px] text-[#ededed]/50">
                    visitors so far
                  </p>
                  {!enoughDataForUplift && totalVisitors > 0 && (
                    <p className="mt-1 text-[10px] text-text-3">
                      Need {MIN_CONV_FOR_UPLIFT - convPerArm} more conversions per variant for reliable uplift
                    </p>
                  )}
                </>
              )}

              {/* V4: Time-to-significance estimate */}
              {daysToSig !== null && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-pro/[0.08] border border-pro/15 px-3 py-1">
                  <Clock className="h-3 w-3 text-pro shrink-0" />
                  <span className="text-[11px] text-pro/90">
                    ~{daysToSig} day{daysToSig !== 1 ? 's' : ''} to {Math.round(significanceLevel * 100)}% confidence
                  </span>
                </div>
              )}
            </div>

            {/* Right: Multi-criteria progress (V3) */}
            <div className="space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#ededed]/40">Requirements</p>
              {/* Visitors per arm */}
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className={visitorsProgress >= 100 ? 'text-ok' : 'text-[#ededed]/50'}>
                    {visitorsProgress >= 100 ? '✓' : '○'} Visitors/arm
                  </span>
                  <span className="text-[#ededed]/40 tabular-nums">
                    {visitorsPerArm.toLocaleString()} / {Math.max(minVisitors, MIN_VISITORS_PER_ARM).toLocaleString()}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-[#111111]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${visitorsProgress >= 100 ? 'bg-ok/60' : 'bg-[#ededed]/15'}`}
                    style={{ width: `${visitorsProgress}%` }}
                  />
                </div>
              </div>
              {/* Conversions per arm */}
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className={convProgress >= 100 ? 'text-ok' : 'text-[#ededed]/50'}>
                    {convProgress >= 100 ? '✓' : '○'} Conversions/arm
                  </span>
                  <span className="text-[#ededed]/40 tabular-nums">
                    {convPerArm} / {MIN_CONVERSIONS_PER_ARM}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-[#111111]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${convProgress >= 100 ? 'bg-ok/60' : 'bg-[#ededed]/15'}`}
                    style={{ width: `${convProgress}%` }}
                  />
                </div>
              </div>
              {/* Runtime */}
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className={runtimeProgress >= 100 ? 'text-ok' : 'text-[#ededed]/50'}>
                    {runtimeProgress >= 100 ? '✓' : '○'} Runtime
                  </span>
                  <span className="text-[#ededed]/40 tabular-nums">
                    {daysRunning.toFixed(1)} / {MIN_RUNTIME_DAYS} days
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-[#111111]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${runtimeProgress >= 100 ? 'bg-ok/60' : 'bg-[#ededed]/15'}`}
                    style={{ width: `${runtimeProgress}%` }}
                  />
                </div>
              </div>
              {!done && !allCriteriaMet && (
                <p className="text-[9px] text-[#ededed]/30 italic">
                  All three must be met before a winner is declared.
                </p>
              )}
              {!done && allCriteriaMet && significance < significanceLevel && (
                <p className="text-[10px] text-pro/80">
                  Thresholds met — waiting for {Math.round(significanceLevel * 100)}% confidence.
                </p>
              )}
            </div>
          </div>

          {/* Win #3: "0 Visitors" — konkrete nächste Schritte */}
          {totalVisitors === 0 && (
            <div className="mt-5 rounded-[8px] border border-pro/15 bg-pro/[0.03] p-4">
              <p className="text-[12px] font-medium text-pro mb-2">Your test is live — now drive traffic</p>
              <ul className="space-y-1.5 text-[11px] text-text-2">
                <li className="flex items-start gap-2">
                  <span className="text-text-3 mt-0.5 shrink-0">1.</span>
                  <span>Share your page URL with visitors — the snippet auto-assigns them to A or B.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-text-3 mt-0.5 shrink-0">2.</span>
                  <span>First results usually appear within hours, depending on your traffic.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-text-3 mt-0.5 shrink-0">3.</span>
                  <span>Need faster data? Run an ad or share the page on social media to boost traffic.</span>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* ── Charts Row: Visitors + Conversions side-by-side ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Visitors over time — available for all plans */}
        {analytics && analytics.daily.length >= 2 ? (
          <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-3.5 w-3.5 text-[#ededed]/40" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">
                Visitors over Time
              </span>
            </div>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={analytics.daily.map((d) => ({
                    date: new Date(d.date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' }),
                    A: d.visitors_a,
                    B: d.visitors_b,
                  }))}
                  margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: '#1a1a1a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#ededed',
                    }}
                    labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="A"
                    stroke="rgba(255,255,255,0.35)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: 'rgba(255,255,255,0.5)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="B"
                    stroke={C.pro}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: C.pro }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-[#ededed]/40">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: C.pro }} /> Variant B
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'rgba(255,255,255,0.35)' }} /> Variant A
              </span>
            </div>
          </div>
        ) : analyticsLoaded ? (
          <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-[#ededed]/40" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">
                Visitors over Time
              </span>
              <span className="ml-auto text-[11px] text-[#ededed]/50">Not enough data yet</span>
            </div>
          </div>
        ) : null}

        {/* ── Cumulative Conversions over Time ── */}
        {analytics && analytics.daily.length >= 2 ? (
          <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-3.5 w-3.5 text-[#ededed]/40" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">
                Cumulative Conversions
              </span>
            </div>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={(() => {
                    let cumA = 0, cumB = 0
                    return analytics.daily.map((d) => {
                      cumA += d.conversions_a
                      cumB += d.conversions_b
                      return {
                        date: new Date(d.date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' }),
                        A: cumA,
                        B: cumB,
                      }
                    })
                  })()}
                  margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: '#1a1a1a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#ededed',
                    }}
                    labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="A"
                    stroke="rgba(255,255,255,0.35)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: 'rgba(255,255,255,0.5)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="B"
                    stroke={C.ok}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: C.ok }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-[#ededed]/40">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: C.ok }} /> Variant B
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'rgba(255,255,255,0.35)' }} /> Variant A
              </span>
            </div>
          </div>
        ) : analyticsLoaded ? (
          <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-5">
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-[#ededed]/40" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">
                Cumulative Conversions
              </span>
              <span className="ml-auto text-[11px] text-[#ededed]/50">Not enough data yet</span>
            </div>
          </div>
        ) : null}
        </div>{/* end charts grid */}

        {/* ── Significance over Time ── */}
        {analytics && analytics.daily.length >= 2 ? (
          <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-5">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-3.5 w-3.5 text-[#ededed]/40" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">
                Significance over Time
              </span>
            </div>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={(() => {
                    let cumVA = 0, cumCA = 0, cumVB = 0, cumCB = 0
                    return analytics.daily.map((d) => {
                      cumVA += d.visitors_a; cumCA += d.conversions_a
                      cumVB += d.visitors_b; cumCB += d.conversions_b
                      const sig = calcSignificance(cumVA, cumCA, cumVB, cumCB)
                      return {
                        date: new Date(d.date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' }),
                        significance: Math.round(sig * 100),
                      }
                    })
                  })()}
                  margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: '#1a1a1a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#ededed',
                    }}
                    labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}
                    formatter={(value) => [`${value}%`, 'Confidence']}
                  />
                  {/* 95% significance threshold */}
                  <ReferenceLine
                    y={Math.round(significanceLevel * 100)}
                    stroke="rgba(255,255,255,0.18)"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                  />
                  <Line
                    type="monotone"
                    dataKey="significance"
                    stroke={C.ok}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: C.ok }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-[#ededed]/40">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: C.ok }} /> Confidence
              </span>
              <span className="flex items-center gap-1.5 text-[#ededed]/30">
                <span className="inline-block h-0.5 w-4 rounded-full border-t border-dashed border-[#ededed]/20" /> 95% threshold
              </span>
            </div>
          </div>
        ) : analyticsLoaded ? (
          <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-5">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-[#ededed]/40" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">
                Significance over Time
              </span>
              <span className="ml-auto text-[11px] text-[#ededed]/50">Not enough data yet</span>
            </div>
          </div>
        ) : null}

        {/* ── A/B Stats Cards (Significance jetzt im Hero) ── */}
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

        {/* Variant comparison bar chart — available for all plans */}
        <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-3.5 w-3.5 text-[#ededed]/40" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">
              Variant Comparison
            </span>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Visitors bar chart */}
            <div>
              <p className="mb-2 text-[10px] font-medium text-[#ededed]/40">Visitors</p>
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { variant: 'A', value: a.views },
                      { variant: 'B', value: b.views },
                    ]}
                    margin={{ top: 0, right: 0, bottom: 20, left: 0 }}
                  >
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                    <RechartsTooltip
                      contentStyle={{
                        background: '#1a1a1a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: '#ededed',
                      }}
                      formatter={(value: ValueType | undefined) => [Number(value ?? 0).toLocaleString(), 'Visitors'] as [string, string]}
                    />
                    <Bar
                      dataKey="value"
                      radius={[4, 4, 0, 0]}
                      fill="rgba(255,255,255,0.15)"
                      maxBarSize={48}
                      label={{ position: 'top', fill: 'rgba(255,255,255,0.3)', fontSize: 10, formatter: (v: unknown) => (typeof v === 'number' ? v.toLocaleString() : String(v ?? '')) }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Conversion rate bar chart */}
            <div>
              <p className="mb-2 text-[10px] font-medium text-[#ededed]/40">Conversion Rate</p>
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { variant: 'A', value: a.cr },
                      { variant: 'B', value: b.cr },
                    ]}
                    margin={{ top: 0, right: 0, bottom: 20, left: 0 }}
                  >
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                    <RechartsTooltip
                      contentStyle={{
                        background: '#1a1a1a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: '#ededed',
                      }}
                      formatter={(value: ValueType | undefined) => [`${Number(value ?? 0)}%`, 'Conv. Rate'] as [string, string]}
                    />
                    <Bar
                      dataKey="value"
                      radius={[4, 4, 0, 0]}
                      fill={C.pro}
                      maxBarSize={48}
                      label={{ position: 'top', fill: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: (v: unknown) => (typeof v === 'number' ? `${v}%` : String(v ?? '')) }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Conversion Goal */} 
        <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-5">
          {!editingGoal ? (
            <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {goalType === 'element' ? (
                  <MousePointerClick className="h-3.5 w-3.5 text-[#ededed]/40" />
                ) : goalType === 'click' ? (
                  <MousePointerClick className="h-3.5 w-3.5 text-pro" />
                ) : (
                  <Globe className="h-3.5 w-3.5 text-ok" />
                )}
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">
                  Conversion Goal
                </span>
              </div>
              <button
                onClick={() => {
                  const p = parseGoal(data.goal)
                  setGoalType(p.type)
                  setGoalValue(p.value)
                  setEditingGoal(true)
                }}
                className="flex cursor-pointer items-center gap-1.5 text-xs text-[#ededed]/40 transition-colors hover:text-[#ededed]"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
            </div>
            <p className="mt-2 text-[13px] text-[#ededed]/62">
              {goalType === 'element' && data.selector ? (
                <>Clicks on the replaced element <code className="text-[11px] font-mono text-[#ededed]/50 bg-[#111111] px-1.5 py-0.5 rounded">{data.selector}</code></>
              ) : goalType === 'element' && !data.selector ? (
                'No conversion goal set — conversions can’t be tracked yet.'
              ) : goalType === 'click' ? (
                <>Clicks on <code className="text-[11px] font-mono text-[#ededed]/50 bg-[#111111] px-1.5 py-0.5 rounded">{goalValue}</code></>
              ) : (
                <>Page view: <code className="text-[11px] font-mono text-[#ededed]/50 bg-[#111111] px-1.5 py-0.5 rounded">{goalValue}</code></>
              )}
            </p>
            </>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-3.5 w-3.5 text-[#ededed]/40" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">
                  Conversion Goal
                </span>
              </div>

              <div className="flex gap-1 mb-3">
                {([
                  { type: 'element' as const, label: 'Replaced element', icon: MousePointerClick, desc: 'Click on the original element is the conversion' },
                  { type: 'click' as const, label: 'Click selector', icon: MousePointerClick, desc: 'Pick a CSS selector users click' },
                  { type: 'url' as const, label: 'URL goal', icon: Globe, desc: 'Users visit a specific page after converting' },
                ]).map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => { setGoalType(opt.type); setGoalSaved(false) }}
                    className={`flex-1 cursor-pointer rounded-[6px] border px-3 py-2 text-left transition-colors ${
                      goalType === opt.type
                        ? 'border-white/20 bg-white/[0.06]'
                        : 'border-white/10 bg-transparent hover:border-white/[0.14]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <opt.icon className={`h-3 w-3 ${goalType === opt.type ? 'text-white' : 'text-[#ededed]/40'}`} />
                      <span className={`text-[11px] font-semibold ${goalType === opt.type ? 'text-white' : 'text-[#ededed]/50'}`}>
                        {opt.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-[#ededed]/40 hidden sm:block">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {/* Value input for click / url */}
              {goalType === 'click' && (
                <div className="mb-3">
                  <label className="text-[10px] font-semibold text-[#ededed]/50 uppercase tracking-wider">CSS Selector</label>
                  <input
                    type="text"
                    placeholder=".cta-button, #signup-link, a.btn-primary"
                    value={goalValue}
                    onChange={e => { setGoalValue(e.target.value); setGoalSaved(false) }}
                    className="mt-1 w-full rounded-[6px] border border-white/10 bg-[#111111] px-3 py-2 text-sm text-[#ededed] font-mono placeholder:text-[#ededed]/25 focus:border-[#ededed]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:ring-1 focus:ring-[#ededed]/10"
                  />
                </div>
              )}

              {goalType === 'url' && (
                <div className="mb-3">
                  <label className="text-[10px] font-semibold text-[#ededed]/50 uppercase tracking-wider">Target URL</label>
                  <input
                    type="text"
                    placeholder="/thank-you, /checkout/success"
                    value={goalValue}
                    onChange={e => { setGoalValue(e.target.value); setGoalSaved(false) }}
                    className="mt-1 w-full rounded-[6px] border border-white/10 bg-[#111111] px-3 py-2 text-sm text-[#ededed] font-mono placeholder:text-[#ededed]/25 focus:border-[#ededed]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:ring-1 focus:ring-[#ededed]/10"
                  />
                </div>
              )}

              {goalType === 'element' && data.selector && (
                <p className="mb-3 text-[12px] text-[#ededed]/50">
                  The element <code className="text-[11px] font-mono bg-[#111111] px-1 py-0.5 rounded">{data.selector}</code> is the conversion goal. Users who click it convert.
                </p>
              )}
              {goalType === 'element' && !data.selector && (
                <p className="mb-3 text-[12px] text-pro">
                  No element selector stored. Set a click or URL goal instead.
                </p>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={saveGoal}
                  disabled={goalSaving || (goalType !== 'element' && !goalValue.trim())}
                  className="cursor-pointer rounded-[6px] bg-white px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-white/90 disabled:opacity-40"
                >
                  {goalSaving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditingGoal(false)}
                  className="cursor-pointer rounded-[6px] border border-white/10 px-3 py-2 text-xs text-[#ededed]/40 transition-colors hover:text-[#ededed]"
                >
                  Cancel
                </button>
                {goalSaved && (
                  <span className="flex items-center gap-1 text-xs text-ok">
                    <Check className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Raw data table */}
        {analytics && analytics.daily.length > 0 && (
          <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRawData(!showRawData)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Table2 className="h-3.5 w-3.5 text-[#ededed]/40" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">
                  Raw Data
                </span>
              </button>
              <span className="text-[11px] text-[#ededed]/40">
                · {analytics.daily.length} days
              </span>
              <button
                onClick={() => exportCsv(analytics!.daily, name)}
                className="ml-auto flex cursor-pointer items-center gap-1 rounded-[6px] border border-white/10 px-2.5 py-1 text-[10px] text-[#ededed]/50 transition-colors hover:border-white/[0.18] hover:text-[#ededed]"
              >
                <Download className="h-3 w-3" /> CSV
              </button>
            </div>
            {showRawData && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-[#ededed]/50">
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
                          <td className="py-1.5 pr-3">{new Date(row.date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}</td>
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#ededed]">Preview</h2>
              <span className="text-[10px] text-[#ededed]/30">Live rendering of your variants</span>
            </div>
            <div className="grid grid-cols-2 gap-5">
              {data.originalHtml && (
                <VariantPreview
                  html={data.originalHtml}
                  css={data.siteCss}
                  label="A · Original"
                  winner={winner === 'A'}
                />
              )}
              {!editingB && data.variantBHtml && (
                <div className="space-y-2">
                  <VariantPreview
                    html={data.variantBHtml}
                    css={data.siteCss}
                    label="B · Variant"
                    winner={winner === 'B'}
                  />
                  <button
                    onClick={() => { setDraftB(data.variantBHtml || ''); setEditingB(true) }}
                    className="flex cursor-pointer items-center gap-1.5 text-xs text-[#ededed]/40 transition-colors hover:text-[#ededed]/70"
                  >
                    <Pencil className="h-3 w-3" /> Edit Variant B HTML
                  </button>
                </div>
              )}
              {!editingB && !data.variantBHtml && data.originalHtml && (
                <div className="flex items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] min-h-[280px]">
                  <button
                    onClick={() => { setDraftB('<div class="ab-v">\n  <style>\n    .ab-v { /* your styles */ }\n  </style>\n</div>'); setEditingB(true) }}
                    className="cursor-pointer text-xs text-[#ededed]/40 transition-colors hover:text-[#ededed]/70"
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
                    className="w-full rounded-[6px] border border-white/10 bg-[#0a0a0a] px-3 py-2 font-mono text-xs text-ok focus:border-[#ededed]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:ring-1 focus:ring-[#ededed]/10"
                    rows={10}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={saveVariantB}
                      disabled={busy}
                      className="cursor-pointer rounded-[6px] bg-white px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
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
                      className="w-full rounded-[6px] border border-white/10 bg-[#111111] px-3 py-2 text-sm text-[#ededed] focus:border-[#ededed]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:ring-1 focus:ring-[#ededed]/10"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[#ededed]/62">
                      Min Uplift B · {Math.round(minUplift * 100)}%
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      step={0.5}
                      value={minUplift * 100}
                      onChange={e => setMinUplift(Number(e.target.value) / 100)}
                      className="w-full accent-white h-1.5 rounded-full cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #ededed 0%, #ededed ${(minUplift * 100 - 1) / 19 * 100}%, #111111 ${(minUplift * 100 - 1) / 19 * 100}%, #111111 100%)`,
                      }}
                    />
                  </label>
                </div>

                {/* Segmented control: significance level */}
                <fieldset className="mt-4">
                  <legend className="text-xs font-semibold text-[#ededed]/62 mb-2">Significance Level</legend>
                  <div className="flex gap-1">
                    {([0.9, 0.95, 0.99] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSignificanceLevel(lvl)}
                        className={`flex-1 cursor-pointer rounded-[6px] border px-3 py-2 text-xs font-semibold transition-colors ${
                          significanceLevel === lvl
                            ? 'border-white/30 bg-white text-black'
                            : 'border-white/10 bg-[#111111] text-[#ededed]/60 hover:text-[#ededed]'
                        }`}
                      >
                        {Math.round(lvl * 100)}%
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-[#ededed]/50">
                    {significanceLevel === 0.9 ? 'Looser threshold, faster results' : significanceLevel === 0.99 ? 'Strictest threshold, most confident' : 'Balanced confidence (default)'}
                  </p>
                </fieldset>

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
                    disabled={busy}
                    className="cursor-pointer rounded-[6px] bg-white px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
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
              Auto-Winner configuration is available from the Pro plan onward.
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
