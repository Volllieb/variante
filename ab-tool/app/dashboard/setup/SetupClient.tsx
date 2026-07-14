'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  HeartPulse,
  LogIn,
  Globe,
  Puzzle,
  Check,
  AlertTriangle,
  X,
  Loader2,
  Copy,
  ChevronDown,
} from 'lucide-react'
import type { SetupData } from './page'
import { SNIPPET_CODE } from '@/lib/snippetCode'

const T = {
  ok: '#2fd76c',
  pro: '#f5a623',
  err: '#f5455c',
  text: '#ededed',
}

type StepId = 'login' | 'website' | 'plugin'

type StepState = {
  status: 'ok' | 'loading' | 'err' | 'pending'
  label: string
  summary: string
}

type WebsiteState =
  | { phase: 'input'; error?: string }
  | { phase: 'saving' }
  | { phase: 'checking'; url: string }
  | { phase: 'not-found'; url: string }
  | { phase: 'verified'; url: string }

export function SetupClient({ data }: { data: SetupData }) {
  const [expanded, setExpanded] = useState<StepId | null>(null)

  // ── Website state ──
  const [urlInput, setUrlInput] = useState('')
  const [website, setWebsite] = useState<WebsiteState>(() => {
    if (data.siteUrl) return { phase: 'verified', url: data.siteUrl }
    if (data.hasAnyDomain) return { phase: 'input' } // has domain but not verified — let them re-enter
    return { phase: 'input' }
  })
  const [snippetCopied, setSnippetCopied] = useState(false)
  const [promptCopied, setPromptCopied] = useState(false)
  const [tokenCopied, setTokenCopied] = useState(false)

  // ── Derived step states ──
  const steps: Record<StepId, StepState> = {
    login: { status: 'ok', label: 'Login', summary: 'You\'re signed in.' },
    website: website.phase === 'verified'
      ? { status: 'ok', label: 'Connect Website', summary: `Snippet active on ${website.url}` }
      : website.phase === 'checking'
        ? { status: 'loading', label: 'Connect Website', summary: `Checking ${website.url}…` }
        : website.phase === 'saving'
          ? { status: 'loading', label: 'Connect Website', summary: 'Saving domain…' }
          : website.phase === 'not-found'
            ? { status: 'err', label: 'Connect Website', summary: `Snippet not found on ${website.url}` }
            : { status: 'pending', label: 'Connect Website', summary: 'Add your website to run tests.' },
    plugin: data.hasFigmaPlugin
      ? { status: 'ok', label: 'Figma Plugin Connect', summary: 'Plugin is linked to your account.' }
      : { status: 'pending', label: 'Figma Plugin Connect', summary: 'Install the Figma plugin and link it.' },
  }

  const allOk = Object.values(steps).every((s) => s.status === 'ok')
  const issues = Object.values(steps).filter((s) => s.status === 'err' || s.status === 'pending').length

  // ── Normalize URL ──
  const normalize = (raw: string) =>
    raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '')

  // ── Submit domain → save → snippet check ──
  const submitDomain = useCallback(async () => {
    const normalized = normalize(urlInput)
    if (!normalized || !normalized.includes('.')) {
      setWebsite({ phase: 'input', error: 'Please enter a valid domain (e.g. yoursite.com)' })
      return
    }

    setWebsite({ phase: 'saving' })

    try {
      const saveRes = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized }),
      })
      if (saveRes.status === 402) {
        setWebsite({ phase: 'input', error: 'Multiple websites require the Agency plan.' })
        return
      }
      if (!saveRes.ok && saveRes.status !== 409) {
        const d = await saveRes.json().catch(() => ({}))
        setWebsite({ phase: 'input', error: d.error || 'Failed to save domain.' })
        return
      }
    } catch {
      setWebsite({ phase: 'input', error: 'Connection failed. Check your internet.' })
      return
    }

    // Step 2: snippet check
    setWebsite({ phase: 'checking', url: normalized })
    try {
      const checkRes = await fetch('/api/snippet-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_url: normalized }),
      })
      const json = await checkRes.json()

      if (json.detected) {
        // Verify the domain
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
        setWebsite({ phase: 'verified', url: normalized })
      } else {
        setWebsite({ phase: 'not-found', url: normalized })
      }
    } catch {
      setWebsite({ phase: 'not-found', url: normalized })
    }
  }, [urlInput, normalize])

  // ── Re-check existing verified domain ──
  const recheckDomain = useCallback(async (url: string) => {
    setWebsite({ phase: 'checking', url })
    try {
      const checkRes = await fetch('/api/snippet-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_url: url }),
      })
      const json = await checkRes.json()
      if (json.detected) {
        setWebsite({ phase: 'verified', url })
      } else {
        setWebsite({ phase: 'not-found', url })
      }
    } catch {
      setWebsite({ phase: 'not-found', url })
    }
  }, [])

  function copySnippet() {
    navigator.clipboard.writeText(SNIPPET_CODE).then(() => {
      setSnippetCopied(true)
      setTimeout(() => setSnippetCopied(false), 2000)
    })
  }

  function copyPrompt() {
    const url = website.phase === 'not-found' || website.phase === 'checking' ? website.url : urlInput || '(your site URL)'
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

  function copyToken() {
    navigator.clipboard.writeText(data.apiToken).then(() => {
      setTokenCopied(true)
      setTimeout(() => setTokenCopied(false), 2000)
    })
  }

  const statusIcon = (status: StepState['status']) => {
    if (status === 'loading') return <Loader2 className="h-4 w-4 animate-spin text-[#ededed]/30" />
    if (status === 'ok') return <Check className="h-4 w-4" style={{ color: T.ok }} />
    if (status === 'err') return <X className="h-4 w-4" style={{ color: T.err }} />
    return <div className="h-4 w-4 rounded-full border-2 border-[#ededed]/12" />
  }

  const statusBg = (status: StepState['status']) => {
    if (status === 'ok') return `${T.ok}1f`
    if (status === 'err') return `${T.err}1f`
    if (status === 'loading') return `${T.text}08`
    return 'transparent'
  }

  const statusBorder = (status: StepState['status']) => {
    if (status === 'ok') return `${T.ok}33`
    if (status === 'err') return `${T.err}33`
    if (status === 'loading') return 'rgba(255,255,255,.08)'
    return 'rgba(255,255,255,.08)'
  }

  const stepIcons: Record<StepId, React.ComponentType<{ className?: string }>> = {
    login: LogIn,
    website: Globe,
    plugin: Puzzle,
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
          <p className="mt-1.5 text-[12px] text-[#ededed]/40">
            {allOk
              ? 'All systems go — your setup is healthy.'
              : `${issues} step${issues !== 1 ? 's' : ''} remaining. Complete each one in order.`}
          </p>
        </div>

        {/* Overall status pill */}
        <div
          className="flex items-center gap-2.5 rounded-[8px] px-4 py-2.5 text-[12px] font-medium"
          style={{
            background: allOk ? `${T.ok}0f` : `${T.pro}0f`,
            border: `1px solid ${allOk ? `${T.ok}33` : `${T.pro}33`}`,
            color: allOk ? T.ok : T.pro,
          }}
        >
          {allOk ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          {allOk ? 'Healthy — no issues detected' : `${issues} step${issues !== 1 ? 's' : ''} need${issues === 1 ? 's' : ''} attention`}
        </div>

        {/* Step cards */}
        <div className="space-y-3">
          {/* Step 1: Login */}
          <StepCard
            step={steps.login}
            icon={LogIn}
            expanded={expanded === 'login'}
            onToggle={() => setExpanded(expanded === 'login' ? null : 'login')}
            statusIcon={statusIcon(steps.login.status)}
            statusBg={statusBg(steps.login.status)}
            statusBorder={statusBorder(steps.login.status)}
            stepNumber={1}
          >
            <p className="text-[12px] leading-relaxed text-[#ededed]/62">
              You&apos;re signed in and authenticated. Your account is ready — no additional login steps needed.
            </p>
          </StepCard>

          {/* Step 2: Connect Website */}
          <StepCard
            step={steps.website}
            icon={Globe}
            expanded={expanded === 'website'}
            onToggle={() => setExpanded(expanded === 'website' ? null : 'website')}
            statusIcon={statusIcon(steps.website.status)}
            statusBg={statusBg(steps.website.status)}
            statusBorder={statusBorder(steps.website.status)}
            stepNumber={2}
          >
            <div className="space-y-4">
              {website.phase === 'verified' ? (
                <>
                  <p className="text-[12px] leading-relaxed text-[#ededed]/62">
                    The snippet is live on <strong className="text-[#ededed]/80">https://{website.url}</strong>. Data is flowing — visitors and conversions are being tracked.
                  </p>
                  <button
                    onClick={() => recheckDomain(website.url)}
                    className="flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-white/[0.12] px-3 py-1.5 text-[11px] font-medium text-[#ededed]/62 transition-colors hover:border-white/[0.20] hover:text-[#ededed]"
                  >
                    Re-check snippet
                  </button>
                </>
              ) : website.phase === 'not-found' ? (
                <>
                  <div
                    className="flex items-start gap-3 rounded-[8px] px-3 py-2.5"
                    style={{ background: `${T.pro}0f`, border: `1px solid ${T.pro}33` }}
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: T.pro }} />
                    <p className="text-[12px] leading-relaxed" style={{ color: `${T.pro}b3` }}>
                      Snippet not detected on <strong className="text-[#ededed]/62">https://{website.url}</strong>.
                      Add it to your site&apos;s <code className="rounded-[4px] bg-white/[0.06] px-1 text-[11px]">&lt;head&gt;</code>, then retry.
                    </p>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ededed]/40">Universal snippet</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={copySnippet}
                          className="flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-[#ededed]/62 transition-colors hover:border-white/[0.18] hover:text-[#ededed]"
                        >
                          {snippetCopied ? <Check className="h-3.5 w-3.5" style={{ color: T.ok }} /> : <Copy className="h-3.5 w-3.5" />}
                          {snippetCopied ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                          onClick={copyPrompt}
                          className="flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-[#ededed]/62 transition-colors hover:border-white/[0.18] hover:text-[#ededed]"
                        >
                          {promptCopied ? <Check className="h-3.5 w-3.5" style={{ color: T.ok }} /> : <Copy className="h-3.5 w-3.5" />}
                          {promptCopied ? 'Copied!' : 'Copy prompt'}
                        </button>
                      </div>
                    </div>
                    <pre className="overflow-x-auto rounded-[6px] bg-black px-4 py-4 text-[10px] leading-relaxed text-[#ededed]/50 ring-1 ring-white/10">
{SNIPPET_CODE}
                    </pre>
                  </div>

                  <FrameworkExamples />

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => recheckDomain(website.url)}
                      className="flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-white/[0.12] px-3 py-1.5 text-[11px] font-medium text-[#ededed]/62 transition-colors hover:border-white/[0.20] hover:text-[#ededed]"
                    >
                      Re-check snippet
                    </button>
                    <button
                      onClick={() => setWebsite({ phase: 'input' })}
                      className="cursor-pointer text-[11px] text-[#ededed]/25 transition-colors hover:text-[#ededed]/40"
                    >
                      Change URL
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[12px] leading-relaxed text-[#ededed]/62">
                    Paste this snippet into the <code className="rounded-[5px] bg-white/[0.07] px-1.5 py-0.5 font-mono text-[11px] text-[#ededed]/62">&lt;head&gt;</code> of every page you want to test. It&apos;s framework-agnostic — no build step, no npm.
                  </p>

                  <div className="flex items-center gap-2 rounded-[10px] border border-white/10 bg-[#0a0a0a] px-4 py-3">
                    <Globe className="h-4 w-4 shrink-0 text-[#ededed]/40" />
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => {
                        setUrlInput(e.target.value)
                        if (website.phase === 'input' && 'error' in website) setWebsite({ phase: 'input' })
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && submitDomain()}
                      placeholder="yoursite.com"
                      disabled={website.phase === 'saving' || website.phase === 'checking'}
                      autoFocus
                      className="flex-1 bg-transparent text-[15px] text-[#ededed] placeholder:text-[#ededed]/25 outline-none"
                    />
                  </div>

                  {website.phase === 'input' && 'error' in website && website.error && (
                    <p className="text-[12px] text-[#f5455c]">{website.error}</p>
                  )}

                  <button
                    onClick={submitDomain}
                    disabled={website.phase !== 'input' || !urlInput.trim()}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-white py-2.5 text-[14px] font-semibold text-black transition-opacity hover:opacity-85 disabled:opacity-30"
                  >
                    {website.phase === 'saving' ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                    ) : website.phase === 'checking' ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Checking snippet…</>
                    ) : (
                      'Continue'
                    )}
                  </button>

                  <p className="text-center text-[11px] text-[#ededed]/30">
                    We check if the snippet is installed on your site. You can skip and add it later.
                  </p>
                </>
              )}
            </div>
          </StepCard>

          {/* Step 3: Figma Plugin Connect */}
          <StepCard
            step={steps.plugin}
            icon={Puzzle}
            expanded={expanded === 'plugin'}
            onToggle={() => setExpanded(expanded === 'plugin' ? null : 'plugin')}
            statusIcon={statusIcon(steps.plugin.status)}
            statusBg={statusBg(steps.plugin.status)}
            statusBorder={statusBorder(steps.plugin.status)}
            stepNumber={3}
          >
            <div className="space-y-4">
              {data.hasFigmaPlugin ? (
                <p className="text-[12px] leading-relaxed text-[#ededed]/62">
                  Plugin is linked. Variants created in Figma will appear in your dashboard automatically.
                </p>
              ) : (
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
              )}
            </div>
          </StepCard>
        </div>
      </div>
    </main>
  )
}

/* ── StepCard ── */
function StepCard({
  step,
  expanded,
  onToggle,
  icon: Icon,
  statusIcon,
  statusBg,
  statusBorder,
  children,
  stepNumber,
}: {
  step: StepState
  expanded: boolean
  onToggle: () => void
  icon: React.ComponentType<{ className?: string }>
  statusIcon: React.ReactNode
  statusBg: string
  statusBorder: string
  children: React.ReactNode
  stepNumber?: number
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
          <div className="flex items-center gap-2">
            {stepNumber && (
              <span className="text-[10px] font-semibold text-[#ededed]/20">{stepNumber}</span>
            )}
            <p className="truncate text-[13px] font-medium text-[#ededed]">{step.label}</p>
          </div>
          <p
            className="mt-0.5 truncate text-[11px]"
            style={{
              color:
                step.status === 'ok' ? `${T.text}40` : step.status === 'err' ? T.err : `${T.text}30`,
            }}
          >
            {step.summary}
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
        <link rel="preconnect" href="https://www.getvariante.com" crossorigin />
        <style id="__ab_hide">{\`html.__ab_pending{opacity:0!important}\`}</style>
        <script dangerouslySetInnerHTML={{
          __html: \`document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)\`
        }} />
        <script async src="https://www.getvariante.com/ab.js" integrity="sha384-UWQNoAlUdBZpCeh5Fdi6Wrqdp6Br23/hcRLvJS8N2mUFO03X2S0mdC3+LzwiBSZW" crossorigin="anonymous"></script>
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
        <link rel="preconnect" href="https://www.getvariante.com" crossorigin />
        <style id="__ab_hide">{\`html.__ab_pending{opacity:0!important}\`}</style>
        <script dangerouslySetInnerHTML={{
          __html: \`document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)\`
        }} />
        <script async src="https://www.getvariante.com/ab.js" integrity="sha384-UWQNoAlUdBZpCeh5Fdi6Wrqdp6Br23/hcRLvJS8N2mUFO03X2S0mdC3+LzwiBSZW" crossorigin="anonymous"></script>
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
  <link rel="preconnect" href="https://www.getvariante.com" crossorigin>
  <style id="__ab_hide">html.__ab_pending{opacity:0!important}</style>
  <script>document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)<\/script>
  <script async src="https://www.getvariante.com/ab.js" integrity="sha384-UWQNoAlUdBZpCeh5Fdi6Wrqdp6Br23/hcRLvJS8N2mUFO03X2S0mdC3+LzwiBSZW" crossorigin="anonymous"><\/script>
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
