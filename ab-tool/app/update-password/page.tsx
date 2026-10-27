'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { PandaLogo } from '@/components/PandaLogo'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { Button, Card, Field, Input } from '@/app/components'

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<UpdatePasswordFallback />}>
      <UpdatePasswordForm />
    </Suspense>
  )
}

function UpdatePasswordFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-0 antialiased">
      <div className="relative z-10 w-full max-w-sm px-6">
        <div className="mb-8 flex justify-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-heading font-semibold text-text transition-opacity hover:opacity-75"
          >
            <PandaLogo size="lg" />
            variante
          </Link>
        </div>
        <Card className="p-8">
          <p className="text-body text-text-3">Checking your reset link…</p>
        </Card>
      </div>
    </div>
  )
}

function UpdatePasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
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
    const source = searchParams.get('source')
    const plan = searchParams.get('plan')
    const qsParts: string[] = []
    if (source) qsParts.push(`source=${encodeURIComponent(source)}`)
    if (plan) qsParts.push(`plan=${encodeURIComponent(plan)}`)
    const qs = qsParts.length > 0 ? '?' + qsParts.join('&') : ''
    router.push('/dashboard' + qs)
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-0 antialiased">

      <div className="relative z-10 w-full max-w-sm px-6">
        <div className="mb-8 flex justify-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-heading font-semibold text-text transition-opacity hover:opacity-75"
          >
            <PandaLogo size="lg" />
            variante
          </Link>
        </div>

        <Card className="p-8">
          {checking ? (
            <p className="text-body text-text-3">Checking your reset link…</p>
          ) : !ready ? (
            <>
              <h1 className="text-heading font-semibold text-text">
                Link expired
              </h1>
              <p className="mt-2 text-small text-text-3">
                {err || 'This reset link is no longer valid.'}
              </p>
              <Button href="/login" size="lg" className="mt-6 h-11 w-full">
                Back to login
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-heading font-semibold text-text">
                Set new password
              </h1>
              <p className="mt-1 text-small text-text-3">
                Choose a strong password for your account.
              </p>

              <form onSubmit={submit} className="mt-7 flex flex-col gap-base">
                <Field label="New password">
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-0.5 top-1/2 -translate-y-1/2"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </Field>

                {err && (
                  <p className="rounded-md border border-err/20 bg-err-bg px-4 py-3 text-meta text-err">
                    {err}
                  </p>
                )}

                <div className="pt-1">
                  <Button type="submit" size="lg" loading={loading} className="h-11 w-full">
                    {loading ? 'Updating…' : 'Save password'}
                    {!loading && <ShieldCheck className="h-4 w-4" aria-hidden />}
                  </Button>
                </div>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}