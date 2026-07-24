import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'
import { ensureProfile } from '@/lib/auth'
import { supabase as supabaseAdmin } from '@/lib/supabase'

/**
 * Validiert den `next`-Parameter gegen Open Redirect (Plan SEC-07).
 * Erlaubt nur relative Pfade, die nicht mit `//` beginnen.
 * `new URL('//evil.com', 'https://www.getvariante.com')` ergibt sonst
 * `https://evil.com/` — ein hochwertiger Phishing-Vektor nach dem Login.
 */
function safeNext(raw: string | null): string | null {
  if (!raw) return null
  if (!raw.startsWith('/') || raw.startsWith('//')) return null
  return raw
}

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
      const rawNext0 = requestUrl.searchParams.get('next')
      const next = safeNext(rawNext0) || '/dashboard'
      const attribution = parseAttribution(rawNext0)
      if (data.user) {
        await ensureProfile(data.user.id, attribution)
        // Google OAuth: Implied consent — set terms_accepted_at if not already set
        await supabaseAdmin
          .from('profiles')
          .update({ terms_accepted_at: new Date().toISOString() })
          .eq('user_id', data.user.id)
          .is('terms_accepted_at', null)
      }
      // Kauf-Intent: User kam über "Pro"-Button → direkt in den Stripe-Checkout
      if (attribution.plan === 'pro') {
        return NextResponse.redirect(new URL('/auth/checkout', req.url))
      }
      return NextResponse.redirect(new URL(next, req.url))
    } catch (e: unknown) {
      // PKCE exchange kann fehlschlagen, wenn die Session bereits via
      // OAuth-Implicit-Flow gesetzt wurde (Supabase setzt Cookies direkt).
      // Dann prüfen wir ob trotzdem eine Session da ist.
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await ensureProfile(user.id)
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(e instanceof Error ? e.message : 'auth-failed')}`, req.url)
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
    const rawNext2 = requestUrl.searchParams.get('next')
    const next = safeNext(rawNext2) || (type === 'recovery' ? '/update-password' : '/dashboard')
    const attribution = parseAttribution(rawNext2)
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
      const next = safeNext(requestUrl.searchParams.get('next')) || '/dashboard'
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

  const rawNext3 = requestUrl.searchParams.get('next')
  const next = safeNext(rawNext3) || (type === 'recovery' ? '/update-password' : '/dashboard')
  const attribution = parseAttribution(rawNext3)
  if (data.user) {
    await ensureProfile(data.user.id, attribution)
  }
  if (attribution.plan === 'pro') {
    return NextResponse.redirect(new URL('/auth/checkout', req.url))
  }
  return NextResponse.redirect(new URL(next, req.url))
}
