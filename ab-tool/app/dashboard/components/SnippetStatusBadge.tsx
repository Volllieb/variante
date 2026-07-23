'use client'

import { useState, useEffect, useCallback } from 'react'
import { Globe, Check, X, Loader2, Copy, ChevronDown } from 'lucide-react'
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
  | { phase: 'not-found'; url: string; timeout?: boolean }
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
  // ponytail: Diese Bedingung lief vorher bei JEDEM Render. Ein Klick auf
  // "Re-check" setzte phase auf 'input', der unmittelbar folgende Render setzte
  // sie sofort wieder auf 'verified' zurueck — der Button war funktionslos
  // (Plan UX-03). Jetzt greift der Sync nur, wenn sich die verifizierte Domain
  // tatsaechlich geaendert hat, nicht bei jedem Render.
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
  // Date.now() im Render ist unrein: Server- und Client-Render liefern
  // unterschiedliche Werte (Hydration-Mismatch). Erst nach dem Mount berechnen.
  const [ago, setAgo] = useState<string | null>(null)
  useEffect(() => {
    if (!verifiedAt) return
    const format = () => {
      const diff = Math.floor((Date.now() - new Date(verifiedAt).getTime()) / 1000)
      if (diff < 60) return `${diff}s ago`
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
      return `${Math.floor(diff / 3600)}h ago`
    }
    // Erster Wert asynchron: ein synchrones setState im Effect-Body erzwingt
    // einen zweiten Render-Durchlauf direkt nach dem Commit.
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
          <Check className="h-4 w-4 shrink-0 text-ok" />
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

  const normalize = (raw: string) =>
    raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '')

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

    onChange({ phase: 'checking', url: normalized, progress: 0 })
    try {
      let p = 0
      const progressTimer = setInterval(() => {
        p = Math.min(p + 25, 90)
        onChange({ phase: 'checking', url: normalized, progress: p })
      }, 800)

      const checkRes = await fetch('/api/snippet-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_url: normalized }),
      })
      clearInterval(progressTimer)
      const json = await checkRes.json()

      if (json.detected) {
        const domainsRes = await fetch('/api/domains')
        const { domains } = await domainsRes.json()
        const domain = (domains || []).find((d: { url: string; id: string }) => d.url === normalized)
        if (domain?.id) {
          await fetch('/api/domains/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domainId: domain.id }),
          })
        }
        onVerified(normalized)
      } else if (json.timeout) {
        onChange({ phase: 'not-found', url: normalized, timeout: true })
      } else {
        onChange({ phase: 'not-found', url: normalized })
      }
    } catch {
      onChange({ phase: 'not-found', url: normalized, timeout: true })
    }
  }, [urlInput, onChange, onVerified])

  const recheckDomain = useCallback(async (url: string) => {
    onChange({ phase: 'checking', url, progress: 0 })
    try {
      let p = 0
      const progressTimer = setInterval(() => {
        p = Math.min(p + 25, 90)
        onChange({ phase: 'checking', url, progress: p })
      }, 800)

      const checkRes = await fetch('/api/snippet-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_url: url }),
      })
      clearInterval(progressTimer)
      const json = await checkRes.json()
      if (json.detected) {
        onVerified(url)
      } else if (json.timeout) {
        onChange({ phase: 'not-found', url, timeout: true })
      } else {
        onChange({ phase: 'not-found', url })
      }
    } catch {
      onChange({ phase: 'not-found', url, timeout: true })
    }
  }, [onChange, onVerified])

  function copySnippet() {
    navigator.clipboard.writeText(SNIPPET_CODE).then(() => {
      setSnippetCopied(true)
      setTimeout(() => setSnippetCopied(false), 2000)
    })
  }

  // ── Input state ──
  if (state.phase === 'input' || state.phase === 'saving' || state.phase === 'checking') {
    return (
      <div className="mb-5 rounded-[10px] border border-pro/20 bg-pro/[0.04] px-4 py-3.5">
        <div className="flex items-start gap-3">
          <Globe className="mt-0.5 h-4 w-4 shrink-0 text-pro" />
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-[13px] font-medium text-text">Connect your site to run A/B tests</p>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value)
                    if (state.phase === 'input' && 'error' in state) onChange({ phase: 'input' })
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && submitDomain()}
                  placeholder="yoursite.com"
                  disabled={state.phase === 'saving' || state.phase === 'checking'}
                  autoFocus
                  className="w-full h-[36px] rounded-[6px] border border-border bg-bg-0 px-3 text-[13px] text-text placeholder:text-text-3 focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-text/15 focus-visible:outline-none disabled:opacity-40"
                />
              </div>
              <button
                onClick={submitDomain}
                disabled={state.phase !== 'input' || !urlInput.trim()}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[6px] bg-fill-invert px-4 py-2 text-[12px] font-semibold text-text-on-invert transition-opacity hover:opacity-85 disabled:opacity-30"
              >
                {state.phase === 'saving' || state.phase === 'checking' ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Checking…</span>
                    {state.phase === 'checking' && state.progress !== undefined && (
                      <span className="text-[10px] text-text-on-invert/60">{state.progress}%</span>
                    )}
                  </span>
                ) : (
                  'Check'
                )}
              </button>
            </div>

            {state.phase === 'input' && 'error' in state && state.error && (
              <p className="text-[12px] text-err">{state.error}</p>
            )}

            <div className="flex items-center gap-3 text-[11px] text-text-3">
              <span>No snippet needed?</span>
              <button
                onClick={copySnippet}
                className="inline-flex cursor-pointer items-center gap-1 text-text-3 transition-colors hover:text-text"
              >
                {snippetCopied ? <Check className="h-3 w-3 text-ok" /> : <Copy className="h-3 w-3" />}
                {snippetCopied ? 'Copied!' : 'Copy snippet'}
              </button>
              <a href="/dashboard/health" className="inline-flex cursor-pointer items-center gap-1 text-text-3 transition-colors hover:text-text">
                Setup Guide →
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Not-found state ──
  if (state.phase === 'not-found') {
    return (
      <div className="mb-5 rounded-[10px] border border-err/20 bg-err/[0.04] px-4 py-3.5">
        <div className="flex items-start gap-3">
          <X className="mt-0.5 h-4 w-4 shrink-0 text-err" />
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-[13px] font-medium text-text">
              {state.timeout
                ? 'Site unreachable — check your URL and try again'
                : <>Snippet not found on <strong>{state.url}</strong></>
              }
            </p>
            {state.timeout && (
              <p className="text-[11px] text-err/60">
                Make sure the site is publicly accessible and not behind a login or local network.
              </p>
            )}

            <p className="text-[11px] text-text-3">
              Paste this in your <code className="rounded-[3px] bg-bg-2 px-1 text-[11px]">&lt;head&gt;</code>:
            </p>

            <pre className="overflow-x-auto rounded-[6px] bg-black px-4 py-3 text-[10px] leading-relaxed text-text-3 ring-1 ring-border">
              {SNIPPET_CODE}
            </pre>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={copySnippet}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-border bg-bg-2 px-3 py-1.5 text-[11px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text"
              >
                {snippetCopied ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
                {snippetCopied ? 'Copied!' : 'Copy snippet'}
              </button>
              <a
                href="/dashboard/health"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-border bg-bg-2 px-3 py-1.5 text-[11px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text"
              >
                Setup Guide →
              </a>
              <button
                onClick={() => recheckDomain(state.url)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-border px-3 py-1.5 text-[11px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text"
              >
                Re-check
              </button>
              <button
                onClick={() => onChange({ phase: 'input' })}
                className="cursor-pointer text-[11px] text-text-3 transition-colors hover:text-text-2"
              >
                Change URL
              </button>
            </div>

            <FrameworkExamples />

            <div className="pt-1">
              <a
                href="/dashboard/health"
                className="inline-flex items-center gap-1 text-[11px] text-text-3 transition-colors hover:text-text"
              >
                Need help? See setup guide →
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}


