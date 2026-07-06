'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PandaLogo } from '@/components/PandaLogo'
import { Copy, Check, ArrowRight, Zap, Puzzle } from 'lucide-react'

export function OnboardingClient({
  email,
  apiToken,
  plan,
  source,
  upgraded,
}: {
  email: string
  apiToken: string
  plan: string
  source: string
  upgraded?: boolean
}) {
  const router = useRouter()
  const [tokenCopied, setTokenCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [upgradeSkipped, setUpgradeSkipped] = useState(false)
  const isPro = plan === 'pro' || plan === 'agency'

  function copyToken() {
    navigator.clipboard.writeText(apiToken).then(() => {
      setTokenCopied(true)
      setTimeout(() => setTokenCopied(false), 2000)
    })
  }

  async function upgrade() {
    setBusy(true)
    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-0 text-text antialiased">
      <div>
        {/* Nav */}
        <header className="border-b border-border px-6 py-4">
          <div className="mx-auto flex max-w-xl items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-base font-semibold text-white transition-opacity hover:opacity-75"
            >
              <PandaLogo className="h-7 w-7 rounded-lg p-1" />
              variante
            </Link>
            <span className="text-xs text-text-3">{email}</span>
          </div>
        </header>

        <main className="mx-auto max-w-xl px-6 py-12 space-y-5">

          {/* 1. Browser Extension — step 1 */}
          <div className="rounded-[10px] border border-border bg-bg-1 overflow-hidden">
            <div className="px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-bg-2 text-xs font-semibold text-text-3">1</span>
                <div>
                  <p className="text-sm font-semibold text-white">Install the Browser Extension</p>
                  <p className="mt-0.5 text-xs text-text-3">The element picker runs locally — install once, works everywhere.</p>
                </div>
              </div>
            </div>

            <div className="border-t border-border px-6 pb-6 pt-5 space-y-4">
              <a
                href="https://chromewebstore.google.com/detail/variante-—-ab-test-elemen/hopbdjfpmknemchgoonjommfemgihkbh"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-[6px] bg-white px-5 py-2.5 text-sm font-semibold text-black transition-colors duration-200 hover:bg-white/90"
              >
                <Puzzle className="h-4 w-4" /> Install from Chrome Web Store
              </a>
              <p className="text-xs text-text-3">— or install manually —</p>
              <a
                href="/chrome-extension.zip"
                download
                className="inline-flex items-center gap-2 rounded-[6px] border border-border px-5 py-2 text-sm font-semibold text-text transition-colors duration-200 hover:border-border-strong hover:text-white"
              >
                ⬇ Download ZIP
              </a>
              <ol className="space-y-2 text-xs text-text-3 ml-1">
                <li className="flex gap-2"><span className="shrink-0 text-text-3">1.</span>Unzip the downloaded file</li>
                <li className="flex gap-2"><span className="shrink-0 text-text-3">2.</span>Open Chrome → <code className="rounded-[4px] bg-bg-2 px-1.5 py-0.5 font-mono text-[10px] text-text">chrome://extensions</code></li>
                <li className="flex gap-2"><span className="shrink-0 text-text-3">3.</span>Enable <strong className="text-text-2">Developer mode</strong> (top right)</li>
                <li className="flex gap-2"><span className="shrink-0 text-text-3">4.</span>Click <strong className="text-text-2">Load unpacked</strong> → select the unzipped folder</li>
                <li className="flex gap-2"><span className="shrink-0 text-text-3">5.</span>Done — you only need to do this once</li>
              </ol>
            </div>
          </div>

          {/* 2. Plugin Token — step 2 */}
          <div className="rounded-[10px] border border-border bg-bg-1 p-6">
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-bg-2 text-xs font-semibold text-text-3">2</span>
              <p className="text-sm font-semibold text-white">Connect the Figma Plugin</p>
            </div>
            <p className="mt-1 text-xs text-text-3">
              Copy your token and paste it into the Variante Figma plugin to link it to your account.
            </p>

            <div className="mt-4 flex items-center gap-2">
              <code className="flex-1 overflow-x-auto truncate rounded-[6px] border border-border bg-bg-2 px-3 py-2.5 font-mono text-xs text-ok">
                {apiToken}
              </code>
              <button
                onClick={copyToken}
                className="flex shrink-0 h-9 w-9 items-center justify-center rounded-[6px] border border-border bg-bg-1 text-text-3 transition-colors duration-200 hover:border-border-strong hover:text-text"
              >
                {tokenCopied ? <Check className="h-4 w-4 text-ok" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-[6px] border border-pro/20 bg-pro-bg px-4 py-3">
              <span className="mt-0.5 text-sm">💡</span>
              <p className="text-xs leading-relaxed text-pro">
                <strong className="font-semibold">Next:</strong>{' '}
                Open the{' '}
                <a
                  href="https://www.figma.com/community/plugin/123456/variante"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline transition-colors hover:opacity-80"
                >
                  Variante Figma Plugin
                </a>
                {' '}— the connect screen is ready for your token.
              </p>
            </div>
          </div>

          {/* Upgraded banner */}
          {upgraded && (
            <div className="rounded-[6px] border border-ok/20 bg-ok-bg px-5 py-4 text-sm text-ok text-center">
              You&apos;re now on <strong className="font-semibold text-ok">Pro</strong> — unlimited experiments, full statistics, no badge.
            </div>
          )}

          {/* Hero */}
          <div className="rounded-[10px] border border-border bg-bg-1 p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[10px] bg-bg-2 ring-1 ring-border">
              <Zap className="h-6 w-6 text-text-3" />
            </div>
            <h1 className="text-3xl font-semibold text-white">
              You&apos;re all set!
            </h1>
            <p className="mt-2 text-sm text-text-3">
              Welcome to Variante.{source === 'figma-plugin' ? ' You came from Figma — you\'re in the right place.' : ''}
            </p>
            <p className="mt-4 mx-auto max-w-sm text-sm leading-relaxed text-text-3">
              Pick any element on your live site, redesign it in Figma, and let AI generate Variant&nbsp;B.
              One snippet in{' '}
              <code className="rounded-[4px] bg-bg-2 px-1.5 py-0.5 font-mono text-[11px] text-text">&lt;head&gt;</code>{' '}
              tracks conversions — no dev pipeline needed.
            </p>
          </div>

          {/* Upgrade — free users only */}
          {!isPro && !upgradeSkipped && (
            <div className="rounded-[10px] border border-border bg-bg-1 p-6">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm">🚀</span>
                <p className="text-sm font-semibold text-white">Before you start</p>
              </div>
              <p className="mt-1 text-xs text-text-3">
                Your free plan includes 1 active experiment with the &quot;Powered by Variante&quot; badge. Upgrade for unlimited tests, full stats, and no badge.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-[6px] border border-border bg-bg-2 p-4">
                  <p className="font-semibold text-white">Free</p>
                  <ul className="mt-2.5 space-y-1.5 text-text-3">
                    <li>✦ 1 active experiment</li>
                    <li>✦ Badge shown on site</li>
                    <li>✦ Basic stats</li>
                    <li className="text-text-3/50">✕ White-label</li>
                  </ul>
                </div>
                <div className="rounded-[6px] border border-pro/30 bg-pro-bg p-4">
                  <p className="font-semibold text-pro">Pro — 35€/mo</p>
                  <ul className="mt-2.5 space-y-1.5 text-pro/70">
                    <li>✦ Unlimited experiments</li>
                    <li>✦ No badge</li>
                    <li>✦ Full statistics</li>
                    <li className="text-pro/30">✕ White-label</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={upgrade}
                  disabled={busy}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[6px] bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors duration-200 hover:bg-white/90 disabled:opacity-50"
                >
                  {busy ? 'Redirecting…' : 'Upgrade to Pro'}
                  {!busy && <ArrowRight className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => setUpgradeSkipped(true)}
                  className="flex-1 rounded-[6px] border border-border px-4 py-2.5 text-sm font-medium text-text-3 transition-colors duration-200 hover:border-border-strong hover:text-text"
                >
                  Skip, start Free
                </button>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="pb-4 text-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-2 rounded-[6px] bg-white px-8 py-3 text-sm font-semibold text-black transition-colors duration-200 hover:bg-white/90"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </button>
            <p className="mt-3 text-xs text-text-3">
              Or open the Figma plugin and paste your token to create your first test.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
