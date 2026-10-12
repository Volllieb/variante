'use client'

import { formatCount, formatPercent, formatDelta } from '@/lib/formatNumber'
import { significanceTone } from '@/app/dashboard/components/sigVisual'
import type { ArmCriterion, Readiness, UpliftCriterion } from '@/lib/resultsHelpers'
import type { ExperimentData, VariantStats } from '@/lib/getExperimentStats'
import type { Forecast } from '@/lib/forecast'
import { ForecastBadge } from './ForecastBadge'
import { ArmRequirement } from './ArmRequirement'

/** Hero: Konfidenz-Donut, Hauptkennzahl mit Forecast, Anforderungsliste, SRM- und 0-Besucher-Hinweise. */
export function HeroStats({
  significance,
  totalVisitors,
  significanceLevel,
  decided,
  winner,
  lift,
  totalConversions,
  a,
  b,
  enoughDataForUplift,
  upliftGap,
  upliftGapWhere,
  forecast,
  visitorsReq,
  convReq,
  runtime,
  upliftReq,
  allCriteriaMet,
  srm,
  data,
}: {
  significance: number
  totalVisitors: number
  significanceLevel: number
  decided: boolean
  winner: string | null
  lift: number | null
  totalConversions: number
  a: VariantStats
  b: VariantStats
  enoughDataForUplift: boolean
  upliftGap: number
  upliftGapWhere: string
  forecast: Forecast | null
  visitorsReq: ArmCriterion
  convReq: ArmCriterion
  runtime: Readiness['runtime']
  upliftReq: UpliftCriterion
  allCriteriaMet: boolean
  srm: boolean
  data: ExperimentData
}) {
  return (
    <>
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
    </>
  )
}
