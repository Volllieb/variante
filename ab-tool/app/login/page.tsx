'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { PandaLogo } from '@/components/PandaLogo'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'

function norm(s: string): string {
  return s.trim().toLowerCase()
}

function loginParams(): { source: string; plan: string } {
  if (typeof window === 'undefined') return { source: '', plan: '' }
  const p = new URLSearchParams(window.location.search)
  return { source: p.get('source') || '', plan: p.get('plan') || '' }
}

type ErrKind = 'not-confirmed' | 'rate-limit' | 'network' | 'generic'

function classify(error: any): ErrKind {
  const msg = (typeof error === 'string' ? error : error?.message || JSON.stringify(error)).toLowerCase()
  if (!msg) return 'generic'
  if (msg.includes('not confirmed') || msg.includes('email not confirmed')) return 'not-confirmed'
  if (msg.includes('too many') || msg.includes('rate limit') || msg.includes('security purposes') || msg.includes('try again later')) return 'rate-limit'
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('timeout') || msg.includes('abort') || msg.includes('load failed')) return 'network'
  return 'generic'
}

export default function LoginPage() {
  const router = useRouter()
  const { source, plan } = loginParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [notConfirmed, setNotConfirmed] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [googleErr, setGoogleErr] = useState('')
  const [sessionChecked, setSessionChecked] = useState(false)

  // UX: Bereits eingeloggt → zum Dashboard
  // PASSWORD_RECOVERY-Event: User kommt aus alter Reset-Mail → redirect zu /update-password
  useEffect(() => {
    const supabase = getBrowserSupabase()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/dashboard')
        return
      }
      setSessionChecked(true)
    }).catch(() => {
      // Netzwerk- oder Config-Fehler: Form trotzdem zeigen, User kann's nochmal probieren
      setSessionChecked(true)
    })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setNotConfirmed(false)
    setConfirmationSent(false)
    setLoading(true)
    try {
      const supabase = getBrowserSupabase()
      const { error } = await supabase.auth.signInWithPassword({ email: norm(email), password })
      if (error) {
        const kind = classify(error)
        if (kind === 'not-confirmed') { setNotConfirmed(true); setLoading(false); return }
        if (kind === 'rate-limit') { setErr('Too many attempts. Wait a moment and try again.'); setLoading(false); return }
        if (kind === 'network') { setErr('Connection failed. Check your internet and try again.'); setLoading(false); return }
        const msgStr = typeof error === 'string' ? error : error.message || JSON.stringify(error)
        if (msgStr === '{}' || msgStr === '') {
          setErr('Request blocked. If this persists, contact support.')
        } else {
          setErr(error.message || msgStr)
        }
        setLoading(false)
        return
      }
      setLoading(false)
      router.push('/dashboard')
      router.refresh()
    } catch {
      setLoading(false)
      setErr('Connection failed. Check your internet and try again.')
    }
  }

  async function handleResendConfirmation() {
    if (!email) { setErr('Enter your email first, then click "Resend confirmation email".'); return }
    setErr('')
    setConfirmationSent(false)
    setLoading(true)
    try {
      const supabase = getBrowserSupabase()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: norm(email),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/dashboard')}`,
        },
      })
      if (error) { setErr(error.message); setLoading(false); return }
      setLoading(false)
      setConfirmationSent(true)
    } catch {
      setLoading(false)
      setErr('Connection failed. Check your internet and try again.')
    }
  }

  async function handleReset() {
    if (!email) { setErr('Enter your email first, then click "Forgot password?"'); return }
    setErr('')
    setLoading(true)
    try {
      const supabase = getBrowserSupabase()
      const qsPartsR: string[] = []
      if (source) qsPartsR.push(`source=${encodeURIComponent(source)}`)
      if (plan) qsPartsR.push(`plan=${encodeURIComponent(plan)}`)
      const qsR = qsPartsR.length > 0 ? '?' + qsPartsR.join('&') : ''
      const { error } = await supabase.auth.resetPasswordForEmail(norm(email), {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/update-password' + qsR)}`,
      })
      if (error) { setErr(error?.message || JSON.stringify(error)); setLoading(false); return }
      setLoading(false)
      setResetSent(true)
    } catch {
      setLoading(false)
      setErr('Connection failed. Check your internet and try again.')
    }
  }

  async function handleGoogleLogin() {
    setErr('')
    setGoogleErr('')
    setGoogleLoading(true)
    try {
      const supabase = getBrowserSupabase()
      const qsPartsG: string[] = []
      if (source) qsPartsG.push(`source=${encodeURIComponent(source)}`)
      if (plan) qsPartsG.push(`plan=${encodeURIComponent(plan)}`)
      const qsG = qsPartsG.length > 0 ? '?' + qsPartsG.join('&') : ''
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/dashboard' + qsG)}`,
        },
      })
      if (error) {
        const msg = (typeof error === 'string' ? error : error.message || '').toLowerCase()
        if (msg.includes('already') || msg.includes('exists') || msg.includes('registered')) {
          setGoogleErr('This Google account is already linked to a different user. Try logging in with email + password instead.')
        } else if (msg.includes('provider') || msg.includes('identity')) {
          setGoogleErr('Couldn\'t sign in with Google. If you registered with email + password, use the login form above.')
        } else {
          setErr(error.message)
        }
      }
    } catch {
      setErr('Connection failed. Check your internet and try again.')
    }
    setGoogleLoading(false)
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
            <PandaLogo size="lg" />
            variante
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-[10px] border border-border bg-bg-1 p-8">
          <h1 className="text-2xl font-semibold text-white">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-text-3">Log in to manage your experiments.</p>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="mt-6 flex h-11 w-full items-center justify-center gap-3 rounded-[6px] border border-border bg-bg-1 text-sm font-medium text-white/80 transition-colors duration-200 hover:border-border-strong disabled:pointer-events-none disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden={true}>
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
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-semibold uppercase tracking-wider text-text-2">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-[6px] border border-border bg-bg-1 px-4 py-3 text-sm text-white placeholder:text-text-3 transition-colors duration-200 focus:border-border-strong focus:outline-none"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wider text-text-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-[6px] border border-border bg-bg-1 px-4 py-3 pr-11 text-sm text-white placeholder:text-text-3 transition-colors duration-200 focus:border-border-strong focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 transition-colors hover:text-text-2"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error / success */}
            {err && (
              <p className="rounded-[6px] border border-err/20 bg-err-bg px-4 py-3 text-xs text-err">
                {err}
              </p>
            )}
            {googleErr && (
              <p className="rounded-[6px] border border-pro/20 bg-pro-bg px-4 py-3 text-xs text-pro">
                {googleErr}
              </p>
            )}
            {notConfirmed && (
              <div className="rounded-[6px] border border-pro/20 bg-pro-bg px-4 py-3 text-xs text-pro space-y-2">
                <p>Your email isn't confirmed yet — check your inbox or resend the confirmation link.</p>
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={loading}
                  className="font-semibold underline transition-colors hover:opacity-80 disabled:opacity-40"
                >
                  Resend confirmation email
                </button>
              </div>
            )}
            {confirmationSent && (
              <p className="rounded-[6px] border border-ok/20 bg-ok-bg px-4 py-3 text-xs text-ok">
                Confirmation link resent — check your email.
              </p>
            )}
            {resetSent && (
              <p className="rounded-[6px] border border-ok/20 bg-ok-bg px-4 py-3 text-xs text-ok">
                Password reset link sent — check your email.
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 items-center gap-2 rounded-[6px] bg-white px-6 text-sm font-semibold text-black transition-colors duration-200 hover:bg-white/90 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? 'Signing in…' : 'Log in'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="text-xs text-text-3 transition-colors duration-200 hover:text-text disabled:opacity-40"
              >
                Forgot password?
              </button>
            </div>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-text-3">
          No account yet?{' '}
          <Link href={`/signup${source || plan ? `?${new URLSearchParams({ source, plan }).toString()}` : ''}`} className="font-semibold text-white transition-colors hover:text-text">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  )
}
