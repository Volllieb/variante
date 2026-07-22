// Tests für die Gewinner-Schwellen aus lib/significance.ts (Plan STAT-01).
//
// Ausführen: node --import tsx __tests__/winner-guards.mjs

import assert from 'node:assert'
import {
  evaluateWinner,
  calcSignificance,
  hasSampleRatioMismatch,
  MIN_VISITORS_PER_ARM,
  MIN_CONVERSIONS_PER_ARM,
} from '../lib/significance.ts'

let failed = 0
function check(name, fn) {
  try {
    fn()
    console.log('✓', name)
  } catch (err) {
    failed++
    console.error('✗', name, '\n   ', err.message)
  }
}

const DAY = 86_400_000
const now = Date.UTC(2026, 6, 22)
const longAgo = new Date(now - 30 * DAY).toISOString()
const yesterday = new Date(now - 1 * DAY).toISOString()

/** Baut einen Fall mit gegebenen Zahlen und berechneter Signifikanz. */
function verdict({ vA, cA, vB, cB, createdAt = longAgo, ...rest }) {
  return evaluateWinner({
    significance: calcSignificance(vA, cA, vB, cB),
    vA, cA, vB, cB, createdAt, now,
    ...rest,
  })
}

// ── Das Kernproblem: früher Ausreißer darf nicht gewinnen ──────────────────
check('winziges Sample mit extremem Unterschied gewinnt NICHT', () => {
  // 50 Besucher pro Arm, B doppelt so gut. Unter der alten Regel
  // (vA + vB >= 100) war das ein gültiger Gewinner.
  const v = verdict({ vA: 50, cA: 5, vB: 50, cB: 15 })
  assert.equal(v.winner, null, `entschied ${v.winner} (${v.reason})`)
  assert.equal(v.reason, 'not-enough-visitors')
})

check('genug Besucher, aber zu wenige Conversions → kein Gewinner', () => {
  // Der z-Test braucht n·p >= 10; darunter ist der p-Wert nicht gültig.
  const v = verdict({ vA: 5000, cA: 5, vB: 5000, cB: 20 })
  assert.equal(v.winner, null, `entschied ${v.winner}`)
  assert.equal(v.reason, 'not-enough-conversions')
})

check('genug Daten, aber Test läuft erst einen Tag → kein Gewinner', () => {
  const v = verdict({ vA: 5000, cA: 250, vB: 5000, cB: 400, createdAt: yesterday })
  assert.equal(v.winner, null, `entschied ${v.winner}`)
  assert.equal(v.reason, 'too-early')
})

check('Mindest-Stichprobe gilt PRO ARM, nicht in Summe', () => {
  // 90/10-Split: in Summe reichlich, im kleinen Arm nicht.
  const v = verdict({ vA: 9000, cA: 450, vB: 200, cB: 30 })
  assert.equal(v.winner, null, `entschied ${v.winner}`)
  assert.equal(v.reason, 'not-enough-visitors')
})

// ── Der Positivfall muss weiterhin funktionieren ───────────────────────────
check('sauberer Fall mit klarem Uplift → B gewinnt', () => {
  const v = verdict({ vA: 10000, cA: 300, vB: 10000, cB: 420 })
  assert.equal(v.winner, 'B', `reason: ${v.reason}`)
  assert.equal(v.reason, 'decided')
})

check('B signifikant besser, aber unter minUplift → weiterlaufen lassen', () => {
  // 5,0 % vs 5,3 % bei n=100k pro Arm: statistisch klar (z ≈ 3), praktisch
  // aber nur +6 % relativ — unter der konfigurierten Schwelle von 20 %.
  const v = verdict({ vA: 100000, cA: 5000, vB: 100000, cB: 5300, minUplift: 0.2 })
  assert.equal(v.winner, null, `entschied ${v.winner}`)
  assert.equal(v.reason, 'below-min-uplift')
})

check('B schlechter als A bei klarer Datenlage → A gewinnt', () => {
  const v = verdict({ vA: 10000, cA: 420, vB: 10000, cB: 300 })
  assert.equal(v.winner, 'A', `reason: ${v.reason}`)
})

check('genug Daten, aber kein signifikanter Unterschied → null', () => {
  const v = verdict({ vA: 10000, cA: 300, vB: 10000, cB: 305 })
  assert.equal(v.winner, null, `entschied ${v.winner}`)
  assert.equal(v.reason, 'not-significant')
})

check('konfiguriertes min_visitors kann die Untergrenze nur ANHEBEN', () => {
  // Ein Kunde setzt 100 — der Boden von MIN_VISITORS_PER_ARM greift trotzdem.
  const v = verdict({ vA: 200, cA: 30, vB: 200, cB: 60, minVisitorsPerArm: 100 })
  assert.equal(v.reason, 'not-enough-visitors')
  // Umgekehrt: ein höherer Wert wird respektiert.
  const v2 = verdict({ vA: 3000, cA: 150, vB: 3000, cB: 210, minVisitorsPerArm: 5000 })
  assert.equal(v2.reason, 'not-enough-visitors')
})

check('Schwellenwerte sind belastbar dimensioniert', () => {
  assert.ok(MIN_VISITORS_PER_ARM >= 1000, 'Mindest-Besucher pro Arm zu niedrig')
  assert.ok(MIN_CONVERSIONS_PER_ARM >= 10, 'Mindest-Conversions pro Arm zu niedrig')
})

// ── Sample Ratio Mismatch ──────────────────────────────────────────────────
check('SRM: 50/50 konfiguriert, aber 70/30 gemessen → Alarm', () => {
  assert.equal(hasSampleRatioMismatch(7000, 3000, 50), true)
})

check('SRM: normale Schwankung schlägt nicht an', () => {
  assert.equal(hasSampleRatioMismatch(5040, 4960, 50), false)
})

check('SRM: konfigurierter 90/10-Split ist kein Mismatch', () => {
  assert.equal(hasSampleRatioMismatch(9000, 1000, 10), false)
})

check('SRM: zu wenig Daten → keine Aussage', () => {
  assert.equal(hasSampleRatioMismatch(80, 20, 50), false)
})

console.log(failed === 0 ? '\n✓ Winner-Guards: alle Checks bestanden.' : `\n✗ ${failed} Check(s) fehlgeschlagen.`)
process.exit(failed === 0 ? 0 : 1)
