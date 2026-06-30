'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
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
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setInfo('')
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
      setErr(typeof msg === 'string' ? msg : JSON.stringify(msg))
      return
    }
    if (data.session) {
      const qs = source ? '?source=' + encodeURIComponent(source) : ''
      router.push('/onboarding' + qs)
      router.refresh()
    } else {
      setInfo('Fast geschafft — bestätige deine E-Mail-Adresse, dann kannst du dich anmelden.')
    }
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
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-black text-white shadow-lg shadow-fuchsia-500/30">
              v
            </span>
            variante
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-8 shadow-2xl backdrop-blur-xl">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-white">
            Create account
          </h1>
          <p className="mt-1 text-sm text-white/45">Start free with Variante.</p>

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
