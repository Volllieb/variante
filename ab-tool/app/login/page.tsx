'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    const supabase = getBrowserSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setErr(error.message)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  async function handleReset() {
    if (!email) { setErr('Enter your email first, then click "Forgot password?"'); return }
    setErr('')
    setLoading(true)
    const supabase = getBrowserSupabase()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    setLoading(false)
    if (error) { setErr(error.message); return }
    setResetSent(true)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-2xl font-bold">Log in</h1>
      <p className="mb-6 text-sm text-gray-500">Welcome back to Variante.</p>
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
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        {err && <p className="text-sm text-red-600">{err}</p>}
        {resetSent && <p className="text-sm text-green-700">Password reset link sent — check your email.</p>}
        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? 'Please wait…' : 'Log in'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            className="text-xs text-gray-500 hover:text-gray-700 hover:underline disabled:opacity-50"
          >
            Forgot password?
          </button>
        </div>
      </form>
      <p className="mt-4 text-sm text-gray-500">
        No account yet?{' '}
        <a href="/signup" className="font-medium text-blue-600 hover:underline">
          Sign up
        </a>
      </p>
    </div>
  )
}
