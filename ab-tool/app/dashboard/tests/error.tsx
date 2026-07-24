'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { ArrowLeft, RefreshCw } from 'lucide-react'

export default function TestsError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('[tests:error-boundary]', error)
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-0">
      <div className="text-center">
        <p className="text-4xl font-semibold text-text-3">Error</p>
        <p className="mt-2 text-sm text-text-3">Something went wrong loading tests.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-[6px] border border-border px-4 py-2 text-xs text-text-3 transition-colors duration-200 hover:border-border-strong hover:text-text"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-[6px] border border-border px-4 py-2 text-xs text-text-3 transition-colors duration-200 hover:border-border-strong hover:text-text"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
