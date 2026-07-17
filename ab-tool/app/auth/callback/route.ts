import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'
import { ensureProfile } from '@/lib/auth'
import { claimTempSessionTests, markFigmaPluginUser } from '@/lib/claimTests'

/** Extrahiert source/plan/temp_token/test_id aus dem next-Param (z.B. `/dashboard?source=figma-plugin&temp_token=abc&test_id=123`). */
function parseAttribution(nextRaw: string | null): { source?: string; plan?: string; tempToken?: string; testId?: string } {
  if (!nextRaw) return {}
  try {
    const qs = nextRaw.includes('?') ? nextRaw.split('?')[1] : ''
    if (!qs) return {}
    const p = new URLSearchParams(qs)
    return {
      source: p.get('source') || undefined,
      plan: p.get('plan') || undefined,
      tempToken: p.get('temp_token') || undefined,
      testId: p.get('test_id') || undefined,
    }
  } catch {
    return {}
  }
}

/**
 * Überträgt Temp-Session-Tests auf den echten User.
 * Die Logik liegt in lib/claimTests.ts, geteilt mit /api/claim-tests — inklusive
 * preview→draft-Promotion für Tests aus dem Hybrid-Onboarding.
 *
 * has_figma_plugin nur bei source=figma-plugin: seit dem Hybrid-Onboarding
 * claimen auch Website-Previews über diesen Pfad, und die kommen nie aus Figma.
 */
async function claimTempTests(userId: string, tempToken: string, source?: string) {
  await claimTempSessionTests(userId, tempToken)
  if (source === 'figma-plugin') await markFigmaPluginUser(userId)
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
      if (attribution.tempToken) await claimTempTests(data.user.id, attribution.tempToken, attribution.source)
    }
    // Kauf-Intent: User kam über "Pro"-Button → direkt in den Stripe-Checkout
    if (attribution.plan === 'pro') {
      return NextResponse.redirect(new URL('/auth/checkout', req.url))
    }
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
    const next = requestUrl.searchParams.get('next') || (type === 'recovery' ? '/update-password' : '/dashboard')
    const attribution = parseAttribution(next)
    if (data.user) {
      await ensureProfile(data.user.id, attribution)
      if (attribution.tempToken) await claimTempTests(data.user.id, attribution.tempToken, attribution.source)
    }
    if (attribution.plan === 'pro') {
      return NextResponse.redirect(new URL('/auth/checkout', req.url))
    }
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

  const next = requestUrl.searchParams.get('next') || (type === 'recovery' ? '/update-password' : '/dashboard')
  const attribution = parseAttribution(next)
  if (data.user) {
    await ensureProfile(data.user.id, attribution)
    if (attribution.tempToken) await claimTempTests(data.user.id, attribution.tempToken, attribution.source)
  }
  if (attribution.plan === 'pro') {
    return NextResponse.redirect(new URL('/auth/checkout', req.url))
  }
  return NextResponse.redirect(new URL(next, req.url))
}
