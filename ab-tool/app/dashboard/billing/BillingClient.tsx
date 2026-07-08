'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
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

const T = {
  ok: '#2fd76c',
  pro: '#f5a623',
  err: '#f5455c',
}

export function BillingClient({ data }: { data: BillingData }) {
  const [busy, setBusy] = useState(false)
  const isPro = data.plan === 'pro' || data.plan === 'agency'

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
    <main className="min-w-0 flex-1 px-5 py-6 sm:px-8">
      <div className="mx-auto max-w-lg space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[11px] text-[#ededed]/40 transition-colors hover:text-[#ededed]"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Dashboard
        </Link>

        <h1 className="text-[18px] font-semibold text-[#ededed]">Billing</h1>

        {/* Plan */}
        <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[#ededed]/40" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">Plan</span>
            </div>
            <span
              className="rounded-[5px] border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
              style={{
                borderColor: isPro ? `${T.ok}33` : 'rgba(255,255,255,.10)',
                color: isPro ? T.ok : '#ededed62',
                background: isPro ? `${T.ok}0f` : 'transparent',
              }}
            >
              {isPro ? 'Pro' : 'Free'}
            </span>
          </div>

          {isPro ? (
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
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-white py-2.5 text-[13px] font-semibold text-black transition-opacity hover:opacity-85 disabled:opacity-50"
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
              className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-white/10 py-2.5 text-[13px] font-medium text-[#ededed]/62 transition-colors hover:border-white/[0.18] hover:text-[#ededed] disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Manage subscription in Stripe
            </button>
          )}
        </div>

        {/* Usage */}
        <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-[#ededed]/40" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">Current Usage</span>
          </div>
          <div className="flex flex-col divide-y divide-white/[0.06]">
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
    </main>
  )
}

function FeatureRow({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-[#ededed]/62">
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
  const color = atLimit ? T.pro : tone === 'ok' ? T.ok : tone === 'err' ? T.err : undefined
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-2 text-[12px] text-[#ededed]/62">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </span>
      <span className="font-mono text-[13px] text-[#ededed]/62" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  )
}
