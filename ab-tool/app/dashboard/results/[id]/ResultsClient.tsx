'use client'

import { ExperimentData } from '@/lib/getExperimentStats'
import { VariantPreview } from '@/app/components/VariantPreview'
import { extractTextFromHtml } from '@/lib/previewDoc'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTestUpdate } from '@/lib/useRealtime'
import { Breadcrumbs } from '@/app/components/Breadcrumbs'
import { Tooltip } from '@/app/components/Tooltip'
import { useToast } from '@/app/components/Toast'
import {
  calcSignificance,
  hasSampleRatioMismatch,
  MIN_VISITORS_PER_ARM,
  MIN_CONVERSIONS_PER_ARM,
  MIN_RUNTIME_DAYS,
} from '@/lib/significance'
import {
  formatCreatedAt,
  formatDayLabel,
  exportCsv,
  computeReadiness,
  calcUplift,
  conversionRate,
  dailyLift,
  MIN_CONV_FOR_UPLIFT,
  type ArmCriterion,
  parseGoal,
  formatGoal,
  describeGoal,
  type DailyRow,
  type AnalyticsData,
} from '@/lib/resultsHelpers'
import { forecastDecision, formatHorizon, FORECAST_HORIZON_DAYS, type Forecast } from '@/lib/forecast'
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
  Trophy,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  ReferenceLine,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/app/components/ui/chart'
import {
  barMargin,
  chartMargin,
  gridProps,
  lineProps,
  xAxisProps,
  yAxisProps,
  SERIES,
} from '@/app/dashboard/components/chartTheme'
import { formatCount, formatPercent, formatDelta, formatCompact } from '@/lib/formatNumber'
import { significanceTone } from '@/app/dashboard/components/sigVisual'
import { RefreshIndicator } from '@/app/dashboard/components/RefreshIndicator'

// CSS custom property helpers — SVGs support var() natively
const OK = SERIES.ok
const PRO = SERIES.pro

/* Chart-Konfigurationen. Vorher standen Serienfarben und Legenden-Labels an
   jedem Chart einzeln — die Legenden waren handgebaute divs mit eigenen
   Farbwerten, die von den Linienfarben abweichen konnten. */
const visitorsConfig = {
  B: { label: 'Variant B', color: SERIES.pro },
  A: { label: 'Variant A', color: SERIES.neutral },
} satisfies ChartConfig

const conversionsConfig = {
  B: { label: 'Variant B', color: SERIES.ok },
  A: { label: 'Variant A', color: SERIES.neutral },
} satisfies ChartConfig

const significanceConfig = {
  significance: { label: 'Confidence', color: SERIES.ok },
} satisfies ChartConfig

const barConfig = {
  value: { label: 'Value', color: SERIES.neutral },
} satisfies ChartConfig

/* Prozent-Achse mit fester 0-100-Domain; der kompakte Formatter der geteilten
   Achse wäre hier irreführend. Über formatPercent statt roher Interpolation:
   die CR-Balkenwerte kommen seit dem Metrik-Fix ungerundet an und hingen sonst
   mit allen Nachkommastellen auf der Achse. */
const percentAxisProps = { ...yAxisProps, tickFormatter: (v: number) => formatPercent(v), width: 48 }

/**
 * Die Restlaufzeit-Schätzung samt ihrer Grundlage.
 *
 * Die Grundlage steht dabei, weil sie die Zahl erklärt: springt der Traffic,
 * springt auch die Schätzung — ohne den Hinweis "gerechnet mit den letzten drei
 * Tagen" sähe das aus wie ein Fehler statt wie die Korrektur, die es ist.
 */
function ForecastBadge({ forecast }: { forecast: Forecast }) {
  const { days, limitedBy, lowerBound, rate } = forecast

  const alarming = limitedBy === 'no-traffic' || limitedBy === 'beyond-horizon'
  const headline =
    limitedBy === 'no-traffic'
      ? 'One variant is getting no traffic — it cannot finish like this'
      : limitedBy === 'no-conversions'
      ? 'No conversions are being tracked — the goal may not be firing'
      : limitedBy === 'insufficient-data'
      ? 'Too little data to estimate yet — keep driving traffic'
      : limitedBy === 'ready'
      ? 'All requirements met — the winner can be called now'
      : limitedBy === 'uplift'
      ? 'B is ahead, but below your minimum uplift — no ETA at this difference'
      : limitedBy === 'beyond-horizon'
      ? `More than ${formatHorizon(FORECAST_HORIZON_DAYS)} at the current pace`
      : `${lowerBound ? 'At least ' : ''}${formatHorizon(days ?? 0)} until a winner can be called`

  const factor = rate.changeFactor
  const note =
    rate.basis === 'shift' && factor !== null
      ? factor >= 1
        ? `Traffic jumped ${Number.isFinite(factor) ? `${factor.toFixed(1)}×` : 'sharply'} — estimated from the last ${rate.windowDays} days`
        : `Traffic dropped to ${Math.round(factor * 100)}% — estimated from the last ${rate.windowDays} days`
      : rate.basis === 'recent'
      ? `At the pace of the last ${rate.windowDays} days`
      : 'At the average pace since this test started'

  return (
    <div className="mt-2 flex flex-col items-center gap-1">
      <div
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${
          alarming ? 'border border-err/20 bg-err-bg' : 'border border-pro/15 bg-pro/[0.08]'
        }`}
      >
        <Clock className={`h-3 w-3 shrink-0 ${alarming ? 'text-err' : 'text-pro'}`} />
        <span className={`text-[11px] ${alarming ? 'text-err' : 'text-pro/90'}`}>{headline}</span>
      </div>
      {(days !== null || limitedBy === 'beyond-horizon') && (
        <span className="text-[10px] text-text-3">{note}</span>
      )}
    </div>
  )
}

/**
 * Eine Anforderungszeile, die pro Arm gilt.
 *
 * Zeigt beide Arme und das Ziel; der Balken folgt dem schwächeren Arm, weil
 * evaluateWinner() erst freigibt, wenn BEIDE die Schwelle reißen. Vorher stand
 * hier nur das Minimum ohne Kontext — bei A=6 und B=16 Conversions las sich
 * "6 / 25" wie eine dritte, unerklärliche Zahl.
 */
function ArmRequirement({ label, criterion }: { label: string; criterion: ArmCriterion }) {
  const { a, b, target, pct, met, laggingArm } = criterion
  const armClass = (arm: 'A' | 'B') =>
    !met && laggingArm === arm ? 'text-text-2' : 'text-text-3'
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[10px] mb-0.5">
        <span className={met ? 'text-ok' : 'text-text-3'}>
          {met ? '✓' : '○'} {label}/arm
        </span>
        <span
          className="text-text-3 tabular-nums whitespace-nowrap"
          title={`Variant A: ${formatCount(a)}, Variant B: ${formatCount(b)} — each needs ${formatCount(target)}`}
        >
          <span className={armClass('A')}>A {formatCount(a)}</span>
          <span className="text-text-3/60"> · </span>
          <span className={armClass('B')}>B {formatCount(b)}</span>
          <span className="text-text-3/60"> / {formatCount(target)}</span>
        </span>
      </div>
      <div
        className="h-1 overflow-hidden rounded-full bg-bg-2"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} per variant: A ${a}, B ${b}, target ${target} each`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-[var(--duration-slow)] ${met ? 'bg-ok/60' : 'bg-text-3/40'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
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
  // Manuelles Winner-Override: Variante, für die gerade das Inline-Confirm
  // offen ist (Pattern analog zu deleteConfirm).
  const [declaringWinner, setDeclaringWinner] = useState<'A' | 'B' | null>(null)
  const [showRawData, setShowRawData] = useState(false)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalType, setGoalType] = useState<'element' | 'click' | 'url'>(() => parseGoal(initial.goal).type)
  const [goalValue, setGoalValue] = useState(() => parseGoal(initial.goal).value)
  const [goalSaving, setGoalSaving] = useState(false)
  const [goalSaved, setGoalSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-dismiss error after 6 seconds
  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(null), 6000)
    return () => clearTimeout(t)
  }, [error])
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
    } catch {
      setError('Failed to refresh data. Check your connection.')
    }
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

  const { name, status, winner, variants, created_at } = data
  const [a, b] = variants
  const totalVisitors = a.views + b.views

  // Signifikanz live aus denselben Zählern, die zwei Zentimeter weiter als
  // Besucher und Conversions stehen.
  //
  // ponytail: Der Donut zeigte `tests.significance` aus der Datenbank. Diese
  // Spalte schreibt nur /api/event (also bei Conversions) und der Tages-Cron —
  // Besucher-Zuweisungen fassen sie nicht an. Zwischen zwei Conversions wuchs
  // die Stichprobe also weiter, während die Konfidenz auf dem Stand der letzten
  // Conversion stehenblieb: 500 zusätzliche Besucher ohne Conversion senken die
  // echte Konfidenz, der Donut zeigte den alten, höheren Wert. Die Overview
  // rechnet aus genau diesem Grund schon live (lib/decisions.ts), und die
  // Kurve "Significance over Time" auf dieser Seite ebenfalls — der Donut war
  // die einzige Stelle mit dem gespeicherten Wert und widersprach beiden.
  const significance = calcSignificance(a.views, a.conversions, b.views, b.conversions)

  // Sample Ratio Mismatch: weicht die tatsächliche Verteilung stark vom
  // konfigurierten Split ab, ist die Datenbasis kaputt. Cron und Overview
  // behandeln das als hartes Ausschlusskriterium (kein Gewinner, "not
  // trustworthy") — die Results-Seite zeigte davon nichts und ließ den Kunden
  // auf Zahlen schauen, die im Hintergrund längst disqualifiziert waren.
  const srm = hasSampleRatioMismatch(a.views, b.views, data.trafficSplit)
  // ponytail (Plan RA-06): `done` hieß bisher `status === 'done' || !!winner`.
  // Seit die Auto-Promotion abschaltbar ist, kann ein Test einen ermittelten
  // Gewinner haben und trotzdem weiterlaufen — dann hätte die alte Definition
  // „Variante B wird an alle Besucher ausgeliefert" behauptet, obwohl auf der
  // Kundenseite nichts passiert ist. Der ausgerollte Zustand hängt jetzt
  // ausschließlich am Status, wie in /api/resolve (force nur bei done+B).
  const done = status === 'done'
  // Gewinner steht fest, wartet aber auf die Freigabe des Nutzers.
  const winnerPending = !!winner && !done
  // „Die Entscheidung ist gefallen" — egal ob schon ausgerollt oder nicht.
  // Steuert alles, was Fortschritts- statt Ergebnisdarstellung zeigt.
  const decided = done || winnerPending
  const totalConversions = a.conversions + b.conversions

  // Eine einzige Besucher-Schwelle für Anzeige UND Gate. Der DB-Wert gilt pro
  // Arm (so prüft evaluateWinner), der Systemboden greift zusätzlich. Vorher
  // rechnete der Balken in den Einstellungen mit `min_visitors` als SUMME und
  // meldete bei 83 Besuchern "83 / 100 — fast fertig", während die
  // Anforderungsliste daneben korrekt "30 / 1.000" zeigte.
  const effectiveMinVisitors = Math.max(minVisitors, MIN_VISITORS_PER_ARM)

  // ── V3: Multi-Kriterien-Progress (Spiegel von evaluateWinner) ──
  const readiness = computeReadiness({
    a,
    b,
    minVisitorsPerArm: effectiveMinVisitors,
    minConversionsPerArm: MIN_CONVERSIONS_PER_ARM,
    minRuntimeDays: MIN_RUNTIME_DAYS,
    minUplift,
    createdAt: created_at,
    now,
  })
  const { visitors: visitorsReq, conversions: convReq, runtime, uplift: upliftReq } = readiness
  const allCriteriaMet = readiness.allMet
  // Ohne die Styles der Zielseite ist eine visuelle Vorschau irrefuehrend statt
  // hilfreich — siehe lib/previewDoc.ts. Betrifft alle Tests, die vor 08/2026
  // im Wizard angelegt wurden: dort wurde site_css nie gespeichert.
  const hasSiteCss = !!data.siteCss?.trim()

  // Win #4: Uplift erst anzeigen wenn beide Arme genug Conversions haben.
  // Bei < 10 Conversions pro Arm ist die Uplift-Schätzung statistisches Rauschen
  // und führt zu Fehlinterpretationen ("+50%!" bei 2 vs 3 Conversions).
  const enoughDataForUplift = convReq.lagging >= MIN_CONV_FOR_UPLIFT
  const lift = enoughDataForUplift ? calcUplift(a, b) : null
  // Der fehlende Rest betrifft nur den schwächeren Arm — "4 more per variant"
  // war falsch, wenn A bei 6 und B bei 16 Conversions steht.
  const upliftGap = MIN_CONV_FOR_UPLIFT - convReq.lagging
  const upliftGapWhere = convReq.laggingArm ? `variant ${convReq.laggingArm}` : 'each variant'

  // ── V4: Schätzung bis zur Entscheidbarkeit (alle Bedingungen, nicht nur Konfidenz) ──
  // Pausierte Tests sammeln nichts ein — eine Hochrechnung aus vergangenem
  // Traffic wäre dort ein Versprechen, das der Test gar nicht einlösen kann.
  // Bei kaputter Traffic-Verteilung ist die Frage "wann" ebenfalls die falsche.
  //
  // Das Tempo kommt aus den Tagesdeltas, sobald sie geladen sind: solange nur
  // die Zähler da sind, schätzt lib/forecast aus dem Lebenszeit-Mittel — die
  // erste, grobe Antwort. Mit den Tageszeilen wird daraus das Mittel der
  // letzten Woche, und nach einem Sprung in den Besucherzahlen das der letzten
  // drei Tage.
  const forecast = !decided && now > 0 && status !== 'paused' && !srm
    ? forecastDecision({
        a,
        b,
        significance,
        significanceLevel,
        minVisitorsPerArm: effectiveMinVisitors,
        minConversionsPerArm: MIN_CONVERSIONS_PER_ARM,
        minRuntimeDays: MIN_RUNTIME_DAYS,
        minUplift,
        createdAt: created_at,
        now,
        daily: analytics?.daily,
      })
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
    } catch {
      setError('Failed to save configuration. Please try again.')
    } finally {
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
    } catch {
      setError('Failed to save variant. Please try again.')
    } finally {
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
    } catch {
      setError('Failed to save goal. Please try again.')
    } finally {
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
    } catch {
      setError(`Failed to ${next === 'active' ? 'start' : 'pause'} test. Please try again.`)
    } finally {
      setBusy(false)
    }
  }

  // Plan RA-06: Manuelles Ausrollen des Gewinners. Ohne diesen Weg wäre der
  // Auto-Promotion-Opt-out eine Sackgasse — der Test hätte einen Gewinner,
  // aber kein UI, um ihn live zu schalten.
  // status='done' + winner='B' → /api/resolve liefert force:'B' (100 % B).
  // Bei winner='A' schließt es den Test ab; ausgeliefert wird ohnehin das
  // Original.
  async function applyWinner() {
    if (busy || !winner) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/tests/${experimentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      })
      if (!res.ok) throw new Error('patch failed')
      await refresh()
    } catch {
      setError('Failed to apply the winner. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  // Manuelles Winner-Override: setzt winner + status='done' in einem Schritt
  // und schaltet die Variante damit sofort live — unabhängig davon, ob der
  // Algorithmus (evaluateWinner) bereits entschieden hat. Die Auto-Guardrails
  // (Min-Visitors, Min-Runtime, SRM) gelten weiterhin nur für die automatische
  // Erkennung; hier entscheidet der Nutzer bewusst selbst.
  async function declareWinner(variant: 'A' | 'B') {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/tests/${experimentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner: variant, status: 'done' }),
      })
      if (!res.ok) throw new Error('patch failed')
      setDeclaringWinner(null)
      await refresh()
    } catch {
      setError('Failed to declare the winner. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const statusColor = winnerPending
    // Gewinner steht fest, ist aber noch nicht ausgerollt → Handlungsbedarf.
    ? 'bg-pro-bg text-pro'
    : status === 'active'
      ? 'bg-ok-bg text-ok'
      : status === 'paused'
      ? 'bg-pro-bg text-pro'
      : 'bg-bg-2 text-text-3'

  return (
    <div className="text-text antialiased">
      {/* A11Y-05: Die Seite hatte kein h1 — höchste Überschrift war <h2>Preview</h2>,
          der Testname stand nur im Breadcrumb. */}
      <h1 className="sr-only">{name} — Results</h1>
      {/* Test toolbar */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex items-center gap-3">
          <Breadcrumbs items={[{ label: from === 'tests' ? 'Tests' : 'Dashboard', href: backHref }, { label: name }]} />
          <span className="text-[11px] text-text-3 ml-3">
            Created {formatCreatedAt(created_at)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-[var(--radius-md)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusColor}`}>
            {winnerPending ? `${winner} won · not applied` : winner ? `${winner} won` : status}
          </span>
          {/* Plan RA-06: Nur sichtbar, wenn die Auto-Promotion aus ist und ein
              Gewinner auf Freigabe wartet. Bei aktiver Auto-Promotion tritt
              dieser Zustand nie auf — der Cron setzt done direkt. */}
          {winnerPending && (
            <button
              onClick={applyWinner}
              disabled={busy}
              className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] bg-fill-invert px-3 py-1.5 text-xs font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trophy className="h-3 w-3" /> Apply winner
            </button>
          )}
          {status === 'active' && (
            <button
              onClick={() => toggleStatus('paused')}
              disabled={busy}
              className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] border border-pro/20 bg-pro-bg px-3 py-1.5 text-xs text-pro transition-colors hover:bg-pro/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Pause className="h-3 w-3" /> Pause
            </button>
          )}
          {status === 'paused' && (
            <button
              onClick={() => toggleStatus('active')}
              disabled={busy}
              className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] border border-ok/20 bg-ok-bg px-3 py-1.5 text-xs text-ok transition-colors hover:bg-ok/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="h-3 w-3" /> Resume
            </button>
          )}
          <Tooltip content="Refresh data">
            <button
              onClick={refresh}
              className="flex cursor-pointer h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-border text-text-3 transition-colors hover:border-white/[0.18] hover:text-text"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </Tooltip>
          {!deleteConfirm ? (
            <Tooltip content="Delete experiment">
              <button
                onClick={() => setDeleteConfirm(true)}
                className="flex cursor-pointer h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-border text-text-3 transition-colors hover:border-err/30 hover:text-err"
                aria-label="Delete experiment"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-err/20 bg-err-bg px-3 py-1.5">
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

      {/* Error banner */}
      {error && (
        <div className="border-b border-err/20 bg-err-bg px-5 py-2.5" role="alert">
          <div className="mx-auto max-w-6xl flex items-center justify-between gap-3">
            <p className="text-[13px] text-err">{error}</p>
            <button
              onClick={() => setError(null)}
              className="flex shrink-0 cursor-pointer h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-err/60 transition-colors hover:text-err"
              aria-label="Dismiss error"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-6 py-8 space-y-5">

        {/* ── Hero stat (V2: Significance-first layout) ── */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Left: Significance donut */}
            <div className="flex flex-col items-center">
              <div
                className="relative h-[100px] w-[100px]"
                role="img"
                aria-label={`Significance: ${Math.round(significance * 100)}% confidence, ${formatCount(totalVisitors)} total visitors`}
              >
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="var(--color-bg-2)" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="14" fill="none"
                    stroke={significanceTone(significance, significanceLevel).stroke}
                    strokeWidth="3"
                    strokeDasharray={`${Math.max(0.01, significance) * 87.96} 87.96`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray var(--duration-slow) var(--ease-out)' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-xl font-bold ${significanceTone(significance, significanceLevel).text}`}>
                    {Math.round(significance * 100)}%
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-text-3">Confidence</span>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-center text-text-3 leading-relaxed max-w-[160px]">
                {significance >= significanceLevel
                  ? 'Statistically significant'
                  : significance >= 0.7
                  ? 'Approaching significance'
                  : 'Collecting data'}
              </p>
            </div>

            {/* Center: Primary stat — uplift or visitors */}
            <div className="text-center">
              {decided && winner ? (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-3">
                    {winner} won
                  </p>
                  <p className={`mt-1 text-4xl font-bold tracking-tight ${lift !== null && lift > 0 ? 'text-ok' : lift !== null && lift < 0 ? 'text-err' : 'text-text'}`}>
                    {lift !== null ? formatDelta(lift) : '—'}
                  </p>
                  <p className="mt-1 text-[12px] text-text-3">
                    {lift !== null ? 'Conversion uplift' : 'Not enough data'}
                  </p>
                  <p className="mt-1 text-[11px] text-text-3">
                    {formatCount(totalVisitors)} visitors · {formatCount(totalConversions)} conversions (A + B)
                  </p>
                </>
              ) : !decided && lift !== null ? (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-3">
                    {lift > 0 ? 'B ahead' : lift < 0 ? 'A ahead' : 'Tied'}
                  </p>
                  <p className={`mt-1 text-4xl font-bold tracking-tight ${lift > 0 ? 'text-ok' : lift < 0 ? 'text-pro' : 'text-text'}`}>
                    {formatDelta(lift)}
                  </p>
                  <p className="mt-1 text-[12px] text-text-3">
                    Uplift · {formatCount(totalVisitors)} visitors (A + B)
                  </p>
                  <p className="mt-1 text-[11px] text-text-3 tabular-nums">
                    A: {formatPercent(a.cr)} CR ({formatCount(a.conversions)}/{formatCount(a.views)}) ·
                    B: {formatPercent(b.cr)} CR ({formatCount(b.conversions)}/{formatCount(b.views)})
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-3">
                    Collecting data
                  </p>
                  <p className="mt-1 text-4xl font-bold tracking-tight text-text-3">
                    {formatCount(totalVisitors)}
                  </p>
                  <p className="mt-1 text-[12px] text-text-3">
                    visitors so far — A + B combined
                  </p>
                  <p className="mt-1 text-[11px] text-text-3 tabular-nums">
                    A {formatCount(a.views)} · B {formatCount(b.views)}
                  </p>
                  {!enoughDataForUplift && totalVisitors > 0 && (
                    <p className="mt-1 text-[10px] text-text-3">
                      {upliftGap} more conversion{upliftGap !== 1 ? 's' : ''} in {upliftGapWhere} before the uplift means anything
                    </p>
                  )}
                </>
              )}

              {/* V4: Schätzung bis zur Entscheidbarkeit — alle Bedingungen, nicht nur Konfidenz */}
              {forecast && <ForecastBadge forecast={forecast} />}
            </div>

            {/* Right: Multi-criteria progress (V3) */}
            <div className="space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-3">Requirements</p>
              {/* Besucher und Conversions gelten PRO ARM: beide Werte stehen da,
                  der Balken folgt dem schwächeren — er entscheidet. Der nackte
                  Minimum-Wert allein sah neben der Gesamtsumme im Feld daneben
                  wie ein Rechenfehler aus. */}
              <ArmRequirement label="Visitors" criterion={visitorsReq} />
              <ArmRequirement label="Conversions" criterion={convReq} />
              {/* Runtime */}
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className={runtime.met ? 'text-ok' : 'text-text-3'}>
                    {runtime.met ? '✓' : '○'} Runtime
                  </span>
                  <span className="text-text-3 tabular-nums">
                    {runtime.days.toFixed(1)} / {runtime.target} days
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-bg-2">
                  <div
                    className={`h-full rounded-full transition-[width] duration-[var(--duration-slow)] ${runtime.met ? 'bg-ok/60' : 'bg-text-3/40'}`}
                    style={{ width: `${runtime.pct}%` }}
                  />
                </div>
              </div>
              {/* Min-Uplift: der Gate aus evaluateWinner() — kein Pro-Arm-Wert.
                  Liegt B nicht vorn, blockiert der Gate nicht (A kann gewinnen)
                  und die Zeile steht auf ✓. */}
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className={upliftReq.met ? 'text-ok' : 'text-text-3'}>
                    {upliftReq.met ? '✓' : '○'} Min uplift (B)
                  </span>
                  <span
                    className="text-text-3 tabular-nums whitespace-nowrap"
                    title={
                      upliftReq.lift === null
                        ? 'Not enough conversions in both variants yet — the estimate would be noise'
                        : upliftReq.lift <= 0
                        ? 'B is not ahead — the minimum-uplift gate only applies to B; A can win'
                        : 'Variant B vs. Variant A'
                    }
                  >
                    {upliftReq.lift !== null ? formatDelta(upliftReq.lift) : '—'} / {upliftReq.target}%
                  </span>
                </div>
                <div
                  className="h-1 overflow-hidden rounded-full bg-bg-2"
                  role="progressbar"
                  aria-valuenow={upliftReq.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Min uplift B: ${upliftReq.lift !== null ? formatDelta(upliftReq.lift) : 'not enough data yet'}, target ${upliftReq.target}%`}
                >
                  <div
                    className={`h-full rounded-full transition-[width] duration-[var(--duration-slow)] ${upliftReq.met ? 'bg-ok/60' : 'bg-text-3/40'}`}
                    style={{ width: `${upliftReq.pct}%` }}
                  />
                </div>
              </div>
              {!decided && !allCriteriaMet && (
                <p className="text-[9px] text-text-3 italic">
                  Each variant must clear both thresholds, and every line must be met, before a winner is declared.
                </p>
              )}
              {!decided && allCriteriaMet && significance < significanceLevel && (
                <p className="text-[10px] text-pro/80">
                  Thresholds met — waiting for {Math.round(significanceLevel * 100)}% confidence.
                </p>
              )}
            </div>
          </div>

          {/* Kaputte Traffic-Verteilung: dieselbe Aussage, die Cron und Overview
              schon treffen — hier an der Stelle, an der der Kunde die Zahlen
              tatsächlich liest. */}
          {srm && (
            <div className="mt-5 rounded-[var(--radius-md)] border border-err/20 bg-err-bg p-4" role="alert">
              <p className="text-[12px] font-medium text-err mb-1">
                Traffic split is off — these numbers are not trustworthy
              </p>
              <p className="text-[11px] leading-relaxed text-text-2">
                A got {formatCount(a.views)} visitors, B got {formatCount(b.views)} — far from the
                configured {100 - data.trafficSplit}/{data.trafficSplit} split. Until that is fixed no
                winner will be declared, whatever the confidence above says. Usual causes: page
                caching, an ad blocker, bot traffic, or a selector that no longer matches.
              </p>
            </div>
          )}

          {/* Win #3: "0 Visitors" — konkrete nächste Schritte */}
          {totalVisitors === 0 && (
            <div className="mt-5 rounded-[var(--radius-md)] border border-pro/15 bg-pro/[0.03] p-4">
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
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-3.5 w-3.5 text-text-3" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">
                Visitors per Day
              </span>
            </div>
            <ChartContainer
              config={visitorsConfig}
              showLegend
              className="h-[180px] w-full"
              role="img"
              aria-label={`Visitors per day for ${analytics.daily.length} days, ${formatCount(totalVisitors)} in total`}
            >
              <LineChart
                data={analytics.daily.map((d) => ({
                  date: formatDayLabel(d.date),
                  A: d.visitors_a,
                  B: d.visitors_b,
                }))}
                margin={chartMargin}
              >
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" {...xAxisProps} />
                <YAxis {...yAxisProps} />
                <ChartTooltip content={<ChartTooltipContent valueFormatter={(v) => formatCount(v)} />} />
                <Line dataKey="A" stroke={SERIES.neutral} {...lineProps} />
                <Line dataKey="B" stroke={PRO} {...lineProps} />
              </LineChart>
            </ChartContainer>
          </div>
        ) : analyticsLoaded ? (
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-text-3" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">
                Visitors per Day
              </span>
              <span className="ml-auto text-[11px] text-text-3">Not enough data yet</span>
            </div>
          </div>
        ) : null}

        {/* ── Cumulative Conversions over Time ── */}
        {analytics && analytics.daily.length >= 2 ? (
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-3.5 w-3.5 text-text-3" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">
                Cumulative Conversions
              </span>
            </div>
            <ChartContainer
              config={conversionsConfig}
              showLegend
              className="h-[180px] w-full"
              role="img"
              aria-label={`Cumulative conversions: ${formatCount(totalConversions)} total conversions over ${analytics.daily.length} days`}
            >
              <LineChart
                data={(() => {
                  let cumA = 0, cumB = 0
                  return analytics.daily.map((d) => {
                    cumA += d.conversions_a
                    cumB += d.conversions_b
                    return {
                      date: formatDayLabel(d.date),
                      A: cumA,
                      B: cumB,
                    }
                  })
                })()}
                margin={chartMargin}
              >
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" {...xAxisProps} />
                <YAxis {...yAxisProps} />
                <ChartTooltip content={<ChartTooltipContent valueFormatter={(v) => formatCount(v)} />} />
                <Line dataKey="A" stroke={SERIES.neutral} {...lineProps} />
                <Line dataKey="B" stroke={OK} {...lineProps} />
              </LineChart>
            </ChartContainer>
          </div>
        ) : analyticsLoaded ? (
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-text-3" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">
                Cumulative Conversions
              </span>
              <span className="ml-auto text-[11px] text-text-3">Not enough data yet</span>
            </div>
          </div>
        ) : null}
        </div>{/* end charts grid */}

        {/* ── Significance over Time ── */}
        {analytics && analytics.daily.length >= 2 ? (
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-3.5 w-3.5 text-text-3" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">
                Significance over Time
              </span>
            </div>
            <ChartContainer
              config={significanceConfig}
              className="h-[180px] w-full"
              role="img"
              aria-label={`Significance over time: currently ${Math.round(significance * 100)}% confidence over ${analytics.daily.length} days`}
            >
              <LineChart
                data={(() => {
                  let cumVA = 0, cumCA = 0, cumVB = 0, cumCB = 0
                  return analytics.daily.map((d) => {
                    cumVA += d.visitors_a; cumCA += d.conversions_a
                    cumVB += d.visitors_b; cumCB += d.conversions_b
                    const sig = calcSignificance(cumVA, cumCA, cumVB, cumCB)
                    return {
                      date: formatDayLabel(d.date),
                      significance: Math.round(sig * 100),
                    }
                  })
                })()}
                margin={chartMargin}
              >
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" {...xAxisProps} />
                <YAxis domain={[0, 100]} {...percentAxisProps} />
                <ChartTooltip
                  content={<ChartTooltipContent valueFormatter={(v) => formatPercent(v)} />}
                />
                {/* 95% significance threshold */}
                <ReferenceLine
                  y={Math.round(significanceLevel * 100)}
                  stroke={SERIES.muted}
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
                <Line dataKey="significance" stroke={OK} {...lineProps} />
              </LineChart>
            </ChartContainer>
            <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-text-3">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: OK }} /> Confidence
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="inline-block h-0.5 w-4 rounded-full border-t border-dashed border-border-strong" />{' '}
                {Math.round(significanceLevel * 100)}% threshold
              </span>
            </div>
          </div>
        ) : analyticsLoaded ? (
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-text-3" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">
                Significance over Time
              </span>
              <span className="ml-auto text-[11px] text-text-3">Not enough data yet</span>
            </div>
          </div>
        ) : null}

        {/* ── A/B Stats Cards (Significance jetzt im Hero) ── */}
        <div className="grid grid-cols-2 gap-4">
          {[a, b].map((v, i) => {
            const isWinner = winner === v.id
            const isVariantB = i === 1
            const other = v.id === 'A' ? b : a
            const isLowerCr = v.cr < other.cr
            return (
              <div
                key={v.id}
                className={`rounded-[var(--radius-lg)] border p-6 ${
                  isWinner
                    ? 'border-ok/30 bg-ok-bg'
                    : 'border-border bg-bg-1'
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className={`rounded-[var(--radius-md)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                    isVariantB
                      ? 'bg-pro-bg text-pro'
                      : 'bg-bg-2 text-text-3'
                  }`}>
                    Variant {v.label}
                  </span>
                  {isWinner && (
                    <span className="flex items-center gap-1 rounded-[var(--radius-md)] bg-ok-bg px-2.5 py-1 text-[11px] font-semibold text-ok">
                      <Check className="h-3 w-3" /> Winner
                    </span>
                  )}
                </div>

                <p className="text-4xl font-semibold text-text">
                  {formatPercent(v.cr)}
                </p>
                <p className="mt-0.5 text-xs text-text-3">Conversion Rate</p>

                <div className="mt-4 space-y-1.5 text-xs text-text-3">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {formatCount(v.views)} visitors
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" />
                    {formatCount(v.conversions)} conversions
                  </div>
                </div>

                {lift !== null && isVariantB && (
                  <div className={`mt-4 rounded-[var(--radius-md)] px-3 py-2 text-xs font-semibold ${
                    lift > 0
                      ? 'bg-ok-bg text-ok'
                      : 'bg-err-bg text-err'
                  }`}>
                    {formatDelta(lift)} vs A
                  </div>
                )}

                {/* Manuelles Winner-Override: nur solange kein Gewinner feststeht
                    und der Test läuft/pausiert. Sobald der Algorithmus oder ein
                    früherer Override `winner` gesetzt hat, verschwindet der Weg. */}
                {!winner && (status === 'active' || status === 'paused') && (
                  declaringWinner !== v.id ? (
                    <button
                      onClick={() => setDeclaringWinner(v.id as 'A' | 'B')}
                      className="mt-4 flex cursor-pointer items-center gap-1.5 text-xs text-text-3 transition-colors hover:text-text"
                    >
                      <Trophy className="h-3.5 w-3.5" /> Declare winner
                    </button>
                  ) : (
                    <div className={`mt-4 rounded-[var(--radius-md)] border p-3 ${
                      isLowerCr ? 'border-err/20 bg-err-bg' : 'border-border bg-bg-2'
                    }`}>
                      <p className={`text-xs ${isLowerCr ? 'text-err' : 'text-text-2'}`}>
                        {isLowerCr
                          ? `Variant ${v.label} currently has a lower conversion rate (${formatPercent(v.cr)} vs ${formatPercent(other.cr)}). Declare it winner anyway?`
                          : `Declare Variant ${v.label} as the winner? This ends the test and serves it to all visitors.`}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => declareWinner(v.id as 'A' | 'B')}
                          disabled={busy}
                          className="cursor-pointer text-xs font-semibold text-ok transition-colors hover:opacity-80 disabled:opacity-50"
                        >
                          Yes, declare winner
                        </button>
                        <button
                          onClick={() => setDeclaringWinner(null)}
                          disabled={busy}
                          className="cursor-pointer text-xs text-text-3 transition-colors hover:text-text disabled:opacity-30"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )
          })}
        </div>

        {/* Variant comparison bar chart — available for all plans */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-3.5 w-3.5 text-text-3" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">
              Variant Comparison
            </span>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Visitors bar chart */}
            <div>
              <p className="mb-2 text-[10px] font-medium text-text-3" id="visitors-bar-label">Visitors</p>
              <ChartContainer
                config={barConfig}
                className="h-[140px] w-full"
                role="img"
                aria-labelledby="visitors-bar-label"
                aria-label={`Variant A ${formatCount(a.views)} visitors, Variant B ${formatCount(b.views)} visitors`}
              >
                <BarChart
                  data={[
                    { variant: 'A', value: a.views },
                    { variant: 'B', value: b.views },
                  ]}
                  margin={barMargin}
                >
                  <CartesianGrid {...gridProps} />
                  <YAxis {...yAxisProps} />
                  <ChartTooltip
                    content={<ChartTooltipContent hideLabel valueFormatter={(v) => formatCount(v)} />}
                  />
                  <Bar
                    dataKey="value"
                    radius={[4, 4, 0, 0]}
                    fill={SERIES.neutral}
                    fillOpacity={0.35}
                    maxBarSize={48}
                    label={{ position: 'top', fill: 'var(--color-text-3)', fontSize: 10, formatter: (v: unknown) => (typeof v === 'number' ? formatCompact(v) : String(v ?? '')) }}
                  />
                </BarChart>
              </ChartContainer>
            </div>
            {/* Conversion rate bar chart */}
            <div>
              <p className="mb-2 text-[10px] font-medium text-text-3">Conversion Rate</p>
              <ChartContainer
                config={barConfig}
                className="h-[140px] w-full"
                role="img"
                aria-label={`Conversion rate: Variant A ${formatPercent(a.cr)}, Variant B ${formatPercent(b.cr)}`}
              >
                <BarChart
                  data={[
                    { variant: 'A', value: a.cr },
                    { variant: 'B', value: b.cr },
                  ]}
                  margin={barMargin}
                >
                  <CartesianGrid {...gridProps} />
                  <YAxis {...percentAxisProps} />
                  <ChartTooltip
                    content={<ChartTooltipContent hideLabel valueFormatter={(v) => formatPercent(v)} />}
                  />
                  <Bar
                    dataKey="value"
                    radius={[4, 4, 0, 0]}
                    fill={PRO}
                    maxBarSize={48}
                    label={{ position: 'top', fill: 'var(--color-text-3)', fontSize: 10, formatter: (v: unknown) => (typeof v === 'number' ? formatPercent(v) : String(v ?? '')) }}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </div>

        {/* Conversion Goal */} 
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
          {!editingGoal ? (
            <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {goalType === 'element' ? (
                  <MousePointerClick className="h-3.5 w-3.5 text-text-3" />
                ) : goalType === 'click' ? (
                  <MousePointerClick className="h-3.5 w-3.5 text-pro" />
                ) : (
                  <Globe className="h-3.5 w-3.5 text-ok" />
                )}
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">
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
                className="flex cursor-pointer items-center gap-1.5 text-xs text-text-3 transition-colors hover:text-text"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
            </div>
            <p className="mt-2 text-[13px] text-text-2">
              {(() => {
                // Dieselbe Zuordnung wie auf der Testkarte (lib/resultsHelpers).
                const g = describeGoal(goalType, goalValue, data.selector)
                return g.code ? (
                  <>{g.label} <code className="text-[11px] font-mono text-text-3 bg-bg-2 px-1.5 py-0.5 rounded">{g.code}</code></>
                ) : (
                  g.label
                )
              })()}
            </p>
            </>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-3.5 w-3.5 text-text-3" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">
                  Conversion Goal
                </span>
              </div>

              <div className="flex gap-1 mb-3">
                {([
                  { type: 'element' as const, label: 'Replaced element', icon: MousePointerClick, desc: 'Click on the original element is the conversion' },
                  { type: 'click' as const, label: 'Click selector', icon: MousePointerClick, desc: 'Pick a CSS selector users click' },
                  // "URL goal" war hier waehlbar, ohne dass ab.js es je
                  // implementiert hat: der Wert lief als CSS-Selektor in
                  // closest(), der SyntaxError verschwand still, und der Test
                  // zaehlte auf beiden Armen dauerhaft null Conversions
                  // (Katalog RUN-03). Bestandstests mit url:-Goal zeigen unten
                  // eine Warnung, statt die Option weiter anzubieten.
                ]).map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => { setGoalType(opt.type); setGoalSaved(false) }}
                    className={`flex-1 cursor-pointer rounded-[var(--radius-md)] border px-3 py-2 text-left transition-colors ${
                      goalType === opt.type
                        ? 'border-white/20 bg-white/[0.06]'
                        : 'border-border bg-transparent hover:border-white/[0.14]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <opt.icon className={`h-3 w-3 ${goalType === opt.type ? 'text-white' : 'text-text-3'}`} />
                      <span className={`text-[11px] font-semibold ${goalType === opt.type ? 'text-white' : 'text-text-3'}`}>
                        {opt.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-text-3 hidden sm:block">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {/* Value input for click / url */}
              {goalType === 'click' && (
                <div className="mb-3">
                  <label className="text-[10px] font-semibold text-text-3 uppercase tracking-wider">CSS Selector</label>
                  <input
                    type="text"
                    placeholder=".cta-button, #signup-link, a.btn-primary"
                    value={goalValue}
                    onChange={e => { setGoalValue(e.target.value); setGoalSaved(false) }}
                    className="mt-1 w-full rounded-[var(--radius-md)] border border-border bg-bg-2 px-3 py-2 text-sm text-text font-mono placeholder:text-text/25 focus:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:ring-1 focus:ring-border-strong"
                  />
                </div>
              )}

              {/* Bestandstest mit url:-Goal — die Option wird nicht mehr
                  angeboten, der gespeicherte Wert muss aber erklärt werden. */}
              {goalType === 'url' && (
                <div className="mb-3 rounded-[var(--radius-md)] border border-err/30 bg-err/[0.06] px-3 py-2.5">
                  <p className="text-[12px] text-text-2">
                    This test uses a URL goal (<code className="text-[11px] font-mono bg-bg-2 px-1 py-0.5 rounded">{goalValue}</code>), which the snippet never supported —
                    <strong className="text-text"> no conversions have been tracked for it</strong>. Pick a click goal above to start measuring.
                  </p>
                </div>
              )}

              {goalType === 'element' && data.selector && (
                <p className="mb-3 text-[12px] text-text-3">
                  The element <code className="text-[11px] font-mono bg-bg-2 px-1 py-0.5 rounded">{data.selector}</code> is the conversion goal. Users who click it convert.
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
                  // url: ist kein speicherbarer Zustand mehr — der Nutzer muss
                  // erst einen unterstützten Zieltyp wählen (Katalog RUN-03).
                  disabled={goalSaving || goalType === 'url' || (goalType !== 'element' && !goalValue.trim())}
                  className="cursor-pointer rounded-[var(--radius-md)] bg-white px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-white/90 disabled:opacity-40"
                >
                  {goalSaving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditingGoal(false)}
                  className="cursor-pointer rounded-[var(--radius-md)] border border-border px-3 py-2 text-xs text-text-3 transition-colors hover:text-text"
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
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRawData(!showRawData)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Table2 className="h-3.5 w-3.5 text-text-3" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">
                  Raw Data
                </span>
              </button>
              <span className="text-[11px] text-text-3">
                · {analytics.daily.length} days
              </span>
              <button
                onClick={() => exportCsv(analytics!.daily, name)}
                className="ml-auto flex cursor-pointer items-center gap-1 rounded-[var(--radius-md)] border border-border px-2.5 py-1 text-[10px] text-text-3 transition-colors hover:border-white/[0.18] hover:text-text"
              >
                <Download className="h-3 w-3" /> CSV
              </button>
            </div>
            {showRawData && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-text-3">
                      <th className="pb-2 pr-3 font-medium">Date</th>
                      <th className="pb-2 pr-3 font-medium text-right">Vis A</th>
                      <th className="pb-2 pr-3 font-medium text-right">Vis B</th>
                      {/* Ohne die Conversions ist die CR-Spalte nicht
                          nachrechenbar — "0.0%" konnte null Conversions oder
                          eine sehr kleine Rate heissen. Der CSV-Export lieferte
                          sie laengst, die Tabelle nicht. */}
                      <th className="pb-2 pr-3 font-medium text-right">Conv A</th>
                      <th className="pb-2 pr-3 font-medium text-right">Conv B</th>
                      <th className="pb-2 pr-3 font-medium text-right">CR A</th>
                      <th className="pb-2 pr-3 font-medium text-right">CR B</th>
                      <th className="pb-2 font-medium text-right">Lift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.daily.map((row: DailyRow) => {
                      // "—%" stand vorher an jedem Tag ohne Besucher in dem Arm:
                      // der Gedankenstrich kam aus dem Fallback, das Prozent-
                      // zeichen aus dem Markup daneben.
                      const crA = row.visitors_a > 0 ? formatPercent(conversionRate(row.visitors_a, row.conversions_a)) : '—'
                      const crB = row.visitors_b > 0 ? formatPercent(conversionRate(row.visitors_b, row.conversions_b)) : '—'
                      const rowLift = dailyLift(row)
                      return (
                        <tr key={row.date} className="border-b border-border text-text-3 transition-colors duration-[var(--duration-fast)] ease-out hover:bg-bg-2 hover:text-text-2">
                          <td className="py-1.5 pr-3">{formatDayLabel(row.date)}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{formatCount(row.visitors_a)}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{formatCount(row.visitors_b)}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{formatCount(row.conversions_a)}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{formatCount(row.conversions_b)}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{crA}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{crB}</td>
                          <td className={`py-1.5 text-right tabular-nums ${rowLift !== null ? (rowLift > 0 ? 'text-ok' : rowLift < 0 ? 'text-err' : '') : ''}`}>
                            {rowLift !== null ? formatDelta(rowLift) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <p className="mt-2 text-[10px] text-text-3">
                  Daily values, not cumulative. Lift stays empty until a day has at least{' '}
                  {MIN_CONV_FOR_UPLIFT} conversions in both variants — below that it is noise.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        {(data.originalHtml || data.variantBHtml || editingB) && (
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text">Preview</h2>
              <span className="text-[10px] text-text-3">
                {hasSiteCss ? 'Live rendering of your variants' : 'Text-only — no site styles captured'}
              </span>
            </div>
            {!hasSiteCss && (data.originalHtml || data.variantBHtml) && !editingB ? (
              /* Ohne die Styles der Zielseite wuerde das iframe einen nackten
                 Browser-Default rendern, der mit dem echten Element nichts zu tun
                 hat. Tests, die vor 08/2026 im Wizard angelegt wurden, haben kein
                 site_css — dort ist der Textvergleich die ehrlichere Auskunft. */
              <div>
                <div className="grid grid-cols-2 gap-5">
                  <TextPane label="A · Original" value={extractTextFromHtml(data.originalHtml || '')} />
                  <TextPane label="B · Variant" value={extractTextFromHtml(data.variantBHtml || '')} />
                </div>
                <p className="mt-2 text-[11px] text-[#ededed]/40">
                  This test was created without the visual picker, so your site&apos;s styles for
                  this element were never captured. Re-pick the element to get a rendered preview.
                </p>
              </div>
            ) : (
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
                    variantCss={data.variantBCss}
                    label="B · Variant"
                    winner={winner === 'B'}
                  />
                  <button
                    onClick={() => { setDraftB(data.variantBHtml || ''); setEditingB(true) }}
                    className="flex cursor-pointer items-center gap-1.5 text-xs text-text-3 transition-colors hover:text-text-2"
                  >
                    <Pencil className="h-3 w-3" /> Edit Variant B HTML
                  </button>
                </div>
              )}
              {!editingB && !data.variantBHtml && data.originalHtml && (
                <div className="flex items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] min-h-[280px]">
                  <button
                    onClick={() => { setDraftB('<div class="ab-v">\n  <style>\n    .ab-v { /* your styles */ }\n  </style>\n</div>'); setEditingB(true) }}
                    className="cursor-pointer text-xs text-text-3 transition-colors hover:text-text-2"
                  >
                    + Add Variant B HTML
                  </button>
                </div>
              )}
              {editingB && (
                <div className="rounded-[var(--radius-md)] border border-border bg-bg-2 p-4">
                  <p className="mb-2 text-xs font-semibold text-text-2">Edit Variant B HTML</p>
                  <textarea
                    value={draftB}
                    onChange={e => setDraftB(e.target.value)}
                    className="w-full rounded-[var(--radius-md)] border border-border bg-bg-1 px-3 py-2 font-mono text-xs text-ok focus:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:ring-1 focus:ring-border-strong"
                    rows={10}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={saveVariantB}
                      disabled={busy}
                      className="cursor-pointer rounded-[var(--radius-md)] bg-white px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingB(false)}
                      className="cursor-pointer rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-xs text-text-3 transition-colors hover:text-text"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
        )}

        {/* Auto-winner */}
        {pro && (
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-6">
            <h2 className="mb-1 text-sm font-semibold text-text">Auto Winner</h2>
            {done ? (
              <p className="mt-2 text-[13px] text-ok">
                ✓ Test complete —{' '}
                {winner
                  ? `Variant ${winner} wins and is now served to all visitors.`
                  : 'no winner declared.'}
              </p>
            ) : winnerPending ? (
              // Plan RA-06: Auto-Apply ist aus — der Gewinner steht fest, aber
              // auf der Kundenseite hat sich nichts geändert. Das hier muss
              // unmissverständlich sein, sonst glaubt der Kunde, die Variante
              // sei live.
              <div className="mt-2 space-y-3">
                <p className="text-[13px] text-pro">
                  Variant {winner} won — <strong className="font-semibold">not applied yet</strong>.
                </p>
                <p className="text-xs leading-relaxed text-text-3">
                  Auto-apply is off, so your site is unchanged and the test keeps running at its
                  current split. Applying the winner serves Variant {winner} to all visitors and
                  closes the test.
                </p>
                <button
                  onClick={applyWinner}
                  disabled={busy}
                  className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] bg-fill-invert px-4 py-2 text-xs font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trophy className="h-3.5 w-3.5" /> Apply winner
                </button>
              </div>
            ) : (
              <>
                <p className="mt-1 text-xs text-text-3 leading-relaxed">
                  Once every requirement above is met — visitors and conversions in
                  <em> both </em> variants, minimum runtime, confidence and minimum uplift —
                  Variant B becomes the winner. If auto-apply is on
                  (Account → Experiments), it is served to all new visitors automatically —
                  otherwise you get a notification and decide here.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-text-2">
                      Min Visitors <span className="font-normal text-text-3">per variant</span>
                    </span>
                    <input
                      type="number"
                      min={MIN_VISITORS_PER_ARM}
                      step={100}
                      value={minVisitors}
                      onChange={e => setMinVisitors(Number(e.target.value))}
                      className="w-full rounded-[var(--radius-md)] border border-border bg-bg-2 px-3 py-2 text-sm text-text focus:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:ring-1 focus:ring-border-strong"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-text-2">
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
                        background: `linear-gradient(to right, var(--color-text) 0%, var(--color-text) ${(minUplift * 100 - 1) / 19 * 100}%, var(--color-bg-2) ${(minUplift * 100 - 1) / 19 * 100}%, var(--color-bg-2) 100%)`,
                      }}
                    />
                  </label>
                </div>

                {/* Segmented control: significance level */}
                <fieldset className="mt-4">
                  <legend className="text-xs font-semibold text-text-2 mb-2">Significance Level</legend>
                  <div className="flex gap-1">
                    {([0.9, 0.95, 0.99] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSignificanceLevel(lvl)}
                        className={`flex-1 cursor-pointer rounded-[var(--radius-md)] border px-3 py-2 text-xs font-semibold transition-colors ${
                          significanceLevel === lvl
                            ? 'border-white/30 bg-white text-black'
                            : 'border-border bg-bg-2 text-text-2 hover:text-text'
                        }`}
                      >
                        {Math.round(lvl * 100)}%
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-text-3">
                    {significanceLevel === 0.9 ? 'Looser threshold, faster results' : significanceLevel === 0.99 ? 'Strictest threshold, most confident' : 'Balanced confidence (default)'}
                  </p>
                </fieldset>

                {minVisitors < MIN_VISITORS_PER_ARM && (
                  <p className="mt-2 text-[11px] text-text-3">
                    Below the system floor — {formatCount(MIN_VISITORS_PER_ARM)} visitors per variant
                    are required regardless, so a lower value has no effect.
                  </p>
                )}

                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs text-text-3">
                    <span>Visitor threshold</span>
                    {/* Derselbe Wert wie in der Anforderungsliste oben: schwächerer
                        Arm gegen die effektive Schwelle. Vorher stand hier die
                        Gesamtsumme gegen dieselbe Zahl — doppelt so schnell voll. */}
                    <span className="tabular-nums">
                      {formatCount(visitorsReq.lagging)} / {formatCount(effectiveMinVisitors)} per variant
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-bg-2">
                    <div
                      className="h-full rounded-full bg-text transition-[width] duration-[var(--duration-slow)]"
                      style={{ width: `${visitorsReq.pct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={saveConfig}
                    disabled={busy}
                    className="cursor-pointer rounded-[var(--radius-md)] bg-white px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
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
          <div className="rounded-[var(--radius-lg)] border border-dashed border-border p-6 text-center">
            <h2 className="text-sm font-semibold text-text">Auto Winner</h2>
            <p className="mt-2 text-xs text-text-3">
              Auto-Winner configuration is available from the Pro plan onward.
            </p>
            <button
              onClick={upgrade}
              disabled={busy}
              className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] bg-white px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:opacity-50"
            >
              {busy ? 'Redirecting…' : 'Upgrade to Pro'}
            </button>
          </div>
        )}
      </div>

      {/* refreshing deckt manuellen Button UND Realtime-Updates ab — die
          Pille erscheint also auch, wenn der Test sich im Hintergrund
          aktualisiert hat. */}
      <RefreshIndicator active={refreshing} />
    </div>
  )
}

/**
 * Textspalte des Vorschau-Fallbacks. Bewusst keine gemeinsame Komponente mit
 * StepReview: dort gilt die kompakte Wizard-Typo, hier die der Results-Seite.
 */
function TextPane({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[#ededed]/40">{label}</p>
      <div className="flex min-h-[120px] items-center rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <p className="text-sm leading-relaxed text-[#ededed] break-words">{value || '—'}</p>
      </div>
    </div>
  )
}
