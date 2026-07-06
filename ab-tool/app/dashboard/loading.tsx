export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-0">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-text" />
        <p className="text-sm text-text-3">Loading dashboard…</p>
      </div>
    </div>
  )
}
