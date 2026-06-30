'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'

function signupSource(): string {
  if (typeof window === 'undefined') return ''
  const p = new URLSearchParams(window.location.search)
  return p.get('source') || ''
}

export default function SignupPage() {
  const router = useRouter()
  const source = signupSource()
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
    const { data, error } = await supabase.auth.signUp(
      { email, password },
      { emailRedirectTo: `${window.location.origin}/login` }
    )
    setLoading(false)
    if (error) {
      const msg = typeof error === 'string' ? error : error.message || JSON.stringify(error)
      setErr(typeof msg === 'string' ? msg : JSON.stringify(msg))
      return
    }
    if (data.session) {
      // E-Mail-Bestätigung deaktiviert → direkt eingeloggt.
      const qs = source ? '?source=' + encodeURIComponent(source) : ''
      router.push('/onboarding' + qs)
      router.refresh()
    } else {
      setInfo('Fast geschafft — bestätige deine E-Mail-Adresse, dann kannst du dich anmelden.')
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-2xl font-bold">Create account</h1>
      <p className="mb-6 text-sm text-gray-500">Start free with Variante.</p>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password (min. 6 characters)"
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
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-500">
        Already have an account?{' '}
        <a href="/login" className="font-medium text-blue-600 hover:underline">
          Log in
        </a>
      </p>
    </div>
  )
}
