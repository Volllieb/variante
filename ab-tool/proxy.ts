import { NextRequest, NextResponse } from 'next/server'

export function proxy(req: NextRequest) {
  const existing = req.cookies.get('ab_spike')?.value
  const variant = existing ?? (Math.random() < 0.5 ? 'A' : 'B')

  // Variante als Request-Header weitergeben, damit die API-Route sie lesen kann
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-ab-variant', variant)

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  })

  if (!existing) {
    res.cookies.set('ab_spike', variant, {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: false,
      sameSite: 'none',
      secure: true,
    })
  }

  return res
}

export const config = {
  matcher: '/api/(.*)',
}
