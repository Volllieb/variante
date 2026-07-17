#!/usr/bin/env node

/**
 * ab-bot.mjs — Traffic simulator for A/B test validation (V3).
 *
 * Simuliert echte Besucher mit Playwright. Respektiert die Variant-Zuweisung
 * von ab.js und klickt Conversion-Goals. Perfekt zum Testen von:
 *   - Conversion-Messung (landen Klicks in der DB?)
 *   - Significance-Auto-Berechnung (wird der Winner erkannt?)
 *
 * Usage:
 *   node scripts/ab-bot.mjs                                    # 100 visitors, random conv
 *   node scripts/ab-bot.mjs --visitors 200 --conv-rate 0.3     # 200 visitors, 30% CR
 *   node scripts/ab-bot.mjs --bias B                           # Nur B konvertiert → Winner B
 *   node scripts/ab-bot.mjs --goal hero_cta_primary            # Nur diesen Goal klicken
 *   node scripts/ab-bot.mjs --headless=false                   # Browser-Fenster zeigen
 *   node scripts/ab-bot.mjs --prod                             # Gegen Production
 *   node scripts/ab-bot.mjs --loop --delay 500                 # Endlos, 500ms Pause
 *
 * Prerequisites:
 *   npm run dev (im ab-tool/) muss laufen. Playwright installiert.
 */

import { chromium } from 'playwright';
import { parseArgs } from 'node:util';

// ── CLI args ──────────────────────────────────────────────────────────
const { values } = parseArgs({
  options: {
    visitors:   { type: 'string', default: '100' },
    'conv-rate':{ type: 'string', default: '0.20' },  // 0–1
    bias:       { type: 'string', default: 'none' },   // A | B | none
    goal:       { type: 'string', default: '' },        // empty = random
    headless:   { type: 'string', default: 'true' },
    prod:       { type: 'string', default: 'false' },
    base:       { type: 'string', default: 'http://localhost:3000' },
    parallel:   { type: 'string', default: '4' },
    delay:      { type: 'string', default: '100' },
    loop:       { type: 'string', default: 'false' },
  },
});

const N = parseInt(values.visitors);
const CONV_RATE = parseFloat(values['conv-rate']);
const BIAS = values.bias.toLowerCase(); // 'a' | 'b' | 'none'
const HEADLESS = values.headless !== 'false';
const IS_PROD = values.prod === 'true';
const GOAL = values.goal;
const BASE = values.base.replace(/\/+$/, '');
const PARALLEL = parseInt(values.parallel);
const DELAY = parseInt(values.delay);
const LOOP = values.loop === 'true';

// ── Goals aus der Test-Page ───────────────────────────────────────────
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

// ── Stats ─────────────────────────────────────────────────────────────
const stats = {
  visitors: 0,
  variantA: 0,
  variantB: 0,
  variantUnknown: 0,
  conversions: 0,
  convByVariant: { A: 0, B: 0, unknown: 0 },
  errors: 0,
};
const startTime = Date.now();

// ── Helpers ───────────────────────────────────────────────────────────
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
    const url = `${BASE}/test-page/?ab_env=${IS_PROD ? 'prod' : 'local'}&_bot=${id}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Warte bis ab.js fertig ist: __ab_pending wird von reveal() entfernt.
    // Maximal 10s warten, dann weitermachen (Seite ist trotzdem sichtbar).
    await page.waitForFunction(
      () => {
        const html = document.documentElement;
        return !html.classList.contains('__ab_pending') || window.__ab_pending_resolve === true;
      },
      { timeout: 10000 }
    ).catch(() => {
      // ab.js hat vielleicht nicht geladen (Netzwerk, Cold Start). Kein Problem —
      // die Seite ist nach 10s Anti-Flicker-Timeout ohnehin sichtbar.
    });

    // Kleiner Extra-Wait für DOM-Mutation (Variant B HTML-Tausch)
    await sleep(300);

    // ── Variante aus localStorage lesen ──────────────────────────────
    const variantInfo = await page.evaluate(() => {
      const variants = {};
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          // ab.js speichert Variant unter "ab_<snippet_key>"
          // Conversions unter "ab_conv_<snippet_key>" → ignorieren
          if (key && key.startsWith('ab_') && !key.startsWith('ab_conv_')) {
            try {
              const data = JSON.parse(localStorage.getItem(key));
              variants[key] = data.variant || 'unknown';
            } catch {}
          }
        }
      } catch {}
      return variants;
    });

    // Erste gefundene Variante tracken
    const variantKeys = Object.keys(variantInfo);
    let variant = 'unknown';
    if (variantKeys.length > 0) {
      variant = variantInfo[variantKeys[0]];
    }

    if (variant === 'B') stats.variantB++;
    else if (variant === 'A') stats.variantA++;
    else stats.variantUnknown++;

    // ── Conversion-Logik ─────────────────────────────────────────────
    const effectiveBias = BIAS === 'none' ? null : BIAS.toUpperCase();
    const biasAllows = !effectiveBias || variant === effectiveBias;
    const shouldConvert = Math.random() < CONV_RATE && biasAllows;

    if (shouldConvert) {
      const goal = GOAL || GOALS[Math.floor(Math.random() * GOALS.length)];
      const selector = `[data-ab-goal="${goal}"]`;

      // Signup-Form: zuerst Felder ausfüllen, sonst geht Submit nicht
      if (goal === 'signup_submit_btn') {
        try {
          await page.fill('#signup-name', `Bot ${id}`);
          await page.fill('#signup-email', `bot${id}@test.variante.dev`);
          await page.fill('#signup-password', 'test12345678');
        } catch {}
      }

      const el = page.locator(selector).first();
      if (await el.count() > 0) {
        await el.scrollIntoViewIfNeeded();
        await sleep(80 + Math.random() * 250);
        await el.click();
        stats.conversions++;
        stats.convByVariant[variant] = (stats.convByVariant[variant] || 0) + 1;
      }
    }

    // Dwell time: wie ein echter Besucher
    await sleep(200 + Math.random() * 600);

  } catch (err) {
    stats.errors++;
    if (!HEADLESS) console.error(`  [${id}] Error:`, err.message.slice(0, 120));
  } finally {
    await browser.close();
  }

  stats.visitors++;

  // Progress (jeder 10. oder letzter)
  if (stats.visitors % 10 === 0 || stats.visitors === N) {
    printProgress();
  }
}

function printProgress() {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const rate = (stats.visitors / Math.max(parseFloat(elapsed), 0.1)).toFixed(1);
  process.stdout.write(
    `\r  ${stats.visitors}/${N} visitors | ` +
    `A:${stats.variantA} B:${stats.variantB} ?:${stats.variantUnknown} | ` +
    `Conv:${stats.conversions} (A:${stats.convByVariant.A || 0} B:${stats.convByVariant.B || 0}) | ` +
    `Err:${stats.errors} | ${rate}/s | ${elapsed}s  `
  );
}

// ── Main ──────────────────────────────────────────────────────────────
async function runBatch() {
  for (let i = 0; i < N; i += PARALLEL) {
    const batch = [];
    for (let j = 0; j < PARALLEL && i + j < N; j++) {
      batch.push(visit(i + j + 1));
    }
    await Promise.all(batch);
    if (DELAY > 0 && i + PARALLEL < N) await sleep(DELAY);
  }
}

async function main() {
  console.log('');
  console.log('  🤖 AB Bot V3 — Traffic Simulator');
  console.log(`  Target:   ${BASE}/test-page/`);
  console.log(`  Env:      ${IS_PROD ? 'prod' : 'local'}`);
  console.log(`  Visitors: ${LOOP ? '∞ (loop)' : N} | CR: ${(CONV_RATE * 100).toFixed(0)}% | Bias: ${BIAS} | Parallel: ${PARALLEL}`);
  console.log(`  Goal:     ${GOAL || 'random'}`);
  console.log('');

  if (LOOP) {
    let batch = 0;
    while (true) {
      batch++;
      console.log(`\n  🔄 Loop #${batch}`);
      await runBatch();
    }
  } else {
    await runBatch();
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n');
  console.log('  ── Results ──');
  console.log(`  Visitors:    ${stats.visitors}`);
  console.log(`  A:           ${stats.variantA} (${(stats.variantA / Math.max(stats.visitors, 1) * 100).toFixed(1)}%)`);
  console.log(`  B:           ${stats.variantB} (${(stats.variantB / Math.max(stats.visitors, 1) * 100).toFixed(1)}%)`);
  console.log(`  Unknown:     ${stats.variantUnknown}`);
  console.log(`  Conversions: ${stats.conversions} (A:${stats.convByVariant.A || 0} B:${stats.convByVariant.B || 0})`);
  console.log(`  Errors:      ${stats.errors}`);
  console.log(`  Duration:    ${elapsed}s (${(stats.visitors / Math.max(parseFloat(elapsed), 0.1)).toFixed(1)}/s)`);
  console.log('');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
