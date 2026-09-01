// Tests für das deterministische Bucketing (lib/assignBucket.ts).
//
// Vorher entschied die DB mit `random() * 100 < traffic_split` bei JEDEM
// /api/assign-Call. Im cookieless Default-Modus von ab.js hieß das: jeder
// Reload würfelt neu, derselbe Besucher sieht mal A und mal B, und
// visitors_a/b zählt Page-Views statt Menschen. Die drei Eigenschaften, an
// denen das jetzt hängt, prüfen wir hier — sie sind nicht offensichtlich und
// eine Regression daran wäre im Dashboard nicht als Bug erkennbar, sondern
// nur als "komischer Split":
//
//   1. Determinismus  — gleicher Besucher, gleicher Test → gleiche Variante
//   2. Gleichverteilung — sonst ist der Split systematisch schief
//   3. Unabhängigkeit — kein Besucher ist in JEDEM Test in derselben Variante
//
// Ausführen: node --import tsx __tests__/assign-bucket.mjs

import assert from 'node:assert'
import { visitorIdentity } from '../lib/assignBucket.ts'

let failed = 0
function check(name, fn) {
  try { fn(); console.log('✓', name) }
  catch (err) { failed++; console.error('✗', name, '\n   ', err.message) }
}

const KEY_A = '11111111-1111-4111-8111-111111111111'
const KEY_B = '22222222-2222-4222-8222-222222222222'
const UA = 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/141'

function req(ip, ua = UA) {
  const headers = { 'user-agent': ua }
  if (ip !== null) headers['x-forwarded-for'] = ip
  return new Request('https://www.getvariante.com/api/assign', { headers })
}

/** Variante wie in ab_assign_v2: bucket < traffic_split → B. */
const variantOf = (identity, split = 50) => (identity.bucket < split ? 'B' : 'A')

check('gleicher Besucher + gleicher Test → identischer Bucket', () => {
  const a = visitorIdentity(KEY_A, req('203.0.113.5'))
  const b = visitorIdentity(KEY_A, req('203.0.113.5'))
  assert.strictEqual(a.bucket, b.bucket)
  assert.strictEqual(a.visitorId, b.visitorId)
})

check('Bucket liegt immer in 0..99', () => {
  for (let i = 0; i < 500; i++) {
    const { bucket } = visitorIdentity(KEY_A, req(`10.0.${i >> 8}.${i & 255}`))
    assert.ok(Number.isInteger(bucket) && bucket >= 0 && bucket < 100, `bucket=${bucket}`)
  }
})

check('10.000 Besucher → Split bei 50 % liegt zwischen 48 und 52 %', () => {
  let b = 0
  for (let i = 0; i < 10_000; i++) {
    const ip = `${10 + (i >> 16)}.${(i >> 8) & 255}.${i & 255}.7`
    if (variantOf(visitorIdentity(KEY_A, req(ip))) === 'B') b++
  }
  const pct = (b / 10_000) * 100
  // ±2 pp ist ~4 Standardabweichungen (σ ≈ 0.5 pp) — kein Flake, aber jede
  // echte Schieflage im Hash fällt auf.
  assert.ok(pct > 48 && pct < 52, `B-Anteil ${pct.toFixed(2)} % außerhalb 48–52 %`)
})

check('traffic_split wird respektiert (20 % → ~20 % B)', () => {
  let b = 0
  for (let i = 0; i < 10_000; i++) {
    const ip = `${10 + (i >> 16)}.${(i >> 8) & 255}.${i & 255}.7`
    if (variantOf(visitorIdentity(KEY_A, req(ip)), 20) === 'B') b++
  }
  const pct = (b / 10_000) * 100
  assert.ok(pct > 18 && pct < 22, `B-Anteil ${pct.toFixed(2)} % außerhalb 18–22 %`)
})

check('zwei Tests sind unkorreliert — kein Besucher immer in B', () => {
  let same = 0
  const n = 5_000
  for (let i = 0; i < n; i++) {
    const r = req(`${10 + (i >> 16)}.${(i >> 8) & 255}.${i & 255}.7`)
    if (variantOf(visitorIdentity(KEY_A, r)) === variantOf(visitorIdentity(KEY_B, r))) same++
  }
  const pct = (same / n) * 100
  // Bei Unabhängigkeit stimmen ~50 % überein. Ohne snippetKey im Hash wären
  // es 100 % — derselbe Mensch säße dann in jedem Test in derselben Variante.
  assert.ok(pct > 46 && pct < 54, `Übereinstimmung ${pct.toFixed(2)} % — Tests korrelieren`)
})

check('unterschiedlicher User-Agent → eigene Identität (geteilte NAT-IP)', () => {
  const a = visitorIdentity(KEY_A, req('198.51.100.9', 'Chrome/141'))
  const b = visitorIdentity(KEY_A, req('198.51.100.9', 'Firefox/133'))
  assert.notStrictEqual(a.visitorId, b.visitorId)
})

check('keine Client-IP → null (Aufrufer fällt auf random() zurück)', () => {
  assert.strictEqual(visitorIdentity(KEY_A, req(null)), null)
})

check('visitorId ist pro Test verschieden (kein Cross-Test-Tracking-Key)', () => {
  const r = req('203.0.113.77')
  assert.notStrictEqual(visitorIdentity(KEY_A, r).visitorId, visitorIdentity(KEY_B, r).visitorId)
})

if (failed) { console.error(`\n${failed} Test(s) fehlgeschlagen`); process.exit(1) }
console.log('\nAlle Tests bestanden')
