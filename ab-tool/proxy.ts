import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresht den Session-Cookie (wichtig für Token-Ablauf).
  const { data: { user } } = await supabase.auth.getUser()

  // Eingeloggte Nutzer sollen die Landingpage nie sehen — direkt ins Dashboard.
  if (user && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  // Dashboard/Results/Onboarding: Session-Refresh. Landingpage: Auth-Redirect-Check.
  matcher: ['/', '/dashboard/:path*', '/results/:path*', '/onboarding/:path*'],
}
