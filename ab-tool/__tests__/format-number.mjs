// Tests für lib/formatNumber.ts.
//
// Die Fälle hier sind die, an denen die alten Inline-Formatierungen konkret
// falsch lagen — eine Regression daran wäre im Dashboard nicht als Bug
// sichtbar, sondern nur als "die Zahl sieht komisch aus":
//
//   1. formatCompact schneidet ab, statt zu runden (1500 → 1.5k, nie 2k)
//   2. formatDelta erzeugt kein vorzeichenbehaftetes Null (-0.04 → 0.0%)
//   3. formatPercent hält die Nachkommastelle fest (3 → 3.0%)
//
// Ausführen: node --import tsx __tests__/format-number.mjs

import assert from 'node:assert'
import { formatCount, formatPercent, formatDelta, formatCompact } from '../lib/formatNumber.ts'

let failed = 0
function check(name, fn) {
  try { fn(); console.log('✓', name) }
  catch (err) { failed++; console.error('✗', name, '\n   ', err.message) }
}

check('formatCount setzt Tausendertrenner', () => {
  assert.equal(formatCount(1234), '1,234')
  assert.equal(formatCount(1234567), '1,234,567')
  assert.equal(formatCount(0), '0')
  assert.equal(formatCount(999), '999')
})

check('formatCount ist locale-stabil (kein Hydration-Mismatch)', () => {
  // Ohne feste Locale liefert eine de-DE-Runtime "1.234" statt "1,234".
  assert.equal(formatCount(1234), '1,234')
  assert.ok(!formatCount(1234).includes('.'))
})

check('formatPercent haelt die Nachkommastelle fest', () => {
  assert.equal(formatPercent(3), '3.0%')
  assert.equal(formatPercent(3.4), '3.4%')
  assert.equal(formatPercent(0), '0.0%')
  assert.equal(formatPercent(12.35, 2), '12.35%')
})

check('formatDelta setzt + nur bei echten Zuwaechsen', () => {
  assert.equal(formatDelta(2.4), '+2.4%')
  assert.equal(formatDelta(-1.2), '-1.2%')
  assert.equal(formatDelta(0), '0.0%')
})

check('formatDelta erzeugt kein vorzeichenbehaftetes Null', () => {
  // Der alte Ausdruck `${x > 0 ? '+' : ''}${x.toFixed(1)}%` lieferte "-0.0%".
  assert.equal(formatDelta(-0.04), '0.0%')
  assert.equal(formatDelta(-0.0001), '0.0%')
  assert.equal(formatDelta(0.04), '0.0%')
})

check('formatCompact schneidet ab statt zu runden', () => {
  // Kern des TestCard-Bugs: toFixed(0) machte aus 1500 Besuchern "2k".
  assert.equal(formatCompact(1500), '1.5k')
  assert.equal(formatCompact(1499), '1.4k')
  assert.equal(formatCompact(1999), '1.9k')
  assert.equal(formatCompact(1000), '1k')
})

check('formatCompact hat ein M-Tier', () => {
  // Vorher fehlend: 1500000 rendert als "1500k" in einen 40px-Kreis.
  assert.equal(formatCompact(1500000), '1.5M')
  assert.equal(formatCompact(1000000), '1M')
  assert.equal(formatCompact(999999), '999.9k')
})

check('formatCompact laesst kleine Zahlen unangetastet', () => {
  assert.equal(formatCompact(0), '0')
  assert.equal(formatCompact(999), '999')
  assert.equal(formatCompact(42), '42')
})

check('Sonderwerte brechen nicht', () => {
  assert.equal(formatCount(Infinity), '∞')
  assert.equal(formatCompact(Infinity), '∞')
  assert.equal(formatCount(NaN), '–')
  assert.equal(formatPercent(NaN), '–')
  assert.equal(formatDelta(NaN), '–')
})

check('negative Werte behalten ihr Vorzeichen', () => {
  assert.equal(formatCompact(-1500), '-1.5k')
  assert.equal(formatCount(-1234), '-1,234')
})

if (failed) { console.error(`\n${failed} Test(s) fehlgeschlagen`); process.exit(1) }
console.log('\nalle Tests bestanden')
