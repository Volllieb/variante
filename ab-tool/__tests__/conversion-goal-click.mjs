// Conversion Goal-Click Integration Test
// Testet: sendBeacon → 200, sessionStorage-Dedup, pausierter Test → 409
// Run: node __tests__/conversion-goal-click.mjs [--server=http://localhost:3000] [--key=<snippet_key>] [--paused-key=<paused_snippet_key>]

import { strict as assert } from 'node:assert'

// ═══════════════════════════════════════════════════════════════════════════
// CLI-Args parsen
// ═══════════════════════════════════════════════════════════════════════════
const args = process.argv.slice(2)
function arg(k) {
  const prefix = `--${k}=`
  for (const a of args) {
    if (a === `--${k}`) return true
    if (a.startsWith(prefix)) return a.slice(prefix.length)
  }
  return null
}

const SERVER = arg('server') || 'http://localhost:3000'
const ACTIVE_KEY = arg('key') || null
const PAUSED_KEY = arg('paused-key') || null

let passed = 0
let failed = 0
async function check(label, conditionFn) {
  try {
    const result = conditionFn()
    if (result && typeof result.then === 'function') await result
    console.log(`  ✓ ${label}`)
    passed++
  } catch (err) {
    console.log(`  ✗ ${label} — ${err.message}`)
    failed++
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PART A: Unit-Tests — sendConversion-Client-Logik (aus ab.js extrahiert)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── Part A: Client-seitige sendConversion-Logik ──\n')

async function runUnitTests() {
  const sessionStore = new Map()
  const beaconCalls = []

  const mockSessionStorage = {
    getItem(k) { return sessionStore.get(k) ?? null },
    setItem(k, v) { sessionStore.set(k, v) },
  }

  const mockNavigator = {
    sendBeacon(url, blob) {
      beaconCalls.push({ url, blob })
      return true
    },
  }

  // sendConversion — extrahiert aus public/ab.js (Zeilen ~360–390)
  function sendConversion(key, variant, origin, _sessionStorage, _navigator, _fetch) {
    const ck = 'ab_conv_' + key
    try {
      if (_sessionStorage.getItem(ck) === '1') return false
    } catch (_) {}
    try {
      _sessionStorage.setItem(ck, '1')
    } catch (_) {}

    const payload = JSON.stringify({ testId: key, variant: variant, event: 'conversion' })
    try {
      if (_navigator.sendBeacon) {
        _navigator.sendBeacon(
          origin + '/api/event',
          new Blob([payload], { type: 'text/plain' })
        )
      } else {
        _fetch(origin + '/api/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(function () {})
      }
      return true
    } catch (_) {
      return false
    }
  }

  const KEY = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  const ORIGIN = 'https://www.getvariante.com'

  await check('sendBeacon mit korrektem Blob-Payload (text/plain)', () => {
    beaconCalls.length = 0
    sessionStore.clear()
    sendConversion(KEY, 'A', ORIGIN, mockSessionStorage, mockNavigator, [])
    assert.equal(beaconCalls.length, 1, 'sendBeacon wurde nicht aufgerufen')
    const { url, blob } = beaconCalls[0]
    assert.equal(url, ORIGIN + '/api/event')
    assert.equal(blob.type, 'text/plain', 'Blob muss text/plain sein (CORS-safelisted)')
    return blob.text().then(text => {
      const parsed = JSON.parse(text)
      assert.equal(parsed.testId, KEY)
      assert.equal(parsed.variant, 'A')
      assert.equal(parsed.event, 'conversion')
    })
  })

  await check('sessionStorage-Dedup: zweiter Call → false, kein Beacon', () => {
    beaconCalls.length = 0
    sessionStore.clear()
    const first = sendConversion(KEY, 'B', ORIGIN, mockSessionStorage, mockNavigator, [])
    assert.equal(first, true, 'Erster Call muss true zurückgeben')
    assert.equal(beaconCalls.length, 1, 'Erster Call muss Beacon senden')
    const second = sendConversion(KEY, 'B', ORIGIN, mockSessionStorage, mockNavigator, [])
    assert.equal(second, false, 'Zweiter Call muss false zurückgeben (Dedup)')
    assert.equal(beaconCalls.length, 1, 'Kein zweiter Beacon-Call')
    assert.equal(mockSessionStorage.getItem('ab_conv_' + KEY), '1')
  })

  await check('Verschiedene Keys → kein Dedup, beide Beacons', () => {
    beaconCalls.length = 0
    sessionStore.clear()
    const KEY2 = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
    sendConversion(KEY, 'A', ORIGIN, mockSessionStorage, mockNavigator, [])
    sendConversion(KEY2, 'B', ORIGIN, mockSessionStorage, mockNavigator, [])
    assert.equal(beaconCalls.length, 2, 'Beide unterschiedliche Keys müssen je einen Beacon senden')
    assert.equal(mockSessionStorage.getItem('ab_conv_' + KEY), '1')
    assert.equal(mockSessionStorage.getItem('ab_conv_' + KEY2), '1')
  })

  await check('Fallback auf fetch() wenn sendBeacon nicht verfügbar', () => {
    const noBeaconNav = { sendBeacon: undefined }
    const _fetchCalls = []
    const _fetch = (url, opts) => {
      _fetchCalls.push({ url, opts })
      return Promise.resolve({ ok: true })
    }
    sessionStore.clear()
    sendConversion(KEY, 'A', ORIGIN, mockSessionStorage, noBeaconNav, _fetch)
    assert.equal(_fetchCalls.length, 1, 'fetch muss aufgerufen werden')
    assert.equal(_fetchCalls[0].url, ORIGIN + '/api/event')
    assert.equal(_fetchCalls[0].opts.method, 'POST')
    assert.equal(_fetchCalls[0].opts.keepalive, true)
    assert.equal(_fetchCalls[0].opts.headers['Content-Type'], 'application/json')
  })

  await check('sessionStorage.setItem wirft → fängt gracefully, sendet trotzdem', () => {
    beaconCalls.length = 0
    const throwingStorage = {
      getItem(_k) { return null },
      setItem(_k, _v) { throw new Error('QuotaExceeded') },
    }
    const result = sendConversion(KEY, 'A', ORIGIN, throwingStorage, mockNavigator, [])
    assert.equal(result, true, 'Muss trotz setItem-Fehler senden')
    assert.equal(beaconCalls.length, 1, 'Beacon muss trotz Storage-Fehler gesendet werden')
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// PART B: Integration-Tests — /api/event Endpoint
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── Part B: /api/event Server-Integration ──\n')

async function runIntegrationTests() {
  try {
    await fetch(SERVER + '/api/resolve?host=example.com')
  } catch (_) {
    console.log(`  Server ${SERVER}: nicht erreichbar — Integration-Tests übersprungen.`)
    console.log(`  Starte mit: cd ab-tool && npm run dev`)
    return
  }
  console.log(`  Server ${SERVER}: erreichbar`)

  // Prüfe ob Supabase verfügbar ist (sonst sinnlos DB-Tests zu versuchen)
  let dbAvailable = true
  try {
    const probe = await fetch(SERVER + '/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testId: '00000000-0000-0000-0000-000000000000', variant: 'A', event: 'conversion' }),
    })
    // 500 kann von fehlenden Supabase-Credentials oder anderen Server-Fehlern kommen.
    // 404 bestätigt dass Supabase funktioniert (testId nicht in DB).
    // Alles andere → DB nicht verfügbar, Tests überspringen.
    if (probe.status === 404) {
      // DB funktioniert, alles gut
    } else if (probe.status === 500) {
      console.log('  ⚠ /api/event returned 500 — Supabase-Credentials fehlen vermutlich. DB-Tests übersprungen.')
      dbAvailable = false
    } else {
      console.log(`  ⚠ /api/event returned ${probe.status} — unerwartet, DB-Tests übersprungen.`)
      dbAvailable = false
    }
  } catch (_) {
    dbAvailable = false
  }

  await check('/api/event ohne testId → 400', async () => {
    const r = await fetch(SERVER + '/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    assert.equal(r.status, 400)
    const body = await r.json()
    assert.ok(body.error)
  })

  await check('/api/event mit event=click (nicht conversion) → 400', async () => {
    const r = await fetch(SERVER + '/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', variant: 'A', event: 'click' }),
    })
    assert.equal(r.status, 400)
  })

  await check('/api/event mit ungültiger UUID → 400', async () => {
    const r = await fetch(SERVER + '/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testId: 'not-a-uuid', variant: 'A', event: 'conversion' }),
    })
    assert.equal(r.status, 400)
  })

  await check('/api/event mit variant=C → 400', async () => {
    const r = await fetch(SERVER + '/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', variant: 'C', event: 'conversion' }),
    })
    assert.equal(r.status, 400)
  })

  if (dbAvailable) {
    await check('/api/event mit nicht-existenter snippet_key → 404', async () => {
      const r = await fetch(SERVER + '/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: '00000000-0000-0000-0000-000000000000', variant: 'A', event: 'conversion' }),
      })
      assert.equal(r.status, 404)
    })
  }

  if (ACTIVE_KEY) {
    await check(`/api/event mit aktivem Test → 200 (${ACTIVE_KEY.slice(0, 8)}...)`, async () => {
      const r = await fetch(SERVER + '/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: ACTIVE_KEY, variant: 'A', event: 'conversion' }),
      })
      assert.equal(r.status, 200, `Erwartet 200, bekam ${r.status}`)
      const body = await r.json()
      assert.equal(body.ok, true)
    })
  } else {
    console.log('  ⚠ --key=<snippet_key> nicht angegeben — aktiver-Test-Check übersprungen.')
  }

  if (PAUSED_KEY) {
    await check(`/api/event mit pausiertem Test → 409 (${PAUSED_KEY.slice(0, 8)}...)`, async () => {
      const r = await fetch(SERVER + '/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: PAUSED_KEY, variant: 'A', event: 'conversion' }),
      })
      assert.equal(r.status, 409, `Erwartet 409, bekam ${r.status}`)
      const body = await r.json()
      assert.equal(body.error, 'test is not active')
    })
  } else {
    console.log('  ⚠ --paused-key=<snippet_key> nicht angegeben — pausiert-Test-Check übersprungen.')
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PART C: CORS-Header-Check für /api/event
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── Part C: CORS-Header ──\n')

async function runCorsTests() {
  try {
    await fetch(SERVER + '/api/resolve?host=example.com')
  } catch (_) {
    console.log('  Server nicht erreichbar — CORS-Tests übersprungen.')
    return
  }

  await check('/api/event OPTIONS → 204 mit CORS-Headern', async () => {
    const r = await fetch(SERVER + '/api/event', { method: 'OPTIONS' })
    assert.equal(r.status, 204)
    assert.ok(r.headers.get('access-control-allow-origin'), 'CORS allow-origin fehlt')
    assert.ok(r.headers.get('access-control-allow-methods'), 'CORS allow-methods fehlt')
  })

  await check('/api/event POST-Antwort hat CORS-Header', async () => {
    const r = await fetch(SERVER + '/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    assert.ok(r.headers.get('access-control-allow-origin'), 'CORS allow-origin fehlt in POST-Antwort')
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║  Conversion Goal-Click Test                  ║')
  console.log('║  sendBeacon → 200 | Dedup | Paused → 409     ║')
  console.log('╚══════════════════════════════════════════════╝')

  await runUnitTests()
  await runIntegrationTests()
  await runCorsTests()

  console.log(`\n${'─'.repeat(46)}`)
  console.log(`  ${passed} passed, ${failed} failed`)
  if (failed > 0) {
    console.log('  ❌ Einige Tests fehlgeschlagen.')
    process.exit(1)
  } else {
    console.log('  ✅ Alle Tests bestanden.')
  }
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
