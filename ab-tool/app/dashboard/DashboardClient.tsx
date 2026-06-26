'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'

type TestRow = {
  id: string
  name: string
  site_url: string | null
  status: string
  visitors_a: number
  visitors_b: number
  conversions_a: number
  conversions_b: number
}

export function DashboardClient({
  email,
  plan,
  apiToken,
  tests,
  upgraded,
}: {
  email: string
  plan: string
  apiToken: string
  tests: TestRow[]
  upgraded?: boolean
}) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [snippetCopied, setSnippetCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const isPro = plan === 'pro' || plan === 'agency'

  async function logout() {
    await getBrowserSupabase().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function copyToken() {
    navigator.clipboard.writeText(apiToken).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function billing(path: 'checkout' | 'portal') {
    setBusy(true)
    try {
      const res = await fetch(`/api/billing/${path}`, { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error || 'Fehler')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      {upgraded && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
          🎉 You&apos;re now on <strong>Pro</strong> — unlimited experiments, full statistics, no badge.
        </div>
      )}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">{email}</p>
        </div>
        <button onClick={logout} className="text-sm text-gray-500 hover:underline">
          Log out
        </button>
      </div>

      {/* Plan */}
      <div className="mb-6 flex items-center justify-between rounded-xl border border-gray-200 p-5">
        <div>
          <p className="text-sm font-semibold">
            Plan: <span className="uppercase">{plan}</span>
          </p>
          <p className="text-xs text-gray-500">
            {isPro
              ? 'Unlimited experiments, full statistics, no badge.'
              : '1 active experiment, "Powered by Variante" badge.'}
          </p>
        </div>
        {isPro ? (
          <button
            onClick={() => billing('portal')}
            disabled={busy}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Manage subscription
          </button>
        ) : (
          <button
            onClick={() => billing('checkout')}
            disabled={busy}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            Upgrade to Pro
          </button>
        )}
      </div>

      {/* API-Token */}
      <div className="mb-8 rounded-xl border border-gray-200 p-5">
        <p className="mb-1 text-sm font-semibold">Plugin Token</p>
        <p className="mb-3 text-xs text-gray-500">
          Paste this token once into the Figma plugin to link your tests.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-md bg-gray-100 px-3 py-2 text-xs">
            {apiToken}
          </code>
          <button
            onClick={copyToken}
            className="shrink-0 rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Snippet Installation */}
      <div className="mb-8 rounded-xl border border-gray-200 p-5">
        <p className="mb-1 text-sm font-semibold">Snippet Installation</p>
        <p className="mb-3 text-xs text-gray-500">
          One universal block — paste in <code className="bg-gray-100 px-1 rounded">{'<head>'}</code> on <strong>every</strong> page of your site. Do NOT add it multiple times.
        </p>

        {/* Code block */}
        <div className="relative mb-3">
          <pre className="overflow-x-auto rounded-md bg-gray-900 px-4 py-3 text-xs text-green-400">
{`<!-- A/B Testing: universal snippet — paste in <head> on EVERY page -->
<link rel="preconnect" href="https://ab-tool-pied.vercel.app">
<style id="__ab_hide">html.__ab_pending{opacity:0!important}</style>
<script>document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)<\/script>
<script async src="https://ab-tool-pied.vercel.app/ab.js"><\/script>`}
          </pre>
          <button
            onClick={() => {
              const code = `<!-- A/B Testing: universal snippet — paste in <head> on EVERY page -->\n<link rel="preconnect" href="https://ab-tool-pied.vercel.app">\n<style id="__ab_hide">html.__ab_pending{opacity:0!important}</style>\n<script>document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)<\/script>\n<script async src="https://ab-tool-pied.vercel.app/ab.js"><\/script>`
              navigator.clipboard.writeText(code).then(() => {
                setSnippetCopied(true)
                setTimeout(() => setSnippetCopied(false), 2000)
              })
            }}
            className="absolute right-2 top-2 rounded-md bg-gray-700 px-2 py-1 text-xs text-white hover:bg-gray-600"
          >
            {snippetCopied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        <details className="group mb-2">
          <summary className="cursor-pointer text-xs font-medium text-gray-700 hover:text-gray-900">
            Next.js (App Router) — paste in <code className="bg-gray-100 px-1 rounded">app/layout.tsx</code>
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-md bg-gray-900 px-4 py-3 text-xs text-green-400">
{`// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://ab-tool-pied.vercel.app" />
        <style id="__ab_hide">{\`html.__ab_pending{opacity:0!important}\`}</style>
        <script dangerouslySetInnerHTML={{
          __html: \`document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)\`
        }} />
        <script async src="https://ab-tool-pied.vercel.app/ab.js" />
      </head>
      <body>{children}</body>
    </html>
  )
}`}
          </pre>
        </details>

        <details className="group mb-2">
          <summary className="cursor-pointer text-xs font-medium text-gray-700 hover:text-gray-900">
            Next.js (Pages Router) — paste in <code className="bg-gray-100 px-1 rounded">pages/_document.tsx</code>
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-md bg-gray-900 px-4 py-3 text-xs text-green-400">
{`// pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        <link rel="preconnect" href="https://ab-tool-pied.vercel.app" />
        <style id="__ab_hide">{\`html.__ab_pending{opacity:0!important}\`}</style>
        <script dangerouslySetInnerHTML={{
          __html: \`document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)\`
        }} />
        <script async src="https://ab-tool-pied.vercel.app/ab.js" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}`}
          </pre>
        </details>

        <details className="group mb-2">
          <summary className="cursor-pointer text-xs font-medium text-gray-700 hover:text-gray-900">
            Plain HTML — paste in <code className="bg-gray-100 px-1 rounded">{'<head>'}</code>
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-md bg-gray-900 px-4 py-3 text-xs text-green-400">
{`<!DOCTYPE html>
<html>
<head>
  <!-- A/B Testing: universal snippet -->
  <link rel="preconnect" href="https://ab-tool-pied.vercel.app">
  <style id="__ab_hide">html.__ab_pending{opacity:0!important}</style>
  <script>document.documentElement.classList.add("__ab_pending");(function p(){if(window.__ab_pending_resolve)document.documentElement.classList.remove("__ab_pending");else setTimeout(p,50)})();setTimeout(function(){document.documentElement.classList.remove("__ab_pending")},10000)<\/script>
  <script async src="https://ab-tool-pied.vercel.app/ab.js"><\/script>
</head>
<body>
  <!-- your content -->
</body>
</html>`}
          </pre>
        </details>

        <details className="group">
          <summary className="cursor-pointer text-xs font-medium text-gray-700 hover:text-gray-900">
            Other frameworks (Vue, Svelte, Astro, etc.)
          </summary>
          <div className="mt-2 text-xs text-gray-500">
            <p className="mb-1">Inject these elements into the <code className="bg-gray-100 px-1 rounded">{'<head>'}</code> of your root layout or template. The snippet is framework-agnostic — it works anywhere.</p>
            <p>Make sure the <code className="bg-gray-100 px-1 rounded">{'<link rel="preconnect">'}</code>, anti-flicker <code className="bg-gray-100 px-1 rounded">{'<style>'}</code>, and inline <code className="bg-gray-100 px-1 rounded">{'<script>'}</code> come <strong>before</strong> the async <code className="bg-gray-100 px-1 rounded">ab.js</code> script tag.</p>
          </div>
        </details>

        <div className="mt-4 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
          <strong>🔒 Privacy:</strong> ab.js stores a random visitor ID in <code className="bg-amber-100 px-1 rounded">localStorage</code> (no cookies). No personal data is collected or transmitted. The snippet only sends: current URL, visitor ID, and click events on test elements.
        </div>
      </div>

      {/* Stats Summary */}
      {tests.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-4 text-sm">
          <div className="rounded-lg border border-gray-200 px-4 py-3">
            <span className="font-semibold">{tests.length}</span>{' '}
            <span className="text-gray-500">experiments</span>
          </div>
          <div className="rounded-lg border border-gray-200 px-4 py-3">
            <span className="font-semibold">
              {tests.reduce((s, t) => s + (t.visitors_a ?? 0) + (t.visitors_b ?? 0), 0).toLocaleString()}
            </span>{' '}
            <span className="text-gray-500">total visitors</span>
          </div>
          <div className="rounded-lg border border-gray-200 px-4 py-3">
            <span className="font-semibold">
              {tests.reduce((s, t) => s + (t.conversions_a ?? 0) + (t.conversions_b ?? 0), 0).toLocaleString()}
            </span>{' '}
            <span className="text-gray-500">total conversions</span>
          </div>
        </div>
      )}

      {/* Tests */}
      <h2 className="mb-3 text-sm font-semibold">Your Experiments</h2>
      {tests.length === 0 ? (
        <p className="text-sm text-gray-500">
          No tests yet. Create them in the Figma plugin (paste the token above).
        </p>
      ) : (
        <div className="space-y-2">
          {tests.map(t => {
            const va = t.visitors_a ?? 0
            const vb = t.visitors_b ?? 0
            const ca = t.conversions_a ?? 0
            const cb = t.conversions_b ?? 0
            const crA = va > 0 ? ca / va : 0
            const crB = vb > 0 ? cb / vb : 0
            const uplift = crA > 0 ? ((crB - crA) / crA) * 100 : null
            return (
              <a
                key={t.id}
                href={`/results/${t.id}`}
                className="block rounded-lg border border-gray-200 p-4 hover:border-gray-400"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t.name}</span>
                  <span className="flex items-center gap-2">
                    {uplift !== null && uplift !== 0 && (
                      <span
                        className={`text-xs font-semibold ${uplift > 0 ? 'text-green-600' : 'text-red-500'}`}
                      >
                        {uplift > 0 ? '+' : ''}
                        {uplift.toFixed(1)} %
                      </span>
                    )}
                    <span className="text-xs uppercase text-gray-400">{t.status}</span>
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {va + vb} visitors · {ca + cb} conversions{crA > 0 ? ` · A: ${(crA * 100).toFixed(1)}%` : ''}{crB > 0 ? ` · B: ${(crB * 100).toFixed(1)}%` : ''}{' '}
                  · {t.site_url || '—'}
                </p>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
