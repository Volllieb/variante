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
    <div className={`group rounded-xl border transition-colors ${
      winner
        ? 'border-emerald-400/30 bg-emerald-400/[0.05]'
        : 'border-white/[0.08] bg-white/[0.02]'
    }`}>
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]">
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#f5455c]/60" />
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#f5a623]/60" />
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#2fd76c]/60" />
        </div>
        {/* Label badge */}
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
          winner
            ? 'bg-emerald-400/10 text-emerald-400'
            : 'bg-white/[0.06] text-[#ededed]/40'
        }`}>
          {label}
        </span>
        {winner && (
          <span className="text-[10px] font-medium text-emerald-400/70">Winner</span>
        )}
        {/* Background toggle */}
        <button
          onClick={() => setBg(bg === 'light' ? 'dark' : 'light')}
          className="ml-auto cursor-pointer rounded border border-white/10 px-2 py-0.5 text-[10px] text-white/30 transition-colors hover:border-white/20 hover:text-white/50"
          title={`Switch to ${bg === 'light' ? 'dark' : 'light'} background`}
        >
          {bg === 'light' ? '☀' : '☾'}
        </button>
      </div>
      {/* Preview area */}
      <div
        className="overflow-hidden"
        style={{ height: 280, background: bg === 'dark' ? '#1a1a1a' : '#ffffff' }}
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
