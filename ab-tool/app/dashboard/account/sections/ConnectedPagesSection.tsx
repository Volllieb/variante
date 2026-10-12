'use client'

import { Globe, AlertTriangle, Check, Loader2, X } from 'lucide-react'
import type { AddState, Domain } from '../types'
import type { Dispatch, SetStateAction } from 'react'

/** Verbundene Seiten: Liste, Verify/Remove, Add-Flow inkl. Plan-Limit und Ersetzen. */
export function ConnectedPagesSection({
  plan,
  domains,
  domainBusy,
  domainError,
  verifying,
  deleteId,
  setDeleteId,
  addingPage,
  setAddingPage,
  addUrl,
  setAddUrl,
  addState,
  setAddState,
  addError,
  setAddError,
  normalize,
  verifyDomain,
  deleteDomain,
  addAdditionalPage,
  replaceExistingPage,
  resetAddFlow,
}: {
  plan: string
  domains: Domain[]
  domainBusy: boolean
  domainError: string
  verifying: string | null
  deleteId: string | null
  setDeleteId: Dispatch<SetStateAction<string | null>>
  addingPage: boolean
  setAddingPage: Dispatch<SetStateAction<boolean>>
  addUrl: string
  setAddUrl: Dispatch<SetStateAction<string>>
  addState: AddState
  setAddState: Dispatch<SetStateAction<AddState>>
  addError: string
  setAddError: Dispatch<SetStateAction<string>>
  normalize: (raw: string) => string
  verifyDomain: (domainId: string, url: string) => Promise<void>
  deleteDomain: (domainId: string) => Promise<void>
  addAdditionalPage: () => Promise<void>
  replaceExistingPage: () => Promise<void>
  resetAddFlow: () => void
}) {
  return (
    <>
      {/* Connected Pages */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-4 w-4 text-text-3" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">Connected Pages</span>
        </div>

        <p className="mb-4 text-[12px] text-text-3 leading-relaxed">
          This is where your variante snippet lives. We check these pages to verify the snippet is installed.
          Subpages like <code className="rounded-[3px] bg-white/[0.06] px-1 text-[11px]">/pricing</code> inherit the snippet automatically — no need to add them separately.
          When creating a test, you can use <strong className="text-text-2">any URL on a connected domain</strong>.
        </p>

        {/* ── Empty state ── */}
        {domains.length === 0 && !addingPage && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-pro/30 bg-pro/[0.03] px-4 py-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-pro" />
              <p className="text-[13px] text-pro">No page connected yet — tests won&apos;t run without a snippet.</p>
            </div>
            <button
              onClick={() => { setAddingPage(true); setAddState('input'); setAddError(''); setAddUrl('') }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] bg-fill-invert px-4 py-2 text-[11px] font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover"
            >
              Seite hinzufügen
            </button>
          </div>
        )}

        {/* ── Page list — every domain gets identical treatment, no "primary" special-case ── */}
        {domains.length > 0 && (
          <div className="space-y-1.5">
            {domains.map((d) => (
              <div
                key={d.id}
                className={`flex items-center justify-between gap-3 rounded-[var(--radius-md)] border px-3.5 py-2.5 ${
                  d.verified ? 'border-ok/20 bg-ok/[0.04]' : 'border-pro/20 bg-pro/[0.03]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[13px] font-medium text-text truncate">{d.url}</span>
                  {d.verified ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-ok/15 px-1.5 py-0.5 text-[9px] font-semibold text-ok">
                      <Check className="h-2.5 w-2.5" /> Verified
                    </span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-pro/15 px-1.5 py-0.5 text-[9px] font-semibold text-pro">
                      <AlertTriangle className="h-2.5 w-2.5" /> Not verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!d.verified && (
                    <button
                      onClick={() => verifyDomain(d.id, d.url)}
                      disabled={verifying === d.id}
                      className="cursor-pointer rounded-[var(--radius-sm)] px-2 py-1 text-[10px] font-semibold text-text-2 transition-colors hover:text-text disabled:opacity-40"
                    >
                      {verifying === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Re-verify'}
                    </button>
                  )}
                  {deleteId === d.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteDomain(d.id)}
                        disabled={domainBusy}
                        className="cursor-pointer rounded-[var(--radius-sm)] bg-err px-2 py-0.5 text-[9px] font-semibold text-white hover:bg-err/90 disabled:opacity-40"
                      >
                        {domainBusy ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setDeleteId(null)}
                        disabled={domainBusy}
                        className="cursor-pointer rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[9px] text-text-3 hover:text-text"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteId(d.id)}
                      className="cursor-pointer rounded-[var(--radius-sm)] p-1 text-text-3/50 transition-colors hover:text-err"
                      aria-label={`Remove ${d.url}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Add-page trigger — same flow for page 1 and page N, so this is the only "add" button in the section ── */}
        {domains.length > 0 && !addingPage && (
          <div className="mt-2">
            {plan === 'free' ? (
              <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-pro/20 bg-pro/[0.02] px-3 py-2">
                <span className="text-[10px] font-medium text-pro/80">Free plan: 1 page</span>
                <a href="/dashboard/billing" className="text-[10px] font-semibold text-pro underline hover:text-pro/80 transition-colors">Pro includes 5 pages →</a>
              </div>
            ) : (
              <button
                onClick={() => { setAddingPage(true); setAddState('input'); setAddError(''); setAddUrl('') }}
                className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-dashed border-border py-2 text-[10px] font-semibold text-text-3 transition-colors hover:border-border-strong hover:text-text-2"
              >
                + Weitere Seite hinzufügen
              </button>
            )}
          </div>
        )}

        {/* ── Inline add form — input → saving → verified / not-found / limit ── */}
        {addingPage && (
          <div className="mt-3 space-y-2 rounded-[var(--radius-md)] bg-bg-2 p-3">
            {(addState === 'input' || addState === 'saving') && (
              <>
                <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-bg-1 px-2.5 py-2">
                  <Globe className="h-3.5 w-3.5 shrink-0 text-text-3" />
                  <input
                    type="text"
                    value={addUrl}
                    onChange={(e) => { setAddUrl(e.target.value); setAddError('') }}
                    onKeyDown={(e) => e.key === 'Enter' && addAdditionalPage()}
                    placeholder="yoursite.com"
                    disabled={addState !== 'input'}
                    autoFocus
                    className="flex-1 bg-transparent text-[12px] text-text placeholder:text-text-3/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0"
                  />
                </div>
                {addError && <p className="text-[11px] text-err">{addError}</p>}
                <div className="flex gap-1.5">
                  <button
                    onClick={addAdditionalPage}
                    disabled={addState !== 'input' || !addUrl.trim()}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-fill-invert py-1.5 text-[10px] font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover disabled:opacity-30"
                  >
                    {addState === 'saving' ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Saving & checking…
                      </>
                    ) : (
                      'Add'
                    )}
                  </button>
                  <button
                    onClick={resetAddFlow}
                    className="cursor-pointer rounded-[var(--radius-sm)] border border-border px-3 py-1.5 text-[10px] text-text-3 transition-colors hover:text-text"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {addState === 'not-found' && (
              <div className="space-y-2">
                <p className="text-[11px] text-pro">Snippet not found on <strong>{normalize(addUrl)}</strong>. Add it to the page&apos;s &lt;head&gt; and retry.</p>
                <div className="flex gap-1.5">
                  <button onClick={addAdditionalPage} className="flex cursor-pointer items-center gap-1 rounded-[var(--radius-sm)] bg-fill-invert px-3 py-1.5 text-[10px] font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover">
                    <Loader2 className="h-2.5 w-2.5" /> Retry
                  </button>
                  <button onClick={() => { setAddState('input'); setAddError('') }} className="cursor-pointer rounded-[var(--radius-sm)] border border-border px-3 py-1.5 text-[10px] text-text-3 transition-colors hover:text-text">Change URL</button>
                  <button onClick={resetAddFlow} className="cursor-pointer rounded-[var(--radius-sm)] px-3 py-1.5 text-[10px] text-text-3 transition-colors hover:text-text">Cancel</button>
                </div>
              </div>
            )}

            {/* Plan limit hit — a contextual swap prompt instead of a permanent "Change" button */}
            {addState === 'limit' && (
              <div className="space-y-2">
                <p className="text-[11px] text-pro">{addError || 'Page limit reached.'}</p>
                {domains.length === 1 ? (
                  <>
                    <p className="text-[11px] text-text-3">
                      Replace <strong className="text-text-2">{domains[0].url}</strong> with <strong className="text-text-2">{normalize(addUrl)}</strong>?
                      We&apos;ll confirm the new snippet is live first — your current page stays connected until then.
                    </p>
                    <div className="flex gap-1.5">
                      <button onClick={replaceExistingPage} className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-sm)] bg-fill-invert px-3 py-1.5 text-[10px] font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover">
                        Replace page
                      </button>
                      <button onClick={resetAddFlow} className="cursor-pointer rounded-[var(--radius-sm)] border border-border px-3 py-1.5 text-[10px] text-text-3 transition-colors hover:text-text">Cancel</button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-1.5">
                    <a href="/dashboard/billing" className="cursor-pointer rounded-[var(--radius-sm)] bg-fill-invert px-3 py-1.5 text-[10px] font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover">Upgrade plan</a>
                    <button onClick={resetAddFlow} className="cursor-pointer rounded-[var(--radius-sm)] border border-border px-3 py-1.5 text-[10px] text-text-3 transition-colors hover:text-text">Cancel</button>
                  </div>
                )}
              </div>
            )}

            {addState === 'replacing' && (
              <div className="flex items-center gap-2 text-[11px] text-text-3">
                <Loader2 className="h-3 w-3 animate-spin" /> Checking snippet on {normalize(addUrl)}…
              </div>
            )}

            {addState === 'verified' && (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-[11px] text-ok"><Check className="h-3 w-3" /> <strong>{normalize(addUrl)}</strong> added &amp; verified.</p>
                <button onClick={resetAddFlow} className="cursor-pointer rounded-[var(--radius-sm)] bg-fill-invert px-3 py-1.5 text-[10px] font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover">Done</button>
              </div>
            )}
          </div>
        )}

        {domainError && (
          <p className="mt-3 flex items-center gap-1.5 text-[12px] text-err">
            <AlertTriangle className="h-3 w-3" />
            {domainError}
          </p>
        )}
      </div>
    </>
  )
}
