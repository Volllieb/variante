'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, Loader2, ChevronDown, AlertTriangle } from 'lucide-react'

/** Eine Seite, auf der Tests laufen, samt Snippet-Befund (/api/snippet-check). */
type PageReport = {
  url: string
  detected: boolean
  outdated?: boolean
  reason?: string
  tests: string[]
}

type PageCheckState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'done'; pages: PageReport[] }
  | { phase: 'error' }

/* ── Verified Badge (compact) ── */

export function SnippetVerifiedBadge({
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

  // Seiten-Check erst beim Aufklappen — er kostet pro Lauf bis zu zehn Fetches
  // auf die Kundendomain und hat auf einem Dashboard-Load nichts verloren.
  // Bewusst an der Nutzeraktion aufgehaengt und nicht an einem Effect auf
  // `expanded`: der Fetch ist eine Folge des Klicks, nicht des Renderns.
  const [pageCheck, setPageCheck] = useState<PageCheckState>({ phase: 'idle' })
  const startPageCheck = useCallback(() => {
    setPageCheck({ phase: 'loading' })
    fetch('/api/snippet-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_url: domain, include_pages: true }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('check failed'))))
      .then((json) => setPageCheck({ phase: 'done', pages: json.pages ?? [] }))
      .catch(() => setPageCheck({ phase: 'error' }))
  }, [domain])

  const handleToggle = useCallback(() => {
    if (!expanded && pageCheck.phase === 'idle') startPageCheck()
    onToggle()
  }, [expanded, pageCheck.phase, startPageCheck, onToggle])

  const missingPages =
    pageCheck.phase === 'done' ? pageCheck.pages.filter((p) => !p.detected) : []

  return (
    <div className="mb-5 rounded-[var(--radius-lg)] border border-ok/20 bg-ok/[0.04] px-4 py-2.5">
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
            onClick={handleToggle}
            aria-expanded={expanded}
            className="flex cursor-pointer items-center justify-center h-5 w-5 rounded-[var(--radius-sm)] text-text-3 transition-colors hover:bg-ok/10 hover:text-text"
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
            {missingPages.length > 0
              ? 'The snippet is missing on some pages you are testing. Those tests cannot record anything.'
              : 'Data is flowing. Visitors and conversions are being tracked.'}
          </p>

          {/* Pro Seite, nicht pro Domain: das Snippet muss im <head> jeder Seite
              stehen. Eine verifizierte Domain sagt nur, dass es auf EINER Seite
              gefunden wurde — meist der Startseite. */}
          {pageCheck.phase === 'loading' && (
            <p className="flex items-center gap-1.5 text-[11px] text-text-3">
              <Loader2 className="h-3 w-3 animate-spin" /> Checking the pages your tests run on…
            </p>
          )}

          {pageCheck.phase === 'error' && (
            <p className="text-[11px] text-text-3">Could not check the individual pages right now.</p>
          )}

          {pageCheck.phase === 'done' && pageCheck.pages.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-3/60">
                Pages with tests
              </p>
              {pageCheck.pages.map((page) => (
                <div key={page.url} className="flex items-start gap-2 text-[12px]">
                  {page.detected ? (
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-ok" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-err" />
                  )}
                  <div className="min-w-0">
                    <span className={page.detected ? 'text-text-2' : 'text-text'}>
                      {pathLabel(page.url)}
                    </span>
                    {!page.detected && (
                      <span className="block text-[11px] text-err">
                        {page.outdated
                          ? 'Outdated snippet — paste the current one again.'
                          : 'No snippet in the <head> of this page.'}
                        {page.tests.length > 0 && ` Affects: ${page.tests.join(', ')}`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {otherDomains.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-3/60">All domains</p>
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
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-[11px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text"
            >
              Re-check snippet
            </button>
            <a
              href="/dashboard/account"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-[11px] font-medium text-pro transition-colors hover:border-pro/30 hover:text-pro"
            >
              + Add another site
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

/** Zeigt '/pricing' statt der vollen URL — die Domain steht schon im Kopf des Badges. */
function pathLabel(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname === '/' ? '/' : u.pathname.replace(/\/+$/, '')
  } catch {
    return url
  }
}
