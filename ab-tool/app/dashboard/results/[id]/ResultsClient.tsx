'use client'

import { ExperimentData } from '@/lib/getExperimentStats'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTestUpdate } from '@/lib/hooks/useRealtime'
import { useToast } from '@/app/components/Toast'
import { calcSignificance, hasSampleRatioMismatch, MIN_VISITORS_PER_ARM, MIN_CONVERSIONS_PER_ARM, MIN_RUNTIME_DAYS } from '@/lib/significance'
import { computeReadiness, calcUplift, MIN_CONV_FOR_UPLIFT, parseGoal, formatGoal, type AnalyticsData } from '@/lib/resultsHelpers'
import { forecastDecision } from '@/lib/forecast'
import { X } from 'lucide-react'
import { RefreshIndicator } from '@/app/dashboard/components/RefreshIndicator'
import { ResultsToolbar } from './components/ResultsToolbar'
import { HeroStats } from './components/HeroStats'
import { TrendCharts } from './components/TrendCharts'
import { ArmStatsCards } from './components/ArmStatsCards'
import { VariantComparison } from './components/VariantComparison'
import { GoalEditor } from './components/GoalEditor'
import { RawDataTable } from './components/RawDataTable'
import { PreviewPanel } from './components/PreviewPanel'
import { AutoWinnerPanel } from './components/AutoWinnerPanel'

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
      <ResultsToolbar
        name={name}
        from={from}
        backHref={backHref}
        created_at={created_at}
        statusColor={statusColor}
        winnerPending={winnerPending}
        winner={winner}
        status={status}
        busy={busy}
        refreshing={refreshing}
        deleteConfirm={deleteConfirm}
        deleting={deleting}
        applyWinner={applyWinner}
        toggleStatus={toggleStatus}
        refresh={refresh}
        setDeleteConfirm={setDeleteConfirm}
        deleteTest={deleteTest}
      />

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

        <HeroStats
          significance={significance}
          totalVisitors={totalVisitors}
          significanceLevel={significanceLevel}
          decided={decided}
          winner={winner}
          lift={lift}
          totalConversions={totalConversions}
          a={a}
          b={b}
          enoughDataForUplift={enoughDataForUplift}
          upliftGap={upliftGap}
          upliftGapWhere={upliftGapWhere}
          forecast={forecast}
          visitorsReq={visitorsReq}
          convReq={convReq}
          runtime={runtime}
          upliftReq={upliftReq}
          allCriteriaMet={allCriteriaMet}
          srm={srm}
          data={data}
        />

        <TrendCharts
          analytics={analytics}
          analyticsLoaded={analyticsLoaded}
          totalVisitors={totalVisitors}
          totalConversions={totalConversions}
          significance={significance}
          significanceLevel={significanceLevel}
        />

        <ArmStatsCards
          a={a}
          b={b}
          winner={winner}
          lift={lift}
          status={status}
          declaringWinner={declaringWinner}
          setDeclaringWinner={setDeclaringWinner}
          declareWinner={declareWinner}
          busy={busy}
        />

        <VariantComparison
          a={a}
          b={b}
        />

        <GoalEditor
          editingGoal={editingGoal}
          goalType={goalType}
          goalValue={goalValue}
          setGoalType={setGoalType}
          setGoalValue={setGoalValue}
          setEditingGoal={setEditingGoal}
          setGoalSaved={setGoalSaved}
          data={data}
          goalSaving={goalSaving}
          goalSaved={goalSaved}
          saveGoal={saveGoal}
        />

        <RawDataTable
          analytics={analytics}
          showRawData={showRawData}
          setShowRawData={setShowRawData}
          name={name}
        />

        <PreviewPanel
          data={data}
          editingB={editingB}
          hasSiteCss={hasSiteCss}
          winner={winner}
          setDraftB={setDraftB}
          setEditingB={setEditingB}
          draftB={draftB}
          saveVariantB={saveVariantB}
          busy={busy}
        />

        <AutoWinnerPanel
          pro={pro}
          done={done}
          winner={winner}
          winnerPending={winnerPending}
          applyWinner={applyWinner}
          busy={busy}
          minVisitors={minVisitors}
          setMinVisitors={setMinVisitors}
          minUplift={minUplift}
          setMinUplift={setMinUplift}
          significanceLevel={significanceLevel}
          setSignificanceLevel={setSignificanceLevel}
          visitorsReq={visitorsReq}
          effectiveMinVisitors={effectiveMinVisitors}
          saveConfig={saveConfig}
          saved={saved}
          upgrade={upgrade}
        />
      </div>

      {/* refreshing deckt manuellen Button UND Realtime-Updates ab — die
          Pille erscheint also auch, wenn der Test sich im Hintergrund
          aktualisiert hat. */}
      <RefreshIndicator active={refreshing} />
    </div>
  )
}
