'use client'

import { useState, useCallback } from 'react'
import { Globe, Loader2, Check, X, ExternalLink, Copy, ArrowRight } from 'lucide-react'

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

type GateState = 'input' | 'saving' | 'checking' | 'not-found' | 'verified'

type Props = {
  plan: string
}

export function DomainGate({ plan }: Props) {
  const [url, setUrl] = useState('')
  const [state, setState] = useState<GateState>('input')
  const [error, setError] = useState('')
  const [checkedUrl, setCheckedUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [promptCopied, setPromptCopied] = useState(false)

  const isAgency = plan === 'agency'

  // ── URL normalisieren ──
  const normalize = (raw: string) =>
    raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '')

  // ── Domain speichern + Snippet-Check ──
  const submit = useCallback(async () => {
    const normalized = normalize(url)
    if (!normalized || !normalized.includes('.')) {
      setError('Please enter a valid domain (e.g. yoursite.com)')
      return
    }

    setError('')
    setCheckedUrl(normalized)

    // Step 1: Domain speichern
    setState('saving')
    try {
      const saveRes = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized }),
      })

      // 409 = domain already exists (ok, proceed to check)
      // 402 = plan limit (agency needed for multiple domains)
      if (saveRes.status === 402) {
        setError('Multiple websites require the Agency plan. Upgrade to add more domains.')
        setState('input')
        return
      }
      if (!saveRes.ok && saveRes.status !== 409) {
        const data = await saveRes.json().catch(() => ({}))
        setError(data.error || 'Failed to save domain')
        setState('input')
        return
      }
    } catch {
      setError('Connection failed. Check your internet and try again.')
      setState('input')
      return
    }

    // Step 2: Snippet-Check
    setState('checking')
    try {
      const checkRes = await fetch('/api/snippet-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_url: normalized }),
      })
      const json = await checkRes.json()

      if (json.detected) {
        // Mark domain as verified
        // Load the domain ID we just created/existing
        const domainsRes = await fetch('/api/domains')
        const { domains } = await domainsRes.json()
        const domain = (domains || []).find((d: { url: string }) => d.url === normalized)
        if (domain) {
          await fetch('/api/domains/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domainId: domain.id }),
          })
        }
        setState('verified')
      } else {
        setState('not-found')
      }
    } catch {
      setState('not-found')
    }
  }, [url])

  function retry() {
    setState('input')
    setError('')
  }

  function copySnippet() {
    navigator.clipboard.writeText(SNIPPET_CODE).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function copyPrompt() {
    const prompt = [
      `Add the variante A/B testing snippet below to https://${checkedUrl}.`,
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
      'When the snippet is inserted, respond ONLY with this short confirmation:',
      `✅ variante snippet added to https://${checkedUrl}. Open the site and refresh.`,
    ].join('\n')
    navigator.clipboard.writeText(prompt).then(() => {
      setPromptCopied(true)
      setTimeout(() => setPromptCopied(false), 2000)
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-[10px] bg-white">
            <span className="text-[16px] font-bold text-black">V</span>
          </div>
          <h1 className="text-[20px] font-semibold text-[#ededed]">
            {state === 'verified' ? 'You\'re all set' : 'Add your website'}
          </h1>
          <p className="mt-1 text-[13px] text-[#ededed]/40">
            {state === 'verified'
              ? 'Your snippet is installed and verified. Redirecting…'
              : isAgency
                ? 'Enter any of your client websites to get started.'
                : 'Enter your website — tests run only on verified domains.'}
          </p>
        </div>

        {/* ── State: input ── */}
        {(state === 'input' || state === 'saving' || state === 'checking') && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-[10px] border border-white/10 bg-[#0a0a0a] px-4 py-3">
              <Globe className="h-4 w-4 shrink-0 text-[#ededed]/40" />
              <input
                type="text"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="yoursite.com"
                disabled={state !== 'input'}
                autoFocus
                className="flex-1 bg-transparent text-[15px] text-[#ededed] placeholder:text-[#ededed]/25 outline-none"
              />
            </div>

            {error && (
              <p className="text-[12px] text-[#f5455c]">{error}</p>
            )}

            <button
              onClick={submit}
              disabled={state !== 'input' || !url.trim()}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-white py-2.5 text-[14px] font-semibold text-black transition-opacity hover:opacity-85 disabled:opacity-30"
            >
              {state === 'saving' || state === 'checking' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {state === 'saving' ? 'Saving…' : 'Checking snippet…'}
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* ── State: not-found ── */}
        {state === 'not-found' && (
          <div className="space-y-4">
            {/* Warning */}
            <div
              className="flex items-start gap-3 rounded-[10px] px-4 py-3"
              style={{ background: `${T.pro}0f`, border: `1px solid ${T.pro}33` }}
            >
              <X className="mt-0.5 h-4 w-4 shrink-0" style={{ color: T.pro }} />
              <div>
                <p className="text-[13px] font-semibold text-[#ededed]">Snippet not found</p>
                <p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: `${T.pro}b3` }}>
                  The variante snippet was not detected on <strong className="text-[#ededed]/62">https://{checkedUrl}</strong>.
                  Add it to your site&apos;s <code className="rounded-[4px] bg-white/[0.06] px-1 text-[11px]">&lt;head&gt;</code>, then retry.
                </p>
              </div>
            </div>

            {/* Copy prompt button */}
            <button
              onClick={copyPrompt}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-white px-4 py-2.5 text-[13px] font-semibold text-black transition-opacity hover:opacity-85"
            >
              {promptCopied ? (
                <>
                  <Check className="h-4 w-4" style={{ color: T.ok }} />
                  Prompt copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy prompt
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-[#ededed]/30">
              Paste into Cursor, Copilot, ChatGPT or Claude — the AI installs the snippet for you.
            </p>

            <div className="border-t border-white/[0.06] pt-3">
              <button
                onClick={copySnippet}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-white/10 px-4 py-2.5 text-[13px] font-medium text-[#ededed]/62 transition-colors hover:border-white/[0.18] hover:text-[#ededed]"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" style={{ color: T.ok }} /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Copy snippet manually
                  </>
                )}
              </button>
            </div>

            {/* Retry */}
            <button
              onClick={() => submit()}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-white/[0.06] bg-[#0a0a0a] px-4 py-2 text-[13px] text-[#ededed]/40 transition-colors hover:text-[#ededed]"
            >
              <Loader2 className="h-3.5 w-3.5" />
              Retry check
            </button>

            <button
              onClick={retry}
              className="mx-auto block cursor-pointer text-[12px] text-[#ededed]/25 transition-colors hover:text-[#ededed]/40"
            >
              Change URL
            </button>
          </div>
        )}

        {/* ── State: verified ── */}
        {state === 'verified' && (
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#2fd76c]/10">
              <Check className="h-7 w-7" style={{ color: T.ok }} />
            </div>
            <p className="text-[15px] font-semibold text-[#ededed]">
              Snippet verified on https://{checkedUrl}
            </p>
            <p className="text-[12px] text-[#ededed]/40">
              Tests will only run on this domain. You can change it anytime in Account Settings.
            </p>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="inline-flex cursor-pointer items-center gap-2 rounded-[8px] bg-white px-6 py-2.5 text-[14px] font-semibold text-black transition-opacity hover:opacity-85"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
