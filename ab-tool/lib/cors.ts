// Zentrale CORS-Header für alle API-Routen.
// ab.js und Figma Plugin rufen die Routen cross-origin auf.
//
// CORS-Design:
// - Access-Control-Allow-Origin: * ist bewusst permissiv, weil ab.js auf
//   beliebigen Kundenseiten läuft und alle Origins /api/assign|event|resolve
//   erreichen müssen. Die Security kommt nicht von CORS, sondern von:
//   - API-Key-Auth (UUID v4) für /api/generate, /api/tests etc.
//   - JWT-Cookies für /api/profile, /api/domains etc.
//   - Rate-Limiting für /api/assign, /api/event
// - Access-Control-Max-Age: 600s reduziert Preflight-Requests signifikant,
//   besonders relevant für ab.js auf hochfrequentierten Kundenseiten.

export function corsHeaders(methods = 'GET, POST, OPTIONS'): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '600',
  }
}

export function preflight(methods = 'GET, POST, OPTIONS'): Response {
  return new Response(null, { status: 204, headers: corsHeaders(methods) })
}
