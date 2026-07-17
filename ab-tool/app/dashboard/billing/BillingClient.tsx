'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  CreditCard,
  FlaskConical,
  Users,
  TrendingUp,
  Zap,
  ExternalLink,
  Check,
  Loader2,
} from 'lucide-react'
import type { BillingData } from './page'

export function BillingClient({ data }: { data: BillingData }) {
  const [busy, setBusy] = useState(false)
  const isPro = data.plan === 'pro' || data.plan === 'agency'
  const isAgency = data.plan === 'agency'

  async function billing(path: 'checkout' | 'portal') {
    setBusy(true)
    try {
      const res = await fetch(`/api/billing/${path}`, { method: 'POST' })
      const json = await res.json()
      if (json.url) window.location.href = json.url
      else alert(json.error || 'Error')
    } catch {
      alert('Connection failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-w-0 flex-1 px-5 py-6 sm:px-8">
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-[18px] font-semibold text-text">Billing</h1>

        {/* Plan */}
        <div className="rounded-[10px] border border-border bg-bg-1 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-text-3" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">Plan</span>
            </div>
            <span
              className={`rounded-[5px] border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                isAgency ? 'border-pro/20 bg-pro/[0.06] text-pro' :
                isPro ? 'border-ok/20 bg-ok/[0.06] text-ok' :
                'border-border text-text-2'
              }`}
            >
              {isAgency ? 'Agency' : isPro ? 'Pro' : 'Free'}
            </span>
          </div>

          {isAgency ? (
            <div className="mt-4 space-y-2">
              <FeatureRow icon={Check} label="Everything in Pro" />
              <FeatureRow icon={Check} label="Up to 100 domains" />
              <FeatureRow icon={Check} label="White-label — no Variante mention" />
              <FeatureRow icon={Check} label="Dedicated support — direct line" />
              <FeatureRow icon={Check} label="Team access" />
              <FeatureRow icon={Check} label="Client reports — branded PDFs" />
            </div>
          ) : isPro ? (
            <div className="mt-4 space-y-2">
              <FeatureRow icon={Check} label="Unlimited experiments" />
              <FeatureRow icon={Check} label="Statistical significance" />
              <FeatureRow icon={Check} label="Auto-winner detection" />
              <FeatureRow icon={Check} label="Daily analytics & sparklines" />
              <FeatureRow icon={Check} label="No badge on your site" />
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              <FeatureRow icon={Check} label="1 active experiment" />
              <FeatureRow icon={Check} label="Visitor & conversion counts" />
              <FeatureRow icon={Check} label="Unlimited paused/done tests" />
              <div className="mt-3">
                <button
                  onClick={() => billing('checkout')}
                  disabled={busy}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-fill-invert py-2.5 text-[13px] font-semibold text-text-on-invert transition-opacity hover:opacity-85 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Upgrade to Pro
                </button>
              </div>
            </div>
          )}

          {isPro && (
            <button
              onClick={() => billing('portal')}
              disabled={busy}
              className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-border py-2.5 text-[13px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Manage subscription in Stripe
            </button>
          )}
        </div>

        {/* Usage */}
        <div className="rounded-[10px] border border-border bg-bg-1 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-text-3" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">Current Usage</span>
          </div>
          <div className="flex flex-col divide-y divide-border">
            <QuotaRow
              icon={FlaskConical}
              label="Active experiments"
              value={isPro ? `${data.running}` : `${data.running} / 1`}
              atLimit={!isPro && data.running >= 1}
            />
            <QuotaRow icon={Users} label="Total experiments" value={`${data.totalTests}`} />
            <QuotaRow icon={Zap} label="Total visitors" value={data.totalVisitors.toLocaleString()} />
            <QuotaRow icon={TrendingUp} label="Total conversions" value={data.totalConversions.toLocaleString()} />
            {data.avgLift !== null && (
              <QuotaRow
                icon={TrendingUp}
                label="Avg lift"
                value={`${data.avgLift > 0 ? '+' : ''}${(data.avgLift * 100).toFixed(1)}%`}
                tone={data.avgLift > 0 ? 'ok' : data.avgLift < 0 ? 'err' : undefined}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureRow({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-text-2">
      <Icon className="h-3.5 w-3.5 text-ok" />
      {label}
    </div>
  )
}

function QuotaRow({
  icon: Icon,
  label,
  value,
  atLimit,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  atLimit?: boolean
  tone?: 'ok' | 'err'
}) {
  const colorClass = atLimit ? 'text-pro' : tone === 'ok' ? 'text-ok' : tone === 'err' ? 'text-err' : 'text-text-2'
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-2 text-[12px] text-text-2">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </span>
      <span className={`font-mono text-[13px] ${colorClass}`}>
        {value}
      </span>
    </div>
  )
}
