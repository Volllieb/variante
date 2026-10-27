'use client'

import Link from 'next/link'
import { RefreshCw, ArrowLeft } from 'lucide-react'
import { Button } from '@/app/components'

// Route-Level Error-Boundary — fängt Render-Fehler unterhalb des Root-Layouts.
// Kein Sentry-Client-Import: Zero-Client-JS-Entscheidung (siehe instrumentation.ts),
// Server-Fehler laufen bereits über onRequestError in Sentry.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-0">
      <div className="text-center">
        <p className="text-6xl font-semibold text-text-3">500</p>
        <p className="mt-2 text-sm text-text-3">Something went wrong.</p>
        {error.digest && (
          <p className="mt-1 text-meta text-text-3/60">Error ID: {error.digest}</p>
        )}
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            variant="secondary" size="md"
            onClick={reset}
            className="text-xs text-text-3"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-xs text-text-3 transition-colors duration-200 hover:border-border-strong hover:text-text focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:outline-none"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
