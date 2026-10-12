'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Globe, Check, X, Loader2, Copy, ExternalLink } from 'lucide-react'
import { SNIPPET_CODE } from '@/lib/snippetCode'
import { FrameworkExamples } from '../FrameworkExamples'

export type BannerState =
  | { phase: 'input'; error?: string }
  | { phase: 'saving' }
  | { phase: 'checking'; url: string; progress?: number }
  | { phase: 'not-found'; url: string; timeout?: boolean; outdated?: boolean; retries?: number }
  | { phase: 'verified'; url: string }

/* ── Banner (input / checking / not-found) ── */

export function SnippetBanner({
  state,
  onChange,
  onVerified,
}: {
  state: BannerState
  onChange: (s: BannerState) => void
  onVerified: (url: string) => void
}) {
  const [urlInput, setUrlInput] = useState('')
  const [snippetCopied, setSnippetCopied] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const normalize = (raw: string) =>
    raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '')

  const checkSnippet = useCallback(async (url: string, retries = 0) => {
    try {
      const res = await fetch('/api/snippet-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_url: url }),
      })
      if (!mountedRef.current) return
      const json = await res.json()
      // Altes Snippet mit integrity-Hash: das Script IST auf der Seite, der
      // Browser blockiert es aber. Als "verifiziert" durchzuwinken wuerde eine
      // tote Installation gruen anzeigen.
      if (json.outdated) {
        onChange({ phase: 'not-found', url, outdated: true, retries })
      } else if (json.detected) {
        if (pollRef.current) clearInterval(pollRef.current)
        // Verify the domain
        try {
          const domainsRes = await fetch('/api/domains')
          const { domains } = await domainsRes.json()
          const domain = (domains || []).find((d: { url: string; id: string }) => d.url === url)
          if (domain?.id) {
            await fetch('/api/domains/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ domainId: domain.id }),
            })
          }
        } catch { /* verification is best-effort */ }
        onVerified(url)
      } else if (json.timeout) {
        onChange({ phase: 'not-found', url, timeout: true, retries })
      } else {
        onChange({ phase: 'not-found', url, retries })
      }
    } catch {
      if (mountedRef.current) {
        onChange({ phase: 'not-found', url, timeout: true, retries })
      }
    }
  }, [onChange, onVerified])

  const submitDomain = useCallback(async () => {
    const normalized = normalize(urlInput)
    if (!normalized || !normalized.includes('.')) {
      onChange({ phase: 'input', error: 'Please enter a valid domain (e.g. yoursite.com)' })
      return
    }

    onChange({ phase: 'saving' })

    try {
      const saveRes = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized }),
      })
      if (saveRes.status === 402) {
        const d = await saveRes.json().catch(() => ({ error: 'Domain limit reached.' }))
        onChange({ phase: 'input', error: d.error || 'Domain limit reached.' })
        return
      }
      if (!saveRes.ok && saveRes.status !== 409) {
        const d = await saveRes.json().catch(() => ({}))
        onChange({ phase: 'input', error: d.error || 'Failed to save domain.' })
        return
      }
    } catch {
      onChange({ phase: 'input', error: 'Connection failed. Check your internet.' })
      return
    }

    // Start checking with progress
    onChange({ phase: 'checking', url: normalized, progress: 0 })
    let p = 0
    const progressTimer = setInterval(() => {
      p = Math.min(p + 20, 90)
      if (mountedRef.current && stateRef.current.phase === 'checking') {
        onChange({ phase: 'checking', url: normalized, progress: p })
      }
    }, 600)

    await checkSnippet(normalized, 0)
    clearInterval(progressTimer)

    // Auto-retry: poll every 10s for up to 5 attempts
    if (mountedRef.current) {
      const st = stateRef.current
      if (st.phase === 'not-found' && (st.retries ?? 0) < 5) {
        let retries = st.retries ?? 0
        pollRef.current = setInterval(async () => {
          retries++
          if (!mountedRef.current) {
            if (pollRef.current) clearInterval(pollRef.current)
            return
          }
          const s = stateRef.current
          if (s.phase !== 'not-found' && s.phase !== 'checking') {
            if (pollRef.current) clearInterval(pollRef.current)
            return
          }
          onChange({ phase: 'checking', url: normalized, progress: 0 })
          await checkSnippet(normalized, retries)
        }, 10_000)
      }
    }
  }, [urlInput, checkSnippet, onChange])

  const handleRetry = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    const url = state.phase === 'not-found' ? state.url : normalize(urlInput)
    if (url) {
      onChange({ phase: 'checking', url, progress: 0 })
      checkSnippet(url, 0)
    }
  }, [state, urlInput, checkSnippet, onChange])

  function copySnippet() {
    navigator.clipboard.writeText(SNIPPET_CODE).then(() => {
      setSnippetCopied(true)
      setTimeout(() => setSnippetCopied(false), 2000)
    })
  }

  // ── Input state — prominent "get started" banner ──
  if (state.phase === 'input' || state.phase === 'saving' || state.phase === 'checking') {
    const isChecking = state.phase === 'saving' || state.phase === 'checking'
    const progress = state.phase === 'checking' ? state.progress : undefined

    return (
      <div className="mb-5 rounded-[var(--radius-lg)] border border-border-strong bg-bg-1 px-5 py-4" aria-live="polite">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5">
            <Globe className="h-5 w-5 text-text-2" />
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="text-[14px] font-semibold text-white">
                Connect your domain to start A/B testing
              </p>
              <p className="mt-1 text-[12px] text-text-3 max-w-prose">
                Paste the variante snippet into the <code className="text-text-2 bg-bg-2 px-1 rounded text-[11px]">&lt;head&gt;</code> of every page on your domain,
                then enter the domain below to verify.
              </p>
            </div>

            {/* Input row */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-[320px]">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value)
                    if (state.phase === 'input' && 'error' in state) onChange({ phase: 'input' })
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && submitDomain()}
                  placeholder="yoursite.com"
                  disabled={isChecking}
                  autoFocus
                  aria-label="Domain to check"
                  aria-describedby="snippet-input-error"
                  className="w-full h-[38px] rounded-[var(--radius-md)] border border-border bg-bg-0 px-3.5 text-[13px] text-text placeholder:text-text-3 focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:outline-none disabled:opacity-40"
                />
              </div>
              <button
                onClick={submitDomain}
                disabled={isChecking || !urlInput.trim()}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] bg-fill-invert px-4 py-2 text-[12px] font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover disabled:opacity-30"
              >
                {isChecking ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{state.phase === 'saving' ? 'Saving…' : `Checking…`}</span>
                    {progress !== undefined && (
                      <span className="text-[10px] text-text-on-invert/60">{progress}%</span>
                    )}
                  </span>
                ) : (
                  'Check'
                )}
              </button>
            </div>

            {/* Error */}
            {state.phase === 'input' && 'error' in state && state.error && (
              <p id="snippet-input-error" role="alert" className="text-[12px] text-err">{state.error}</p>
            )}

            {/* Progress bar while checking */}
            {state.phase === 'checking' && progress !== undefined && (
              <div
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Checking snippet: ${progress}%`}
                className="h-1 w-full max-w-[320px] rounded-full bg-bg-2 overflow-hidden"
              >
                <div
                  className="h-full rounded-full bg-pro transition-[width] duration-[var(--duration-slow)]"
                  style={{ width: `${Math.max(progress, 5)}%` }}
                />
              </div>
            )}

            {/* Helper links */}
            <div className="flex items-center gap-3 text-[11px]">
              <button
                onClick={copySnippet}
                className="inline-flex cursor-pointer items-center gap-1 text-text-3 transition-colors hover:text-text"
              >
                {snippetCopied ? <Check className="h-3 w-3 text-ok" /> : <Copy className="h-3 w-3" />}
                {snippetCopied ? 'Copied!' : 'Copy snippet'}
              </button>
              <a
                href="/docs"
                className="inline-flex cursor-pointer items-center gap-1 text-text-3 transition-colors hover:text-text"
              >
                <ExternalLink className="h-3 w-3" />
                Setup guide
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Not-found state — troubleshooting banner ──
  if (state.phase === 'not-found') {
    const retries = state.retries ?? 0
    const stillPolling = retries < 5

    return (
      <div className="mb-5 rounded-[var(--radius-lg)] border border-err/20 bg-err/[0.03] px-5 py-4" role="alert">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-err/10">
            <X className="h-5 w-5 text-err" />
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="text-[14px] font-semibold text-white">
                {state.timeout
                  ? 'Site unreachable'
                  : state.outdated
                    ? <>Outdated snippet on <strong>{state.url}</strong></>
                    : <>Snippet not found on <strong>{state.url}</strong></>
                }
              </p>
              <p className="mt-1 text-[12px] text-text-3">
                {state.timeout
                  ? 'Make sure your site is publicly accessible (no localhost or login walls).'
                  : state.outdated
                    ? 'Your snippet still carries an integrity="sha384-…" hash from an older release. The browser blocks ab.js because of it — no tracking, no variants, no element picker. Replace the snippet in your <head> with the one below (it no longer pins a hash).'
                    : 'We checked your site but couldn\'t find the variante snippet. Here\'s what to check:'}
              </p>
            </div>

            {/* Troubleshooting list */}
            {!state.timeout && !state.outdated && (
              <ul className="space-y-1 text-[11px] text-text-2">
                <li className="flex items-start gap-2">
                  <span className="text-err mt-0.5 shrink-0">1.</span>
                  Paste the snippet in your site&apos;s{' '}
                  <code className="text-text bg-bg-2 px-1 rounded text-[10px]">&lt;head&gt;</code> —
                  it must be on <strong>every</strong> page
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-err mt-0.5 shrink-0">2.</span>
                  Deploy your changes — the site must be live, not local
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-err mt-0.5 shrink-0">3.</span>
                  Check CSP headers and adblockers — they may block third-party scripts
                </li>
              </ul>
            )}

            {/* Snippet code for re-copy */}
            <div>
              <pre className="overflow-x-auto rounded-[var(--radius-md)] bg-black px-4 py-3 text-[10px] leading-relaxed text-text-3 ring-1 ring-border">
                {SNIPPET_CODE}
              </pre>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={copySnippet}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] border border-border bg-bg-2 px-3 py-1.5 text-[11px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text"
              >
                {snippetCopied ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
                {snippetCopied ? 'Copied!' : 'Copy snippet'}
              </button>
              <button
                onClick={handleRetry}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] border border-border bg-bg-2 px-3 py-1.5 text-[11px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text"
              >
                <Loader2 className="h-3.5 w-3.5" />
                Check again
              </button>
              <button
                onClick={() => onChange({ phase: 'input' })}
                className="cursor-pointer text-[11px] text-text-3 transition-colors hover:text-text-2 ml-1"
              >
                Change URL
              </button>
            </div>

            {/* Auto-retry indicator */}
            {stillPolling && (
              <p className="text-[10px] text-text-3/60">
                Auto-checking every 10s ({5 - retries} attempts remaining)
              </p>
            )}

            {!stillPolling && retries >= 5 && (
              <p className="text-[10px] text-text-3/60">
                Auto-check stopped after {retries} attempts.{' '}
                <button onClick={handleRetry} className="underline cursor-pointer hover:text-text-3">Try again manually</button>.
              </p>
            )}

            <FrameworkExamples />

            <div className="pt-1">
              <a
                href="/docs"
                className="inline-flex items-center gap-1 text-[11px] text-text-3 transition-colors hover:text-text"
              >
                <ExternalLink className="h-3 w-3" />
                Full setup guide
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
