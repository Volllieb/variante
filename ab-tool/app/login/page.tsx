'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { PandaLogo } from '@/components/PandaLogo'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  // PASSWORD_RECOVERY-Event: User kommt aus alter Reset-Mail → redirect zu /update-password
  useEffect(() => {
    const supabase = getBrowserSupabase()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/update-password')
      }
    })
    // Error aus Query-Param (z. B. vom /auth/callback redirect)
    const p = new URLSearchParams(window.location.search)
    const errorParam = p.get('error')
    if (errorParam) setErr(decodeURIComponent(errorParam))
    return () => subscription.unsubscribe()
  }, [router])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    const supabase = getBrowserSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setErr(error?.message || JSON.stringify(error)); return }
    router.push('/dashboard')
    router.refresh()
  }

  async function handleReset() {
    if (!email) { setErr('Enter your email first, then click "Forgot password?"'); return }
    setErr('')
    setLoading(true)
    const supabase = getBrowserSupabase()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    setLoading(false)
    if (error) { setErr(error?.message || JSON.stringify(error)); return }
    setResetSent(true)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#06050f] font-[family-name:var(--font-sans)] antialiased">
      {/* Aurora background */}
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
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link
            href="/"
            className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl font-bold text-white transition-opacity hover:opacity-75"
          >
            <PandaLogo className="h-8 w-8 rounded-xl p-1 shadow-lg shadow-fuchsia-500/30" />
            variante
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-8 shadow-2xl backdrop-blur-xl">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-white">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-white/45">Log in to manage your experiments.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Email
              </label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-white/30 transition-colors duration-200 focus:border-fuchsia-400/40 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-fuchsia-400/20"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
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

            {/* Error / success */}
            {err && (
              <p className="rounded-xl border border-rose-400/20 bg-rose-400/[0.07] px-4 py-3 text-xs text-rose-300">
                {err}
              </p>
            )}
            {resetSent && (
              <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-3 text-xs text-emerald-300">
                Password reset link sent — check your email.
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="submit"
                disabled={loading}
                className="group inline-flex cursor-pointer h-11 items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600 bg-[length:200%_auto] px-6 text-sm font-bold text-white shadow-[0_8px_24px_-6px_rgba(139,92,246,0.55)] transition-all duration-200 hover:bg-[position:100%_center] hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? 'Signing in…' : 'Log in'}
                {!loading && <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="cursor-pointer text-xs text-white/40 transition-colors duration-200 hover:text-white/70 disabled:opacity-40"
              >
                Forgot password?
              </button>
            </div>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-white/40">
          No account yet?{' '}
          <Link href="/signup" className="cursor-pointer font-semibold text-fuchsia-300 transition-colors hover:text-fuchsia-200">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  )
}
