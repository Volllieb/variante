import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-0">
      <div className="text-center">
        <p className="text-6xl font-semibold text-text-3">404</p>
        <p className="mt-2 text-sm text-text-3">Page not found.</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-1.5 rounded-[6px] border border-border px-4 py-2 text-xs text-text-3 transition-colors duration-200 hover:border-border-strong hover:text-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </Link>
      </div>
    </div>
  )
}
