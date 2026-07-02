import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'

/**
 * Supabase Auth Callback — verarbeitet token_hash aus E-Mail-Links
 * (Passwort-Reset, E-Mail-Bestätigung, etc.)
 *
 * Flows:
 * - type=recovery → /update-password
 * - type=signup   → /login (nach Bestätigung)
 * - default       → /dashboard
 */
export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url)
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') || 'recovery'
  const next = type === 'recovery' ? '/update-password' : '/dashboard'

  if (!tokenHash) {
    return NextResponse.redirect(new URL('/login?error=missing-token', req.url))
  }

  const supabase = await getServerSupabase()

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as 'recovery' | 'signup' | 'email',
  })

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url)
    )
  }

  return NextResponse.redirect(new URL(next, req.url))
}
