import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'

/**
 * Supabase Auth Callback — verarbeitet sowohl OAuth (Google) als auch Email-Links.
 *
 * Flows:
 * - OAuth (code)     → Session via Cookie-Austausch → /dashboard (oder /onboarding wenn source gesetzt)
 * - type=recovery    → /update-password
 * - type=signup      → /login (nach E-Mail-Bestätigung)
 * - default (token)  → /dashboard
 */
export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url)
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') || 'recovery'

  const supabase = await getServerSupabase()

  // OAuth-Flow (Google etc.): Code → Cookie-Austausch via @supabase/ssr
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url)
      )
    }
    // source-Param aus dem OAuth-State? Nicht direkt — wir nutzen next als Fallback
    const next = requestUrl.searchParams.get('next') || '/dashboard'
    return NextResponse.redirect(new URL(next, req.url))
  }

  // Email-Flow (Passwort-Reset, E-Mail-Bestätigung)
  if (!tokenHash) {
    return NextResponse.redirect(new URL('/login?error=missing-token', req.url))
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as 'recovery' | 'signup' | 'email',
  })

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url)
    )
  }

  const next = type === 'recovery' ? '/update-password' : '/dashboard'
  return NextResponse.redirect(new URL(next, req.url))
}
