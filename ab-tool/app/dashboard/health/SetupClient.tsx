'use client'

import { useState, useCallback } from 'react'
import {
  Code,
  Globe,
  Check,
  AlertTriangle,
  X,
  Loader2,
  Copy,
  ChevronDown,
} from 'lucide-react'
import type { SetupData } from './page'
import { SNIPPET_CODE } from '@/lib/snippetCode'
import { FrameworkExamples } from '../components/FrameworkExamples'

type WebsiteState =
  | { phase: 'input'; error?: string }
  | { phase: 'saving' }
  | { phase: 'checking'; url: string; progress?: number }
  | { phase: 'not-found'; url: string; timeout?: boolean }
  | { phase: 'verified'; url: string; verifiedAt?: string | null }

export function SetupClient({ data }: { data: SetupData }) {
  // ── Website state ──
  const [urlInput, setUrlInput] = useState('')
  const [website, setWebsite] = useState<WebsiteState>(() => {
    if (data.siteUrl) return { phase: 'verified', url: data.siteUrl, verifiedAt: data.verifiedAt }
    if (data.hasAnyDomain) return { phase: 'input' }
    return { phase: 'input' }
  })
  const [snippetCopied, setSnippetCopied] = useState(false)
  const [promptMode, setPromptMode] = useState<'dev' | 'guide'>('dev')
  const [promptCopied, setPromptCopied] = useState(false)

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
        const d = await saveRes.json().catch(() => ({ error: 'Domain limit reached.' }))
        setWebsite({ phase: 'input', error: d.error || 'Domain limit reached.' })
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

    setWebsite({ phase: 'checking', url: normalized, progress: 0 })
    try {
      // Progress simulation for UX
      const progressTimer = setInterval(() => {
        setWebsite((prev) => {
          if (prev.phase !== 'checking') { clearInterval(progressTimer); return prev }
          const next = Math.min((prev.progress ?? 0) + 25, 90)
          return { ...prev, progress: next }
        })
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
        setWebsite({ phase: 'verified', url: normalized, verifiedAt: new Date().toISOString() })
      } else if (json.timeout) {
        setWebsite({ phase: 'not-found', url: normalized, timeout: true })
      } else {
        setWebsite({ phase: 'not-found', url: normalized })
      }
    } catch {
      setWebsite({ phase: 'not-found', url: normalized, timeout: true })
    }
  }, [urlInput, normalize])

  // ── Re-check existing verified domain ──
  const recheckDomain = useCallback(async (url: string) => {
    setWebsite({ phase: 'checking', url, progress: 0 })
    try {
      const progressTimer = setInterval(() => {
        setWebsite((prev) => {
          if (prev.phase !== 'checking') { clearInterval(progressTimer); return prev }
          const next = Math.min((prev.progress ?? 0) + 25, 90)
          return { ...prev, progress: next }
        })
      }, 800)

      const checkRes = await fetch('/api/snippet-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_url: url }),
      })
      clearInterval(progressTimer)
      const json = await checkRes.json()
      if (json.detected) {
        setWebsite({ phase: 'verified', url, verifiedAt: new Date().toISOString() })
      } else if (json.timeout) {
        setWebsite({ phase: 'not-found', url, timeout: true })
      } else {
        setWebsite({ phase: 'not-found', url })
      }
    } catch {
      setWebsite({ phase: 'not-found', url, timeout: true })
    }
  }, [])

  function copySnippet() {
    navigator.clipboard.writeText(SNIPPET_CODE).then(() => {
      setSnippetCopied(true)
      setTimeout(() => setSnippetCopied(false), 2000)
    })
  }

  function copyPrompt(mode: 'dev' | 'guide') {
    const url = website.phase === 'not-found' || website.phase === 'checking' ? website.url : urlInput || '(your site URL)'

    if (mode === 'guide') {
      const guide = [
        `How to add the variante A/B testing snippet to https://${url}`,
        '',
        '1. Open your website project in your code editor',
        '2. Find the file that contains the <head> tag:',
        '   - Next.js: app/layout.tsx or pages/_document.tsx',
        '   - Plain HTML: index.html or the main template file',
        '   - WordPress: header.php (via Appearance → Theme File Editor)',
        '   - Shopify: theme.liquid (via Online Store → Themes → Edit Code)',
        '   - Webflow: Site Settings → Custom Code → Head Code',
        '   - Squarespace: Settings → Advanced → Code Injection → Header',
        '3. Copy this snippet and paste it inside <head>:',
        '```html',
        SNIPPET_CODE,
        '```',
        '4. Save the file and publish/deploy your site',
        '5. Come back here and click "Re-check" to confirm it\'s live',
        '',
        'That\'s it! No build step, no npm install needed.',
      ].join('\n')
      navigator.clipboard.writeText(guide).then(() => {
        setPromptCopied(true)
        setTimeout(() => setPromptCopied(false), 2000)
      })
      return
    }

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
  const isChecking = website.phase === 'checking' || website.phase === 'saving'
  const isNotFound = website.phase === 'not-found'
  const isVerified = website.phase === 'verified'

  return (
    <div className="min-w-0 flex-1 px-5 py-6 sm:px-8">
      <div className="mx-auto max-w-xl space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5">
            <Code className="h-4 w-4 text-text-3" />
            <h1 className="text-[18px] font-semibold text-text">Snippet</h1>
          </div>
          <p className="mt-1.5 text-[12px] text-text-3">
            {isVerified
              ? 'Your snippet is live — data is flowing.'
              : 'Add the snippet to your site to start tracking.'}
          </p>
        </div>

        {/* Status pill */}
        <div
          className={`flex items-center gap-2.5 rounded-[8px] px-4 py-2.5 text-[12px] font-medium ${
            isVerified
              ? 'border border-ok/20 bg-ok/[0.06] text-ok'
              : isNotFound
                ? 'border border-err/20 bg-err/[0.06] text-err'
                : 'border border-pro/20 bg-pro/[0.06] text-pro'
          }`}
        >
          {isVerified ? <Check className="h-3.5 w-3.5" /> : isNotFound ? <X className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          {isVerified
            ? 'Snippet active'
            : isNotFound
              ? 'Snippet not found'
              : 'Not yet connected'}
        </div>

        {/* Main content */}
        <div className="rounded-[10px] border border-border bg-bg-1 p-5">
          {isVerified ? (
            /* ── Verified ── */
            <div className="space-y-4">
              <p className="text-[12px] leading-relaxed text-text-2">
                The snippet is live on <strong className="text-text">https://{website.url}</strong>. Data is flowing — visitors and conversions are being tracked.
              </p>
              {website.verifiedAt && (
                <p className="text-[11px] text-text-3">
                  Last verified: {new Date(website.verifiedAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              )}
              <button
                onClick={() => recheckDomain(website.url)}
                className="flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-border px-3 py-1.5 text-[11px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text"
              >
                Re-check snippet
              </button>
            </div>
          ) : isNotFound ? (
            /* ── Not Found ── */
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-[8px] border border-err/20 bg-err/[0.06] px-3 py-2.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-err" />
                <div>
                  <p className="text-[12px] leading-relaxed text-err/80">
                    {website.timeout
                      ? 'Site unreachable — check your URL and try again.'
                      : `Snippet not detected on <strong class="text-text">https://${website.url}</strong>. Add it to your site&apos;s <code class="rounded-[4px] bg-bg-2 px-1 text-[11px]">&lt;head&gt;</code>, then retry.`
                    }
                  </p>
                  {website.timeout && (
                    <p className="mt-1 text-[11px] text-err/60">
                      Make sure the site is publicly accessible and not behind a login or local network.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">Universal snippet</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={copySnippet}
                      className="flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-border bg-bg-2 px-2.5 py-1 text-[11px] font-semibold text-text-2 transition-colors hover:border-border-strong hover:text-text"
                    >
                      {snippetCopied ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
                      {snippetCopied ? 'Copied!' : 'Copy'}
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => copyPrompt(promptMode)}
                        className="flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-border bg-bg-2 px-2.5 py-1 text-[11px] font-semibold text-text-2 transition-colors hover:border-border-strong hover:text-text"
                      >
                        {promptCopied ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
                        {promptCopied ? 'Copied!' : promptMode === 'dev' ? 'Copy prompt' : 'Quick guide'}
                      </button>
                      <div className="absolute right-0 top-full z-10 mt-1 flex rounded-[6px] border border-border bg-bg-1 shadow-lg">
                        <button
                          onClick={() => { setPromptMode('dev'); copyPrompt('dev') }}
                          className={`whitespace-nowrap px-3 py-1.5 text-[11px] transition-colors cursor-pointer ${promptMode === 'dev' ? 'font-semibold text-text' : 'text-text-3 hover:text-text'}`}
                        >
                          For developers
                        </button>
                        <button
                          onClick={() => { setPromptMode('guide'); copyPrompt('guide') }}
                          className={`whitespace-nowrap px-3 py-1.5 text-[11px] transition-colors cursor-pointer ${promptMode === 'guide' ? 'font-semibold text-text' : 'text-text-3 hover:text-text'}`}
                        >
                          Quick guide
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <pre className="overflow-x-auto rounded-[6px] bg-black px-4 py-4 text-[10px] leading-relaxed text-text-3 ring-1 ring-border">
{SNIPPET_CODE}
                </pre>
              </div>

              <FrameworkExamples />

              <div className="flex items-center gap-2">
                <button
                  onClick={() => recheckDomain(website.url)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-border px-3 py-1.5 text-[11px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text"
                >
                  Re-check snippet
                </button>
                <button
                  onClick={() => setWebsite({ phase: 'input' })}
                  className="cursor-pointer text-[11px] text-text-3 transition-colors hover:text-text-2"
                >
                  Change URL
                </button>
              </div>

              <div>
                <a
                  href="/dashboard/account"
                  className="inline-flex items-center gap-1 text-[11px] text-text-3 transition-colors hover:text-text"
                >
                  Need help? See setup guide →
                </a>
              </div>
            </div>
          ) : (
            /* ── Input ── */
            <div className="space-y-4">
              <p className="text-[12px] leading-relaxed text-text-2">
                Paste this snippet into the <code className="rounded-[5px] bg-bg-2 px-1.5 py-0.5 font-mono text-[11px] text-text-2">&lt;head&gt;</code> of every page you want to test. It&apos;s framework-agnostic — no build step, no npm.
              </p>

              <div className="flex items-center gap-2 rounded-[10px] border border-border bg-bg-1 px-4 py-3">
                <Globe className="h-4 w-4 shrink-0 text-text-3" />
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value)
                    if (website.phase === 'input' && 'error' in website) setWebsite({ phase: 'input' })
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && submitDomain()}
                  placeholder="yoursite.com"
                  disabled={isChecking}
                  autoFocus
                  className="flex-1 bg-transparent text-[15px] text-text placeholder:text-text-3 outline-none"
                />
              </div>

              {website.phase === 'input' && 'error' in website && website.error && (
                <p className="text-[12px] text-err">{website.error}</p>
              )}

              <button
                onClick={submitDomain}
                disabled={website.phase !== 'input' || !urlInput.trim()}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-fill-invert py-2.5 text-[14px] font-semibold text-text-on-invert transition-opacity hover:opacity-85 disabled:opacity-30"
              >
                {isChecking ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Checking…</span>
                    {website.phase === 'checking' && website.progress !== undefined && (
                      <span className="text-[11px] text-text-on-invert/60">{website.progress}%</span>
                    )}
                  </span>
                ) : (
                  'Check snippet'
                )}
              </button>

              <p className="text-center text-[11px] text-text-3">
                We check if the snippet is installed on your site. You can skip and add it later.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

