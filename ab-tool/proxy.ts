import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Edge-level Auth-Gate + Cache-Control für Dashboard.
 *
 * Das Proxy löst den Redirect-Loop zwischen /login ↔ /dashboard:
 * - getUser() refreshed die Session — hier KANN setAll() Cookies schreiben
 *   (in Server Components ist set() nicht erlaubt, daher scheiterte es dort).
 * - Auth-Checks passieren BEVOR eine Seite rendert → kein Flash, kein Loop.
 *
 * Zusätzlich: Cache-Control-Header (30s stale-while-revalidate) für Dashboard-GET.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Request-Cookies für nachfolgende Handler im selben Request
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          // Response neu bauen mit aktualisierten Request-Cookies
          supabaseResponse = NextResponse.next({ request })
          // Response-Cookies für den Browser
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Session validieren & ggf. Token refreshen (hier funktioniert setAll!)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Cache-Control für Dashboard-GET
  if (request.method === 'GET' && path.startsWith('/dashboard')) {
    supabaseResponse.headers.set(
      'Cache-Control',
      'private, max-age=30, stale-while-revalidate=60, stale-if-error=300'
    )
  }

  // Auth-Gates
  if (user) {
    // Eingeloggt: /login & /signup → Dashboard
    if (path === '/login' || path === '/signup') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  } else {
    // Nicht eingeloggt: geschützte Routen → Login
    const protectedPaths = ['/dashboard', '/onboarding', '/update-password']
    const isProtected = protectedPaths.some((p) => path === p || path.startsWith(p + '/'))
    if (isProtected) {
      const url = new URL('/login', request.url)
      // Nur bei explizitem Logout keinen error-Param setzen
      if (!request.nextUrl.searchParams.has('logout')) {
        url.searchParams.set('error', 'Please log in to continue.')
      }
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/login',
    '/signup',
    '/dashboard/:path*',
    '/onboarding',
    '/onboarding/:path*',
    '/update-password',
  ],
}
