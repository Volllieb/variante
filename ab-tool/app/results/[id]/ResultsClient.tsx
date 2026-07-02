'use client'

import { ExperimentData } from '@/lib/getExperimentStats'
import { VariantPreview } from '@/app/components/VariantPreview'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  Users,
  Target,
  Lock,
  Check,
  Pause,
  Play,
  Pencil,
  X,
} from 'lucide-react'

export function ResultsClient({ initial, experimentId }: { initial: ExperimentData; experimentId: string }) {
  const [data, setData] = useState(initial)
  const [minVisitors, setMinVisitors] = useState(initial.minVisitors)
  const [minUplift, setMinUplift] = useState(initial.minUplift)
  const [saved, setSaved] = useState(false)
  const [editingB, setEditingB] = useState(false)
  const [draftB, setDraftB] = useState(initial.variantBHtml || '')
  const [refreshing, setRefreshing] = useState(false)

  async function refresh() {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/results/${experimentId}`)
      if (res.ok) setData(await res.json())
    } catch {}
    setRefreshing(false)
  }

  useEffect(() => {
    const interval = data.pro ? 10000 : 30000
    const iv = setInterval(refresh, interval)
    return () => clearInterval(iv)
  }, [experimentId, data.pro])

  const { name, status, significance, winner, variants, pro } = data
  const [a, b] = variants
  const totalVisitors = a.views + b.views
  const done = status === 'done' || !!winner
  const visitorPct = Math.min(100, Math.round((totalVisitors / Math.max(1, minVisitors)) * 100))

  const lift = a.views > 0 && a.conversions > 0
    ? ((b.cr - a.cr) / a.cr) * 100
    : null

  async function saveConfig() {
    try {
      await fetch(`/api/tests/${experimentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ min_visitors: minVisitors, min_uplift: minUplift }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
  }

  async function saveVariantB() {
    try {
      await fetch(`/api/tests/${experimentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant_b_html: draftB || null }),
      })
      setEditingB(false)
      await refresh()
    } catch {}
  }

  async function toggleStatus(next: 'active' | 'paused') {
    await fetch(`/api/tests/${experimentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    refresh()
  }

  const statusColor =
    status === 'active'
      ? 'bg-emerald-400/15 text-emerald-300'
      : status === 'paused'
      ? 'bg-amber-400/15 text-amber-300'
      : 'bg-white/[0.07] text-white/50'

  return (
    <div className="relative min-h-screen bg-[#06050f] font-[family-name:var(--font-sans)] text-white/80 antialiased">
      {/* Aurora */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-32 top-0 h-[32rem] w-[32rem] rounded-full bg-violet-700/12 blur-[130px]" />
        <div className="absolute -right-20 bottom-0 h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/08 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.09]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.28) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Top bar */}
        <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#06050f]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3.5">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50 transition-all duration-200 hover:border-white/20 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Dashboard
              </Link>
              <h1 className="font-[family-name:var(--font-display)] text-base font-bold text-white">
                {name}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusColor}`}>
                {winner ? `${winner} won` : status}
              </span>
              {status === 'active' && (
                <button
                  onClick={() => toggleStatus('paused')}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/[0.07] px-3 py-1.5 text-xs text-amber-300 transition-all hover:bg-amber-400/10"
                >
                  <Pause className="h-3 w-3" /> Pause
                </button>
              )}
              {status === 'paused' && (
                <button
                  onClick={() => toggleStatus('active')}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5 text-xs text-emerald-300 transition-all hover:bg-emerald-400/10"
                >
                  <Play className="h-3 w-3" /> Resume
                </button>
              )}
              <button
                onClick={refresh}
                className="flex cursor-pointer h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/40 transition-all hover:border-white/20 hover:text-white"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-6 py-8 space-y-5">

          <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.045] to-white/[0.02] p-5 shadow-[0_20px_60px_-20px_rgba(17,24,39,0.55)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06] text-violet-200">
                  <TrendingUp className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/40">
                    Current status
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {done
                      ? 'Completed and ready to review'
                      : status === 'active'
                      ? 'Active and collecting data'
                      : 'Paused for now'}
                  </p>
                  <p className="mt-1 text-sm text-white/45">
                    {done
                      ? 'This test has enough signal to evaluate the winner.'
                      : status === 'active'
                      ? 'Visitors are currently being split between A and B while the experiment runs.'
                      : 'Traffic is paused until you resume this experiment.'}
                  </p>
                </div>
              </div>
              <div className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${statusColor}`}>
                {winner ? `${winner} won` : status}
              </div>
            </div>
          </div>

          {/* A/B Stats cards */}
          <div className="grid grid-cols-2 gap-4">
            {[a, b].map((v, i) => {
              const isWinner = winner === v.id
              const isVariantB = i === 1
              return (
                <div
                  key={v.id}
                  className={`rounded-2xl border p-6 backdrop-blur-md transition-all ${
                    isWinner
                      ? 'border-emerald-400/30 bg-emerald-400/[0.05]'
                      : 'border-white/[0.08] bg-white/[0.025]'
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                      isVariantB
                        ? 'bg-fuchsia-400/15 text-fuchsia-300'
                        : 'bg-white/[0.07] text-white/50'
                    }`}>
                      Variant {v.label}
                    </span>
                    {isWinner && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                        <Check className="h-3 w-3" /> Winner
                      </span>
                    )}
                  </div>

                  <p className="font-[family-name:var(--font-display)] text-4xl font-extrabold text-white">
                    {v.cr}%
                  </p>
                  <p className="mt-0.5 text-xs text-white/40">Conversion Rate</p>

                  <div className="mt-4 space-y-1.5 text-xs text-white/40">
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
                    <div className={`mt-4 rounded-xl px-3 py-2 text-xs font-bold ${
                      lift > 0
                        ? 'bg-emerald-400/10 text-emerald-300'
                        : 'bg-rose-400/10 text-rose-300'
                    }`}>
                      {lift > 0 ? '+' : ''}{lift.toFixed(1)}% vs A
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Significance */}
          {pro ? (
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-5 py-4 backdrop-blur-md">
              <TrendingUp className="h-4 w-4 shrink-0 text-violet-300" />
              <span className="text-sm text-white/60">
                Statistical significance:{' '}
                <strong className={`font-bold ${significance >= 0.95 ? 'text-emerald-300' : 'text-white/80'}`}>
                  {Math.round(significance * 100)}%
                </strong>
                {significance >= 0.95 && <span className="ml-2 text-xs text-emerald-300/70">— result is reliable</span>}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-5 py-4 backdrop-blur-md">
              <Lock className="h-4 w-4 shrink-0 text-white/30" />
              <span className="text-sm text-white/40">Significance &amp; auto-winner are Pro features.</span>
              <Link
                href="/dashboard"
                className="ml-auto shrink-0 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3 py-1.5 text-xs font-bold text-white"
              >
                Upgrade
              </Link>
            </div>
          )}

          {/* Preview */}
          {(data.originalHtml || data.variantBHtml || editingB) && (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-md">
              <h2 className="mb-4 font-[family-name:var(--font-display)] text-sm font-bold text-white">Preview</h2>
              <div className="grid grid-cols-2 gap-4">
                {data.originalHtml && (
                  <VariantPreview
                    html={data.originalHtml}
                    css={data.siteCss}
                    label="A (Original)"
                    winner={winner === 'A'}
                  />
                )}
                {!editingB && data.variantBHtml && (
                  <div>
                    <VariantPreview
                      html={data.variantBHtml}
                      css={data.siteCss}
                      label="B (Variant)"
                      winner={winner === 'B'}
                    />
                    <button
                      onClick={() => { setDraftB(data.variantBHtml || ''); setEditingB(true) }}
                      className="mt-2 flex cursor-pointer items-center gap-1 text-xs text-white/30 transition-colors hover:text-white/60"
                    >
                      <Pencil className="h-3 w-3" /> Edit HTML
                    </button>
                  </div>
                )}
                {!editingB && !data.variantBHtml && data.originalHtml && (
                  <div className="flex items-center justify-center rounded-xl border border-dashed border-white/[0.10] p-6">
                    <button
                      onClick={() => { setDraftB('<div class="ab-v">\n  <style>\n    .ab-v { /* your styles */ }\n  </style>\n</div>'); setEditingB(true) }}
                      className="cursor-pointer text-xs text-white/30 transition-colors hover:text-white/60"
                    >
                      + Add Variant B HTML
                    </button>
                  </div>
                )}
                {editingB && (
                  <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
                    <p className="mb-2 text-xs font-semibold text-white/50">Edit Variant B HTML</p>
                    <textarea
                      value={draftB}
                      onChange={e => setDraftB(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2 font-mono text-xs text-emerald-300 focus:border-fuchsia-400/30 focus:outline-none focus:ring-1 focus:ring-fuchsia-400/20"
                      rows={10}
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={saveVariantB}
                        className="cursor-pointer rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3 py-1.5 text-xs font-bold text-white"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingB(false)}
                        className="cursor-pointer rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white"
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
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-md">
              <h2 className="mb-1 font-[family-name:var(--font-display)] text-sm font-bold text-white">Auto Winner</h2>
              {done ? (
                <p className="mt-2 text-sm text-emerald-300">
                  ✓ Test complete —{' '}
                  {winner
                    ? `Variant ${winner} wins and is now served to all visitors.`
                    : 'no winner declared.'}
                </p>
              ) : (
                <>
                  <p className="mt-1 text-xs text-white/40 leading-relaxed">
                    Once both thresholds are met, Variant B automatically becomes the winner and is served to all new visitors.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-semibold text-white/50">Min Visitors</span>
                      <input
                        type="number"
                        min={1}
                        value={minVisitors}
                        onChange={e => setMinVisitors(Number(e.target.value))}
                        className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-white focus:border-fuchsia-400/30 focus:outline-none focus:ring-1 focus:ring-fuchsia-400/20"
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-semibold text-white/50">Min Uplift B (%)</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={Math.round(minUplift * 100)}
                        onChange={e => setMinUplift(Number(e.target.value) / 100)}
                        className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-white focus:border-fuchsia-400/30 focus:outline-none focus:ring-1 focus:ring-fuchsia-400/20"
                      />
                    </label>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-xs text-white/35">
                      <span>Visitor threshold</span>
                      <span>{totalVisitors.toLocaleString()} / {minVisitors.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                        style={{ width: `${visitorPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={saveConfig}
                      className="cursor-pointer rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-fuchsia-500/20 transition-all hover:scale-[1.02]"
                    >
                      Save
                    </button>
                    {saved && (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <Check className="h-3.5 w-3.5" /> Saved
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {!pro && (
            <div className="rounded-2xl border border-dashed border-white/[0.10] p-6 text-center">
              <h2 className="font-[family-name:var(--font-display)] text-sm font-bold text-white">Auto Winner</h2>
              <p className="mt-2 text-xs text-white/35">
                Statistical significance and the auto-winner are available from the Pro plan onward.
              </p>
              <Link
                href="/dashboard"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-2 text-sm font-bold text-white shadow-md shadow-fuchsia-500/20"
              >
                Upgrade to Pro
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
