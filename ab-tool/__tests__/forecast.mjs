// Tests für die Zeitprognose: wann kann dieser Test einen Gewinner bekommen?
//
// Die Zahl steht auf der Results-Seite ("~2 weeks until a winner can be
// called") und auf der Overview ("at this pace it needs ~N more days"). Sie
// entscheidet, ob jemand einen Test weiterlaufen lässt oder abbricht — eine
// Fehleinschätzung um den Faktor 20 (das alte Lebenszeit-Mittel nach einem
// Traffic-Sprung) kostet Wochen.
//
// Ausführen: node --import tsx __tests__/forecast.mjs

import assert from 'node:assert'
import {
  estimateDaysToSignificance,
  estimateVisitorGap,
  forecastDecision,
  formatHorizon,
  measureTrafficRate,
  FORECAST_HORIZON_DAYS,
  RECENT_WINDOW_DAYS,
  SHIFT_WINDOW_DAYS,
} from '../lib/forecast.ts'
import { MIN_CONVERSIONS_PER_ARM, MIN_RUNTIME_DAYS, MIN_VISITORS_PER_ARM } from '../lib/significance.ts'

let failed = 0
function check(name, fn) {
  try { fn(); console.log('✓', name) }
  catch (err) { failed++; console.error('✗', name, '\n   ', err.message) }
}

// Fixes "jetzt": mitten am Tag, damit "heute" ein angefangener Tag ist.
const NOW = Date.parse('2026-08-31T12:00:00Z')
const DAY = 86_400_000
const started = (days) => new Date(NOW - days * DAY).toISOString()
/** Datum vor `d` Tagen als YYYY-MM-DD. */
const dateAgo = (d) => new Date(NOW - d * DAY).toISOString().slice(0, 10)

/** Tageszeilen: `perDay` als [va, vb, ca, cb] je Tag, jüngster Tag zuletzt. */
function days(spec) {
  return spec.map(([back, va, vb, ca, cb]) => ({
    date: dateAgo(back),
    visitors_a: va,
    visitors_b: vb,
    conversions_a: ca,
    conversions_b: cb,
  }))
}

const base = {
  significance: 0.5,
  significanceLevel: 0.95,
  minVisitorsPerArm: MIN_VISITORS_PER_ARM,
  minConversionsPerArm: MIN_CONVERSIONS_PER_ARM,
  minRuntimeDays: MIN_RUNTIME_DAYS,
  now: NOW,
}

/* ── Tempo-Messung ── */

check('ohne Tageszeilen zählt das Lebenszeit-Mittel', () => {
  const rate = measureTrafficRate({
    daily: [],
    a: { views: 300, conversions: 30 },
    b: { views: 300, conversions: 30 },
    createdAt: started(10),
    now: NOW,
  })
  assert.equal(rate.basis, 'lifetime')
  assert.equal(rate.visitorsA, 30)
  assert.equal(rate.changeFactor, null)
})

check('der angefangene heutige Tag zieht das Tempo nicht nach unten', () => {
  // Sieben volle Tage à 100/Arm, plus eine heutige Zeile mit erst 3 Besuchern.
  const daily = days([
    [7, 100, 100, 5, 5], [6, 100, 100, 5, 5], [5, 100, 100, 5, 5], [4, 100, 100, 5, 5],
    [3, 100, 100, 5, 5], [2, 100, 100, 5, 5], [1, 100, 100, 5, 5],
    [0, 3, 3, 0, 0],
  ])
  const rate = measureTrafficRate({
    daily,
    a: { views: 703, conversions: 35 },
    b: { views: 703, conversions: 35 },
    createdAt: started(7.5),
    now: NOW,
  })
  assert.equal(rate.basis, 'recent')
  assert.equal(rate.windowDays, RECENT_WINDOW_DAYS)
  assert.equal(rate.visitorsA, 100)
})

check('ein Traffic-Sprung schlägt sofort auf die Messung durch', () => {
  // 20/Tag über Wochen, seit drei Tagen 2.000/Tag (Launch).
  const daily = days([
    [10, 10, 10, 0, 0], [9, 10, 10, 0, 0], [8, 10, 10, 0, 0], [7, 10, 10, 0, 0],
    [6, 10, 10, 0, 0], [5, 10, 10, 0, 0], [4, 10, 10, 0, 0],
    [3, 1000, 1000, 20, 25], [2, 1000, 1000, 20, 25], [1, 1000, 1000, 20, 25],
  ])
  const rate = measureTrafficRate({
    daily,
    a: { views: 3070, conversions: 60 },
    b: { views: 3070, conversions: 75 },
    createdAt: started(30),
    now: NOW,
  })
  assert.equal(rate.basis, 'shift')
  assert.equal(rate.windowDays, SHIFT_WINDOW_DAYS)
  assert.equal(rate.visitorsA, 1000)
  assert.ok(rate.changeFactor > 50, `changeFactor war ${rate.changeFactor}`)
})

check('ein Traffic-Einbruch ebenso', () => {
  const daily = days([
    [7, 1000, 1000, 20, 20], [6, 1000, 1000, 20, 20], [5, 1000, 1000, 20, 20],
    [4, 1000, 1000, 20, 20],
    [3, 20, 20, 0, 0], [2, 20, 20, 0, 0], [1, 20, 20, 0, 0],
  ])
  const rate = measureTrafficRate({
    daily,
    a: { views: 4060, conversions: 80 },
    b: { views: 4060, conversions: 80 },
    createdAt: started(20),
    now: NOW,
  })
  assert.equal(rate.basis, 'shift')
  assert.equal(rate.visitorsA, 20)
  assert.ok(rate.changeFactor < 0.5)
})

check('normale Schwankung löst keinen Fensterwechsel aus', () => {
  // Wochenende schwächer, aber kein Sprung: das 7-Tage-Fenster bleibt.
  const daily = days([
    [7, 100, 100, 5, 5], [6, 120, 120, 6, 6], [5, 60, 60, 3, 3], [4, 55, 55, 3, 3],
    [3, 110, 110, 5, 5], [2, 105, 105, 5, 5], [1, 95, 95, 4, 4],
  ])
  const rate = measureTrafficRate({
    daily,
    a: { views: 645, conversions: 31 },
    b: { views: 645, conversions: 31 },
    createdAt: started(7.5),
    now: NOW,
  })
  assert.equal(rate.basis, 'recent')
  assert.ok(rate.changeFactor > 0.5 && rate.changeFactor < 2)
})

check('fehlende Tageszeilen sind kein Beweis für fehlenden Traffic', () => {
  // Der Cron hat eine Woche lang nichts geschrieben. Ohne diesen Rückfall
  // erklärte die Prognose einen laufenden Test für tot.
  const daily = days([[30, 500, 500, 20, 20], [29, 500, 500, 20, 20], [28, 500, 500, 20, 20]])
  const rate = measureTrafficRate({
    daily,
    a: { views: 1500, conversions: 60 },
    b: { views: 1500, conversions: 60 },
    createdAt: started(30),
    now: NOW,
  })
  assert.equal(rate.basis, 'lifetime')
  assert.equal(rate.visitorsA, 50)
})

/* ── Prognose ── */

check('die Prognose folgt dem langsameren Arm, nicht der Summe', () => {
  // 90/10-Split: A ist längst durch, B kriecht. Eine Rechnung über die Summe
  // käme auf wenige Tage.
  const forecast = forecastDecision({
    ...base,
    a: { views: 5000, conversions: 250 },
    b: { views: 200, conversions: 30 },
    createdAt: started(10),
    now: NOW,
    daily: [],
  })
  // B: 20 Besucher/Tag, es fehlen 800 → 40 Tage.
  assert.equal(forecast.days, 40)
  assert.equal(forecast.limitedBy, 'visitors')
})

check('nach einem Sprung wird die Prognose sofort korrigiert', () => {
  const slow = days([
    [10, 10, 10, 0, 0], [9, 10, 10, 0, 0], [8, 10, 10, 0, 0], [7, 10, 10, 0, 0],
    [6, 10, 10, 0, 0], [5, 10, 10, 0, 0], [4, 10, 10, 0, 0],
  ])
  const jumped = [
    ...slow,
    ...days([[3, 150, 150, 5, 5], [2, 150, 150, 5, 5], [1, 150, 150, 5, 5]]),
  ]
  // 7 ruhige Tage à 10 + 3 laute à 150 = 520 Besucher pro Arm, 15 Conversions.
  const counts = { a: { views: 520, conversions: 15 }, b: { views: 520, conversions: 15 } }

  // Ohne Tageszeilen: Lebenszeit-Mittel über 30 Tage ≈ 17/Tag → über vier Wochen.
  const naive = forecastDecision({ ...base, ...counts, createdAt: started(30), now: NOW, daily: [] })
  // Mit ihnen: 150/Tag seit dem Sprung → wenige Tage.
  const smart = forecastDecision({ ...base, ...counts, createdAt: started(30), now: NOW, daily: jumped })

  assert.equal(smart.rate.basis, 'shift')
  assert.equal(naive.rate.basis, 'lifetime')
  assert.equal(naive.days, 28)
  assert.equal(smart.days, 4)
})

check('versiegter Traffic wird nicht als Restlaufzeit verkauft', () => {
  const daily = days([
    [7, 800, 800, 20, 20], [6, 800, 800, 20, 20], [5, 800, 800, 20, 20], [4, 800, 800, 20, 20],
    [3, 0, 0, 0, 0], [2, 0, 0, 0, 0], [1, 0, 0, 0, 0],
  ])
  const forecast = forecastDecision({
    ...base,
    a: { views: 3200, conversions: 80 },
    b: { views: 500, conversions: 12 },
    createdAt: started(10),
    now: NOW,
    daily,
  })
  assert.equal(forecast.days, null)
  assert.equal(forecast.limitedBy, 'no-traffic')
})

check('die Mindestlaufzeit ist die Untergrenze', () => {
  const forecast = forecastDecision({
    ...base,
    significance: 0.99,
    a: { views: 40_000, conversions: 900 },
    b: { views: 40_000, conversions: 1000 },
    createdAt: started(2),
    now: NOW,
    daily: [],
  })
  assert.equal(forecast.days, 5)
  assert.equal(forecast.limitedBy, 'runtime')
})

check('Conversions können der Engpass sein, nicht die Besucher', () => {
  // Besucher längst da, aber die Conversion Rate ist winzig.
  const forecast = forecastDecision({
    ...base,
    a: { views: 20_000, conversions: 4 },
    b: { views: 20_000, conversions: 6 },
    createdAt: started(10),
    now: NOW,
    daily: [],
  })
  assert.equal(forecast.limitedBy, 'conversions')
  assert.ok(forecast.days > 10)
})

check('alle Bedingungen erfüllt → keine Schätzung, sondern "bereit"', () => {
  // Vertrag der alten estimateDaysToReady ("alles erfüllt → keine Schätzung
  // mehr", results-readiness.mjs) — der Umbau hatte ihn stillschweigend in
  // "~1 day until a winner can be called" verwandelt.
  const forecast = forecastDecision({
    ...base,
    significance: 0.99,
    a: { views: 40_000, conversions: 900 },
    b: { views: 40_000, conversions: 1000 },
    createdAt: started(30),
    now: NOW,
    daily: [],
  })
  assert.equal(forecast.days, null)
  assert.equal(forecast.limitedBy, 'ready')
})

check('B unter der Mindest-Uplift-Schwelle → Blockade statt Termin', () => {
  // Alle Schwellen erfüllt, signifikant — aber der Vorsprung (2 %) liegt unter
  // der Mindest-Schwelle (5 %). evaluateWinner() antwortet dann dauerhaft
  // 'below-min-uplift' und deklariert nie; die alte Prognose verkaufte den
  // Zustand als "~1 day until a winner can be called" (bzw. nach dem
  // 'ready'-Fix als "sofort entscheidbar").
  const forecast = forecastDecision({
    ...base,
    significance: 0.99,
    a: { views: 40_000, conversions: 1000 },
    b: { views: 40_000, conversions: 1020 },
    createdAt: started(30),
    now: NOW,
    daily: [],
  })
  assert.equal(forecast.days, null)
  assert.equal(forecast.limitedBy, 'uplift')
})

check('B nicht vorn ist keine Uplift-Blockade — A kann gewinnen', () => {
  // crB < crA: der Gate aus evaluateWinner() greift nicht (dann gewinnt A),
  // der Test ist also sofort entscheidbar, sobald alles andere steht.
  const forecast = forecastDecision({
    ...base,
    significance: 0.99,
    a: { views: 40_000, conversions: 1000 },
    b: { views: 40_000, conversions: 900 },
    createdAt: started(30),
    now: NOW,
    daily: [],
  })
  assert.equal(forecast.days, null)
  assert.equal(forecast.limitedBy, 'ready')
})

check('null Conversions in einem Arm → Goal-Diagnose statt no-traffic', () => {
  // B bekommt vollen Traffic, aber das Goal zählt nichts (kaputtes Tracking,
  // url:-Goal): "One variant is getting no traffic" wäre die falsche Diagnose.
  const forecast = forecastDecision({
    ...base,
    a: { views: 5000, conversions: 100 },
    b: { views: 5000, conversions: 0 },
    createdAt: started(10),
    now: NOW,
    daily: [],
  })
  assert.equal(forecast.days, null)
  assert.equal(forecast.limitedBy, 'no-conversions')
})

check('bereits getrackte Conversions, nur die letzten 7 Tage flau → kein Fehlalarm', () => {
  // B hat 2 Conversions — beide vor über einer Woche, seither Flaute. Das
  // Recent-Fenster (7 Tage) misst dafür 0/Tag, obwohl das Goal nachweislich
  // schon gefeuert hat. "no-conversions" wäre hier eine falsche Diagnose
  // ("goal may not be firing") für einen Arm, der längst konvertiert hat.
  const forecast = forecastDecision({
    ...base,
    a: { views: 5000, conversions: 100 },
    b: { views: 4000, conversions: 2 },
    createdAt: started(20),
    now: NOW,
    daily: days([
      [6, 200, 150, 5, 0], [5, 200, 150, 4, 0], [4, 200, 150, 6, 0],
      [3, 200, 150, 5, 0], [2, 200, 150, 4, 0], [1, 200, 150, 5, 0],
      [0, 200, 150, 5, 0],
    ]),
  })
  assert.notEqual(forecast.limitedBy, 'no-conversions')
})

check('frischer Test ohne Besucher ist keine no-traffic-Lage', () => {
  const forecast = forecastDecision({
    ...base,
    a: { views: 0, conversions: 0 },
    b: { views: 0, conversions: 0 },
    createdAt: started(0.01),
    now: NOW,
    daily: [],
  })
  assert.equal(forecast.days, null)
  assert.equal(forecast.limitedBy, 'insufficient-data')
})

check('ein Cron-Ausfall verdünnt das Tempo nicht', () => {
  // 5 der letzten 7 Tage fehlen — die 2 vorhandenen zeigen 1.000 Besucher/Tag.
  // Vorher teilte rateOver durch 7: die Prognose wurde 3,5× pessimistischer.
  const daily = days([
    [7, 1000, 1000, 50, 50],
    [6, 1000, 1000, 50, 50],
  ])
  const rate = measureTrafficRate({
    daily,
    a: { views: 2000, conversions: 100 },
    b: { views: 2000, conversions: 100 },
    createdAt: started(30),
    now: NOW,
  })
  assert.equal(rate.basis, 'recent')
  assert.equal(rate.visitorsA, 1000)
})

check('jenseits des Horizonts gibt es keine Zahl mehr', () => {
  const forecast = forecastDecision({
    ...base,
    a: { views: 50, conversions: 1 },
    b: { views: 50, conversions: 1 },
    createdAt: started(10),
    now: NOW,
    daily: [],
  })
  assert.equal(forecast.days, null)
  assert.equal(forecast.limitedBy, 'beyond-horizon')
})

check('eine nicht schätzbare Signifikanz macht die Zahl zur Untergrenze', () => {
  // Keine einzige Conversion in A → estimateDaysToSignificance liefert nichts.
  // Der Termin kann dadurch nur später werden, nie früher.
  const forecast = forecastDecision({
    ...base,
    significance: 0,
    a: { views: 3000, conversions: 30 },
    b: { views: 3000, conversions: 30 },
    createdAt: started(10),
    now: NOW,
    daily: [],
  })
  assert.equal(forecast.lowerBound, true)
  assert.ok(forecast.days !== null)
})

check('alles erreicht und trotzdem knapp: mindestens ein Tag', () => {
  const forecast = forecastDecision({
    ...base,
    significance: 0.9,
    a: { views: 3000, conversions: 100 },
    b: { views: 3000, conversions: 130 },
    createdAt: started(20),
    now: NOW,
    daily: [],
  })
  assert.ok(forecast.days >= 1)
  assert.equal(forecast.limitedBy, 'significance')
})

/* ── Darstellung ── */

check('formatHorizon vermeidet Scheingenauigkeit', () => {
  assert.equal(formatHorizon(1), '~1 day')
  assert.equal(formatHorizon(9), '~9 days')
  assert.equal(formatHorizon(14), '~14 days')
  assert.equal(formatHorizon(21), '~3 weeks')
  assert.equal(formatHorizon(65), '~2 months')
  assert.equal(formatHorizon(FORECAST_HORIZON_DAYS), '~3 months')
})

/* ── Overview-Variante ── */

check('estimateVisitorGap rechnet pro Arm und nutzt dasselbe Tempo', () => {
  const gap = estimateVisitorGap({
    a: { views: 400, conversions: 20 },
    b: { views: 600, conversions: 30 },
    createdAt: started(10),
    now: NOW,
  })
  assert.equal(gap.visitorsNeeded, 1000) // (1000-400) + (1000-600), nur zur Anzeige
  // A: 40/Tag, es fehlen 600 → 15 Tage. B waere nach 6,7 Tagen fertig.
  assert.equal(gap.daysNeeded, 15)
})

check('erreichte Schwelle → nichts mehr offen', () => {
  const gap = estimateVisitorGap({
    a: { views: 1200, conversions: 60 },
    b: { views: 1100, conversions: 55 },
    createdAt: started(10),
    now: NOW,
  })
  assert.deepEqual(gap, { visitorsNeeded: 0, daysNeeded: 0 })
})

check('frischer Test ohne messbares Tempo wird nicht hochgerechnet', () => {
  const gap = estimateVisitorGap({
    a: { views: 5, conversions: 0 },
    b: { views: 5, conversions: 0 },
    createdAt: new Date(NOW - 3600_000).toISOString(),
    now: NOW,
  })
  assert.equal(gap.daysNeeded, null)
})

/* ── Signifikanz-Hochrechnung ── */

check('estimateDaysToSignificance schweigt ohne Datenbasis', () => {
  assert.equal(estimateDaysToSignificance(50, 0.5, started(2), 0.95, NOW), null)
  assert.equal(estimateDaysToSignificance(5000, 0, started(2), 0.95, NOW), null)
  assert.equal(estimateDaysToSignificance(5000, 0.99, started(2), 0.95, NOW), null)
})

check('estimateDaysToSignificance wächst, je schwächer das Signal ist', () => {
  const stark = estimateDaysToSignificance(5000, 0.9, started(10), 0.95, NOW)
  const schwach = estimateDaysToSignificance(5000, 0.6, started(10), 0.95, NOW)
  assert.ok(schwach > stark, `schwach=${schwach} stark=${stark}`)
})

if (failed > 0) {
  console.error(`\n${failed} Test(s) fehlgeschlagen`)
  process.exit(1)
}
console.log('\nAlle Forecast-Tests bestanden')
