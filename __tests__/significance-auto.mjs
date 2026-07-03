// ponytail: z-test for two proportions — re-implemented locally (no imports).
// Run: node __tests__/significance-auto.mjs
// Fails with non-zero exit if any assertion breaks.
import { strict as assert } from 'node:assert';

// --- Normal-CDF approximation (Abramowitz & Stegun) ---
function normCDF(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

// --- z-test for two proportions ---
function calculateSignificance(vA, cA, vB, cB) {
  // Guard: no data or zero visitors in either group → cannot compute
  if (vA === 0 || vB === 0 || cA + cB === 0) return 0;

  const pA = cA / vA;
  const pB = cB / vB;
  const pPooled = (cA + cB) / (vA + vB);

  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / vA + 1 / vB));
  // Guard: zero standard error (e.g. all-or-nothing conversions)
  if (se === 0) return 0;

  const z = (pB - pA) / se;
  // Two-tailed p-value
  const pValue = 2 * (1 - normCDF(Math.abs(z)));
  return 1 - pValue;
}

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
  const s = calculateSignificance(1000, 100, 1000, 100);
  assert(s < 0.01, `Expected <0.01, got ${s}`);
});

// 2. Big difference → significance close to 1
check('big difference → ~1', () => {
  const s = calculateSignificance(1000, 100, 1000, 200);
  assert(s > 0.99, `Expected >0.99, got ${s}`);
});

// 3. No data → 0
check('no data → 0', () => {
  assert.equal(calculateSignificance(0, 0, 0, 0), 0);
});

// 4. Small sample, small difference → low significance
check('small sample → below 0.80', () => {
  const s = calculateSignificance(50, 5, 50, 8);
  assert(s < 0.80, `Expected <0.80, got ${s}`);
});

// 5. Large sample, moderate difference → high significance
check('large sample, moderate diff → >0.85', () => {
  const s = calculateSignificance(5000, 500, 5000, 550);
  assert(s > 0.85, `Expected >0.85, got ${s}`);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log('\n✅ All 5 tests passed.');
