'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
    <div className="mx-auto max-w-xl px-6 py-16">
      {upgraded && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800 text-center">
          🎉 You&apos;re now on <strong>Pro</strong> — welcome to unlimited experiments, full statistics, and no badge.
        </div>
      )}

      {/* ── Section 1: Welcome ── */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight">You&apos;re all set!</h1>
        <p className="mt-2 text-gray-500">
          Welcome to Variante. {source === 'figma-plugin' ? 'You came from Figma — you&apos;re in the right place.' : ''}
        </p>
        <p className="mt-4 text-sm text-gray-500 leading-relaxed max-w-lg mx-auto">
          Pick any element on your live website, describe the change in Figma, and AI generates Variant&nbsp;B.
          One snippet in <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{'<head>'}</code> tracks conversions.
          No dev pipeline needed.
        </p>
      </div>

      {/* ── Section 2: Token ── */}
      <div className="mb-8 rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold mb-1">🔑 Your Plugin Token</h2>
        <p className="text-xs text-gray-500 mb-4">
          This token links the Figma plugin to your account. Copy it, then paste it into the plugin&apos;s connect screen.
        </p>

        <div className="flex items-center gap-2 mb-3">
          <code className="flex-1 overflow-x-auto rounded-md bg-gray-100 px-3 py-2.5 text-xs font-mono break-all">
            {apiToken}
          </code>
          <button
            onClick={copyToken}
            className="shrink-0 rounded-md bg-gray-900 px-3 py-2.5 text-xs font-medium text-white hover:bg-gray-700"
          >
            {tokenCopied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-800 flex items-start gap-2">
          <span className="mt-0.5">💡</span>
          <div>
            <strong>Next step:</strong> Go back to Figma. Open the Variante plugin — the connect screen is ready for your token. Paste it there.
          </div>
        </div>
      </div>

      {/* ── Section 3: Upgrade ── */}
      {plan === 'free' && !upgradeSkipped && (
        <div className="mb-8 rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold mb-1">🚀 Before you start</h2>
          <p className="text-xs text-gray-500 mb-4">
            Your free plan includes 1 active experiment with the &quot;Powered by Variante&quot; badge. Upgrade for unlimited tests, full stats, and no badge.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="font-semibold text-gray-900">Free</div>
              <ul className="mt-2 space-y-1 text-gray-500">
                <li>✦ 1 active experiment</li>
                <li>✦ Badge shown on site</li>
                <li>✦ Basic stats</li>
                <li className="text-gray-300">✕ White-label</li>
              </ul>
            </div>
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
              <div className="font-semibold text-violet-900">Pro — 35&euro;/mo</div>
              <ul className="mt-2 space-y-1 text-violet-700">
                <li>✦ Unlimited experiments</li>
                <li>✦ No badge</li>
                <li>✦ Full statistics</li>
                <li className="text-violet-300">✕ White-label</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={upgrade}
              disabled={busy}
              className="flex-1 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {busy ? 'Redirecting…' : 'Upgrade to Pro'}
            </button>
            <button
              onClick={() => setUpgradeSkipped(true)}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Skip, start Free
            </button>
          </div>
        </div>
      )}

      {/* ── Section 4: Browser Extension + Next Steps ── */}
      <div className="mb-8 rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold mb-1">🧩 One-time: Browser Extension</h2>
        <p className="text-xs text-gray-500 mb-4">
          The element picker runs via a small Browser Extension. Install it once — no updates needed.
        </p>

        <a
          href="/chrome-extension.zip"
          download
          className="inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 mb-4"
        >
          ⬇ Download Browser Extension
        </a>

        <ol className="text-xs text-gray-500 space-y-2 ml-4 list-decimal">
          <li>Unzip the downloaded file</li>
          <li>Open Chrome → <code className="bg-gray-100 px-1 rounded">chrome://extensions</code></li>
          <li>Enable <strong>Developer mode</strong> (top right)</li>
          <li>Click <strong>Load unpacked</strong> → select the unzipped folder</li>
          <li>The extension is now installed — you only need to do this once</li>
        </ol>
      </div>

      {/* ── CTA ── */}
      <div className="text-center">
        <button
          onClick={() => router.push('/dashboard')}
          className="rounded-md bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
        >
          Go to Dashboard →
        </button>
        <p className="mt-3 text-xs text-gray-400">
          Or open the Figma plugin and paste your token to create your first test.
        </p>
      </div>
    </div>
  )
}
