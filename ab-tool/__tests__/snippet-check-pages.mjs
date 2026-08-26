// checkSnippetPages (lib/snippetCheck.ts) — Snippet-Prüfung pro Unterseite.
// Run: node __tests__/snippet-check-pages.mjs
//
// WARUM DIESER TEST EXISTIERT
// Die Funktion fetcht von unserer IP auf eine fremde Kundendomain. Zwei Dinge
// müssen dabei halten, und beide sieht man einer laufenden Anwendung nicht an:
//   1. Obergrenzen — ohne Limit und Dedup wird der Endpunkt zum Traffic-
//      Amplifier auf fremde Server (derselbe Grund, aus dem er Auth verlangt).
//   2. Zuordnung — die Route mappt die Ergebnisse über den Index zurück auf die
//      Test-Namen. Kommt die Reihenfolge durcheinander, meldet die UI das
//      fehlende Snippet auf der falschen Seite.
//
// Node importiert die .ts-Module direkt (type stripping, Node ≥22.6).

import { strict as assert } from 'node:assert'

// --- fetch-Mock: zählt Aufrufe und gleichzeitige Verbindungen ---------------
const SNIPPET_HTML = '<html><head><script async src="https://www.getvariante.com/ab.js"></script></head></html>'
const BARE_HTML = '<html><head><title>Nichts</title></head></html>'

let calls = []
let active = 0
let maxActive = 0
/** Pfade, die das Snippet tragen. Alles andere kommt ohne zurück. */
let withSnippet = new Set()

function mockResponse(url, html) {
  const bytes = new TextEncoder().encode(html)
  let sent = false
  return {
    url,
    body: {
      getReader: () => ({
        read: async () => {
          if (sent) return { done: true, value: undefined }
          sent = true
          return { done: false, value: bytes }
        },
        cancel: async () => {},
      }),
    },
  }
}

globalThis.fetch = async (url) => {
  calls.push(url)
  active++
  maxActive = Math.max(maxActive, active)
  // Kurz halten, damit sich die Worker überhaupt überlappen können.
  await new Promise((r) => setTimeout(r, 5))
  active--
  const path = new URL(url).pathname
  return mockResponse(url, withSnippet.has(path) ? SNIPPET_HTML : BARE_HTML)
}

function reset(snippetPaths = []) {
  calls = []
  active = 0
  maxActive = 0
  withSnippet = new Set(snippetPaths)
}

const { checkSnippetPages } = await import('../lib/snippetCheck.ts')

let failed = 0
async function check(name, fn) {
  try { await fn(); console.log(`✓ ${name}`) }
  catch (err) { failed++; console.error(`✗ ${name}: ${err.message}`) }
}

// ─────────────────────────────────────────────────────────────────────────────

await check('erkennt Snippet pro Seite einzeln', async () => {
  reset(['/pricing'])
  const res = await checkSnippetPages([
    'https://example.com/pricing',
    'https://example.com/about',
  ])
  assert.equal(res.length, 2)
  assert.equal(res[0].detected, true, '/pricing sollte erkannt werden')
  assert.equal(res[1].detected, false, '/about hat kein Snippet')
  assert.match(res[1].reason, /not found/i)
})

await check('Reihenfolge folgt der Eingabe (Zuordnung zu Test-Namen)', async () => {
  reset(['/c'])
  const res = await checkSnippetPages([
    'https://example.com/a',
    'https://example.com/b',
    'https://example.com/c',
  ])
  assert.deepEqual(
    res.map((r) => new URL(r.checkedUrl).pathname),
    ['/a', '/b', '/c']
  )
  assert.deepEqual(res.map((r) => r.detected), [false, false, true])
})

await check('dedupliziert dieselbe Seite in verschiedenen Schreibweisen', async () => {
  reset([])
  const res = await checkSnippetPages([
    'https://example.com/pricing',
    'example.com/pricing',
    'https://example.com/pricing',
  ])
  assert.equal(calls.length, 1, `erwartet 1 Fetch, waren ${calls.length}`)
  assert.equal(res.length, 1)
})

await check('deckelt bei MAX_PAGES (10) — kein Amplifier auf fremde Server', async () => {
  reset([])
  const many = Array.from({ length: 25 }, (_, i) => `https://example.com/p${i}`)
  const res = await checkSnippetPages(many)
  assert.equal(res.length, 10, `erwartet 10 Ergebnisse, waren ${res.length}`)
  assert.equal(calls.length, 10, `erwartet 10 Fetches, waren ${calls.length}`)
})

await check('hält die Parallelität bei 4', async () => {
  reset([])
  await checkSnippetPages(Array.from({ length: 10 }, (_, i) => `https://example.com/q${i}`))
  assert.ok(maxActive <= 4, `maximal 4 gleichzeitige Fetches erwartet, waren ${maxActive}`)
  assert.ok(maxActive > 1, `Worker-Pool arbeitet seriell (maxActive=${maxActive}) — Limit prüfen`)
})

await check('ignoriert leere und ungültige Einträge', async () => {
  reset(['/ok'])
  const res = await checkSnippetPages(['', null, undefined, 'https://example.com/ok'])
  assert.equal(res.length, 1)
  assert.equal(res[0].detected, true)
})

await check('leere Eingabe fetcht nichts', async () => {
  reset([])
  const res = await checkSnippetPages([])
  assert.deepEqual(res, [])
  assert.equal(calls.length, 0)
})

await check('meldet Altinstallation mit integrity als nicht nutzbar', async () => {
  reset([])
  globalThis.fetch = async (url) =>
    mockResponse(
      url,
      '<html><head><script async src="https://www.getvariante.com/ab.js" integrity="sha384-abc"></script></head></html>'
    )
  const res = await checkSnippetPages(['https://example.com/legacy'])
  assert.equal(res[0].detected, false, 'integrity blockiert das Script im Browser')
  assert.equal(res[0].outdated, true)
})

console.log(failed === 0 ? '\n✅ checkSnippetPages: alle Fälle grün.' : `\n❌ ${failed} Fälle fehlgeschlagen.`)
process.exit(failed === 0 ? 0 : 1)
