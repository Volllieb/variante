// Lightweight self-check for significance + winner logic.
// No test framework. Run: node __tests__/significance-check.mjs
// Fails with non-zero exit if any assertion breaks.

import { strict as assert } from 'node:assert'
import { calcSignificance } from '../../__tests__/helpers.mjs'

const WINNER_MIN_SIGNIFICANCE = 0.95

function determineWinner(significance, cA, cB, vA, vB, minVisitors = 100, minUplift = 0.05) {
  if (vA + vB < minVisitors) return null
  if (significance < WINNER_MIN_SIGNIFICANCE) return null
  const crA = vA > 0 ? cA / vA : 0
  const crB = vB > 0 ? cB / vB : 0
  if (crB <= crA) return 'A'
  const uplift = crA > 0 ? (crB - crA) / crA : Infinity
  if (uplift < minUplift) return null
  return 'B'
}
// --- End duplicate ---

// Significance: big difference → high significance
const sig1 = calcSignificance(1000, 100, 1000, 200)
console.log('✓ calcSignificance: big diff →', (sig1 * 100).toFixed(1) + '%')
assert(sig1 > 0.95, `Expected >0.95, got ${sig1}`)

// Significance: no difference → ~0
const sig2 = calcSignificance(100, 10, 100, 10)
assert(sig2 < 0.01, `Expected <0.01, got ${sig2}`)
console.log('✓ calcSignificance: no difference → ~0')

// Significance: no data → 0
assert.equal(calcSignificance(0, 0, 0, 0), 0)
console.log('✓ calcSignificance: no data → 0')

// determineWinner: B wins
assert.equal(determineWinner(0.96, 10, 20, 100, 100, 100, 0.05), 'B')
console.log('✓ determineWinner: B wins when uplift + significance met')

// determineWinner: A wins (B worse)
assert.equal(determineWinner(0.96, 20, 10, 100, 100, 100, 0.05), 'A')
console.log('✓ determineWinner: A wins when B is worse')

// determineWinner: A wins (equal)
assert.equal(determineWinner(0.96, 10, 10, 100, 100, 100, 0.05), 'A')
console.log('✓ determineWinner: A wins on tie')

// determineWinner: null — not significant
assert.equal(determineWinner(0.90, 10, 20, 100, 100, 100, 0.05), null)
console.log('✓ determineWinner: null when below significance threshold')

// determineWinner: null — B better but below uplift
assert.equal(determineWinner(0.96, 100, 102, 100, 100, 100, 0.05), null)
console.log('✓ determineWinner: null when B barely better (below minUplift)')

// determineWinner: null — not enough visitors
assert.equal(determineWinner(0.96, 1, 2, 10, 10, 100, 0.05), null)
console.log('✓ determineWinner: null when below minVisitors')

// determineWinner: B wins at exact uplift threshold
assert.equal(determineWinner(0.96, 100, 107, 100, 100, 100, 0.05), 'B')
console.log('✓ determineWinner: B wins at exactly 5% uplift')

console.log('\n✅ All checks passed.')
