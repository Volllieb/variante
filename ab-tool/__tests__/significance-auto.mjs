// z-test for two proportions — auto-check (CI use).
// Run: node __tests__/significance-auto.mjs
import { strict as assert } from 'node:assert'
import { calcSignificance } from './helpers.mjs'

// --- 5 Tests ---
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`✗ ${name}: ${err.message}`);
  }
}

// 1. Equal proportions → significance ≈ 0
check('equal proportions → ~0', () => {
  const s = calcSignificance(1000, 100, 1000, 100)
  assert(s < 0.01, `Expected <0.01, got ${s}`);
});

// 2. Big difference → significance close to 1
check('big difference → ~1', () => {
  const s = calcSignificance(1000, 100, 1000, 200)
  assert(s > 0.99, `Expected >0.99, got ${s}`);
});

// 3. No data → 0
check('no data → 0', () => {
  assert.equal(calcSignificance(0, 0, 0, 0), 0)
});

// 4. Small sample, small difference → low significance
check('small sample → below 0.80', () => {
  const s = calcSignificance(50, 5, 50, 8)
  assert(s < 0.80, `Expected <0.80, got ${s}`);
});

// 5. Large sample, moderate difference → high significance
check('large sample, moderate diff → >0.85', () => {
  const s = calcSignificance(5000, 500, 5000, 550)
  assert(s > 0.85, `Expected >0.85, got ${s}`);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log('\n✅ All 5 tests passed.');
