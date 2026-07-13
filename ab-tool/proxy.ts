import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/** 30s stale-while-revalidate für Dashboard-Seiten.
 *  Mutations (POST/PATCH/DELETE) invalidieren via revalidatePath('/dashboard').
 */
export function proxy(request: NextRequest) {
  // Nur GET-Requests cachen — Mutations nicht
  if (request.method !== 'GET') return NextResponse.next()

  const response = NextResponse.next()

  // Browser-Cache: 30s frisch, 60s stale-while-revalidate
  response.headers.set(
    'Cache-Control',
    'private, max-age=30, stale-while-revalidate=60, stale-if-error=300'
  )

  return response
}

/** Greift nur für Dashboard-Routen */
export const config = {
  matcher: ['/dashboard', '/dashboard/tests', '/dashboard/setup', '/dashboard/account', '/dashboard/billing'],
}
