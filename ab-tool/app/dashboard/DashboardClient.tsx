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
}: {
  email: string
  plan: string
  apiToken: string
  tests: TestRow[]
}) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">{email}</p>
        </div>
        <button onClick={logout} className="text-sm text-gray-500 hover:underline">
          Abmelden
        </button>
      </div>

      {/* Plan */}
      <div className="mb-6 flex items-center justify-between rounded-xl border border-gray-200 p-5">
        <div>
          <p className="text-sm font-semibold">
            Tarif: <span className="uppercase">{plan}</span>
          </p>
          <p className="text-xs text-gray-500">
            {isPro
              ? 'Unbegrenzte Experimente, volle Statistik, kein Badge.'
              : '1 aktives Experiment, „Powered by Variante"-Badge.'}
          </p>
        </div>
        {isPro ? (
          <button
            onClick={() => billing('portal')}
            disabled={busy}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Abo verwalten
          </button>
        ) : (
          <button
            onClick={() => billing('checkout')}
            disabled={busy}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            Auf Pro upgraden
          </button>
        )}
      </div>

      {/* API-Token */}
      <div className="mb-8 rounded-xl border border-gray-200 p-5">
        <p className="mb-1 text-sm font-semibold">Plugin-Token</p>
        <p className="mb-3 text-xs text-gray-500">
          Diesen Token einmalig ins Figma-Plugin einfügen, um deine Tests zu verknüpfen.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-md bg-gray-100 px-3 py-2 text-xs">
            {apiToken}
          </code>
          <button
            onClick={copyToken}
            className="shrink-0 rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700"
          >
            {copied ? '✓ Kopiert' : 'Kopieren'}
          </button>
        </div>
      </div>

      {/* Tests */}
      <h2 className="mb-3 text-sm font-semibold">Deine Experimente</h2>
      {tests.length === 0 ? (
        <p className="text-sm text-gray-500">
          Noch keine Tests. Lege sie im Figma-Plugin an (Token oben einfügen).
        </p>
      ) : (
        <div className="space-y-2">
          {tests.map(t => (
            <a
              key={t.id}
              href={`/results/${t.id}`}
              className="block rounded-lg border border-gray-200 p-4 hover:border-gray-400"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{t.name}</span>
                <span className="text-xs uppercase text-gray-400">{t.status}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {(t.visitors_a + t.visitors_b)} Besucher ·{' '}
                {(t.conversions_a + t.conversions_b)} Conversions · {t.site_url || '—'}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
