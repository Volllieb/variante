'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Globe, Check, X, Loader2, Copy, ChevronDown, ExternalLink } from 'lucide-react'
import { SNIPPET_CODE } from '@/lib/snippetCode'
import { FrameworkExamples } from './FrameworkExamples'

/* ── Types ── */

type VerifiedDomain = { url: string; verifiedAt: string | null }

type SnippetStatusBadgeProps = {
  hasVerifiedDomain: boolean
  primaryDomain: string | null
  verifiedAt?: string | null
  allVerifiedDomains?: VerifiedDomain[]
  onDomainVerified: () => void
}

type BannerState =
  | { phase: 'input'; error?: string }
  | { phase: 'saving' }
  | { phase: 'checking'; url: string; progress?: number }
  | { phase: 'not-found'; url: string; timeout?: boolean; retries?: number }
  | { phase: 'verified'; url: string }

/* ── Main Component ── */

export function SnippetStatusBadge({
  hasVerifiedDomain,
  primaryDomain,
  verifiedAt,
  allVerifiedDomains,
  onDomainVerified,
}: SnippetStatusBadgeProps) {
  const [banner, setBanner] = useState<BannerState>(() => {
    if (hasVerifiedDomain && primaryDomain) return { phase: 'verified', url: primaryDomain }
    return { phase: 'input' }
  })

  const [expandedVerified, setExpandedVerified] = useState(false)

  // ── If domain changed externally, sync ──
  const [syncedDomain, setSyncedDomain] = useState(primaryDomain)
  if (syncedDomain !== primaryDomain) {
    setSyncedDomain(primaryDomain)
    if (hasVerifiedDomain && primaryDomain) {
      setBanner({ phase: 'verified', url: primaryDomain })
    }
  }

  // ── Compact verified badge ──
  if (banner.phase === 'verified') {
    return (
      <SnippetVerifiedBadge
        domain={banner.url}
        verifiedAt={verifiedAt}
        allVerifiedDomains={allVerifiedDomains}
        onRecheck={() => setBanner({ phase: 'input' })}
        expanded={expandedVerified}
        onToggle={() => setExpandedVerified((v) => !v)}
      />
    )
  }

  // ── Full banner (input, checking, not-found) ──
  return (
    <SnippetBanner
      state={banner}
      onChange={setBanner}
      onVerified={(url) => {
        setBanner({ phase: 'verified', url })
        onDomainVerified()
      }}
    />
  )
}

/* ── Verified Badge (compact) ── */

function SnippetVerifiedBadge({
  domain,
  verifiedAt,
  allVerifiedDomains,
  onRecheck,
  expanded,
  onToggle,
}: {
  domain: string
  verifiedAt?: string | null
  allVerifiedDomains?: { url: string; verifiedAt: string | null }[]
  onRecheck: () => void
  expanded: boolean
  onToggle: () => void
}) {
  const [ago, setAgo] = useState<string | null>(null)
  useEffect(() => {
    if (!verifiedAt) return
    const format = () => {
      const diff = Math.floor((Date.now() - new Date(verifiedAt).getTime()) / 1000)
      if (diff < 60) return `${diff}s ago`
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
      return `${Math.floor(diff / 3600)}h ago`
    }
    const first = setTimeout(() => setAgo(format()), 0)
    const id = setInterval(() => setAgo(format()), 30_000)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [verifiedAt])

  const otherDomains = (allVerifiedDomains ?? []).filter((d) => d.url !== domain)

  return (
    <div className="mb-5 rounded-[10px] border border-ok/20 bg-ok/[0.04] px-4 py-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ok opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-ok" />
          </span>
          <span className="text-[13px] font-medium text-text truncate">
            Snippet active on <strong>{domain}</strong>
          </span>
          {ago && (
            <span className="hidden sm:inline text-[11px] text-text-3 whitespace-nowrap">
              Last checked: {ago}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRecheck}
            className="cursor-pointer text-[11px] font-medium text-text-3 transition-colors hover:text-text"
          >
            Re-check
          </button>
          <a
            href="/dashboard/account"
            className="cursor-pointer text-[11px] font-medium text-pro transition-colors hover:text-pro/80"
          >
            + Add site
          </a>
          <button
            onClick={onToggle}
            className="flex cursor-pointer items-center justify-center h-5 w-5 rounded-[4px] text-text-3 transition-colors hover:bg-ok/10 hover:text-text"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 border-t border-ok/10 pt-3 space-y-2">
          <p className="text-[12px] text-text-2 leading-relaxed">
            Data is flowing. Visitors and conversions are being tracked.
          </p>

          {otherDomains.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-3/60">All sites</p>
              {[domain, ...otherDomains.map((d) => d.url)].map((url) => (
                <div key={url} className="flex items-center gap-2 text-[12px] text-text-2">
                  <Check className="h-3 w-3 shrink-0 text-ok" />
                  <span>{url}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onRecheck}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-border px-3 py-1.5 text-[11px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text"
            >
              Re-check snippet
            </button>
            <a
              href="/dashboard/account"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-border px-3 py-1.5 text-[11px] font-medium text-pro transition-colors hover:border-pro/30 hover:text-pro"
            >
              + Add another site
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Banner (input / checking / not-found) ── */

function SnippetBanner({
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
  stateRef.current = state

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
      if (json.detected) {
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
      <div className="mb-5 rounded-[10px] border border-border-strong bg-bg-1 px-5 py-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5">
            <Globe className="h-5 w-5 text-text-2" />
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="text-[14px] font-semibold text-white">
                Connect your site to start A/B testing
              </p>
              <p className="mt-1 text-[12px] text-text-3 max-w-prose">
                Paste the variante snippet into your site&apos;s <code className="text-text-2 bg-bg-2 px-1 rounded text-[11px]">&lt;head&gt;</code>,
                then enter your domain to verify the installation.
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
                  className="w-full h-[38px] rounded-[6px] border border-border bg-bg-0 px-3.5 text-[13px] text-text placeholder:text-text-3 focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-text/15 focus-visible:outline-none disabled:opacity-40"
                />
              </div>
              <button
                onClick={submitDomain}
                disabled={isChecking || !urlInput.trim()}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[6px] bg-fill-invert px-4 py-2 text-[12px] font-semibold text-text-on-invert transition-opacity hover:opacity-85 disabled:opacity-30"
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
              <p className="text-[12px] text-err">{state.error}</p>
            )}

            {/* Progress bar while checking */}
            {state.phase === 'checking' && progress !== undefined && (
              <div className="h-1 w-full max-w-[320px] rounded-full bg-bg-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-pro transition-all duration-500"
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
      <div className="mb-5 rounded-[10px] border border-err/20 bg-err/[0.03] px-5 py-4">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-err/10">
            <X className="h-5 w-5 text-err" />
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="text-[14px] font-semibold text-white">
                {state.timeout
                  ? 'Site unreachable'
                  : <>Snippet not found on <strong>{state.url}</strong></>
                }
              </p>
              <p className="mt-1 text-[12px] text-text-3">
                {state.timeout
                  ? 'Make sure your site is publicly accessible (no localhost or login walls).'
                  : 'We checked your site but couldn\'t find the variante snippet. Here\'s what to check:'}
              </p>
            </div>

            {/* Troubleshooting list */}
            {!state.timeout && (
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
              <pre className="overflow-x-auto rounded-[6px] bg-black px-4 py-3 text-[10px] leading-relaxed text-text-3 ring-1 ring-border">
                {SNIPPET_CODE}
              </pre>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={copySnippet}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-border bg-bg-2 px-3 py-1.5 text-[11px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text"
              >
                {snippetCopied ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
                {snippetCopied ? 'Copied!' : 'Copy snippet'}
              </button>
              <button
                onClick={handleRetry}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-border bg-bg-2 px-3 py-1.5 text-[11px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text"
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
