'use client'

import { Key, AlertTriangle, Check, Loader2, Copy } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'

/** API-Token für Figma-Plugin und API: anzeigen, kopieren, neu erzeugen. */
export function ApiTokenSection({
  token,
  showToken,
  setShowToken,
  tokenCopied,
  tokenBusy,
  regenerateConfirm,
  setRegenerateConfirm,
  copyToken,
  regenerateToken,
}: {
  token: string | null
  showToken: boolean
  setShowToken: Dispatch<SetStateAction<boolean>>
  tokenCopied: boolean
  tokenBusy: boolean
  regenerateConfirm: boolean
  setRegenerateConfirm: Dispatch<SetStateAction<boolean>>
  copyToken: () => Promise<void>
  regenerateToken: () => Promise<void>
}) {
  return (
    <>
      {/* API Token — used by Figma plugin and API access */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Key className="h-4 w-4 text-text-3" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">API Token</span>
        </div>

        {!token ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-pro/30 bg-pro/[0.03] px-4 py-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-pro" />
              <p className="text-[12px] text-pro">No API token found. This is required for the Figma plugin.</p>
            </div>
            <button
              onClick={regenerateToken}
              disabled={tokenBusy}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] bg-fill-invert px-4 py-2 text-[11px] font-semibold text-text-on-invert transition-opacity hover:bg-fill-invert-hover disabled:opacity-40"
            >
              {tokenBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
              Generate token
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px] text-text-3 leading-relaxed">
              This token authenticates the <strong className="text-text-2">Figma plugin</strong> and API requests.
              Treat it like a password — do not share it publicly.
            </p>

            {/* Token display */}
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-bg-2 px-3 py-2.5">
              <Key className="h-3.5 w-3.5 shrink-0 text-text-3" />
              <code className="flex-1 text-[12px] font-mono text-text truncate select-all">
                {showToken ? token : `••••••••••••••••${token.slice(-4)}`}
              </code>
              <button
                onClick={() => setShowToken((v) => !v)}
                className="shrink-0 cursor-pointer text-[10px] text-text-3 transition-colors hover:text-text-2"
                aria-label={showToken ? 'Hide token' : 'Show token'}
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={copyToken}
                className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-[11px] font-semibold text-text-2 transition-colors hover:border-border-strong hover:text-text"
              >
                {tokenCopied ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
                {tokenCopied ? 'Copied' : 'Copy'}
              </button>

              {!regenerateConfirm ? (
                <button
                  onClick={() => setRegenerateConfirm(true)}
                  className="cursor-pointer rounded-[var(--radius-md)] px-3 py-1.5 text-[11px] font-medium text-text-3 transition-colors hover:text-err"
                >
                  Regenerate
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={regenerateToken}
                    disabled={tokenBusy}
                    className="flex cursor-pointer items-center gap-1 rounded-[var(--radius-sm)] bg-err px-2.5 py-1 text-[10px] font-semibold text-white transition-opacity hover:bg-err/90 disabled:opacity-40"
                  >
                    {tokenBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    Confirm
                  </button>
                  <button
                    onClick={() => setRegenerateConfirm(false)}
                    disabled={tokenBusy}
                    className="cursor-pointer rounded-[var(--radius-sm)] px-2 py-1 text-[10px] text-text-3 transition-colors hover:text-text disabled:opacity-30"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <p className="text-[10px] text-text-3/60">
              Regenerating invalidates the old token immediately. Update it in the Figma plugin afterwards.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
