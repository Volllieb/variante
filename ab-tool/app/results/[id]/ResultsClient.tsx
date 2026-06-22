'use client'

import { ExperimentData } from '@/lib/getExperimentStats'
import { useEffect, useState } from 'react'

export function ResultsClient({ initial, experimentId }: { initial: ExperimentData; experimentId: string }) {
  const [data, setData] = useState(initial)

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
    </div>
  )
}
