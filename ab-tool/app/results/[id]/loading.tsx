export default function Loading() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#06050f] font-[family-name:var(--font-sans)]">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-700/10 blur-[120px]" />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-violet-400" />
        <p className="text-sm text-white/30">Loading experiment…</p>
      </div>
    </div>
  )
}
