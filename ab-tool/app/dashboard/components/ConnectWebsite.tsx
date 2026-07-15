'use client'

import { useState, useCallback } from 'react'
import { Globe, Loader2, Check, X, Copy, ArrowRight } from 'lucide-react'
import { SNIPPET_CODE } from '@/lib/snippetCode'
import {
  ConnectPlug,
  ConnectChecking,
  ConnectNotFound,
  ConnectVerified,
} from './OnboardingIllustrations'

const T = {
  ok: '#2fd76c',
  pro: '#f5a623',
  err: '#f5455c',
  text: '#ededed',
}

type GateState = 'input' | 'saving' | 'checking' | 'not-found' | 'verified'

type Domain = {
  id: string
  url: string
  verified: boolean
  verified_at: string | null
  created_at: string
}

type Props = {
  onVerified: (domain: string) => void
}

export function ConnectWebsite({ onVerified }: Props) {
  const [url, setUrl] = useState('')
  const [state, setState] = useState<GateState>('input')
  const [error, setError] = useState('')
  const [checkedUrl, setCheckedUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [promptCopied, setPromptCopied] = useState(false)

  const normalize = (raw: string) =>
    raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '')

  // ── Snippet-Check + Verify ──
  const checkAndVerify = useCallback(async (domainUrl: string, domainId?: string) => {
    setCheckedUrl(domainUrl)
    setState('checking')

    try {
      const checkRes = await fetch('/api/snippet-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_url: domainUrl }),
      })
      const json = await checkRes.json()

      if (json.detected) {
        let id = domainId
        if (!id) {
          const domainsRes = await fetch('/api/domains')
          const { domains } = await domainsRes.json()
          const domain = (domains || []).find((d: Domain) => d.url === domainUrl)
          id = domain?.id
        }
        if (id) {
          const verifyRes = await fetch('/api/domains/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domainId: id }),
          })
          if (verifyRes.ok) {
            setState('verified')
            return
          }
        }
        setState('not-found')
      } else {
        setState('not-found')
      }
    } catch {
      setState('not-found')
    }
  }, [])

  // ── Domain speichern + Snippet-Check ──
  const submit = useCallback(async () => {
    const normalized = normalize(url)
    if (!normalized || !normalized.includes('.')) {
      setError('Please enter a valid domain (e.g. yoursite.com)')
      return
    }

    setError('')
    setCheckedUrl(normalized)

    setState('saving')
    try {
      const saveRes = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized }),
      })

      if (saveRes.status === 402) {
        const data = await saveRes.json().catch(() => ({}))
        setError(data.error || 'Domain limit reached. Upgrade your plan to add more websites.')
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

    await checkAndVerify(normalized)
  }, [url, checkAndVerify])

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

  // ── Nach Verify: Parent benachrichtigen ──
  function handleVerified() {
    onVerified(checkedUrl)
  }

  return (
    <div className="rounded-[10px] border border-white/10 bg-[#0a0a0a] p-5">
      {/* Illustration */}
      <div className="mb-4 flex justify-center">
        {state === 'input' && <ConnectPlug className="h-[100px] w-auto" />}
        {(state === 'saving' || state === 'checking') && <ConnectChecking className="h-[100px] w-auto" />}
        {state === 'not-found' && <ConnectNotFound className="h-[100px] w-auto" />}
        {state === 'verified' && <ConnectVerified className="h-[100px] w-auto" />}
      </div>

      {/* ── State: input ── */}
      {(state === 'input' || state === 'saving' || state === 'checking') && (
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-[14px] font-semibold text-[#ededed]">Connect your website</p>
            <p className="mt-1 text-[12px] text-[#ededed]/50">
              Add the snippet once, create tests from Figma.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-[8px] border border-white/10 bg-[#111111] px-3.5 py-2.5">
            <Globe className="h-4 w-4 shrink-0 text-[#ededed]/40" />
            <input
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="yoursite.com"
              disabled={state !== 'input'}
              autoFocus
              className="flex-1 bg-transparent text-[14px] text-[#ededed] placeholder:text-[#ededed]/35 outline-none"
            />
          </div>

          {error && (
            <p className="text-[12px] text-[#f5455c]">{error}</p>
          )}

          <button
            onClick={submit}
            disabled={state !== 'input' || !url.trim()}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-white py-2 text-[13px] font-semibold text-black transition-opacity hover:opacity-85 disabled:opacity-30"
          >
            {state === 'saving' || state === 'checking' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {state === 'saving' ? 'Saving…' : 'Checking snippet…'}
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>

          {/* Mikro-Schritte */}
          <div className="flex items-center justify-center gap-1 text-[11px] text-[#ededed]/30">
            <span>① Add snippet to &lt;head&gt;</span>
            <span className="mx-1 text-[#ededed]/15">—</span>
            <span>② We verify in seconds</span>
            <span className="mx-1 text-[#ededed]/15">—</span>
            <span>③ Create your first test</span>
          </div>
        </div>
      )}

      {/* ── State: not-found ── */}
      {state === 'not-found' && (
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-[14px] font-semibold text-[#ededed]">Almost — snippet not found</p>
            <p className="mt-1 text-[12px] text-[#ededed]/50">
              The snippet wasn&apos;t detected on <strong className="text-[#ededed]/70">https://{checkedUrl}</strong>.
              Add it to your site&apos;s <code className="rounded-[3px] bg-white/[0.06] px-1 text-[11px]">&lt;head&gt;</code>, then retry.
            </p>
          </div>

          {/* Copy prompt button */}
          <button
            onClick={copyPrompt}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-white py-2 text-[13px] font-semibold text-black transition-opacity hover:opacity-85"
          >
            {promptCopied ? (
              <>
                <Check className="h-3.5 w-3.5" style={{ color: T.ok }} />
                Prompt copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy prompt
              </>
            )}
          </button>
          <p className="text-center text-[11px] text-[#ededed]/40">
            Paste into Cursor, Copilot, ChatGPT or Claude — the AI installs the snippet for you.
          </p>

          <div className="border-t border-white/[0.06] pt-3">
            <button
              onClick={copySnippet}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-white/10 py-2 text-[12px] font-medium text-[#ededed]/55 transition-colors hover:border-white/[0.18] hover:text-[#ededed]"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" style={{ color: T.ok }} /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy snippet manually
                </>
              )}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => submit()}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[6px] border border-white/[0.06] bg-[#111111] py-2 text-[12px] text-[#ededed]/40 transition-colors hover:text-[#ededed]"
            >
              <Loader2 className="h-3 w-3" />
              Retry check
            </button>
            <button
              onClick={retry}
              className="flex-1 cursor-pointer rounded-[6px] border border-white/[0.06] bg-[#111111] py-2 text-[12px] text-[#ededed]/40 transition-colors hover:text-[#ededed]"
            >
              Change URL
            </button>
          </div>
        </div>
      )}

      {/* ── State: verified ── */}
      {state === 'verified' && (
        <div className="space-y-4 text-center">
          <div>
            <p className="text-[14px] font-semibold text-[#2fd76c]">Website connected</p>
            <p className="mt-1 text-[12px] text-[#ededed]/50">
              <strong className="text-[#ededed]/70">https://{checkedUrl}</strong> is verified.
              Tests will run on this domain.
            </p>
          </div>
          <button
            onClick={handleVerified}
            className="inline-flex cursor-pointer items-center gap-2 rounded-[6px] bg-white px-5 py-2 text-[13px] font-semibold text-black transition-opacity hover:opacity-85"
          >
            See what to test first
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
