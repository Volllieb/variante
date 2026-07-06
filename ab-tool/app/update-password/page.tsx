'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { PandaLogo } from '@/components/PandaLogo'
import { Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const supabase = getBrowserSupabase()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true)
      } else {
        // Kein Session → evtl. noch nicht durch Callback, oder abgelaufen
        setErr('Reset link expired or invalid. Request a new one.')
      }
      setChecking(false)
    })
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setErr('Password must be at least 6 characters.')
      return
    }
    setErr('')
    setLoading(true)
    const supabase = getBrowserSupabase()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setErr(error.message)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-0 antialiased">

      <div className="relative z-10 w-full max-w-sm px-6">
        <div className="mb-8 flex justify-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-semibold text-text transition-opacity hover:opacity-75"
          >
            <PandaLogo className="h-8 w-8 rounded-lg p-1" />
            variante
          </Link>
        </div>

        <div className="rounded-[10px] border border-border bg-bg-1 p-8">
          {checking ? (
            <p className="text-sm text-text-3">Checking your reset link…</p>
          ) : !ready ? (
            <>
              <h1 className="text-2xl font-semibold text-text">
                Link expired
              </h1>
              <p className="mt-2 text-sm text-text-3">
                {err || 'This reset link is no longer valid.'}
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-white px-6 text-sm font-semibold text-black transition-colors duration-200 hover:bg-white/90"
              >
                Back to login
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-text">
                Set new password
              </h1>
              <p className="mt-1 text-sm text-text-3">
                Choose a strong password for your account.
              </p>

              <form onSubmit={submit} className="mt-7 space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="update-password" className="text-xs font-semibold uppercase tracking-wider text-text-3">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="update-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full rounded-[6px] border border-border bg-bg-2 px-4 py-3 pr-11 text-sm text-text placeholder:text-text-3 transition-colors duration-200 focus:border-text/30 focus:outline-none focus:ring-1 focus:ring-text/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-text-3 transition-colors hover:text-text"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {err && (
                  <p className="rounded-[6px] border border-err/20 bg-err-bg px-4 py-3 text-xs text-err">
                    {err}
                  </p>
                )}

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-white px-6 text-sm font-semibold text-black transition-colors duration-200 hover:bg-white/90 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {loading ? 'Updating…' : 'Save password'}
                    {!loading && <ShieldCheck className="h-4 w-4" />}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
