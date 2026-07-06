'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PandaLogo } from '@/components/PandaLogo'
import { Copy, Check, ArrowRight, Zap, Puzzle, ChevronDown } from 'lucide-react'

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
  const [extOpen, setExtOpen] = useState(false)
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
    <div className="relative min-h-screen bg-[#06050f] font-[family-name:var(--font-sans)] text-white/80 antialiased">
      {/* Aurora */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-32 top-0 h-[32rem] w-[32rem] rounded-full bg-violet-700/15 blur-[130px]" />
        <div className="absolute -right-20 bottom-0 h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/10 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.28) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Nav */}
        <header className="border-b border-white/[0.07] px-6 py-4">
          <div className="mx-auto flex max-w-xl items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 font-[family-name:var(--font-display)] text-base font-bold text-white transition-opacity hover:opacity-75"
            >
              <PandaLogo className="h-7 w-7 rounded-lg p-1 shadow-md shadow-fuchsia-500/25" />
              variante
            </Link>
            <span className="text-xs text-white/35">{email}</span>
          </div>
        </header>

        <main className="mx-auto max-w-xl px-6 py-12 space-y-5">

          {/* Upgraded banner */}
          {upgraded && (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] px-5 py-4 text-sm text-emerald-300 text-center">
              You&apos;re now on <strong className="font-bold text-emerald-200">Pro</strong> — unlimited experiments, full statistics, no badge.
            </div>
          )}

          {/* Hero */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-8 text-center backdrop-blur-md">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 ring-1 ring-white/10">
              <Zap className="h-6 w-6 text-fuchsia-300" />
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-white">
              You&apos;re all set!
            </h1>
            <p className="mt-2 text-sm text-white/50">
              Welcome to Variante.{source === 'figma-plugin' ? ' You came from Figma — you\'re in the right place.' : ''}
            </p>
            <p className="mt-4 mx-auto max-w-sm text-sm leading-relaxed text-white/40">
              Pick any element on your live site, redesign it in Figma, and let AI generate Variant&nbsp;B.
              One snippet in{' '}
              <code className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[11px] text-fuchsia-200">&lt;head&gt;</code>{' '}
              tracks conversions — no dev pipeline needed.
            </p>
          </div>

          {/* Plugin Token */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-md">
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-fuchsia-500/15 text-xs text-fuchsia-300">🔑</span>
              <p className="text-sm font-semibold text-white">Your Plugin Token</p>
            </div>
            <p className="mt-1 text-xs text-white/45">
              This token links the Figma plugin to your account. Copy it, then paste it into the plugin&apos;s connect screen.
            </p>

            <div className="mt-4 flex items-center gap-2">
              <code className="flex-1 overflow-x-auto truncate rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5 font-mono text-xs text-emerald-300">
                {apiToken}
              </code>
              <button
                onClick={copyToken}
                className="flex cursor-pointer shrink-0 h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white/60 transition-all duration-200 hover:border-fuchsia-400/30 hover:bg-fuchsia-500/10 hover:text-fuchsia-300"
              >
                {tokenCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-xl border border-violet-400/20 bg-violet-400/[0.06] px-4 py-3">
              <span className="mt-0.5 text-sm">💡</span>
              <p className="text-xs leading-relaxed text-violet-200/70">
                <strong className="font-semibold text-violet-200/90">Next step:</strong>{' '}
                Go back to Figma. Open the Variante plugin — the connect screen is ready for your token. Paste it there.
              </p>
            </div>
          </div>

          {/* Upgrade — free users only */}
          {!isPro && !upgradeSkipped && (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-md">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm">🚀</span>
                <p className="text-sm font-semibold text-white">Before you start</p>
              </div>
              <p className="mt-1 text-xs text-white/45">
                Your free plan includes 1 active experiment with the &quot;Powered by Variante&quot; badge. Upgrade for unlimited tests, full stats, and no badge.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="font-semibold text-white/80">Free</p>
                  <ul className="mt-2.5 space-y-1.5 text-white/40">
                    <li>✦ 1 active experiment</li>
                    <li>✦ Badge shown on site</li>
                    <li>✦ Basic stats</li>
                    <li className="text-white/20">✕ White-label</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/[0.07] p-4">
                  <p className="font-semibold text-fuchsia-200">Pro — 35€/mo</p>
                  <ul className="mt-2.5 space-y-1.5 text-fuchsia-200/60">
                    <li>✦ Unlimited experiments</li>
                    <li>✦ No badge</li>
                    <li>✦ Full statistics</li>
                    <li className="text-fuchsia-200/25">✕ White-label</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={upgrade}
                  disabled={busy}
                  className="group flex-1 inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-fuchsia-500/25 transition-all duration-200 hover:scale-[1.02] disabled:opacity-50"
                >
                  {busy ? 'Redirecting…' : 'Upgrade to Pro'}
                  {!busy && <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />}
                </button>
                <button
                  onClick={() => setUpgradeSkipped(true)}
                  className="flex-1 cursor-pointer rounded-full border border-white/10 px-4 py-2.5 text-sm font-medium text-white/50 transition-all duration-200 hover:border-white/20 hover:text-white"
                >
                  Skip, start Free
                </button>
              </div>
            </div>
          )}

          {/* Browser Extension */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-md overflow-hidden">
            <button
              onClick={() => setExtOpen(o => !o)}
              className="flex w-full cursor-pointer items-center justify-between px-6 py-5 text-left transition-colors duration-200 hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-3">
                <Puzzle className="h-4 w-4 text-white/40" />
                <div>
                  <p className="text-sm font-semibold text-white">Browser Extension</p>
                  <p className="mt-0.5 text-xs text-white/40">Install once — the element picker runs locally</p>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 shrink-0 text-white/40 transition-transform duration-200 ${extOpen ? 'rotate-180' : ''}`} />
            </button>

            {extOpen && (
              <div className="border-t border-white/[0.07] px-6 pb-6 pt-5 space-y-4">
                <a
                  href="https://chromewebstore.google.com/detail/variante"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-fuchsia-500/25 transition-all duration-200 hover:scale-[1.02]"
                >
                  🧩 Install from Chrome Web Store
                </a>
                <p className="text-xs text-white/35">— or install manually —</p>
                <a
                  href="/chrome-extension.zip"
                  download
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-white/80 transition-all duration-200 hover:border-white/30 hover:text-white"
                >
                  ⬇ Download ZIP
                </a>
                <ol className="space-y-2 text-xs text-white/45 ml-1">
                  <li className="flex gap-2"><span className="shrink-0 text-white/25">1.</span>Unzip the downloaded file</li>
                  <li className="flex gap-2"><span className="shrink-0 text-white/25">2.</span>Open Chrome → <code className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[10px] text-fuchsia-200">chrome://extensions</code></li>
                  <li className="flex gap-2"><span className="shrink-0 text-white/25">3.</span>Enable <strong className="text-white/60">Developer mode</strong> (top right)</li>
                  <li className="flex gap-2"><span className="shrink-0 text-white/25">4.</span>Click <strong className="text-white/60">Load unpacked</strong> → select the unzipped folder</li>
                  <li className="flex gap-2"><span className="shrink-0 text-white/25">5.</span>Done — you only need to do this once</li>
                </ol>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="pb-4 text-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="group inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-8 py-3 text-sm font-bold text-white shadow-md shadow-fuchsia-500/25 transition-all duration-200 hover:scale-[1.02]"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <p className="mt-3 text-xs text-white/30">
              Or open the Figma plugin and paste your token to create your first test.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
