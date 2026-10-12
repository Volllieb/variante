import type { ArmCriterion } from '@/lib/resultsHelpers'
import { formatCount } from '@/lib/formatNumber'

/**
 * Eine Anforderungszeile, die pro Arm gilt.
 *
 * Zeigt beide Arme und das Ziel; der Balken folgt dem schwächeren Arm, weil
 * evaluateWinner() erst freigibt, wenn BEIDE die Schwelle reißen. Vorher stand
 * hier nur das Minimum ohne Kontext — bei A=6 und B=16 Conversions las sich
 * "6 / 25" wie eine dritte, unerklärliche Zahl.
 */
export function ArmRequirement({ label, criterion }: { label: string; criterion: ArmCriterion }) {
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
