import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'
import { ensureProfile } from '@/lib/auth'

/** Extrahiert source/plan aus dem next-Param (z.B. `/dashboard?source=figma-plugin&plan=pro`). */
function parseAttribution(nextRaw: string | null): { source?: string; plan?: string } {
  if (!nextRaw) return {}
  try {
    const qs = nextRaw.includes('?') ? nextRaw.split('?')[1] : ''
    if (!qs) return {}
    const p = new URLSearchParams(qs)
    return {
      source: p.get('source') || undefined,
      plan: p.get('plan') || undefined,
    }
  } catch {
    return {}
  }
}

/**
 * Supabase Auth Callback — verarbeitet sowohl OAuth (Google) als auch Email-Links.
 *
 * Flows:
 * - OAuth (code)     → Session via Cookie-Austausch → next-Param (Login: /dashboard, Signup: /dashboard)
 * - type=recovery    → /update-password
 * - type=signup      → next-Param (Signup setzt /dashboard via emailRedirectTo)
 * - default (token)  → /dashboard
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
    try {
      const { error, data } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url)
        )
      }
      const next = requestUrl.searchParams.get('next') || '/dashboard'
      const attribution = parseAttribution(next)
      if (data.user) {
        await ensureProfile(data.user.id, attribution)
      }
      // Kauf-Intent: User kam über "Pro"-Button → direkt in den Stripe-Checkout
      if (attribution.plan === 'pro') {
        return NextResponse.redirect(new URL('/auth/checkout', req.url))
      }
      return NextResponse.redirect(new URL(next, req.url))
    } catch (e: any) {
      // PKCE exchange kann fehlschlagen, wenn die Session bereits via
      // OAuth-Implicit-Flow gesetzt wurde (Supabase setzt Cookies direkt).
      // Dann prüfen wir ob trotzdem eine Session da ist.
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await ensureProfile(user.id)
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(e?.message || 'auth-failed')}`, req.url)
      )
    }
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
    const next = requestUrl.searchParams.get('next') || (type === 'recovery' ? '/update-password' : '/dashboard')
    const attribution = parseAttribution(next)
    if (data.user) {
      await ensureProfile(data.user.id, attribution)
    }
    if (attribution.plan === 'pro') {
      return NextResponse.redirect(new URL('/auth/checkout', req.url))
    }
    return NextResponse.redirect(new URL(next, req.url))
  }

  if (!tokenHash) {
    // Kein code, kein access_token, kein token_hash — möglicherweise hat
    // Supabase die Session bereits via OAuth-Implicit-Flow gesetzt (z. B.
    // Google-Login, bei dem der Auth-Server direkt Cookies setzt).
    // Prüfe, ob trotzdem eine Session existiert.
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await ensureProfile(user.id)
      const next = requestUrl.searchParams.get('next') || '/dashboard'
      return NextResponse.redirect(new URL(next, req.url))
    }
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

  const next = requestUrl.searchParams.get('next') || (type === 'recovery' ? '/update-password' : '/dashboard')
  const attribution = parseAttribution(next)
  if (data.user) {
    await ensureProfile(data.user.id, attribution)
  }
  if (attribution.plan === 'pro') {
    return NextResponse.redirect(new URL('/auth/checkout', req.url))
  }
  return NextResponse.redirect(new URL(next, req.url))
}
