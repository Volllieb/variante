// Tests für die Zeitraum-Arithmetik der Dashboard-Overview.
//
// Die KPI-Kacheln zeigen "Visitors letzte 7 Tage, +12 % zur Vorperiode". Wenn
// die Fensterberechnung um einen Tag verrutscht, ist das keine ungenaue Zahl,
// sondern eine falsche — und niemand sieht es der Kachel an. Deshalb feste
// Fixtures und ein fixes `now`.
//
// Ausführen: node --import tsx __tests__/dashboard-stats.mjs

import assert from 'node:assert'
import { aggregatePeriod, buildTrend, dayKey, shiftDay } from '../lib/dashboardStats.ts'

let failed = 0
function check(name, fn) {
  try { fn(); console.log('✓', name) }
  catch (err) { failed++; console.error('✗', name, '\n   ', err.message) }
}

// Fixes "jetzt": 2026-08-26, mitten am Tag (UTC).
const NOW = Date.parse('2026-08-26T12:00:00Z')

function row(test_id, date, va, vb, ca, cb) {
  return { test_id, date, visitors_a: va, visitors_b: vb, conversions_a: ca, conversions_b: cb }
}

check('dayKey/shiftDay rechnen in UTC und über Monatsgrenzen', () => {
  assert.equal(dayKey(NOW), '2026-08-26')
  assert.equal(shiftDay('2026-08-26', -6), '2026-08-20')
  assert.equal(shiftDay('2026-03-01', -1), '2026-02-28')
  assert.equal(shiftDay('2026-01-01', -1), '2025-12-31')
})

check('aggregatePeriod summiert nur das aktuelle Fenster', () => {
  const rows = [
    row('t1', '2026-08-26', 100, 100, 5, 5),  // heute → current
    row('t1', '2026-08-20', 50, 50, 2, 3),    // Tag 7 → current (Rand)
    row('t1', '2026-08-19', 999, 999, 99, 99), // Tag 8 → previous
  ]
  const res = aggregatePeriod(rows, ['t1'], 7, NOW)
  assert.equal(res.current.visitors, 300)
  assert.equal(res.current.conversions, 15)
  assert.equal(res.previous.visitors, 1998)
})

check('Vorperiode ist das unmittelbar davorliegende Fenster gleicher Länge', () => {
  const rows = [
    row('t1', '2026-08-26', 100, 0, 10, 0),   // current
    row('t1', '2026-08-19', 50, 0, 5, 0),     // previous (Tag 8)
    row('t1', '2026-08-13', 40, 0, 4, 0),     // previous (Tag 14, Rand)
    row('t1', '2026-08-12', 500, 0, 50, 0),   // Tag 15 → außerhalb
  ]
  const res = aggregatePeriod(rows, ['t1'], 7, NOW)
  assert.equal(res.current.visitors, 100)
  assert.equal(res.previous.visitors, 90)
  assert.ok(Math.abs(res.delta.visitors - ((100 - 90) / 90) * 100) < 1e-9)
})

check('fremde Tests fließen nicht ein', () => {
  const rows = [
    row('t1', '2026-08-25', 10, 10, 1, 1),
    row('t2', '2026-08-25', 999, 999, 99, 99),
  ]
  const res = aggregatePeriod(rows, ['t1'], 7, NOW)
  assert.equal(res.current.visitors, 20)
})

check('Conversion Rate in Prozent, Δ in Prozentpunkten', () => {
  const rows = [
    row('t1', '2026-08-26', 100, 100, 5, 5),  // 200 Besucher, 10 Conv → 5.0 %
    row('t1', '2026-08-19', 100, 100, 2, 2),  // 200 Besucher, 4 Conv  → 2.0 %
  ]
  const res = aggregatePeriod(rows, ['t1'], 7, NOW)
  assert.equal(res.current.cr, 5)
  assert.equal(res.previous.cr, 2)
  assert.ok(Math.abs(res.delta.crPoints - 3) < 1e-9)
})

check('leere Vorperiode liefert null statt einer erfundenen Steigerung', () => {
  const rows = [row('t1', '2026-08-26', 100, 100, 5, 5)]
  const res = aggregatePeriod(rows, ['t1'], 7, NOW)
  assert.equal(res.previous.visitors, 0)
  assert.equal(res.delta.visitors, null)
  assert.equal(res.delta.conversions, null)
  assert.equal(res.delta.crPoints, null)
})

check('ohne Tests bleibt alles null/0', () => {
  const res = aggregatePeriod([row('t1', '2026-08-26', 10, 10, 1, 1)], [], 7, NOW)
  assert.equal(res.current.visitors, 0)
  assert.equal(res.delta.visitors, null)
})

check('buildTrend liefert lückenlos aufsteigende Tage', () => {
  const rows = [
    row('t1', '2026-08-26', 10, 10, 1, 1),
    row('t1', '2026-08-24', 5, 5, 0, 1),
  ]
  const trend = buildTrend(rows, ['t1'], 7, NOW)
  assert.equal(trend.length, 7)
  assert.equal(trend[0].date, '2026-08-20')
  assert.equal(trend[6].date, '2026-08-26')
  assert.equal(trend[6].visitors, 20)
  assert.equal(trend[4].visitors, 10)   // 2026-08-24
  assert.equal(trend[5].visitors, 0)    // 2026-08-25 — Lücke, nicht ausgelassen
  assert.equal(trend[6].conversions, 2)
})

check('buildTrend addiert mehrere Tests pro Tag', () => {
  const rows = [
    row('t1', '2026-08-26', 10, 0, 1, 0),
    row('t2', '2026-08-26', 7, 3, 0, 2),
    row('t3', '2026-08-26', 999, 0, 99, 0), // nicht im Scope
  ]
  const trend = buildTrend(rows, ['t1', 't2'], 7, NOW)
  assert.equal(trend[6].visitors, 20)
  assert.equal(trend[6].conversions, 3)
})

check('Invariante: Summe über alle Tage = Summe der Zeilen', () => {
  const rows = []
  for (let i = 0; i < 30; i++) {
    rows.push(row('t1', shiftDay('2026-08-26', -i), i, i * 2, i % 3, i % 5))
  }
  const trend = buildTrend(rows, ['t1'], 30, NOW)
  const trendSum = trend.reduce((s, p) => s + p.visitors, 0)
  const rowSum = rows.reduce((s, r) => s + r.visitors_a + r.visitors_b, 0)
  assert.equal(trendSum, rowSum)

  const agg = aggregatePeriod(rows, ['t1'], 30, NOW)
  assert.equal(agg.current.visitors, rowSum)
})

console.log(failed === 0 ? '\n✓ Dashboard-Stats: alle Checks bestanden.' : `\n✗ ${failed} Check(s) fehlgeschlagen.`)
process.exit(failed === 0 ? 0 : 1)
