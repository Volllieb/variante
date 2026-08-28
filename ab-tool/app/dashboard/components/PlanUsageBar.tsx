'use client'

import { TrendingUp, Globe, FlaskConical, Zap } from 'lucide-react'
import { PLAN_LIMITS } from '@/lib/planLimits'
import { formatCompact } from '@/lib/formatNumber'

type PlanUsageBarProps = {
  plan: string
  activeTests: number
  domainCount: number
  /**
   * Verbrauchte AI-Scans im laufenden Monat.
   *
   * ponytail: Stand hier fest auf 0. Der Balken, dessen einziger Zweck es ist,
   * das Limit spuerbar zu machen BEVOR der User dagegen laeuft, behauptete
   * damit dauerhaft "noch nichts verbraucht" — und der naechste Scan lief in
   * einen 429. Gezaehlt wird jetzt dasselbe wie in /api/test-wizard/scan.
   */
  aiScansUsed: number
}

export function PlanUsageBar({ plan, activeTests, domainCount, aiScansUsed }: PlanUsageBarProps) {
  if (plan !== 'free') return null

  const limits = PLAN_LIMITS.free

  const items = [
    {
      icon: FlaskConical,
      label: 'Active tests',
      used: activeTests,
      limit: limits.activeTests,
      proLabel: 'Unlimited',
    },
    {
      icon: Globe,
      label: 'Domains',
      used: domainCount,
      limit: limits.domains,
      proLabel: `${PLAN_LIMITS.pro.domains} websites`,
    },
    {
      icon: Zap,
      label: 'AI scans',
      used: aiScansUsed,
      limit: limits.aiScans,
      proLabel: `${PLAN_LIMITS.pro.aiScans}/mo`,
    },
  ]

  return (
    <div className="mb-5 rounded-[var(--radius-lg)] border border-border bg-bg-1 px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-text">Free plan</span>
          <span className="rounded-[var(--radius-sm)] border border-border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-text-3">
            Free
          </span>
        </div>
        <a
          href="/dashboard/billing"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-pro transition-colors hover:text-pro/80"
        >
          <TrendingUp className="h-3 w-3" />
          Upgrade to Pro
        </a>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => {
          const pct = Math.min((item.used / item.limit) * 100, 100)
          const atLimit = item.used >= item.limit

          return (
            <div key={item.label} className="flex items-center gap-3">
              <item.icon
                className={`h-3.5 w-3.5 shrink-0 ${atLimit ? 'text-pro' : 'text-text-3'}`}
              />
              <span className="w-[90px] shrink-0 text-[11px] text-text-2">{item.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-bg-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-[var(--duration-slow)] ease-out ${
                    atLimit ? 'bg-pro' : 'bg-text-3/40'
                  }`}
                  style={{ width: `${Math.max(pct, 4)}%` }}
                />
              </div>
              <span
                className={`min-w-[36px] shrink-0 whitespace-nowrap text-right text-[10px] tabular-nums font-medium ${
                  atLimit ? 'text-pro' : 'text-text-3'
                }`}
              >
                {formatCompact(item.used)}/{formatCompact(item.limit)}
              </span>
              <span className="hidden sm:inline text-[10px] text-text-3/50 w-[80px] text-right">
                Pro: {item.proLabel}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
