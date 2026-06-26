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
  if (!html) return null

  const srcdoc = css
    ? `<html><head><style>${css}</style></head><body>${html}</body></html>`
    : `<html><body>${html}</body></html>`

  return (
    <div className={`rounded-xl border p-4 ${winner ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
      <p className="mb-2 text-xs font-semibold text-gray-500">
        Variant {label} {winner ? '✓ Winner' : ''}
      </p>
      <div className="overflow-hidden rounded-lg border border-gray-300 bg-white" style={{ height: 240 }}>
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
