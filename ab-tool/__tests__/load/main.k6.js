// k6-Loadtest — variante Hot Paths (Roadmap §1.1)
//
// Misst die drei Pfade, die unter Launch-Traffic zuerst brechen würden:
//   1. Landingpage (SSR, Product-Hunt-Ansturm)
//   2. GET /api/resolve — feuert bei JEDEM Pageview jeder Kunden-Site
//   3. POST /api/event — Conversion-Beacon (nur mit EVENT_TEST_ID)
//
// NIEMALS gegen Production fahren. Ziel ist ein Preview-Deployment:
//
//   k6 run __tests__/load/main.k6.js \
//     -e BASE_URL=https://<preview>.vercel.app \
//     -e LOADTEST_SECRET=<gleicher Wert wie Vercel-Env LOADTEST_SECRET> \
//     -e RESOLVE_HOST=<host mit existierenden Tests, z.B. example.com> \
//     -e EVENT_TEST_ID=<snippet_key eines Wegwerf-Tests>   # optional
//
// LOADTEST_SECRET umgeht die Per-IP-Rate-Limits (30/min) auf resolve/event —
// k6 läuft von EINER IP, echter Traffic von vielen. Der Bypass ist in
// lib/rateLimit.ts hart auf Nicht-Production beschränkt.
// Ohne Secret misst der Test nur 429s, nie Kapazität.
//
// Akzeptanzkriterien (Roadmap): p95 < 2s, Error-Rate < 1%, Ziel ≥100 RPS.
// Profile via -e STAGE=smoke|load|stress (Default: load).

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const SECRET = __ENV.LOADTEST_SECRET || ''
const RESOLVE_HOST = __ENV.RESOLVE_HOST || 'example.com'
const EVENT_TEST_ID = __ENV.EVENT_TEST_ID || ''

const errorRate = new Rate('errors')
const resolveLatency = new Trend('resolve_latency', true)

const STAGES = {
  // Rauchtest: tut der Aufbau, stimmen Secret/Host?
  smoke: [
    { duration: '30s', target: 5 },
  ],
  // Launch-Profil: ~500 gleichzeitige Besucher (Product Hunt Front Page).
  load: [
    { duration: '1m', target: 100 },
    { duration: '2m', target: 500 },
    { duration: '1m', target: 500 },
    { duration: '30s', target: 0 },
  ],
  // Bruchtest: wo liegt die Grenze?
  stress: [
    { duration: '1m', target: 200 },
    { duration: '2m', target: 1000 },
    { duration: '2m', target: 2000 },
    { duration: '30s', target: 0 },
  ],
}

export const options = {
  stages: STAGES[__ENV.STAGE || 'load'],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    errors: ['rate<0.01'],
    resolve_latency: ['p(95)<500'], // resolve blockiert Kunden-Pageviews → strenger
  },
}

const secretHeaders = SECRET ? { 'x-loadtest-secret': SECRET } : {}

export default function () {
  // Gewichtung wie echter Traffic: resolve dominiert (jeder Kunden-Pageview),
  // Landing ~1/5, Conversion-Events selten.
  const roll = Math.random()

  if (roll < 0.2) {
    // ── Landingpage (SSR) ──
    const res = http.get(`${BASE_URL}/`, { tags: { name: 'landing' } })
    errorRate.add(res.status !== 200)
    check(res, { 'landing 200': (r) => r.status === 200 })
  } else if (roll < 0.95 || !EVENT_TEST_ID) {
    // ── GET /api/resolve — der Hot Path ──
    const res = http.get(
      `${BASE_URL}/api/resolve?host=${encodeURIComponent(RESOLVE_HOST)}`,
      { headers: secretHeaders, tags: { name: 'resolve' } }
    )
    resolveLatency.add(res.timings.duration)
    errorRate.add(res.status !== 200)
    check(res, {
      'resolve 200': (r) => r.status === 200,
      'resolve liefert tests[]': (r) => {
        try { return Array.isArray(JSON.parse(r.body).tests) } catch { return false }
      },
    })
  } else {
    // ── POST /api/event — Conversion (nur mit Wegwerf-Test-ID) ──
    const res = http.post(
      `${BASE_URL}/api/event`,
      JSON.stringify({ testId: EVENT_TEST_ID, variant: 'B', event: 'conversion' }),
      {
        headers: { 'Content-Type': 'application/json', ...secretHeaders },
        tags: { name: 'event' },
      }
    )
    errorRate.add(res.status !== 200)
    check(res, { 'event 200': (r) => r.status === 200 })
  }

  // Denkpause echter Besucher — ohne sleep misst k6 nur die eigene Maschine.
  sleep(Math.random() * 2 + 0.5)
}
