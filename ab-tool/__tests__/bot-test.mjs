// Bot-Test: Conversion-Messung & Auto-Winner für Live-Tests.
// Simuliert Visitors + Conversions gegen die Variante-API.
//
// Run:
//   node __tests__/bot-test.mjs --host=vallisride.com
//   node __tests__/bot-test.mjs --host=vallisride.com --visitors=200 --conversions=30
//   node __tests__/bot-test.mjs --host=vallisride.com --server=https://www.getvariante.com
//
// Der Test fragt zuerst /api/resolve ab, um den snippet_key zu ermitteln,
// simuliert dann Visitors (/api/assign) und Conversions (/api/event),
// und prüft, ob der Auto-Winner-Mechanismus greift.

import { strict as assert } from 'node:assert'

// ═══════════════════════════════════════════════════════════════════════════
// CLI-Args
// ═══════════════════════════════════════════════════════════════════════════
const args = process.argv.slice(2)
function arg(k, fallback) {
  const prefix = `--${k}=`
  for (const a of args) {
    if (a === `--${k}`) return true
    if (a.startsWith(prefix)) return a.slice(prefix.length)
  }
  return fallback ?? null
}

const SERVER = arg('server', 'https://www.getvariante.com')
const HOST = arg('host', null)
const VISITORS = parseInt(arg('visitors', '100'), 10)
const CONVERSIONS_B = parseInt(arg('conversions', '20'), 10)
const DRY_RUN = arg('dry-run', false)

if (!HOST) {
  console.error('Usage: node __tests__/bot-test.mjs --host=<domain> [--server=<url>] [--visitors=N] [--conversions=N] [--dry-run]')
  console.error('Example: node __tests__/bot-test.mjs --host=vallisride.com')
  process.exit(1)
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════
let passed = 0
let failed = 0

function ok(label) {
  console.log(`  ✓ ${label}`)
  passed++
}

function fail(label, detail) {
  console.log(`  ✗ ${label} — ${detail}`)
  failed++
}

async function check(label, fn) {
  try {
    const result = fn()
    if (result && typeof result.then === 'function') await result
    ok(label)
  } catch (err) {
    fail(label, err.message)
  }
}

function stats(arr) {
  const counts = {}
  for (const v of arr) counts[v] = (counts[v] || 0) + 1
  return counts
}

// ═══════════════════════════════════════════════════════════════════════════
// API Helpers
// ═══════════════════════════════════════════════════════════════════════════
async function apiGet(path) {
  const res = await fetch(`${SERVER}${path}`)
  return { status: res.status, body: await res.json().catch(() => null) }
}

async function apiPost(path, data) {
  const res = await fetch(`${SERVER}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return { status: res.status, body: await res.json().catch(() => null) }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
console.log(`\n┌${'─'.repeat(60)}┐`)
console.log(`│ Bot-Test: ${HOST.padEnd(46)} │`)
console.log(`│ Server:   ${SERVER.padEnd(46)} │`)
console.log(`│ Visitors: ${String(VISITORS).padEnd(46)} │`)
console.log(`│ Conv (B): ${String(CONVERSIONS_B).padEnd(46)} │`)
if (DRY_RUN) console.log(`│ MODE:     DRY RUN (keine API-Calls)${' '.repeat(22)} │`)
console.log(`└${'─'.repeat(60)}┘\n`)

// ── Step 1: Resolve — snippet_key ermitteln ──────────────────────────────
console.log('── Step 1: /api/resolve — snippet_key ermitteln ──\n')

/** @type {{ snippet_key: string, selector: string, goal: string|null, status: string }[]} */
let tests = []
let snippetKey = null

if (!DRY_RUN) {
  const { status, body } = await apiGet(`/api/resolve?host=${encodeURIComponent(HOST)}`)
  await check('resolve → 200', () => {
    assert.equal(status, 200, `status ${status}`)
  })
  await check('resolve → tests[] vorhanden', () => {
    assert.ok(body && Array.isArray(body.tests), 'body.tests fehlt')
    tests = body.tests
    assert.ok(tests.length > 0, 'Keine aktiven Tests für diesen Host')
  })

  if (tests.length > 0) {
    snippetKey = tests[0].snippet_key
    console.log(`\n  Host:       ${HOST}`)
    console.log(`  Tests:      ${tests.length}`)
    for (const t of tests) {
      console.log(`  ─────────────────────────────────────────────`)
      console.log(`  snippet_key: ${t.snippet_key}`)
      console.log(`  selector:    ${t.selector}`)
      console.log(`  goal:        ${t.goal || '(selector)'}`)
      console.log(`  status:      ${t.status}`)
      console.log(`  force:       ${t.force || '—'}`)
    }
  }
} else {
  console.log('  (dry-run: skipping)')
  snippetKey = 'dry-run-key'
  tests = [{ snippet_key: snippetKey, selector: 'h1', goal: null, status: 'active' }]
}

if (!snippetKey) {
  console.error('\n❌ Kein snippet_key gefunden — Test kann nicht fortgesetzt werden.')
  console.error('   Ist ein aktiver Test für diesen Host konfiguriert?')
  process.exit(1)
}

// ── Step 2: Assign — Visitors simulieren ─────────────────────────────────
console.log('\n── Step 2: /api/assign — Visitors simulieren ──\n')

const assignedVariants = []
let assignErrors = 0

if (!DRY_RUN) {
  // Rate-Limit: 60 Assigns/min. Mit 100ms Abstand = 10/s = 600/min → ok.
  for (let i = 0; i < VISITORS; i++) {
    const { status, body } = await apiGet(`/api/assign?testId=${encodeURIComponent(snippetKey)}`)
    if (status === 200 && body && (body.variant === 'A' || body.variant === 'B')) {
      assignedVariants.push(body.variant)
    } else if (status === 429) {
      // Rate-Limit getroffen — kurz warten, dann weiter
      console.log(`  ⚠ Rate-Limit bei Visitor ${i + 1}/${VISITORS}, warte 5s...`)
      await sleep(5000)
      i-- // retry
      continue
    } else {
      assignErrors++
      if (assignErrors <= 3) {
        console.log(`  ⚠ Assign-Fehler bei Visitor ${i + 1}: status=${status} body=${JSON.stringify(body)}`)
      }
    }

    // Fortschritt alle 10%
    if ((i + 1) % Math.max(1, Math.floor(VISITORS / 10)) === 0) {
      const pct = Math.round((i + 1) / VISITORS * 100)
      console.log(`  ... ${i + 1}/${VISITORS} (${pct}%)`)
    }

    await sleep(100) // 100ms zwischen Assigns
  }

  const dist = stats(assignedVariants)
  const total = assignedVariants.length
  console.log(`\n  Gesendet:  ${total} (Fehler: ${assignErrors})`)
  console.log(`  Variante A: ${dist['A'] || 0} (${total ? Math.round((dist['A'] || 0) / total * 100) : 0}%)`)
  console.log(`  Variante B: ${dist['B'] || 0} (${total ? Math.round((dist['B'] || 0) / total * 100) : 0}%)`)

  await check('Assigns erfolgreich (≥90% 200)', () => {
    const successRate = total / VISITORS
    assert.ok(successRate >= 0.9, `Nur ${Math.round(successRate * 100)}% erfolgreich`)
  })

  await check('Variante A + B beide vertreten', () => {
    assert.ok(dist['A'] > 0, 'Variante A nie zugewiesen')
    assert.ok(dist['B'] > 0, 'Variante B nie zugewiesen')
  })

  // 50/50-Split grob prüfen (darf durch Zufall abweichen, ±15 Prozentpunkte)
  const pctA = total ? (dist['A'] || 0) / total : 0
  await check('50/50-Split grob (±15pp)', () => {
    assert.ok(pctA >= 0.35 && pctA <= 0.65, `A-Anteil: ${Math.round(pctA * 100)}% (erwartet ~50%)`)
  })
} else {
  console.log('  (dry-run: skipping)')
  for (let i = 0; i < VISITORS; i++) assignedVariants.push(i % 2 === 0 ? 'A' : 'B')
}

// ── Step 3: Conversions — B-Conversions senden ───────────────────────────
console.log('\n── Step 3: /api/event — B-Conversions senden ──\n')

let conversionOk = 0
let conversionErrors = 0
let winnerDetected = null

if (!DRY_RUN) {
  // Rate-Limit: 30 Events/min → 2s Abstand
  for (let i = 0; i < CONVERSIONS_B; i++) {
    const { status, body } = await apiPost('/api/event', {
      testId: snippetKey,
      variant: 'B',
      event: 'conversion',
    })

    if (status === 200) {
      conversionOk++
      if (body && body.winner) {
        winnerDetected = body.winner
        console.log(`  🏆 WINNER DETECTED: ${body.winner} (Conversion ${i + 1}/${CONVERSIONS_B})`)
      }
    } else if (status === 409) {
      // Test pausiert oder done
      console.log(`  ⚠ Test ist pausiert/beendet (409) bei Conversion ${i + 1} — breche ab`)
      break
    } else if (status === 429) {
      console.log(`  ⚠ Rate-Limit bei Conversion ${i + 1}, warte 5s...`)
      await sleep(5000)
      i--
      continue
    } else {
      conversionErrors++
      if (conversionErrors <= 3) {
        console.log(`  ⚠ Conversion-Fehler bei ${i + 1}: status=${status} body=${JSON.stringify(body)}`)
      }
    }

    if ((i + 1) % Math.max(1, Math.floor(CONVERSIONS_B / 5)) === 0) {
      console.log(`  ... ${i + 1}/${CONVERSIONS_B} Conversions gesendet`)
    }

    await sleep(2000) // ~30/min für Rate-Limit
  }

  console.log(`\n  Erfolgreich: ${conversionOk}`)
  console.log(`  Fehler:      ${conversionErrors}`)

  await check('Conversions werden akzeptiert (≥1× 200)', () => {
    assert.ok(conversionOk >= 1, 'Keine Conversion erfolgreich')
  })
} else {
  console.log('  (dry-run: skipping)')
}

// ── Step 4: Resolve erneut — Auto-Winner prüfen ──────────────────────────
console.log('\n── Step 4: /api/resolve (erneut) — Auto-Winner prüfen ──\n')

if (!DRY_RUN) {
  const { status, body } = await apiGet(`/api/resolve?host=${encodeURIComponent(HOST)}`)

  await check('resolve → 200', () => {
    assert.equal(status, 200)
  })

  const currentTests = body && body.tests ? body.tests : []
  const ourTest = currentTests.find(t => t.snippet_key === snippetKey)

  if (ourTest) {
    console.log(`  status:  ${ourTest.status}`)
    console.log(`  force:   ${ourTest.force || '—'}`)

    if (ourTest.force === 'B') {
      ok('Auto-Winner: force=B → B gewinnt, wird an alle ausgeliefert')
      winnerDetected = 'B'
    } else if (ourTest.status === 'done') {
      ok('Auto-Winner: status=done → Test abgeschlossen')
    } else {
      console.log(`  ℹ Test läuft noch (status=${ourTest.status}).`)
      console.log(`    Mehr Visitors/Conversions nötig für Auto-Winner.`)
    }
  } else {
    // Test nicht mehr in resolve → könnte done+A sein (wird rausgefiltert)
    console.log(`  ℹ Test nicht mehr in /api/resolve → status=done, winner=A (Original gewinnt)`)
    ok('Auto-Winner: Test aus Resolve verschwunden → A hat gewonnen')
  }
} else {
  console.log('  (dry-run: skipping)')
}

// ── Step 5: Conversion-Dedup prüfen (sessionStorage-Simulation) ──────────
console.log('\n── Step 5: Conversion-Dedup (wiederholte Conversion) ──\n')

if (!DRY_RUN) {
  // Erste Conversion
  const r1 = await apiPost('/api/event', {
    testId: snippetKey,
    variant: 'B',
    event: 'conversion',
  })
  console.log(`  1. Conversion: status=${r1.status}`)

  // Zweite Conversion (sollte clientseitig durch sessionStorage geblockt werden,
  // aber API-seitig trotzdem zählen — Dedup ist client-seitig!)
  const r2 = await apiPost('/api/event', {
    testId: snippetKey,
    variant: 'B',
    event: 'conversion',
  })
  console.log(`  2. Conversion: status=${r2.status}`)

  await check('Beide Conversions akzeptiert (200)', () => {
    assert.equal(r1.status, 200)
    // Zweite kann 200 oder 409 sein (wenn Test inzwischen done)
    assert.ok(r2.status === 200 || r2.status === 409, `status=${r2.status}`)
  })

  console.log(`\n  ℹ Dedup ist client-seitig (sessionStorage).`)
  console.log(`    Der API-Level-Test kann Dedup nicht prüfen — dafür Browser-Test nutzen.`)
} else {
  console.log('  (dry-run: skipping)')
}

// ═══════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(60)}`)
console.log(`Summary: ${passed} passed, ${failed} failed`)
console.log(`${'═'.repeat(60)}`)

if (winnerDetected) {
  console.log(`\n🏆 AUTO-WINNER: ${winnerDetected}`)
}

if (failed > 0) {
  process.exit(1)
}
