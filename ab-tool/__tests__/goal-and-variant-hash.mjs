// Welle-1-Regressionen aus docs/edge-cases.md: RUN-03 und EDIT-01
//
// RUN-03 — "url:/danke" war im Dashboard als Zieltyp waehlbar, in ab.js aber nie
// implementiert. normGoal reichte den Wert unveraendert weiter, er landete als
// CSS-Selektor in e.target.closest(), der SyntaxError verschwand im catch der
// Event-Delegation, und der Test zaehlte auf BEIDEN Armen dauerhaft null
// Conversions — ohne Fehlermeldung irgendwo.
//
// EDIT-01 — Der Client-Cache haelt das gerenderte HTML von Variante B, nicht
// bloss die Zuweisung. Ohne Versionsbezug behielten bereits zugewiesene
// B-Besucher nach einer Bearbeitung die alte Fassung dauerhaft, waehrend neue
// Besucher die neue sahen. Beide zaehlten in dieselben conversions_b.
//
// Run: node --import tsx __tests__/goal-and-variant-hash.mjs

import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { variantHash } from '../lib/variantHash.ts'

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

// ── normGoal aus ab.js extrahieren (nicht nachbauen — sonst driftet der Test) ─
const AB_JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'ab.js')
const source = readFileSync(AB_JS, 'utf8')

const START = source.indexOf('  function normGoal')
assert.ok(START > 0, 'normGoal in ab.js nicht gefunden')
const END = source.indexOf('\n  }', START) + '\n  }'.length
const BLOCK = source.slice(START, END)

const warnings = []
const normGoal = new Function(
  'console',
  `${BLOCK}\n return normGoal`
)({ warn: (m) => warnings.push(String(m)) })

const SEL = '#hero .cta'

console.log('\n── RUN-03: normGoal ──\n')

check('click:-Praefix wird abgeschnitten', () => {
  assert.equal(normGoal('click:.btn-primary', SEL), '.btn-primary')
})

check('leeres Goal faellt auf den Test-Selektor zurueck', () => {
  assert.equal(normGoal('', SEL), SEL)
  assert.equal(normGoal(null, SEL), SEL)
})

check('"click:" ohne Selektor faellt auf den Test-Selektor zurueck', () => {
  assert.equal(normGoal('click:', SEL), SEL)
})

check('nackter Selektor bleibt unveraendert', () => {
  assert.equal(normGoal('.signup-link', SEL), '.signup-link')
})

check('url:-Goal liefert KEIN Goal statt eines kaputten Selektors', () => {
  warnings.length = 0
  assert.equal(normGoal('url:/danke', SEL), '')
})

check('url:-Goal meldet sich in der Konsole, statt still zu scheitern', () => {
  warnings.length = 0
  normGoal('url:/checkout/success', SEL)
  assert.equal(warnings.length, 1, 'keine Warnung ausgegeben')
  assert.ok(/URL goals/i.test(warnings[0]), warnings[0])
})

check('Pseudoklassen werden NICHT als unbekanntes Praefix verworfen', () => {
  // Die url:-Sperre darf nicht generisch "alles vor einem Doppelpunkt" treffen.
  assert.equal(normGoal('a:hover', SEL), 'a:hover')
  assert.equal(normGoal('.btn:first-child', SEL), '.btn:first-child')
  assert.equal(normGoal('click:.card:nth-child(2)', SEL), '.card:nth-child(2)')
})

console.log('\n── EDIT-01: variantHash ──\n')

check('gleicher Inhalt → gleicher Hash', () => {
  assert.equal(variantHash('<b>Los</b>', '.x{color:red}'), variantHash('<b>Los</b>', '.x{color:red}'))
})

check('geaendertes HTML → anderer Hash', () => {
  assert.notEqual(variantHash('<b>Jetzt starten</b>', null), variantHash('<b>Jetzt kaufen</b>', null))
})

check('geaendertes CSS allein reicht fuer einen anderen Hash', () => {
  assert.notEqual(variantHash('<b>Los</b>', '.x{color:red}'), variantHash('<b>Los</b>', '.x{color:blue}'))
})

check('HTML/CSS-Grenze ist nicht verschiebbar', () => {
  // Ohne Trennzeichen waeren ("ab", "c") und ("a", "bc") derselbe Hash.
  assert.notEqual(variantHash('ab', 'c'), variantHash('a', 'bc'))
})

check('kein Inhalt → null (Test ohne generierte Variante)', () => {
  assert.equal(variantHash(null, null), null)
  assert.equal(variantHash(undefined, undefined), null)
  assert.equal(variantHash('', ''), null)
})

check('Hash ist eine kompakte Zeichenkette', () => {
  const h = variantHash('<div class="hero">' + 'x'.repeat(5000) + '</div>', null)
  assert.equal(typeof h, 'string')
  assert.ok(h.length > 0 && h.length <= 8, `unerwartete Laenge: ${h}`)
})

check('Unicode bricht den Hash nicht', () => {
  assert.equal(typeof variantHash('Jetzt günstig kaufen — 50 % 🎉', null), 'string')
})

console.log(`\n${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
