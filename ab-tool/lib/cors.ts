// Zentrale CORS-Header für alle API-Routen.
//
// Plan SEC-09: Getrennte CORS-Strategien.
// - corsHeadersPublic(): * für öffentliche Endpunkte (/api/assign, /api/event,
//   /api/resolve). ab.js läuft auf beliebigen Kundenseiten — diese Routen MÜSSEN
//   jede Origin akzeptieren. Security kommt von Rate-Limiting und (bei /api/event)
//   signierten Assignment-Tokens.
// - corsHeaders(): Origin-Prüfung für authentifizierte Routen. Cookie-basierte
//   Auth (getApiUser Pfad 2) sendet keine Credentials mit *, daher muss hier die
//   erwartete Origin gesetzt sein. Der Schutz vor CSRF kommt zusätzlich von
//   Supabase-Cookies (SameSite=Lax).
//
// Access-Control-Max-Age: 600s reduziert Preflight-Requests signifikant,
// besonders relevant für ab.js auf hochfrequentierten Kundenseiten.

const ALLOWED_ORIGINS = [
  'https://www.getvariante.com',
  'https://getvariante.com',
  process.env.NEXT_PUBLIC_SITE_URL,
].filter(Boolean) as string[]

function getAllowedOrigin(req: Request): string {
  const origin = req.headers.get('origin')
  if (!origin) return ALLOWED_ORIGINS[0] // same-origin request, kein CORS nötig
  if (ALLOWED_ORIGINS.includes(origin)) return origin
  // Development: localhost
  if (origin.startsWith('http://localhost:')) return origin
  return ALLOWED_ORIGINS[0] // Fallback: erlaube keine unbekannten Origins
}

/** Öffentliche Endpunkte: ab.js auf beliebigen Kundenseiten. */
export function corsHeadersPublic(methods = 'GET, POST, OPTIONS'): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '600',
  }
}

/** Authentifizierte Endpunkte: nur eigene Origin + lokale Entwicklung. */
export function corsHeaders(methods = 'GET, POST, OPTIONS', req?: Request): HeadersInit {
  const origin = req ? getAllowedOrigin(req) : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Temp-Token',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '600',
  }
}

export function preflight(methods = 'GET, POST, OPTIONS', req?: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(methods, req) })
}

/** Preflight für öffentliche Endpunkte (Wildcard-CORS). */
export function preflightPublic(methods = 'GET, POST, OPTIONS'): Response {
  return new Response(null, { status: 204, headers: corsHeadersPublic(methods) })
}
