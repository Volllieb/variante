'use client'

import { ExperimentData } from '@/lib/getExperimentStats'
import { VariantPreview } from '@/app/components/VariantPreview'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  Trash2,
} from 'lucide-react'

export function ResultsClient({ initial, experimentId }: { initial: ExperimentData; experimentId: string }) {
  const [data, setData] = useState(initial)
  const [minVisitors, setMinVisitors] = useState(initial.minVisitors)
  const [minUplift, setMinUplift] = useState(initial.minUplift)
  const [saved, setSaved] = useState(false)
  const [editingB, setEditingB] = useState(false)
  const [draftB, setDraftB] = useState(initial.variantBHtml || '')
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

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
        router.push('/dashboard')
        router.refresh()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to delete test')
      }
    } finally {
      setDeleting(false)
    }
  }

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
      ? 'bg-ok-bg text-ok'
      : status === 'paused'
      ? 'bg-pro-bg text-pro'
      : 'bg-bg-2 text-text-3'

  return (
    <div className="min-h-screen bg-bg-0 text-text antialiased">

      <div className="relative z-10">
        {/* Top bar */}
        <header className="sticky top-0 z-50 border-b border-border bg-bg-0/95">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3.5">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 rounded-[6px] border border-border px-3 py-1.5 text-xs text-text-3 transition-colors duration-200 hover:border-border-strong hover:text-text"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Dashboard
              </Link>
              <h1 className="text-base font-semibold text-text">
                {name}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-[6px] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusColor}`}>
                {winner ? `${winner} won` : status}
              </span>
              {status === 'active' && (
                <button
                  onClick={() => toggleStatus('paused')}
                  className="flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-pro/20 bg-pro-bg px-3 py-1.5 text-xs text-pro transition-colors hover:bg-pro/10"
                >
                  <Pause className="h-3 w-3" /> Pause
                </button>
              )}
              {status === 'paused' && (
                <button
                  onClick={() => toggleStatus('active')}
                  className="flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-ok/20 bg-ok-bg px-3 py-1.5 text-xs text-ok transition-colors hover:bg-ok/10"
                >
                  <Play className="h-3 w-3" /> Resume
                </button>
              )}
              <button
                onClick={refresh}
                className="flex cursor-pointer h-8 w-8 items-center justify-center rounded-[6px] border border-border text-text-3 transition-colors hover:border-border-strong hover:text-text"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              {!deleteConfirm ? (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="flex cursor-pointer h-8 w-8 items-center justify-center rounded-[6px] border border-border text-text-3 transition-colors hover:border-err/30 hover:text-err"
                  aria-label="Delete experiment"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : (
                <div className="flex items-center gap-1.5 rounded-[6px] border border-err/20 bg-err-bg px-3 py-1.5">
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
        </header>

        <main className="mx-auto max-w-2xl px-6 py-8 space-y-5">

          <div className="rounded-[10px] border border-border bg-bg-1 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-[6px] bg-bg-2 text-text-3">
                  <TrendingUp className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">
                    Current status
                  </p>
                  <p className="mt-2 text-lg font-semibold text-text">
                    {done
                      ? 'Completed and ready to review'
                      : status === 'active'
                      ? 'Active and collecting data'
                      : 'Paused for now'}
                  </p>
                  <p className="mt-1 text-sm text-text-2">
                    {done
                      ? 'This test has enough signal to evaluate the winner.'
                      : status === 'active'
                      ? 'Visitors are currently being split between A and B while the experiment runs.'
                      : 'Traffic is paused until you resume this experiment.'}
                  </p>
                </div>
              </div>
              <div className={`rounded-[6px] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusColor}`}>
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
                  className={`rounded-[10px] border p-6 transition-all ${
                    isWinner
                      ? 'border-ok/30 bg-ok-bg'
                      : 'border-border bg-bg-1'
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className={`rounded-[6px] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                      isVariantB
                        ? 'bg-pro-bg text-pro'
                        : 'bg-bg-2 text-text-3'
                    }`}>
                      Variant {v.label}
                    </span>
                    {isWinner && (
                      <span className="flex items-center gap-1 rounded-[6px] bg-ok-bg px-2.5 py-1 text-[11px] font-semibold text-ok">
                        <Check className="h-3 w-3" /> Winner
                      </span>
                    )}
                  </div>

                  <p className="text-4xl font-semibold text-text">
                    {v.cr}%
                  </p>
                  <p className="mt-0.5 text-xs text-text-3">Conversion Rate</p>

                  <div className="mt-4 space-y-1.5 text-xs text-text-3">
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
                    <div className={`mt-4 rounded-[6px] px-3 py-2 text-xs font-semibold ${
                      lift > 0
                        ? 'bg-ok-bg text-ok'
                        : 'bg-err-bg text-err'
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
            <div className="flex items-center gap-3 rounded-[10px] border border-border bg-bg-1 px-5 py-4">
              <TrendingUp className="h-4 w-4 shrink-0 text-text-3" />
              <span className="text-sm text-text-2">
                Statistical significance:{' '}
                <strong className={`font-semibold ${significance >= 0.95 ? 'text-ok' : 'text-text'}`}>
                  {Math.round(significance * 100)}%
                </strong>
                {significance >= 0.95 && <span className="ml-2 text-xs text-ok/70">— result is reliable</span>}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-[10px] border border-border bg-bg-1 px-5 py-4">
              <Lock className="h-4 w-4 shrink-0 text-text-3" />
              <span className="text-sm text-text-3">Significance &amp; auto-winner are Pro features.</span>
              <button
                onClick={upgrade}
                disabled={busy}
                className="ml-auto shrink-0 cursor-pointer rounded-[6px] bg-white px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-white/90 disabled:opacity-50"
              >
                {busy ? 'Redirecting…' : 'Upgrade'}
              </button>
            </div>
          )}

          {/* Preview */}
          {(data.originalHtml || data.variantBHtml || editingB) && (
            <div className="rounded-[10px] border border-border bg-bg-1 p-6">
              <h2 className="mb-4 text-sm font-semibold text-text">Preview</h2>
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
                  <div className="rounded-[6px] border border-border bg-bg-2 p-4">
                    <p className="mb-2 text-xs font-semibold text-text-2">Edit Variant B HTML</p>
                    <textarea
                      value={draftB}
                      onChange={e => setDraftB(e.target.value)}
                      className="w-full rounded-[6px] border border-border bg-bg-0 px-3 py-2 font-mono text-xs text-ok focus:border-text/30 focus:outline-none focus:ring-1 focus:ring-text/10"
                      rows={10}
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={saveVariantB}
                        className="cursor-pointer rounded-[6px] bg-white px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-white/90"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingB(false)}
                        className="cursor-pointer rounded-[6px] border border-border px-3 py-1.5 text-xs text-text-3 transition-colors hover:text-text"
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
            <div className="rounded-[10px] border border-border bg-bg-1 p-6">
              <h2 className="mb-1 text-sm font-semibold text-text">Auto Winner</h2>
              {done ? (
                <p className="mt-2 text-sm text-ok">
                  ✓ Test complete —{' '}
                  {winner
                    ? `Variant ${winner} wins and is now served to all visitors.`
                    : 'no winner declared.'}
                </p>
              ) : (
                <>
                  <p className="mt-1 text-xs text-text-3 leading-relaxed">
                    Once both thresholds are met, Variant B automatically becomes the winner and is served to all new visitors.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-semibold text-text-2">Min Visitors</span>
                      <input
                        type="number"
                        min={1}
                        value={minVisitors}
                        onChange={e => setMinVisitors(Number(e.target.value))}
                        className="w-full rounded-[6px] border border-border bg-bg-2 px-3 py-2 text-sm text-text focus:border-text/30 focus:outline-none focus:ring-1 focus:ring-text/10"
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-semibold text-text-2">Min Uplift B (%)</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={Math.round(minUplift * 100)}
                        onChange={e => setMinUplift(Number(e.target.value) / 100)}
                        className="w-full rounded-[6px] border border-border bg-bg-2 px-3 py-2 text-sm text-text focus:border-text/30 focus:outline-none focus:ring-1 focus:ring-text/10"
                      />
                    </label>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-xs text-text-3">
                      <span>Visitor threshold</span>
                      <span>{totalVisitors.toLocaleString()} / {minVisitors.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-bg-2">
                      <div
                        className="h-full rounded-full bg-text transition-all duration-500"
                        style={{ width: `${visitorPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={saveConfig}
                      className="cursor-pointer rounded-[6px] bg-white px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-white/90"
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
            <div className="rounded-[10px] border border-dashed border-border p-6 text-center">
              <h2 className="text-sm font-semibold text-text">Auto Winner</h2>
              <p className="mt-2 text-xs text-text-3">
                Statistical significance and the auto-winner are available from the Pro plan onward.
              </p>
              <button
                onClick={upgrade}
                disabled={busy}
                className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] bg-white px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:opacity-50"
              >
                {busy ? 'Redirecting…' : 'Upgrade to Pro'}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
