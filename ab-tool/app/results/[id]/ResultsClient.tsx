'use client'

import { ExperimentData } from '@/lib/getExperimentStats'
import { useEffect, useState } from 'react'

export function ResultsClient({ initial, experimentId }: { initial: ExperimentData; experimentId: string }) {
  const [data, setData] = useState(initial)
  // Lokale Eingabewerte für die Schwellen (entkoppelt vom 5s-Poll, damit Tippen nicht überschrieben wird).
  const [minVisitors, setMinVisitors] = useState(initial.minVisitors)
  const [minUplift, setMinUplift] = useState(initial.minUplift)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const res = await fetch(`/api/results/${experimentId}`)
        if (res.ok) setData(await res.json())
      } catch {}
    }, 5000)
    return () => clearInterval(iv)
  }, [experimentId])

  const { name, status, significance, winner, variants } = data
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

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 font-sans">
      <h1 className="mb-1 text-2xl font-bold">{name}</h1>
      <p className="mb-8 text-sm text-gray-500">Status: {status}{winner ? ` · Gewinner: Variante ${winner}` : ''}</p>
      <div className="grid grid-cols-2 gap-6">
        {[a, b].map(v => (
          <div key={v.id} className={`rounded-xl border p-6 ${winner === v.id ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
            <p className="text-4xl font-bold">{v.cr}%</p>
            <p className="mt-1 text-sm text-gray-500">Conversion Rate</p>
            <p className="mt-3 text-sm">Variante {v.label}</p>
            <p className="text-xs text-gray-400">{v.views} Besucher · {v.conversions} Conv.</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-gray-500">Signifikanz: {Math.round(significance * 100)}%</p>

      {/* Auto-Gewinner-Panel */}
      <div className="mt-8 rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold">Automatischer Gewinner</h2>
        {done ? (
          <p className="mt-2 text-sm text-green-700">
            ✓ Test abgeschlossen — {winner ? `Variante ${winner} gewinnt und wird an alle Besucher ausgeliefert.` : 'kein Gewinner.'}
          </p>
        ) : (
          <>
            <p className="mt-1 mb-4 text-xs text-gray-500">
              Sobald beide Schwellen erfüllt sind, wird Variante B automatisch zum Gewinner und an alle neuen Besucher ausgeliefert.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-xs font-medium text-gray-600">
                Mindest-Besucher
                <input
                  type="number"
                  min={1}
                  value={minVisitors}
                  onChange={e => setMinVisitors(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-gray-600">
                Mindest-Uplift B (%)
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
                <span>Besucher-Schwelle</span>
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
              Speichern
            </button>
            {saved && <span className="ml-3 text-xs text-green-600">✓ Gespeichert</span>}
          </>
        )}
      </div>
    </div>
  )
}
