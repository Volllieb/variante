import { formatCompact } from '@/lib/formatNumber'
import { significanceTone } from './sigVisual'

/* ── Pie chart: significance progress, visitors in center ── */
export function SigPie({ significance, visitors, size }: { significance: number; visitors: number; size: number }) {
  const r = size / 2 - 3
  const c = size / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(1, Math.max(0, significance))
  const tone = significanceTone(pct)
  const strokeColor = tone.stroke
  const bgColor = tone.fill

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={c} cy={c} r={r} fill={bgColor} stroke="var(--color-border)" strokeWidth="1.5" />
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`}
        transform={`rotate(-90 ${c} ${c})`}
        style={{ transition: 'stroke-dasharray var(--duration-slow) var(--ease-out)' }}
      />
      <text x={c} y={c} textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="600" fill="var(--color-text)">
        {formatCompact(visitors)}
      </text>
    </svg>
  )
}
