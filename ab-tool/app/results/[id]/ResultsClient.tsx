'use client'

import { ExperimentData } from '@/lib/getExperimentStats'
import { VariantPreview } from '@/app/components/VariantPreview'
import { useEffect, useState } from 'react'

export function ResultsClient({ initial, experimentId }: { initial: ExperimentData; experimentId: string }) {
  const [data, setData] = useState(initial)
  // Local input values for thresholds (decoupled from poll so typing isn't overwritten).
  const [minVisitors, setMinVisitors] = useState(initial.minVisitors)
  const [minUplift, setMinUplift] = useState(initial.minUplift)
  const [saved, setSaved] = useState(false)
  // Manual HTML editor for variant B.
  const [editingB, setEditingB] = useState(false)
  const [draftB, setDraftB] = useState(initial.variantBHtml || '')

  async function refresh() {
    try {
      const res = await fetch(`/api/results/${experimentId}`)
      if (res.ok) setData(await res.json())
    } catch {}
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

  const lift = a.views > 0 && a.conversions > 0
    ? ((b.cr - a.cr) / a.cr) * 100
    : null

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 font-sans">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 hover:underline">
            ← Dashboard
          </a>
          <h1 className="text-2xl font-bold">{name}</h1>
        </div>
        <button
          onClick={refresh}
          className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-50"
          title="Refresh now"
        >
          ↻ Refresh
        </button>
      </div>
      <p className="mb-8 text-sm text-gray-500">
        Status: {status}{winner ? ` · Winner: Variant ${winner}` : ''}
        {status === 'active' && (
          <button
            onClick={async () => {
              await fetch(`/api/tests/${experimentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'paused' }),
              })
              refresh()
            }}
            className="ml-3 text-xs text-amber-600 hover:underline"
          >
            [Pause]
          </button>
        )}
        {status === 'paused' && (
          <button
            onClick={async () => {
              await fetch(`/api/tests/${experimentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'active' }),
              })
              refresh()
            }}
            className="ml-3 text-xs text-green-600 hover:underline"
          >
            [Resume]
          </button>
        )}
      </p>
      <div className="grid grid-cols-2 gap-6">
        {[a, b].map(v => (
          <div key={v.id} className={`rounded-xl border p-6 ${winner === v.id ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
            <p className="text-4xl font-bold">{v.cr}%</p>
            <p className="mt-1 text-sm text-gray-500">Conversion Rate</p>
            <p className="mt-3 text-sm">Variant {v.label}</p>
            <p className="text-xs text-gray-400">{v.views} visitors · {v.conversions} conv.</p>
            {lift !== null && v.id === 'B' && (
              <p className={`mt-2 text-xs font-semibold ${lift > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {lift > 0 ? '+' : ''}{lift.toFixed(1)}% vs A
              </p>
            )}
          </div>
        ))}
      </div>

      {(data.originalHtml || data.variantBHtml || editingB) && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold">Preview</h2>
          <div className="grid grid-cols-2 gap-6">
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
                  className="mt-1 text-xs text-gray-400 hover:text-gray-600"
                >
                  ✎ Edit HTML
                </button>
              </div>
            )}
            {!editingB && !data.variantBHtml && data.originalHtml && (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-300 p-6">
                <button
                  onClick={() => { setDraftB('<div class="ab-v">\n  <style>\n    .ab-v { /* your styles */ }\n  </style>\n</div>'); setEditingB(true) }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  + Add Variant B HTML
                </button>
              </div>
            )}
            {editingB && (
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="mb-2 text-xs font-semibold text-gray-500">Edit Variant B HTML</p>
                <textarea
                  value={draftB}
                  onChange={e => setDraftB(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs font-mono"
                  rows={10}
                />
                <div className="mt-2 flex gap-2">
                  <button onClick={saveVariantB} className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700">Save</button>
                  <button onClick={() => setEditingB(false)} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {pro ? (
        <p className="mt-6 text-sm text-gray-500">Significance: {Math.round(significance * 100)}%</p>
      ) : (
        <p className="mt-6 text-sm text-gray-400">🔒 Significance &amp; auto-winner are Pro features.</p>
      )}

      {/* Auto-winner panel — Pro only */}
      {!pro ? (
        <div className="mt-8 rounded-xl border border-dashed border-gray-300 p-6 text-center">
          <h2 className="text-sm font-semibold">Auto Winner</h2>
          <p className="mt-2 text-xs text-gray-500">
            Statistical significance and the auto-winner are available from the Pro plan onward.
          </p>
          <a
            href="/dashboard"
            className="mt-4 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Upgrade to Pro
          </a>
        </div>
      ) : (
      <div className="mt-8 rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold">Auto Winner</h2>
        {done ? (
          <p className="mt-2 text-sm text-green-700">
            ✓ Test complete — {winner ? `Variant ${winner} wins and is now served to all visitors.` : 'no winner.'}
          </p>
        ) : (
          <>
            <p className="mt-1 mb-4 text-xs text-gray-500">
              Once both thresholds are met, Variant B automatically becomes the winner and is served to all new visitors.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-xs font-medium text-gray-600">
                Min Visitors
                <input
                  type="number"
                  min={1}
                  value={minVisitors}
                  onChange={e => setMinVisitors(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-gray-600">
                Min Uplift B (%)
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={Math.round(minUplift * 100)}
                  onChange={e => setMinUplift(Number(e.target.value) / 100)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </label>
            </div>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-gray-500">
                <span>Visitor threshold</span>
                <span>{totalVisitors} / {minVisitors}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${visitorPct}%` }} />
              </div>
            </div>
            <button
              onClick={saveConfig}
              className="mt-4 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              Save
            </button>
            {saved && <span className="ml-3 text-xs text-green-600">✓ Saved</span>}
          </>
        )}
      </div>
      )}
    </div>
  )
}
