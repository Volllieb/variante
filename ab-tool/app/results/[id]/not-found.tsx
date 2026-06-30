import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#06050f] font-[family-name:var(--font-sans)]">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-700/10 blur-[120px]" />
      </div>
      <div className="relative z-10 text-center">
        <p className="font-[family-name:var(--font-display)] text-6xl font-extrabold text-white/10">404</p>
        <p className="mt-2 text-sm text-white/40">Experiment not found.</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-xs text-white/50 transition-all hover:border-white/20 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
