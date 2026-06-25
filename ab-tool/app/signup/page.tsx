'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setInfo('')
    setLoading(true)
    const supabase = getBrowserSupabase()
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) {
      setErr(error.message)
      return
    }
    if (data.session) {
      // E-Mail-Bestätigung deaktiviert → direkt eingeloggt.
      router.push('/dashboard')
      router.refresh()
    } else {
      setInfo('Fast geschafft — bestätige deine E-Mail-Adresse, dann kannst du dich anmelden.')
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-2xl font-bold">Konto erstellen</h1>
      <p className="mb-6 text-sm text-gray-500">Starte kostenlos mit Variante.</p>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          required
          placeholder="E-Mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Passwort (min. 6 Zeichen)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        {err && <p className="text-sm text-red-600">{err}</p>}
        {info && <p className="text-sm text-green-700">{info}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? 'Konto wird erstellt…' : 'Registrieren'}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-500">
        Schon ein Konto?{' '}
        <a href="/login" className="font-medium text-blue-600 hover:underline">
          Anmelden
        </a>
      </p>
    </div>
  )
}
