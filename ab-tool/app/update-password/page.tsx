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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#06050f] font-[family-name:var(--font-sans)] antialiased">
      {/* Aurora */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-32 -top-32 h-[36rem] w-[36rem] rounded-full bg-violet-700/20 blur-[130px]" />
        <div className="absolute -bottom-20 -right-20 h-[30rem] w-[30rem] rounded-full bg-fuchsia-600/15 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.32) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm px-6">
        <div className="mb-8 flex justify-center">
          <Link
            href="/"
            className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl font-bold text-white transition-opacity hover:opacity-75"
          >
            <PandaLogo className="h-8 w-8 rounded-xl p-1 shadow-lg shadow-fuchsia-500/30" />
            variante
          </Link>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-8 shadow-2xl backdrop-blur-xl">
          {checking ? (
            <p className="text-sm text-white/45">Checking your reset link…</p>
          ) : !ready ? (
            <>
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-white">
                Link expired
              </h1>
              <p className="mt-2 text-sm text-white/45">
                {err || 'This reset link is no longer valid.'}
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600 px-6 text-sm font-bold text-white shadow-[0_8px_24px_-6px_rgba(139,92,246,0.55)] transition-all duration-200 hover:scale-[1.02]"
              >
                Back to login
              </Link>
            </>
          ) : (
            <>
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-white">
                Set new password
              </h1>
              <p className="mt-1 text-sm text-white/45">
                Choose a strong password for your account.
              </p>

              <form onSubmit={submit} className="mt-7 space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="update-password" className="text-xs font-semibold uppercase tracking-wider text-white/50">
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
                      className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-4 py-3 pr-11 text-sm text-white placeholder:text-white/30 transition-colors duration-200 focus:border-fuchsia-400/40 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-fuchsia-400/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-white/35 transition-colors hover:text-white/70"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {err && (
                  <p className="rounded-xl border border-rose-400/20 bg-rose-400/[0.07] px-4 py-3 text-xs text-rose-300">
                    {err}
                  </p>
                )}

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="group inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600 bg-[length:200%_auto] px-6 text-sm font-bold text-white shadow-[0_8px_24px_-6px_rgba(139,92,246,0.55)] transition-all duration-200 hover:bg-[position:100%_center] hover:scale-[1.02] disabled:pointer-events-none disabled:opacity-50"
                  >
                    {loading ? 'Updating…' : 'Save password'}
                    {!loading && <ShieldCheck className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />}
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
