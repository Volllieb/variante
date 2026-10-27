'use client'

import { useState } from 'react'
import { buildPreviewSrcDoc } from '@/lib/previewDoc'

export function VariantPreview({
  html,
  css,
  variantCss,
  label,
  winner,
}: {
  html: string | null
  /** Styles der Zielseite — identisch fuer A und B (tests.site_css). */
  css: string | null
  /** CSS-Delta der Variante. Nur fuer B; wird nach `css` eingehaengt. */
  variantCss?: string | null
  label: string
  winner: boolean
}) {
  const [bg, setBg] = useState<'light' | 'dark'>('light')
  if (!html) return null

  return (
    <div className={`group rounded-md border transition-colors ${
      winner
        ? 'border-ok/20 bg-ok/[0.04]'
        : 'border-border bg-bg-1'
    }`}>
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-err/60" />
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-pro/60" />
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-ok/60" />
        </div>
        {/* Label badge */}
        <span className={`text-meta font-semibold px-2 py-0.5 rounded-sm ${
          winner
            ? 'bg-ok-bg text-ok'
            : 'bg-bg-2 text-text-3'
        }`}>
          {label}
        </span>
        {winner && (
          <span className="text-meta font-medium text-ok">Winner</span>
        )}
        {/* Background toggle */}
        <button
          onClick={() => setBg(bg === 'light' ? 'dark' : 'light')}
          className="ml-auto cursor-pointer rounded-sm border border-border px-2 py-0.5 text-meta text-text-3 transition-colors hover:border-border-strong hover:text-text-2"
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
          srcDoc={buildPreviewSrcDoc(
            [{ html, css: variantCss }],
            { siteCss: css, background: bg === 'dark' ? '#1a1a1a' : '#ffffff' }
          )}
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
