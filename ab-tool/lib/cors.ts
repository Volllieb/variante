// Zentrale CORS-Header für alle API-Routen.
// ab.js, Browser Extension und Figma Plugin rufen die Routen cross-origin auf.

export function corsHeaders(methods = 'GET, POST, OPTIONS'): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

export function preflight(methods = 'GET, POST, OPTIONS'): Response {
  return new Response(null, { status: 204, headers: corsHeaders(methods) })
}
