// Tests für die Entscheidungs-Ableitung der Dashboard-Overview.
//
// Die Overview sagt dem Kunden "dieser Test ist entscheidungsreif". Eine
// falsche Zeile hier führt dazu, dass er eine Variante ausrollt, die nichts
// bringt — oder einen kaputten Test weiterlaufen lässt. Die Regeln greifen
// in fester Reihenfolge, deshalb prüfen die Fixtures vor allem, dass die
// richtige Regel gewinnt.
//
// Ausführen: node --import tsx __tests__/decisions.mjs

import assert from 'node:assert'
import {
  DECISION_ORDER,
  deriveDecisions,
  estimateTimeToDecision,
  sortByDecisionReadiness,
} from '../lib/decisions.ts'

let failed = 0
function check(name, fn) {
  try { fn(); console.log('✓', name) }
  catch (err) { failed++; console.error('✗', name, '\n   ', err.message) }
}

const NOW = Date.parse('2026-08-26T12:00:00Z')
const daysAgo = (d) => new Date(NOW - d * 86_400_000).toISOString()

function test(overrides) {
  return {
    id: 'x',
    name: 'Test',
    status: 'active',
    winner: null,
    created_at: daysAgo(10),
    visitors_a: 0,
    visitors_b: 0,
    conversions_a: 0,
    conversions_b: 0,
    health_status: null,
    health_issues: null,
    ...overrides,
  }
}

const kindOf = (t) => {
  const d = deriveDecisions([t], NOW)
  return d.length === 0 ? null : d[0].kind
}

/* ── Einzelne Regeln ── */

check('deklarierter Gewinner → winner', () => {
  assert.equal(kindOf(test({ status: 'done', winner: 'B' })), 'winner')
  assert.equal(kindOf(test({ status: 'done', winner: 'A' })), 'winner')
})

check('Gewinner ohne status=done ist noch kein Rollout-Hinweis', () => {
  // winner gesetzt, aber der Test läuft noch — keine winner-Zeile.
  assert.notEqual(kindOf(test({ status: 'active', winner: 'B' })), 'winner')
})

check('Schwellen erfüllt und B klar vorn → ready', () => {
  const t = test({
    visitors_a: 5000, conversions_a: 250,   // 5.0 %
    visitors_b: 5000, conversions_b: 350,   // 7.0 %
    created_at: daysAgo(10),
  })
  assert.equal(kindOf(t), 'ready')
})

check('unter der Mindest-Stichprobe gibt es keine ready-Zeile', () => {
  const t = test({
    visitors_a: 200, conversions_a: 10,
    visitors_b: 200, conversions_b: 30,
    created_at: daysAgo(10),
  })
  assert.notEqual(kindOf(t), 'ready')
})

check('zu kurze Laufzeit verhindert ready (Wochenzyklus)', () => {
  const t = test({
    visitors_a: 5000, conversions_a: 250,
    visitors_b: 5000, conversions_b: 350,
    created_at: daysAgo(2),
  })
  assert.equal(kindOf(t), null)
})

check('Sample Ratio Mismatch → broken-data', () => {
  const t = test({
    visitors_a: 1000, conversions_a: 10,
    visitors_b: 1400, conversions_b: 10,
    traffic_split: 50,
    created_at: daysAgo(10),
  })
  assert.equal(kindOf(t), 'broken-data')
})

check('ein konfigurierter 60/40-Split ist kein Mismatch', () => {
  const t = test({
    visitors_a: 1000, conversions_a: 10,
    visitors_b: 1500, conversions_b: 10,
    traffic_split: 60,
    created_at: daysAgo(10),
  })
  assert.notEqual(kindOf(t), 'broken-data')
})

check('Health-Issues → health', () => {
  const t = test({ health_status: 'issues', health_issues: ['missing_selector'] })
  assert.equal(kindOf(t), 'health')
})

check('ein Draft mit Health-Issues ist unfertig, nicht kaputt → draft', () => {
  // Wichtig für die Aktion: draft öffnet den Wizard, health die Results-Seite.
  const t = test({ status: 'draft', health_status: 'issues', health_issues: ['missing_goal'] })
  const d = deriveDecisions([t], NOW)[0]
  assert.equal(d.kind, 'draft')
  assert.equal(d.action.href, null)
})

check('Draft ohne offene Schritte braucht keine Entscheidung', () => {
  assert.equal(kindOf(test({ status: 'draft', health_issues: [] })), null)
})

check('lange Laufzeit ohne Signal → stalled', () => {
  const t = test({
    visitors_a: 5000, conversions_a: 250,
    visitors_b: 5000, conversions_b: 252,   // praktisch identisch
    created_at: daysAgo(30),
  })
  assert.equal(kindOf(t), 'stalled')
})

check('lange Laufzeit mit aussichtsloser Hochrechnung → stalled', () => {
  const t = test({
    visitors_a: 100, conversions_a: 2,
    visitors_b: 100, conversions_b: 3,
    created_at: daysAgo(20),               // 10 Besucher/Tag → ~180 Tage
  })
  assert.equal(kindOf(t), 'stalled')
})

check('junger Test mit wenig Traffic ist nicht stalled', () => {
  const t = test({
    visitors_a: 100, conversions_a: 2,
    visitors_b: 100, conversions_b: 3,
    created_at: daysAgo(3),
  })
  assert.equal(kindOf(t), null)
})

check('gut laufender Test ohne offene Frage taucht nicht auf', () => {
  const t = test({
    visitors_a: 600, conversions_a: 30,
    visitors_b: 600, conversions_b: 33,
    created_at: daysAgo(2),
  })
  assert.equal(kindOf(t), null)
})

/* ── Reihenfolge ── */

check('deriveDecisions sortiert nach Priorität', () => {
  const tests = [
    test({ id: 'draft', status: 'draft', health_issues: ['missing_goal'] }),
    test({ id: 'broken', visitors_a: 1000, visitors_b: 1400, conversions_a: 10, conversions_b: 10 }),
    test({ id: 'won', status: 'done', winner: 'B' }),
    test({ id: 'health', health_status: 'issues', health_issues: ['missing_selector'] }),
  ]
  const kinds = deriveDecisions(tests, NOW).map((d) => d.kind)
  assert.deepEqual(kinds, ['winner', 'broken-data', 'health', 'draft'])
  // Die Reihenfolge muss der dokumentierten Prioritätsliste folgen.
  const ranks = kinds.map((k) => DECISION_ORDER.indexOf(k))
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b))
})

check('Tests ohne Entscheidung erscheinen gar nicht', () => {
  const tests = [test({ id: 'quiet' }), test({ id: 'won', status: 'done', winner: 'B' })]
  const d = deriveDecisions(tests, NOW)
  assert.equal(d.length, 1)
  assert.equal(d[0].testId, 'won')
})

/* ── Restweg ── */

check('estimateTimeToDecision rechnet fehlende Besucher pro Arm', () => {
  const t = test({ visitors_a: 400, visitors_b: 600, created_at: daysAgo(10) })
  const est = estimateTimeToDecision(t, NOW)
  assert.equal(est.visitorsNeeded, 1000)   // (1000-400) + (1000-600), nur zur Anzeige
  // ponytail: Hier stand 10 — aus 1000 fehlenden Besuchern geteilt durch das
  // GESAMTTEMPO von 100/Tag. Die Arme füllen sich aber parallel, jeder mit
  // seinem eigenen Tempo: A bekommt 40/Tag und braucht für die fehlenden 600
  // noch 15 Tage, B ist nach 6,7 Tagen fertig. Maßgeblich ist der langsamere.
  assert.equal(est.daysNeeded, 15)
})

check('ein einseitiger Split wird nicht mehr schöngerechnet', () => {
  // 90/10: A ist längst durch, B kriecht mit 20/Tag. Die alte Formel teilte
  // die 800 fehlenden Besucher durch 520/Tag Gesamttempo und meldete "~2 Tage".
  const t = test({ visitors_a: 5000, visitors_b: 200, created_at: daysAgo(10) })
  assert.equal(estimateTimeToDecision(t, NOW).daysNeeded, 40)
})

check('das Tempo der letzten Tage schlägt das Lebenszeit-Mittel', () => {
  // Erst zäh, seit drei Tagen Kampagne. Ohne Tageszeilen bleibt es beim Mittel.
  const t = test({ visitors_a: 520, visitors_b: 520, created_at: daysAgo(30) })
  const dateAgo = (d) => new Date(NOW - d * 86_400_000).toISOString().slice(0, 10)
  const daily = []
  for (const back of [10, 9, 8, 7, 6, 5, 4]) {
    daily.push({ test_id: t.id, date: dateAgo(back), visitors_a: 10, visitors_b: 10, conversions_a: 0, conversions_b: 0 })
  }
  for (const back of [3, 2, 1]) {
    daily.push({ test_id: t.id, date: dateAgo(back), visitors_a: 150, visitors_b: 150, conversions_a: 5, conversions_b: 5 })
  }
  assert.equal(estimateTimeToDecision(t, NOW).daysNeeded, 28)
  assert.equal(estimateTimeToDecision(t, NOW, daily).daysNeeded, 4)
})

check('erreichte Schwelle → nichts mehr offen', () => {
  const t = test({ visitors_a: 1200, visitors_b: 1100, created_at: daysAgo(10) })
  assert.deepEqual(estimateTimeToDecision(t, NOW), { visitorsNeeded: 0, daysNeeded: 0 })
})

check('ein höherer min_visitors-Wert verschiebt die Schwelle nach oben', () => {
  const t = test({ visitors_a: 1200, visitors_b: 1100, min_visitors: 2000, created_at: daysAgo(10) })
  assert.equal(estimateTimeToDecision(t, NOW).visitorsNeeded, 1700)
})

check('die Tage-Hochrechnung wackelt nicht wegen ein paar Millisekunden', () => {
  // created_at exakt 10 Tage her, ausgewertet 5 ms später: ohne Kürzung vor
  // dem Aufrunden zeigt dieselbe Datenlage mal "~10d" und mal "~11d".
  const t = test({ visitors_a: 400, visitors_b: 600, created_at: daysAgo(10) })
  assert.equal(estimateTimeToDecision(t, NOW).daysNeeded, 15)
  assert.equal(estimateTimeToDecision(t, NOW + 5).daysNeeded, 15)
})

check('frischer Test ohne messbares Tempo wird nicht hochgerechnet', () => {
  const t = test({ visitors_a: 5, visitors_b: 5, created_at: new Date(NOW - 3600_000).toISOString() })
  assert.equal(estimateTimeToDecision(t, NOW).daysNeeded, null)
})

/* ── Sortierung der Top-5 ── */

check('sortByDecisionReadiness stellt Entscheidungen nach vorn', () => {
  const quiet = test({ id: 'quiet', visitors_a: 90_000, visitors_b: 90_000 })
  const draft = test({ id: 'draft', status: 'draft', health_issues: ['missing_goal'] })
  const won = test({ id: 'won', status: 'done', winner: 'B' })
  const tests = [quiet, draft, won]
  const sorted = sortByDecisionReadiness(tests, deriveDecisions(tests, NOW))
  assert.deepEqual(sorted.map((t) => t.id), ['won', 'draft', 'quiet'])
})

check('sortByDecisionReadiness mutiert die Eingabe nicht', () => {
  const tests = [test({ id: 'a' }), test({ id: 'b', status: 'done', winner: 'B' })]
  const before = tests.map((t) => t.id)
  sortByDecisionReadiness(tests, deriveDecisions(tests, NOW))
  assert.deepEqual(tests.map((t) => t.id), before)
})

console.log(failed === 0 ? '\n✓ Decisions: alle Checks bestanden.' : `\n✗ ${failed} Check(s) fehlgeschlagen.`)
process.exit(failed === 0 ? 0 : 1)
