// Laufzeit-Guard fuer lib/sanitize in der Vercel-Runtime.
//
// Am 25.08.2026 lag das Produkt einen Tag lang tot: /api/resolve lieferte auf
// jeder Methode die statische /500, keine Kundenseite bekam eine Variante.
// Ursache war kein Logikfehler, sondern der Modul-Import — jsdom zieht CJS-
// Pakete nach, die ESM-Dateien require()n:
//
//   jsdom 29:   @exodus/bytes/encoding-lite.js    aus html-encoding-sniffer 6
//   jsdom 27.3: @csstools/css-calc/dist/index.mjs aus @asamuzakjp/css-color
//
// Vercels Node-Runtime unterstuetzt require(esm) nicht. Lokal schon — deshalb
// war der Ausfall weder mit `npm run dev` noch mit `next start` reproduzierbar
// und fiel erst durch eine Probe aus der Produktion auf.
//
// `node --no-experimental-require-module` schaltet require(esm) ab und bildet
// die Vercel-Runtime damit exakt nach. Dieser Test haelt das fest: ein
// Dependency-Bump, der die Kette wieder einzieht, faellt hier auf, nicht erst
// als Ausfall in der Produktion.
//
// Run: node __tests__/sanitize-runtime.mjs

import { spawnSync } from 'node:child_process'
import { strict as assert } from 'node:assert'
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)
const entry = require_.resolve('isomorphic-dompurify')
const jsdomVersion = require_(
  require_.resolve('jsdom/package.json', { paths: [entry] })
).version

let passed = 0
let failed = 0

function check(label, fn) {
  try {
    fn()
    console.log(`  ✓ ${label}`)
    passed++
  } catch (err) {
    console.log(`  ✗ ${label} — ${err.message}`)
    failed++
  }
}

console.log('\n── lib/sanitize ohne require(esm) (Vercel-Runtime) ──\n')
console.log(`  jsdom hinter isomorphic-dompurify: ${jsdomVersion}
`)

const script = `
  const DOMPurify = require(process.argv[1])
  if (!DOMPurify.isSupported) { console.error('isSupported=false'); process.exit(2) }
  // Event-Handler muss verschwinden, valider Inhalt muss bleiben.
  const out = DOMPurify.sanitize('<div onclick="alert(1)"><b>ok</b></div>')
  if (/ on[a-z]+\s*=/i.test(out)) { console.error('Event-Handler ueberlebt: ' + out); process.exit(3) }
  if (!out.includes('<b>ok</b>')) { console.error('valides HTML verloren: ' + out); process.exit(4) }
  console.log('OK')
`

const run = spawnSync(
  process.execPath,
  ['--no-experimental-require-module', '-e', script, entry],
  { encoding: 'utf8' }
)

const output = `${run.stdout || ''}${run.stderr || ''}`.trim()

check('isomorphic-dompurify laedt ohne require(esm)', () => {
  assert.ok(
    !output.includes('ERR_REQUIRE_ESM'),
    `ERR_REQUIRE_ESM — eine Transitive require()t wieder ESM:\n    ${output.split('\n').find(l => l.includes('ERR_REQUIRE_ESM')) || output.slice(0, 300)}`
  )
})

check('DOMPurify meldet isSupported (kein stiller Fail-Open)', () => {
  assert.notEqual(run.status, 2, 'isSupported=false — DOMPurify gibt die Eingabe unveraendert zurueck')
})

check('Sanitization greift auch ohne require(esm)', () => {
  assert.equal(run.status, 0, `Exit ${run.status}: ${output.slice(0, 300)}`)
  assert.ok(output.includes('OK'), output.slice(0, 300))
})

console.log(`\n${'─'.repeat(46)}`)
console.log(`  ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.log('  ❌ lib/sanitize wuerde auf Vercel nicht laden.')
  process.exit(1)
}
console.log('  ✅ Alle Tests bestanden.')
