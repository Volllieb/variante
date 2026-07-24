'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, Globe } from 'lucide-react'

export function LandingTrySite() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return

    setErr('')
    setLoading(true)

    try {
      const res = await fetch('/api/landing-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setErr(d.error || 'Something went wrong. Try again.')
        setLoading(false)
        return
      }
      // Redirect to signup — the cookie is set by the API
      const normalized = encodeURIComponent(trimmed.replace(/^https?:\/\//, '').replace(/\/+$/, ''))
      router.push(`/signup?demo_url=${normalized}`)
    } catch {
      setErr('Connection failed. Try again.')
      setLoading(false)
    }
  }

  return (
    <section className="section !pt-10 !pb-12">
      <div className="container-wide text-center">
        <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-white/5 text-white/50 mb-4">
          <Globe className="h-5 w-5" />
        </span>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
          See what you can test
        </h2>
        <p className="mt-2 text-sm text-white/45 max-w-md mx-auto">
          Enter your site URL — we&apos;ll save it and prepare your first draft test after signup.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 max-w-sm mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setErr('') }}
              placeholder="yoursite.com"
              className="flex-1 h-[42px] rounded-[6px] border border-border bg-bg-1 px-4 text-sm text-white placeholder:text-text-3 transition-colors focus:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/20"
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[6px] bg-fill-invert px-5 py-2.5 text-sm font-semibold text-text-on-invert transition-opacity hover:opacity-85 disabled:opacity-30"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Try it
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
          {err && <p className="mt-2 text-xs text-err">{err}</p>}
        </form>

        <p className="mt-3 text-[11px] text-text-3">
          No account needed to try — we&apos;ll save your URL for after signup.
        </p>
      </div>
    </section>
  )
}
