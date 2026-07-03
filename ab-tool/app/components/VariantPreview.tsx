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
    <div className={`rounded-xl border p-4 ${winner ? 'border-emerald-400/30 bg-emerald-400/[0.05]' : 'border-white/[0.08] bg-white/[0.025]'}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-white/50">
          Variant {label} {winner ? '✓ Winner' : ''}
        </p>
        <button
          onClick={() => setBg(bg === 'light' ? 'dark' : 'light')}
          className="cursor-pointer rounded border border-white/10 px-2 py-0.5 text-[10px] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/60"
        >
          {bg === 'light' ? '☀ Light' : '☾ Dark'}
        </button>
      </div>
      <div
        className="overflow-hidden rounded-lg border border-white/[0.08]"
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
