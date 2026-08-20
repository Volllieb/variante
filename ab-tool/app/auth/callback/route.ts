import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'
import { ensureProfile } from '@/lib/auth'
import { claimDemoUrlForUser } from '@/lib/demoClaim'
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
 * Verbindet die Landing-Demo-URL direkt mit dem Account (Signup/Login).
 * Liest den `variante_demo_url`-Cookie (gesetzt von /api/landing-demo) und
 * claimed ihn — Draft-Test + Domain. Rückgabe: `true` bei erfolgreichem Claim.
 */
async function claimLandingDemo(userId: string, req: NextRequest): Promise<boolean> {
  const raw = req.cookies.get('variante_demo_url')?.value
  if (!raw) return false
  try {
    const demoUrl = decodeURIComponent(raw)
    if (!demoUrl.includes('.')) return false
    return await claimDemoUrlForUser(userId, demoUrl)
  } catch {
    return false
  }
}

/** Redirect, der nach erfolgreichem Demo-Claim den Cookie aufräumt. */
function redirectAfter(next: string, req: NextRequest, claimed: boolean): NextResponse {
  const res = NextResponse.redirect(new URL(next, req.url))
  if (claimed) {
    res.cookies.set('variante_demo_url', '', { path: '/', maxAge: 0 })
  }
  return res
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
      const claimed = data.user ? await claimLandingDemo(data.user.id, req) : false
      // Kauf-Intent: User kam über "Pro"-Button → direkt in den Stripe-Checkout
      if (attribution.plan === 'pro') {
        return redirectAfter('/auth/checkout', req, claimed)
      }
      return redirectAfter(next, req, claimed)
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
    const claimed = data.user ? await claimLandingDemo(data.user.id, req) : false
    if (attribution.plan === 'pro') {
      return redirectAfter('/auth/checkout', req, claimed)
    }
    return redirectAfter(next, req, claimed)
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
      const claimed = await claimLandingDemo(user.id, req)
      return redirectAfter(next, req, claimed)
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
  const claimed = data.user ? await claimLandingDemo(data.user.id, req) : false
  if (attribution.plan === 'pro') {
    return redirectAfter('/auth/checkout', req, claimed)
  }
  return redirectAfter(next, req, claimed)
}
