'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  HeartPulse,
  Code2,
  Puzzle,
  Globe,
  KeyRound,
  Check,
  AlertTriangle,
  X,
  Loader2,
  Copy,
  ChevronDown,
  ExternalLink,
  Shield,
} from 'lucide-react'
import type { SetupData } from './page'

const T = {
  ok: '#2fd76c',
  pro: '#f5a623',
  err: '#f5455c',
  text: '#ededed',
}

const SNIPPET_CODE = `<!-- A/B Testing: universal snippet — paste in <head> on EVERY page -->
<link rel="preconnect" href="https://www.getvariante.com">
<style id="__ab_hide">html.__ab_pending{opacity:0!important}</style>
<script>document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)<\/script>
<script async src="https://www.getvariante.com/ab.js" integrity="sha384-IRhfYvegwpNV4YFObew04X1nQgyv7Mty9M5VWzJoOFry54oKIx4qIJg7lN1igh/T" crossorigin="anonymous"><\/script>`

type CheckId = 'snippet' | 'plugin' | 'extension'

type CheckResult = {
  status: 'pending' | 'loading' | 'ok' | 'warn' | 'err'
  label: string
  summary: string
  detail?: string
}

export function SetupClient({ data }: { data: SetupData }) {
  const [expanded, setExpanded] = useState<CheckId | null>(null)
  const [snippetCopied, setSnippetCopied] = useState(false)
  const [tokenCopied, setTokenCopied] = useState(false)

  const [checks, setChecks] = useState<Record<CheckId, CheckResult>>({
    snippet: { status: 'pending', label: 'Snippet installed', summary: 'Checking if ab.js is on your site…' },
    plugin: { status: 'pending', label: 'Figma plugin connected', summary: 'Checking plugin status…' },
    extension: { status: 'pending', label: 'Chrome extension', summary: 'Ready to install' },
  })

  // ── Snippet auto-check ──
  const checkSnippet = useCallback(async (url: string) => {
    setChecks((prev) => ({ ...prev, snippet: { ...prev.snippet, status: 'loading' } }))
    try {
      const res = await fetch('/api/snippet-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_url: url }),
      })
      const json = await res.json()
      if (json.detected) {
        setChecks((prev) => ({
          ...prev,
          snippet: { status: 'ok', label: 'Snippet installed', summary: 'ab.js detected on your site.' },
        }))
      } else if (json.reason) {
        setChecks((prev) => ({
          ...prev,
          snippet: {
            status: 'warn',
            label: 'Snippet not reachable',
            summary: json.reason,
            detail: url,
          },
        }))
      } else {
        setChecks((prev) => ({
          ...prev,
          snippet: {
            status: 'err',
            label: 'Snippet not found',
            summary: 'No ab.js or __ab_hide found on the page.',
            detail: url,
          },
        }))
      }
    } catch {
      setChecks((prev) => ({
        ...prev,
        snippet: {
          status: 'warn',
          label: 'Check failed',
          summary: 'Could not verify snippet. Your site may be behind a firewall.',
        },
      }))
    }
  }, [])

  // ── Plugin check (server-provided flag) ──
  useEffect(() => {
    setChecks((prev) => ({
      ...prev,
      plugin: data.hasFigmaPlugin
        ? { status: 'ok', label: 'Figma plugin connected', summary: 'Plugin is linked to your account.' }
        : { status: 'err', label: 'Figma plugin not connected', summary: 'Install the plugin from the Figma Community and paste your token to link it.' },
    }))
  }, [data.hasFigmaPlugin])

  // ── Extension check (always ready to install) ──
  useEffect(() => {
    setChecks((prev) => ({
      ...prev,
      extension: { status: 'ok', label: 'Chrome extension', summary: 'Install from the Chrome Web Store to pick elements on your site.' },
    }))
  }, [])

  // ── Run snippet check on mount if we have a URL ──
  useEffect(() => {
    if (data.siteUrl) {
      checkSnippet(data.siteUrl)
    } else {
      setChecks((prev) => ({
        ...prev,
        snippet: {
          status: 'warn',
          label: 'No site to check',
          summary: 'Create a test first — the health check needs a site URL to verify the snippet.',
        },
      }))
    }
  }, [data.siteUrl, checkSnippet])

  // ── Derived health ──
  const issues = Object.values(checks).filter((c) => c.status === 'err' || c.status === 'warn').length
  const allOk = Object.values(checks).every((c) => c.status === 'ok')
  const hasResults = Object.values(checks).every((c) => c.status !== 'pending' && c.status !== 'loading')

  function copySnippet() {
    navigator.clipboard.writeText(SNIPPET_CODE).then(() => {
      setSnippetCopied(true)
      setTimeout(() => setSnippetCopied(false), 2000)
    })
  }

  function copyToken() {
    navigator.clipboard.writeText(data.apiToken).then(() => {
      setTokenCopied(true)
      setTimeout(() => setTokenCopied(false), 2000)
    })
  }

  function retrySnippet() {
    if (data.siteUrl) checkSnippet(data.siteUrl)
  }

  const statusIcon = (status: CheckResult['status']) => {
    if (status === 'loading' || status === 'pending') return <Loader2 className="h-4 w-4 animate-spin text-[#ededed]/30" />
    if (status === 'ok') return <Check className="h-4 w-4" style={{ color: T.ok }} />
    if (status === 'warn') return <AlertTriangle className="h-4 w-4" style={{ color: T.pro }} />
    return <X className="h-4 w-4" style={{ color: T.err }} />
  }

  const statusBg = (status: CheckResult['status']) => {
    if (status === 'ok') return `${T.ok}1f`
    if (status === 'warn') return `${T.pro}1f`
    if (status === 'err') return `${T.err}1f`
    return 'transparent'
  }

  const statusBorder = (status: CheckResult['status']) => {
    if (status === 'ok') return `${T.ok}33`
    if (status === 'warn') return `${T.pro}33`
    if (status === 'err') return `${T.err}33`
    return 'rgba(255,255,255,.08)'
  }

  return (
    <main className="min-w-0 flex-1 px-5 py-6 sm:px-8">
      <div className="mx-auto max-w-xl space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5">
            <HeartPulse className="h-4 w-4 text-[#ededed]/50" />
            <h1 className="text-[18px] font-semibold text-[#ededed]">Setup health check</h1>
          </div>
          {hasResults && (
            <p className="mt-1.5 text-[12px] text-[#ededed]/40">
              {allOk
                ? 'All systems go — your setup is healthy.'
                : `${issues} issue${issues !== 1 ? 's' : ''} found. Click each item for details and fixes.`}
            </p>
          )}
        </div>

        {/* Overall status pill */}
        {hasResults && (
          <div
            className="flex items-center gap-2.5 rounded-[8px] px-4 py-2.5 text-[12px] font-medium"
            style={{
              background: allOk ? `${T.ok}0f` : issues > 0 ? `${T.pro}0f` : `${T.text}08`,
              border: `1px solid ${allOk ? `${T.ok}33` : issues > 0 ? `${T.pro}33` : 'rgba(255,255,255,.10)'}`,
              color: allOk ? T.ok : issues > 0 ? T.pro : `${T.text}62`,
            }}
          >
            {allOk ? <Check className="h-3.5 w-3.5" /> : issues > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : null}
            {allOk ? 'Healthy — no issues detected' : `${issues} check${issues !== 1 ? 's' : ''} need${issues === 1 ? 's' : ''} attention`}
          </div>
        )}

        {/* Check cards */}
        <div className="space-y-3">
          {/* Snippet check */}
          <CheckCard
            check={checks.snippet}
            expanded={expanded === 'snippet'}
            onToggle={() => setExpanded(expanded === 'snippet' ? null : 'snippet')}
            icon={Code2}
            statusIcon={statusIcon(checks.snippet.status)}
            statusBg={statusBg(checks.snippet.status)}
            statusBorder={statusBorder(checks.snippet.status)}
          >
            <div className="space-y-4">
              {checks.snippet.status === 'err' || checks.snippet.status === 'warn' ? (
                <>
                  <p className="text-[12px] leading-relaxed text-[#ededed]/62">
                    Paste this snippet into the <code className="rounded-[5px] bg-white/[0.07] px-1.5 py-0.5 font-mono text-[11px] text-[#ededed]/62">&lt;head&gt;</code> of every page you want to test. It&apos;s framework-agnostic — no build step, no npm.
                  </p>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">Universal snippet</span>
                      <button
                        onClick={copySnippet}
                        className="flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-[#ededed]/62 transition-colors hover:border-white/[0.18] hover:text-[#ededed]"
                      >
                        {snippetCopied ? <Check className="h-3.5 w-3.5" style={{ color: T.ok }} /> : <Copy className="h-3.5 w-3.5" />}
                        {snippetCopied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <pre className="overflow-x-auto rounded-[6px] bg-black px-4 py-4 text-[10px] leading-relaxed text-[#ededed]/50 ring-1 ring-white/10">
{SNIPPET_CODE}
                    </pre>
                  </div>

                  <FrameworkExamples />

                  <button
                    onClick={retrySnippet}
                    className="flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-white/[0.12] px-3 py-1.5 text-[11px] font-medium text-[#ededed]/62 transition-colors hover:border-white/[0.20] hover:text-[#ededed]"
                  >
                    Re-check snippet
                  </button>
                </>
              ) : checks.snippet.status === 'ok' ? (
                <p className="text-[12px] leading-relaxed text-[#ededed]/62">
                  The snippet is live on your site. Data is flowing — visitors and conversions are being tracked.
                </p>
              ) : (
                <p className="text-[12px] leading-relaxed text-[#ededed]/40">
                  {!data.siteUrl
                    ? 'Create a test with a site URL first, then come back here to verify snippet installation.'
                    : 'Waiting for site URL to run the snippet check…'}
                </p>
              )}
            </div>
          </CheckCard>

          {/* Plugin check */}
          <CheckCard
            check={checks.plugin}
            expanded={expanded === 'plugin'}
            onToggle={() => setExpanded(expanded === 'plugin' ? null : 'plugin')}
            icon={Puzzle}
            statusIcon={statusIcon(checks.plugin.status)}
            statusBg={statusBg(checks.plugin.status)}
            statusBorder={statusBorder(checks.plugin.status)}
          >
            <div className="space-y-4">
              {checks.plugin.status === 'err' ? (
                <>
                  <p className="text-[12px] leading-relaxed text-[#ededed]/62">
                    The Figma plugin lets you create A/B variants directly from your designs.{' '}
                    <a
                      href="https://www.figma.com/community/plugin/1653734891132085565"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline transition-colors hover:opacity-80"
                    >
                      Install from Figma Community
                    </a>
                    , then paste the token below — it links the plugin to your account. No config, no API keys.
                  </p>

                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">Your plugin token</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 overflow-x-auto truncate rounded-[6px] border border-white/10 bg-black px-3 py-2 font-mono text-[13px] text-[#ededed]/62">
                        {data.apiToken || 'No token yet'}
                      </code>
                      <button
                        onClick={copyToken}
                        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-white/10 bg-white/[0.05] text-[#ededed]/62 transition-colors hover:border-white/[0.18] hover:text-[#ededed]"
                      >
                        {tokenCopied ? <Check className="h-4 w-4" style={{ color: T.ok }} /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-[#ededed]/40">
                      After pasting the token into the Figma plugin, create a variant and push it here. The plugin status
                      updates automatically.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-[12px] leading-relaxed text-[#ededed]/62">
                  Plugin is linked. Variants created in Figma will appear in your dashboard automatically.
                </p>
              )}
            </div>
          </CheckCard>

          {/* Extension check */}
          <CheckCard
            check={checks.extension}
            expanded={expanded === 'extension'}
            onToggle={() => setExpanded(expanded === 'extension' ? null : 'extension')}
            icon={Globe}
            statusIcon={statusIcon(checks.extension.status)}
            statusBg={statusBg(checks.extension.status)}
            statusBorder={statusBorder(checks.extension.status)}
          >
            <div className="space-y-4">
              <p className="text-[12px] leading-relaxed text-[#ededed]/62">
                The Chrome extension adds a &quot;Pick element&quot; button directly on your site, so you can select
                exactly which element to test — no manual CSS selectors needed.
              </p>

              <a
                href="https://chromewebstore.google.com/detail/variante-—-ab-test-elemen/hopbdjfpmknemchgoonjommfemgihkbh"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-[6px] bg-white px-4 py-2 text-[11px] font-semibold text-black transition-colors hover:bg-white/90"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Install from Chrome Web Store
              </a>

              <p className="text-[11px] text-[#ededed]/40">
                After installing, open your site from the extension popup and start picking elements.
              </p>
            </div>
          </CheckCard>
        </div>

        {/* Privacy note */}
        <div
          className="flex items-start gap-3 rounded-[8px] px-4 py-3.5"
          style={{ background: `${T.pro}08`, border: `1px solid ${T.pro}22` }}
        >
          <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: T.pro }} />
          <p className="text-[11px] leading-relaxed" style={{ color: `${T.pro}99` }}>
            <strong className="font-semibold">Privacy:</strong> ab.js uses localStorage (no cookies), no personal data is collected or transmitted.
          </p>
        </div>

      </div>
    </main>
  )
}

/* ── CheckCard ── */
function CheckCard({
  check,
  expanded,
  onToggle,
  icon: Icon,
  statusIcon,
  statusBg,
  statusBorder,
  children,
}: {
  check: CheckResult
  expanded: boolean
  onToggle: () => void
  icon: React.ComponentType<{ className?: string }>
  statusIcon: React.ReactNode
  statusBg: string
  statusBorder: string
  children: React.ReactNode
}) {
  return (
    <div
      className="overflow-hidden rounded-[10px] border transition-colors"
      style={{ borderColor: statusBorder, background: '#0a0a0a' }}
    >
      <button
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]"
          style={{ background: statusBg }}
        >
          {statusIcon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-[#ededed]">{check.label}</p>
          <p
            className="mt-0.5 truncate text-[11px]"
            style={{
              color:
                check.status === 'ok' ? `${T.text}40` : check.status === 'warn' ? T.pro : check.status === 'err' ? T.err : `${T.text}30`,
            }}
          >
            {check.summary}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#ededed]/30 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-white/[0.06] px-4 py-3.5">
          {children}
        </div>
      )}
    </div>
  )
}

/* ── Framework snippet examples ── */
function FrameworkExamples() {
  const examples = [
    {
      label: 'Next.js App Router',
      file: 'app/layout.tsx',
      code: `// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://www.getvariante.com" />
        <style id="__ab_hide">{\`html.__ab_pending{opacity:0!important}\`}</style>
        <script dangerouslySetInnerHTML={{
          __html: \`document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)\`
        }} />
        <script async src="https://www.getvariante.com/ab.js" integrity="sha384-IRhfYvegwpNV4YFObew04X1nQgyv7Mty9M5VWzJoOFry54oKIx4qIJg7lN1igh/T" crossorigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  )
}`,
    },
    {
      label: 'Next.js Pages Router',
      file: 'pages/_document.tsx',
      code: `// pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        <link rel="preconnect" href="https://www.getvariante.com" />
        <style id="__ab_hide">{\`html.__ab_pending{opacity:0!important}\`}</style>
        <script dangerouslySetInnerHTML={{
          __html: \`document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)\`
        }} />
        <script async src="https://www.getvariante.com/ab.js" integrity="sha384-IRhfYvegwpNV4YFObew04X1nQgyv7Mty9M5VWzJoOFry54oKIx4qIJg7lN1igh/T" crossorigin="anonymous" />
      </Head>
      <body><Main /><NextScript /></body>
    </Html>
  )
}`,
    },
    {
      label: 'Plain HTML',
      file: '<head>',
      code: `<!DOCTYPE html>
<html>
<head>
  <link rel="preconnect" href="https://www.getvariante.com">
  <style id="__ab_hide">html.__ab_pending{opacity:0!important}</style>
  <script>document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)<\/script>
  <script async src="https://www.getvariante.com/ab.js" integrity="sha384-IRhfYvegwpNV4YFObew04X1nQgyv7Mty9M5VWzJoOFry54oKIx4qIJg7lN1igh/T" crossorigin="anonymous"><\/script>
</head>
<body><!-- your content --></body>
</html>`,
    },
  ]

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">Framework examples</p>
      {examples.map(({ label, file, code }) => (
        <details key={label} className="group rounded-[6px] border border-white/10 [&_summary]:list-none">
          <summary className="flex cursor-pointer select-none items-center justify-between px-3 py-2.5 text-[11px] font-semibold text-[#ededed]/62 transition-colors hover:text-[#ededed]">
            <span>{label}</span>
            <span className="flex items-center gap-2">
              <code className="rounded-[5px] bg-white/[0.07] px-2 py-0.5 font-mono text-[11px] text-[#ededed]/40">
                {file}
              </code>
              <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <pre className="overflow-x-auto border-t border-white/10 px-3 py-3 text-[10px] leading-relaxed text-[#ededed]/50">
{code}
          </pre>
        </details>
      ))}
    </div>
  )
}
