import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'
import { ensureProfile } from '@/lib/auth'

/**
 * Supabase Auth Callback — verarbeitet sowohl OAuth (Google) als auch Email-Links.
 *
 * Flows:
 * - OAuth (code)     → Session via Cookie-Austausch → next-Param (Login: /dashboard, Signup: /onboarding)
 * - type=recovery    → /update-password
 * - type=signup      → next-Param (Signup setzt /onboarding via emailRedirectTo)
 * - default (token)  → /dashboard
 *
 * /dashboard selbst gated zusätzlich auf profiles.onboarded — falls ein User
 * trotzdem ohne next-Param oder über einen alten Link landet, wird er beim
 * ersten Dashboard-Aufruf serverseitig nach /onboarding umgeleitet.
 */
export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url)
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const accessToken = requestUrl.searchParams.get('access_token')
  const refreshToken = requestUrl.searchParams.get('refresh_token')
  const type = requestUrl.searchParams.get('type') || 'recovery'
  const errorParam = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  const supabase = await getServerSupabase()

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || errorParam)}`, req.url)
    )
  }

  // OAuth-Flow (Google etc.): Code → Session via PKCE exchange
  if (code) {
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url)
      )
    }
    // Profile-Fallback: Bei OAuth-Signup kann der DB-Trigger rennen
    if (data.user) await ensureProfile(data.user.id)
    const next = requestUrl.searchParams.get('next') || '/dashboard'
    return NextResponse.redirect(new URL(next, req.url))
  }

  // Email-Flow (Passwort-Reset, E-Mail-Bestätigung) via token hash or direct tokens
  if (accessToken && refreshToken) {
    const { error, data } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url)
      )
    }
    if (data.user) await ensureProfile(data.user.id)
    const next = requestUrl.searchParams.get('next') || (type === 'recovery' ? '/update-password' : '/dashboard')
    return NextResponse.redirect(new URL(next, req.url))
  }

  if (!tokenHash) {
    return NextResponse.redirect(new URL('/login?error=missing-token', req.url))
  }

  const { error, data } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as 'recovery' | 'signup' | 'email',
  })

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url)
    )
  }

  if (data.user) await ensureProfile(data.user.id)
  const next = requestUrl.searchParams.get('next') || (type === 'recovery' ? '/update-password' : '/dashboard')
  return NextResponse.redirect(new URL(next, req.url))
}
