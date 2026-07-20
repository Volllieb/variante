'use client'

import { useState, useCallback } from 'react'
import { Globe, Check, X, Loader2, Copy, ChevronDown, AlertTriangle } from 'lucide-react'
import { SNIPPET_CODE } from '@/lib/snippetCode'
import { FrameworkExamples } from './FrameworkExamples'

/* ── Types ── */

type SnippetStatusBadgeProps = {
  hasVerifiedDomain: boolean
  primaryDomain: string | null
  verifiedAt?: string | null
  onDomainVerified: () => void
}

type BannerState =
  | { phase: 'input'; error?: string }
  | { phase: 'saving' }
  | { phase: 'checking'; url: string }
  | { phase: 'not-found'; url: string }
  | { phase: 'verified'; url: string }

/* ── Main Component ── */

export function SnippetStatusBadge({
  hasVerifiedDomain,
  primaryDomain,
  verifiedAt,
  onDomainVerified,
}: SnippetStatusBadgeProps) {
  const [banner, setBanner] = useState<BannerState>(() => {
    if (hasVerifiedDomain && primaryDomain) return { phase: 'verified', url: primaryDomain }
    return { phase: 'input' }
  })

  const [expandedVerified, setExpandedVerified] = useState(false)

  // ── If domain changed externally, sync ──
  if (hasVerifiedDomain && primaryDomain && banner.phase !== 'verified') {
    setBanner({ phase: 'verified', url: primaryDomain })
  }

  // ── Compact verified badge ──
  if (banner.phase === 'verified') {
    return (
      <SnippetVerifiedBadge
        domain={banner.url}
        verifiedAt={verifiedAt}
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
  onRecheck,
  expanded,
  onToggle,
}: {
  domain: string
  verifiedAt?: string | null
  onRecheck: () => void
  expanded: boolean
  onToggle: () => void
}) {
  const ago = verifiedAt
    ? (() => {
        const diff = Math.floor((Date.now() - new Date(verifiedAt).getTime()) / 1000)
        if (diff < 60) return `${diff}s ago`
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
        return `${Math.floor(diff / 3600)}h ago`
      })()
    : null

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
        <div className="mt-3 border-t border-ok/10 pt-3">
          <p className="text-[12px] text-text-2 leading-relaxed">
            Data is flowing. Visitors and conversions are being tracked.
          </p>
          <button
            onClick={onRecheck}
            className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-border px-3 py-1.5 text-[11px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text"
          >
            Re-check snippet
          </button>
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
  const [promptCopied, setPromptCopied] = useState(false)

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

    onChange({ phase: 'checking', url: normalized })
    try {
      const checkRes = await fetch('/api/snippet-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_url: normalized }),
      })
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
      } else {
        onChange({ phase: 'not-found', url: normalized })
      }
    } catch {
      onChange({ phase: 'not-found', url: normalized })
    }
  }, [urlInput, onChange, onVerified])

  const recheckDomain = useCallback(async (url: string) => {
    onChange({ phase: 'checking', url })
    try {
      const checkRes = await fetch('/api/snippet-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_url: url }),
      })
      const json = await checkRes.json()
      if (json.detected) {
        onVerified(url)
      } else {
        onChange({ phase: 'not-found', url })
      }
    } catch {
      onChange({ phase: 'not-found', url })
    }
  }, [onChange, onVerified])

  function copySnippet() {
    navigator.clipboard.writeText(SNIPPET_CODE).then(() => {
      setSnippetCopied(true)
      setTimeout(() => setSnippetCopied(false), 2000)
    })
  }

  function copyPrompt() {
    const url = state.phase === 'not-found' || state.phase === 'checking' ? state.url : urlInput || '(your site URL)'
    const prompt = [
      `Add the variante A/B testing snippet below to https://${url}.`,
      '',
      '## 1. Check if already installed',
      'Search the codebase for `id="__ab_hide"` or `ab.js`. If found, confirm the snippet is already present and skip the rest.',
      '',
      '## 2. Where to insert',
      'Hardcode the snippet directly into the `<head>` at source level — before all stylesheets, font loaders, and analytics. Never inject via Google Tag Manager or behind a cookie consent banner.',
      '',
      '## 3. Detect framework and insert',
      '- **Next.js**: `app/layout.tsx` or `pages/_document.tsx` (inside `<Head>`)',
      '- **Nuxt**: `nuxt.config.ts` → `app.head.script`',
      '- **Astro**: base layout in `src/layouts/`',
      '- **WordPress**: `header.php` or via `wp_head` hook in `functions.php`',
      '- **Shopify**: `theme.liquid`, inside `<head>`',
      '- **Webflow**: Site settings → Custom Code → Head Code',
      '- **Squarespace**: Settings → Advanced → Code Injection → Header',
      '- **Wix**: Settings → Custom Code → Head (load on each page)',
      '- **Static HTML / no framework**: the root file(s) with `<head>`',
      '- **Unknown or no shared layout**: tell me what you detected and ask where to place the snippet.',
      '',
      '## 4. The snippet (do not modify)',
      '```html',
      SNIPPET_CODE,
      '```',
      '',
      '## 5. Verify',
      'Check the live page source (view-source:) — the snippet must appear in the rendered `<head>`. Purge CDN caches (Cloudflare, Vercel, etc.) if the site uses one.',
      '',
      '## 6. Your response',
      'When the snippet is inserted, respond ONLY with this short confirmation — no analysis, no caveats:',
      `✅ variante snippet added to https://${url}. Open the site and refresh — your variant should be live. Dashboard: https://www.getvariante.com/dashboard`,
    ].join('\n')
    navigator.clipboard.writeText(prompt).then(() => {
      setPromptCopied(true)
      setTimeout(() => setPromptCopied(false), 2000)
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
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…</>
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
              <button
                onClick={copyPrompt}
                className="inline-flex cursor-pointer items-center gap-1 text-text-3 transition-colors hover:text-text"
              >
                {promptCopied ? <Check className="h-3 w-3 text-ok" /> : <Copy className="h-3 w-3" />}
                {promptCopied ? 'Copied!' : 'Copy AI prompt'}
              </button>
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
              Snippet not found on <strong>{state.url}</strong>
            </p>

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
              <button
                onClick={copyPrompt}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-border bg-bg-2 px-3 py-1.5 text-[11px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text"
              >
                {promptCopied ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
                {promptCopied ? 'Copied!' : 'Copy AI prompt'}
              </button>
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
          </div>
        </div>
      </div>
    )
  }

  return null
}


