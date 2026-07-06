'use client'

import { useState, useEffect } from 'react'
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
  const [confirmationResent, setConfirmationResent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)

  // UX: Bereits eingeloggt → direkt zum Dashboard
  useEffect(() => {
    getBrowserSupabase().auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/dashboard')
        return
      }
      setSessionChecked(true)
    })
  }, [router])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setInfo('')
    setAlreadyRegistered(false)
    setLoading(true)
    const supabase = getBrowserSupabase()
    const nextPath = source ? `/onboarding?source=${encodeURIComponent(source)}` : '/onboarding'
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
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

  async function handleResendConfirmation() {
    if (!email) return
    setErr('')
    setConfirmationResent(false)
    setLoading(true)
    const supabase = getBrowserSupabase()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/onboarding')}`,
      },
    })
    setLoading(false)
    if (error) { setErr(error.message); return }
    setConfirmationResent(true)
  }

  async function handleGoogleSignup() {
    setErr('')
    setGoogleLoading(true)
    const supabase = getBrowserSupabase()
    const nextPath = source ? `/onboarding?source=${encodeURIComponent(source)}` : '/onboarding'
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    })
    setGoogleLoading(false)
    if (error) setErr(error.message)
  }

  if (!sessionChecked) return null // UX: Warten auf Session-Check, kein Form-Flash

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-0 antialiased">
      <div className="w-full max-w-sm px-6">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-semibold text-white transition-opacity hover:opacity-75"
          >
            <PandaLogo className="h-8 w-8 rounded-lg p-1" />
            variante
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-[10px] border border-border bg-bg-1 p-8">
          <h1 className="text-2xl font-semibold text-white">
            Create account
          </h1>
          <p className="mt-1 text-sm text-text-3">Start free — no credit card, no dev required.</p>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={googleLoading}
            className="mt-6 flex h-11 w-full items-center justify-center gap-3 rounded-[6px] border border-border bg-bg-1 text-sm font-medium text-white/80 transition-colors duration-200 hover:border-border-strong disabled:pointer-events-none disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? 'Connecting…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="mt-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-3">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="signup-email" className="text-xs font-semibold uppercase tracking-wider text-text-2">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-[6px] border border-border bg-bg-1 px-4 py-3 text-sm text-white placeholder:text-text-3 transition-colors duration-200 focus:border-border-strong focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="signup-password" className="text-xs font-semibold uppercase tracking-wider text-text-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-[6px] border border-border bg-bg-1 px-4 py-3 pr-11 text-sm text-white placeholder:text-text-3 transition-colors duration-200 focus:border-border-strong focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 transition-colors hover:text-text-2"
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
            {alreadyRegistered && (
              <div className="rounded-[6px] border border-pro/20 bg-pro-bg px-4 py-3 text-xs text-pro space-y-2">
                <p>
                  Diese E-Mail ist bereits registriert.{' '}
                  <Link href="/login" className="font-semibold underline transition-colors hover:opacity-80">
                    Direkt einloggen
                  </Link>
                </p>
                <p className="text-pro/70">
                  Keine Bestätigungsmail bekommen?
                </p>
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={loading}
                  className="font-semibold underline transition-colors hover:opacity-80 disabled:opacity-40"
                >
                  Bestätigungslink erneut senden
                </button>
              </div>
            )}
            {confirmationResent && (
              <p className="rounded-[6px] border border-ok/20 bg-ok-bg px-4 py-3 text-xs text-ok">
                Bestätigungslink erneut gesendet — check deine E-Mails.
              </p>
            )}
            {info && (
              <p className="rounded-[6px] border border-ok/20 bg-ok-bg px-4 py-3 text-xs text-ok">
                {info}
              </p>
            )}

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[6px] bg-white px-6 text-sm font-semibold text-black transition-colors duration-200 hover:bg-white/90 disabled:pointer-events-none disabled:opacity-50"
              >
                {loading ? 'Creating account…' : 'Sign up'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-text-3">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-white transition-colors hover:text-text">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
