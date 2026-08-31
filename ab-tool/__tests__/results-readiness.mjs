// Tests für die Zahlen der Hero-Card auf der Results-Seite.
//
// Anlass war ein konkreter Widerspruch im Dashboard: "83 visitors so far",
// daneben "Visitors/arm 30 / 1.000" und "Conversions/arm 6 / 25", während die
// Variantentabelle für B 16 Conversions auswies. Drei Aggregationen desselben
// Tests ohne Kennzeichnung — plus ein Fortschrittsbalken in den Einstellungen,
// der `min_visitors` als Summe las, obwohl evaluateWinner() pro Arm prüft.
//
// Die Zeitprognose ("wann kann ein Gewinner fallen?") hat eine eigene Datei:
// __tests__/forecast.mjs.
//
// Ausführen: node --import tsx __tests__/results-readiness.mjs

import assert from 'node:assert'
import {
  armCriterion,
  calcUplift,
  computeReadiness,
  conversionRate,
  dailyLift,
  daysSince,
  MIN_CONV_FOR_UPLIFT,
} from '../lib/resultsHelpers.ts'
import {
  evaluateWinner,
  MIN_CONVERSIONS_PER_ARM,
  MIN_VISITORS_PER_ARM,
  MIN_RUNTIME_DAYS,
} from '../lib/significance.ts'

let failed = 0
function check(name, fn) {
  try { fn(); console.log('✓', name) }
  catch (err) { failed++; console.error('✗', name, '\n   ', err.message) }
}

const NOW = Date.parse('2026-08-31T12:00:00Z')
const started = (days) => new Date(NOW - days * 86_400_000).toISOString()

// Der Fall aus dem Bugreport: 83 Besucher gesamt, aufgeteilt 53/30,
// Conversions 6 (A) und 16 (B).
const CASE = { a: { views: 53, conversions: 6 }, b: { views: 30, conversions: 16 } }

check('armCriterion nennt beide Arme und den, der bremst', () => {
  const visitors = armCriterion(CASE.a.views, CASE.b.views, 1000)
  assert.equal(visitors.a, 53)
  assert.equal(visitors.b, 30)
  assert.equal(visitors.lagging, 30)
  assert.equal(visitors.laggingArm, 'B')
  assert.equal(visitors.pct, 3)
  assert.equal(visitors.met, false)

  // Der Conversions-Engpass ist ein ANDERER Arm — genau die Verwechslung,
  // die die alte Anzeige mit zwei nackten Minima erzeugt hat.
  const conv = armCriterion(CASE.a.conversions, CASE.b.conversions, 25)
  assert.equal(conv.lagging, 6)
  assert.equal(conv.laggingArm, 'A')
})

check('Gleichstand hat keinen bremsenden Arm', () => {
  const c = armCriterion(40, 40, 100)
  assert.equal(c.laggingArm, null)
  assert.equal(c.lagging, 40)
})

check('erfülltes Kriterium deckelt bei 100 %', () => {
  const c = armCriterion(2000, 1500, 1000)
  assert.equal(c.met, true)
  assert.equal(c.pct, 100)
})

check('knapp verfehlt rundet nicht auf 100 % auf', () => {
  // 999 von 1.000 als voller Balken neben einem offenen ○ ist genau die Art
  // Widerspruch, um die es hier geht.
  const c = armCriterion(999, 1200, 1000)
  assert.equal(c.met, false)
  assert.equal(c.pct, 99)
  assert.equal(armCriterion(1000, 1000, 1000).pct, 100)
})

check('computeReadiness spiegelt exakt die Gates aus evaluateWinner', () => {
  // Genau auf der Schwelle: alle drei Kriterien erfüllt, ein Gewinner scheitert
  // dann höchstens noch an Konfidenz/Uplift — nicht an einer Menge.
  const a = { views: MIN_VISITORS_PER_ARM, conversions: MIN_CONVERSIONS_PER_ARM }
  const b = { views: MIN_VISITORS_PER_ARM, conversions: MIN_CONVERSIONS_PER_ARM + 40 }
  const r = computeReadiness({
    a, b,
    minVisitorsPerArm: MIN_VISITORS_PER_ARM,
    minConversionsPerArm: MIN_CONVERSIONS_PER_ARM,
    minRuntimeDays: MIN_RUNTIME_DAYS,
    createdAt: started(MIN_RUNTIME_DAYS),
    now: NOW,
  })
  assert.equal(r.allMet, true)
  const verdict = evaluateWinner({
    significance: 0.99, cA: a.conversions, cB: b.conversions, vA: a.views, vB: b.views,
    createdAt: started(MIN_RUNTIME_DAYS), now: NOW,
  })
  assert.notEqual(verdict.reason, 'not-enough-visitors')
  assert.notEqual(verdict.reason, 'not-enough-conversions')
  assert.notEqual(verdict.reason, 'too-early')

  // Ein Besucher weniger in einem Arm: beide Seiten kippen gemeinsam.
  const r2 = computeReadiness({
    a: { ...a, views: a.views - 1 }, b,
    minVisitorsPerArm: MIN_VISITORS_PER_ARM,
    minConversionsPerArm: MIN_CONVERSIONS_PER_ARM,
    minRuntimeDays: MIN_RUNTIME_DAYS,
    createdAt: started(MIN_RUNTIME_DAYS),
    now: NOW,
  })
  assert.equal(r2.allMet, false)
  assert.equal(
    evaluateWinner({
      significance: 0.99, cA: a.conversions, cB: b.conversions, vA: a.views - 1, vB: b.views,
      createdAt: started(MIN_RUNTIME_DAYS), now: NOW,
    }).reason,
    'not-enough-visitors'
  )
})

check('Mindestlaufzeit wird nicht vorzeitig als erfüllt gemeldet', () => {
  const base = {
    a: { views: 5000, conversions: 100 },
    b: { views: 5000, conversions: 140 },
    minVisitorsPerArm: MIN_VISITORS_PER_ARM,
    minConversionsPerArm: MIN_CONVERSIONS_PER_ARM,
    minRuntimeDays: MIN_RUNTIME_DAYS,
    now: NOW,
  }
  assert.equal(computeReadiness({ ...base, createdAt: started(6.9) }).runtime.met, false)
  assert.equal(computeReadiness({ ...base, createdAt: started(7.1) }).runtime.met, true)
  assert.equal(computeReadiness({ ...base, createdAt: started(7.1) }).allMet, true)
})

check('daysSince ist nie negativ und verträgt Müll', () => {
  assert.equal(daysSince(new Date(NOW + 86_400_000).toISOString(), NOW), 0)
  assert.equal(daysSince('not-a-date', NOW), 0)
  assert.equal(Math.round(daysSince(started(3), NOW)), 3)
})

check('Uplift rechnet aus Rohzählern, nicht aus gerundeten Raten', () => {
  // 0,44 % vs. 0,52 %: auf eine Nachkommastelle gerundet (0,4 / 0,5) hätte die
  // alte Formel "+25 %" angezeigt. Der wahre Wert liegt bei rund +18 %.
  const a = { views: 25000, conversions: 110 } // 0.44 %
  const b = { views: 25000, conversions: 130 } // 0.52 %
  const lift = calcUplift(a, b)
  assert.ok(Math.abs(lift - 18.18) < 0.01, `erwartet ~18.18, war ${lift}`)
  const rounded = ((0.5 - 0.4) / 0.4) * 100
  assert.equal(Math.round(rounded), 25) // das war die alte Anzeige
})

check('Uplift ohne Basis ist null statt Infinity', () => {
  assert.equal(calcUplift({ views: 100, conversions: 0 }, { views: 100, conversions: 5 }), null)
  assert.equal(calcUplift({ views: 0, conversions: 0 }, { views: 100, conversions: 5 }), null)
  assert.equal(calcUplift({ views: 100, conversions: 5 }, { views: 0, conversions: 0 }), null)
})

check('conversionRate rundet nicht', () => {
  assert.equal(conversionRate(0, 0), 0)
  assert.ok(Math.abs(conversionRate(25000, 110) - 0.44) < 1e-9)
})

function day(va, vb, ca, cb) {
  return { date: '2026-08-30', visitors_a: va, visitors_b: vb, conversions_a: ca, conversions_b: cb }
}

check('Tages-Uplift schweigt, solange der Tag zu duenn ist', () => {
  // 1 gegen 4 Conversions sind "+300 %" — dieselbe Zahl, die die Hero-Card
  // zwei Boxen weiter oben bewusst zurueckhaelt.
  assert.equal(dailyLift(day(50, 50, 1, 4)), null)
  assert.equal(dailyLift(day(500, 500, 9, 30)), null) // ein Arm knapp darunter
  assert.equal(MIN_CONV_FOR_UPLIFT, 10)
})

check('Tages-Uplift rechnet ab der Schwelle wie die Hero-Card', () => {
  const lift = dailyLift(day(1000, 1000, 10, 20))
  assert.equal(lift, 100)
  assert.equal(
    lift,
    calcUplift({ views: 1000, conversions: 10 }, { views: 1000, conversions: 20 })
  )
})

check('Tage ohne Besucher im Arm kippen den Uplift nicht auf Infinity', () => {
  assert.equal(dailyLift(day(0, 500, 0, 12)), null)
  assert.equal(dailyLift(day(500, 0, 12, 0)), null)
})

if (failed > 0) {
  console.error(`\n${failed} Test(s) fehlgeschlagen`)
  process.exit(1)
}
console.log('\nAlle Readiness-Tests bestanden')
