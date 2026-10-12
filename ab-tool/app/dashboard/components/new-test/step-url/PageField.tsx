'use client'

import { Globe, Loader2, Check, ChevronDown } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import type { DomainConnectState, ScanResult, ScanState } from './types'

/** Seitenwahl: Auswahlliste verbundener Domains oder Hostname-Feld mit Inline-Domain-Connect. */
export function PageField({
  url,
  onUrlChange,
  verifiedDomains,
  domainConnectError,
  onConnectDomain,
  scanState,
  setScanState,
  setScanResult,
  setScanError,
  urlValid,
  hasSnippet,
  selectedDomain,
  currentHostname,
  connectState,
}: {
  url: string
  onUrlChange: (url: string) => void
  verifiedDomains: { url: string; verifiedAt: string | null }[]
  domainConnectError: string
  onConnectDomain: (hostname: string) => void
  scanState: ScanState
  setScanState: Dispatch<SetStateAction<ScanState>>
  setScanResult: Dispatch<SetStateAction<ScanResult | null>>
  setScanError: Dispatch<SetStateAction<string>>
  urlValid: string | boolean
  hasSnippet: boolean
  selectedDomain: string | undefined
  currentHostname: string | null
  connectState: DomainConnectState
}) {
  return (
    <>
      {/* ── Page ── */}
      <div>
        {hasSnippet ? (
          <>
            <label className="mb-1.5 block text-[11px] font-medium text-text-3 uppercase tracking-wider">Page</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
              <select
                value={selectedDomain ?? ''}
                onChange={(e) => {
                  onUrlChange(`https://${e.target.value}/`)
                  setScanState('idle'); setScanResult(null); setScanError('')
                }}
                className="w-full appearance-none rounded-[7px] border border-border bg-bg-1 py-2.5 pl-9 pr-8 text-[13px] text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:border-border-strong focus:ring-2 focus:ring-text/10 cursor-pointer"
              >
                {verifiedDomains.map((d) => (
                  <option key={d.url} value={d.url}>{d.url}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3" />
            </div>
            <p className="mt-1 text-[10px] text-text-3">
              The test runs on this page — the one your snippet is verified on. Sub-pages
              aren&apos;t offered: their snippet was never checked, so a test there
              couldn&apos;t be measured.
            </p>
          </>
        ) : (
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-text-3 uppercase tracking-wider">Your site</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  onUrlChange(e.target.value)
                  if (scanState !== 'idle') { setScanState('idle'); setScanResult(null); setScanError('') }
                }}
                placeholder="yoursite.com"
                className="w-full rounded-[7px] border border-border bg-bg-1 py-2.5 pl-9 pr-3 text-[13px] text-text placeholder:text-text-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 focus:border-border-strong focus:ring-2 focus:ring-text/10"
              />
            </div>

            {/* Inline domain-connect — derives the hostname from what was typed
                above instead of asking for it a second time. */}
            {urlValid && currentHostname && (
              <div className="mt-1.5 text-[11px]">
                {connectState === 'verified' ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-ok">
                    <Check className="h-3 w-3" /> {currentHostname} connected
                  </span>
                ) : connectState === 'saving' ? (
                  <span className="inline-flex items-center gap-1.5 text-text-3">
                    <Loader2 className="h-3 w-3 animate-spin" /> Checking {currentHostname}…
                  </span>
                ) : connectState === 'not-found' ? (
                  <span className="inline-flex flex-wrap items-center gap-x-1.5 text-pro/90">
                    Snippet not found on {currentHostname} — paste it in your site&apos;s &lt;head&gt;, then{' '}
                    <button onClick={() => onConnectDomain(currentHostname)} className="underline hover:text-pro cursor-pointer">retry</button>.
                  </span>
                ) : (
                  <button
                    onClick={() => onConnectDomain(currentHostname)}
                    className="inline-flex items-center gap-1.5 text-text-3 transition-colors hover:text-pro cursor-pointer"
                  >
                    <Globe className="h-3 w-3" />
                    Connect {currentHostname}
                  </button>
                )}
                {domainConnectError && connectState === 'idle' && (
                  <span className="ml-1.5 text-err/80">{domainConnectError}</span>
                )}
              </div>
            )}

            <p className="mt-1 text-[10px] text-text-3">
              Connect the site that has the snippet installed — that page becomes the one this test runs on.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
