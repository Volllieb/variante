'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { PandaLogo } from '@/components/PandaLogo'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'

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
  const [showPassword, setShowPassword] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setInfo('')
    setAlreadyRegistered(false)
    setLoading(true)
    const supabase = getBrowserSupabase()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    })
    setLoading(false)
    if (error) {
      const msg = typeof error === 'string' ? error : error.message || JSON.stringify(error)
      const msgStr = typeof msg === 'string' ? msg : JSON.stringify(msg)
      // Supabase-Fehlermeldungen für existierende User sind kryptisch → eigene Message
      if (
        msgStr.toLowerCase().includes('already') ||
        msgStr.toLowerCase().includes('exists') ||
        msgStr.toLowerCase().includes('registered')
      ) {
        setAlreadyRegistered(true)
      } else {
        setErr(msgStr)
      }
      return
    }
    // Bereits registriert & bestätigt? identities existieren und email ist confirmed → User existiert
    if (data.user?.identities?.length === 0) {
      setAlreadyRegistered(true)
      return
    }
    // Fallback: User existiert, identities.length > 0, aber keine Session (Email-Confirmation ON)
    if (data.user && !data.session && data.user.email_confirmed_at) {
      setAlreadyRegistered(true)
      return
    }
    if (data.session) {
      const qs = source ? '?source=' + encodeURIComponent(source) : ''
      router.push('/onboarding' + qs)
      router.refresh()
    } else {
      setInfo('Almost there — confirm your email address, then you can log in.')
    }
  }

  async function handleGoogleSignup() {
    setErr('')
    setGoogleLoading(true)
    const supabase = getBrowserSupabase()
    const nextPath = source ? `/onboarding?source=${encodeURIComponent(source)}` : '/dashboard'
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    })
    setGoogleLoading(false)
    if (error) setErr(error.message)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#06050f] font-[family-name:var(--font-sans)] antialiased">
      {/* Aurora */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -right-32 -top-32 h-[36rem] w-[36rem] rounded-full bg-fuchsia-600/18 blur-[130px]" />
        <div className="absolute -bottom-20 -left-20 h-[30rem] w-[30rem] rounded-full bg-violet-700/15 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-[0.13]"
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
            Create account
          </h1>
          <p className="mt-1 text-sm text-white/45">Start free — no credit card, no dev required.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
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

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Password
              </label>
              <div className="relative">
                <input
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
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-white/35 transition-colors hover:text-white/70"
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
            {alreadyRegistered && (
              <p className="rounded-xl border border-amber-400/20 bg-amber-400/[0.07] px-4 py-3 text-xs text-amber-200">
                Achtung — diese E-Mail ist bereits registriert.{' '}
                <Link href="/login" className="font-semibold underline transition-colors hover:text-amber-100">
                  Direkt einloggen
                </Link>
              </p>
            )}
            {info && (
              <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-3 text-xs text-emerald-300">
                {info}
              </p>
            )}

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="group inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600 bg-[length:200%_auto] px-6 text-sm font-bold text-white shadow-[0_8px_24px_-6px_rgba(139,92,246,0.55)] transition-all duration-200 hover:bg-[position:100%_center] hover:scale-[1.02] disabled:pointer-events-none disabled:opacity-50"
              >
                {loading ? 'Creating account…' : 'Sign up'}
                {!loading && <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />}
              </button>
            </div>
          </form>

          {/* Divider + Google */}
          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.08]" />
            <span className="text-[11px] uppercase tracking-wider text-white/25">or</span>
            <div className="h-px flex-1 bg-white/[0.08]" />
          </div>
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={googleLoading}
            className="mt-4 flex h-11 w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-white/[0.10] bg-white/[0.04] text-sm font-medium text-white/80 transition-all duration-200 hover:border-white/[0.18] hover:bg-white/[0.07] disabled:pointer-events-none disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? 'Connecting…' : 'Continue with Google'}
          </button>
        </div>

        <p className="mt-5 text-center text-sm text-white/40">
          Already have an account?{' '}
          <Link href="/login" className="cursor-pointer font-semibold text-fuchsia-300 transition-colors hover:text-fuchsia-200">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
