'use client'

import { useState } from 'react'

export function VariantPreview({
  html,
  css,
  label,
  winner,
}: {
  html: string | null
  css: string | null
  label: string
  winner: boolean
}) {
  const [bg, setBg] = useState<'light' | 'dark'>('light')
  if (!html) return null

  const srcdoc = css
    ? `<html><head><style>${css}</style></head><body>${html}</body></html>`
    : `<html><body>${html}</body></html>`

  return (
    <div className={`rounded-xl border p-4 ${winner ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500">
          Variant {label} {winner ? '✓ Winner' : ''}
        </p>
        <button
          onClick={() => setBg(bg === 'light' ? 'dark' : 'light')}
          className="rounded border border-gray-300 px-2 py-0.5 text-[10px] text-gray-500 hover:bg-gray-100"
        >
          {bg === 'light' ? '☀ Light' : '☾ Dark'}
        </button>
      </div>
      <div
        className="overflow-hidden rounded-lg border border-gray-300"
        style={{ height: 240, background: bg === 'dark' ? '#1a1a1a' : '#fff' }}
      >
        <iframe
          srcDoc={srcdoc}
          title={`Variant ${label} preview`}
          className="h-full w-full"
          style={{ pointerEvents: 'none' }}
          sandbox=""
          loading="lazy"
        />
      </div>
    </div>
  )
}
