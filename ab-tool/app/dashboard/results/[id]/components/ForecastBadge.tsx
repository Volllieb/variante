import { formatHorizon, FORECAST_HORIZON_DAYS, type Forecast } from '@/lib/forecast'
import { Clock } from 'lucide-react'

/**
 * Die Restlaufzeit-Schätzung samt ihrer Grundlage.
 *
 * Die Grundlage steht dabei, weil sie die Zahl erklärt: springt der Traffic,
 * springt auch die Schätzung — ohne den Hinweis "gerechnet mit den letzten drei
 * Tagen" sähe das aus wie ein Fehler statt wie die Korrektur, die es ist.
 */
export function ForecastBadge({ forecast }: { forecast: Forecast }) {
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
