// Tests für die Host-Normalisierung des Domain-Gates (Plan SEC-01 / TEST-01).
//
// assertOwnedDomain() selbst schlägt gegen die DB — hier testen wir die reine
// hostOf()-Logik, die entscheidet, ob ein site_url zu einer verifizierten
// Domain passt. Sie muss mit der DB-Spalte tests.site_host (Migration 021) und
// mit /api/resolve übereinstimmen; ein Auseinanderlaufen würde entweder fremde
// Tests ausliefern oder eigene stumm blockieren.
//
// Ausführen: node --import tsx __tests__/domain-gate.mjs

import assert from 'node:assert'
import { hostOf } from '../lib/domainGate.ts'

let failed = 0
function check(name, fn) {
  try { fn(); console.log('✓', name) }
  catch (err) { failed++; console.error('✗', name, '\n   ', err.message) }
}

const cases = [
  ['https://example.com', 'example.com'],
  ['https://www.example.com', 'example.com'],
  ['http://www.example.com/pricing', 'example.com'],
  ['https://example.com/a/b?x=1#h', 'example.com'],
  ['EXAMPLE.com/Path', 'example.com'],
  ['  https://example.com  ', 'example.com'],
  ['example.com', 'example.com'],
  ['www.example.com', 'example.com'],
  ['https://sub.example.com', 'sub.example.com'],
  ['https://www.www.example.com', 'www.example.com'], // nur EIN www. entfernen
  ['https://example.co.uk/a', 'example.co.uk'],
]

for (const [input, expected] of cases) {
  check(`${JSON.stringify(input)} → ${expected}`, () => {
    assert.equal(hostOf(input), expected)
  })
}

// Das eigentliche Sicherheitsversprechen: eine fremde Domain darf nicht als
// Treffer gegen die verifizierten Hosts durchgehen.
check('fremder Host matcht nicht die verifizierten Hosts', () => {
  const verified = ['example.com', 'shop.acme.io'].map(hostOf)
  assert.ok(!verified.includes(hostOf('https://evil.com')))
  assert.ok(!verified.includes(hostOf('https://example.com.evil.com')))
  assert.ok(verified.includes(hostOf('https://www.example.com/pricing')))
})

console.log(failed === 0 ? '\n✓ Domain-Gate: alle Checks bestanden.' : `\n✗ ${failed} Check(s) fehlgeschlagen.`)
process.exit(failed === 0 ? 0 : 1)
