#!/usr/bin/env node

/**
 * ab-bot.mjs — Traffic simulator for A/B test validation.
 *
 * Hits the test page with real browsers (Playwright), respects variant
 * assignment via ab.js, and optionally clicks conversion goals.
 *
 * Usage:
 *   node scripts/ab-bot.mjs                           # 100 visitors, random conversions
 *   node scripts/ab-bot.mjs --visitors 500 --conv 0.3 # 500 visitors, 30% conversion rate
 *   node scripts/ab-bot.mjs --headless=false          # Show browser windows
 *   node scripts/ab-bot.mjs --prod                    # Use prod ab.js, not localhost
 *   node scripts/ab-bot.mjs --goal hero_cta_primary   # Only click specific goal
 *
 * Prerequisites: npm run dev (or prod deploy) must be running.
 */

import { chromium } from 'playwright';
import { parseArgs } from 'node:util';

// ── CLI args ──────────────────────────────────────────────────────────
const { values } = parseArgs({
  options: {
    visitors:    { type: 'string', default: '100' },
    conv:        { type: 'string', default: '0.15' },   // conversion rate (0-1)
    headless:    { type: 'string', default: 'true' },
    prod:        { type: 'string', default: 'false' },
    goal:        { type: 'string', default: '' },        // empty = random pick
    base:        { type: 'string', default: 'http://localhost:3000' },
    parallel:    { type: 'string', default: '4' },       // concurrent browsers
    delay:       { type: 'string', default: '100' },     // ms between visitors
  },
});

const N = parseInt(values.visitors);
const CONV_RATE = parseFloat(values.conv);
const HEADLESS = values.headless !== 'false';
const IS_PROD = values.prod === 'true';
const GOAL = values.goal;
const BASE = values.base.replace(/\/+$/, '');
const PARALLEL = parseInt(values.parallel);
const DELAY = parseInt(values.delay);

// ── Possible conversion goals ────────────────────────────────────────
const GOALS = [
  'hero_cta_primary',
  'hero_cta_secondary',
  'nav_signup',
  'feature_click',
  'pricing_starter',
  'pricing_pro',
  'bottom_cta_primary',
  'bottom_cta_secondary',
  'signup_submit_btn',
];

// ── Stats tracking ────────────────────────────────────────────────────
const stats = { visitors: 0, variantA: 0, variantB: 0, conversions: 0, errors: 0 };
const startTime = Date.now();

// ── Helper: Sleep ─────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Single visitor ────────────────────────────────────────────────────
async function visit(id) {
  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({
    userAgent: `ab-bot/${id} Mozilla/5.0 (TestBot)`,
    viewport: { width: 1280 + Math.floor(Math.random() * 400), height: 800 },
  });
  const page = await context.newPage();

  try {
    const url = `${BASE}/test-page/?ab_env=${IS_PROD ? 'prod' : 'local'}&_ab_bot=${id}`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

    // Wait for ab.js to resolve and apply variant
    await page.waitForFunction(
      () => window.__ab_tests && Object.keys(window.__ab_tests).length > 0,
      { timeout: 8000 }
    ).catch(() => {
      // ab.js might not have resolved — that's fine, still counts as visitor
    });

    // Read variant assignments
    const tests = await page.evaluate(() => {
      const t = window.__ab_tests || {};
      const result = {};
      for (const [id, data] of Object.entries(t)) {
        result[id] = { variant: data.variant, element: data.element };
      }
      return result;
    });

    // Track variant distribution (first test only for simplicity)
    const firstKey = Object.keys(tests)[0];
    if (firstKey && tests[firstKey].variant) {
      if (tests[firstKey].variant === 'B') stats.variantB++;
      else stats.variantA++;
    }

    // ── Conversion: decide if this visitor converts ──────────────────
    const shouldConvert = Math.random() < CONV_RATE;
    if (shouldConvert) {
      // Pick a goal
      const goal = GOAL || GOALS[Math.floor(Math.random() * GOALS.length)];
      const selector = `[data-ab-goal="${goal}"]`;

      const el = page.locator(selector).first();
      if (await el.count() > 0) {
        await el.scrollIntoViewIfNeeded();
        await sleep(50 + Math.random() * 200); // human-ish delay
        await el.click();
        stats.conversions++;
      }

      // If goal is signup_submit_btn, also fill the form first
      if (goal === 'signup_submit_btn') {
        await page.fill('#signup-name', `Bot User ${id}`);
        await page.fill('#signup-email', `bot${id}@test.variante.dev`);
        await page.fill('#signup-password', 'test12345678');
      }
    }

    await sleep(300 + Math.random() * 700); // dwell time
  } catch (err) {
    stats.errors++;
    if (!HEADLESS) console.error(`  [${id}] Error:`, err.message.slice(0, 80));
  } finally {
    await browser.close();
  }

  stats.visitors++;

  // Progress dot
  if (stats.visitors % 10 === 0 || stats.visitors === N) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const rate = (stats.visitors / parseFloat(elapsed)).toFixed(1);
    process.stdout.write(
      `\r  Visitors: ${stats.visitors}/${N} | ` +
      `A: ${stats.variantA} B: ${stats.variantB} | ` +
      `Conv: ${stats.conversions} | ` +
      `Errors: ${stats.errors} | ` +
      `${rate}/s | ${elapsed}s`
    );
  }
}

// ── Main: Run visitors in parallel batches ────────────────────────────
async function main() {
  console.log('');
  console.log('  🤖 AB Bot — Traffic Simulator');
  console.log(`  Target:  ${BASE}/test-page/`);
  console.log(`  Env:     ${IS_PROD ? 'prod' : 'local'}`);
  console.log(`  Visitors: ${N} | Conv rate: ${(CONV_RATE * 100).toFixed(0)}% | Parallel: ${PARALLEL}`);
  console.log(`  Goal:    ${GOAL || 'random'}`);
  console.log('');

  for (let i = 0; i < N; i += PARALLEL) {
    const batch = [];
    for (let j = 0; j < PARALLEL && i + j < N; j++) {
      batch.push(visit(i + j + 1));
    }
    await Promise.all(batch);
    if (DELAY > 0 && i + PARALLEL < N) await sleep(DELAY);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n');
  console.log('  ── Results ──');
  console.log(`  Total visitors:  ${stats.visitors}`);
  console.log(`  Variant A:       ${stats.variantA} (${(stats.variantA / Math.max(stats.visitors, 1) * 100).toFixed(1)}%)`);
  console.log(`  Variant B:       ${stats.variantB} (${(stats.variantB / Math.max(stats.visitors, 1) * 100).toFixed(1)}%)`);
  console.log(`  Conversions:     ${stats.conversions} (${(stats.conversions / Math.max(stats.visitors, 1) * 100).toFixed(1)}%)`);
  console.log(`  Errors:          ${stats.errors}`);
  console.log(`  Duration:        ${elapsed}s`);
  console.log(`  Avg rate:        ${(stats.visitors / parseFloat(elapsed)).toFixed(1)} visitors/s`);
  console.log('');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
