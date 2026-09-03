// Picker-Erfassung: kein Hover-Rahmen im erfassten HTML + abgestufte Zustellung
//
// Regression fuer zwei Fixes in public/ab.js:
//
// 1. Blauer Rahmen in Variante A: onOver markiert das gehoverte Element per
//    Inline-outline. Beim direkten Klick feuert onOut nicht, und postToOpener
//    las das outerHTML VOR cleanup() — der blaue Rahmen war damit fest im
//    original_html des Wizards einzementiert. Fix: onClick entfernt das
//    outline vor jeder Erfassung (Normalmodus + zweiter Reorder-Klick).
//
// 2. returnToDashboard war Alles-oder-Nichts: schlug das Encoden des vollen
//    Payloads fehl, ging die Auswahl komplett verloren, obwohl der Selektor
//    allein fuer den Wizard reicht. Fix: gestaffelte Zustellung — voller
//    Payload, bei Encoder-Fehler minimaler Payload (nur Selektor).
//
// Getestet wird der ECHTE Code: der komplette Picker-Block wird aus ab.js
// extrahiert und in einem JSDOM ausgefuehrt (wie variant-interaction.mjs,
// kein 1:1-Duplikat → keine Drift). returnToDashboard wird als Block
// extrahiert und mit Stubs evaluiert, um den Encoder-Fehler deterministisch
// auszuloesen.
//
// Run: node __tests__/picker-capture.mjs

import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { JSDOM } from 'jsdom'

let passed = 0
let failed = 0
async function check(label, fn) {
  try {
    await fn()
    console.log(`  ✓ ${label}`)
    passed++
  } catch (err) {
    console.log(`  ✗ ${label} — ${err.message}`)
    failed++
  }
}

const AB_JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'ab.js')
const source = readFileSync(AB_JS, 'utf8')

// ── Picker-Block (startPicker-IIFE) komplett in JSDOM ausführen ─────────────
const PICKER_START = source.indexOf(';(function startPicker(cfg) {')
const PICKER_END = source.indexOf('    })(__abPickerCfg)')
assert.ok(PICKER_START > 0 && PICKER_END > PICKER_START, 'Picker-Block in ab.js nicht gefunden')
const PICKER_BLOCK = source.slice(PICKER_START, PICKER_END + '    })(__abPickerCfg)'.length)

function bootPicker({ query = '?ab_pick=1', opener = null } = {}) {
  const dom = new JSDOM('<!doctype html><html><body>' +
    '<button class="cta">Sign up</button>' +
    '<button class="other">Secondary</button>' +
    '</body></html>', {
    url: 'https://shop.example.com/product' + query,
    runScripts: 'outside-only',
  })
  const win = dom.window
  if (!win.CSS || !win.CSS.escape) {
    win.CSS = { escape: (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&') }
  }
  if (opener) Object.defineProperty(win, 'opener', { value: opener, configurable: true })
  // cfg wird ausserhalb des Picker-Blocks gebaut (Zeilen vor dem IIFE) —
  // hier nachstellen, inkl. `origin` = Script-Herkunft (getvariante.com).
  const mode = query.indexOf('ab_reorder=1') > -1 ? 'reorder' : 'element'
  const cfg = {
    testId: '1',
    token: query.indexOf('ab_token=') > -1 ? 't' : '',
    tempToken: '',
    apiBase: 'https://www.getvariante.com',
    mode,
  }
  win.eval('var __abPickerCfg = ' + JSON.stringify(cfg) + ';\n' +
    'var origin = "https://www.getvariante.com";\n' +
    PICKER_BLOCK)
  return { dom, win }
}

// ── 1) Element-Modus: Klick erfasst HTML ohne Hover-Rahmen ─────────────────
console.log('\n── Element-Modus: Klick erfasst ohne Hover-Rahmen ──')
{
  const msgs = []
  const { win } = bootPicker({ query: '?ab_pick=1', opener: { closed: false, postMessage: (m) => msgs.push(m) } })
  const btn = win.document.querySelector('button.cta')

  await check('Hover setzt den blauen Rahmen', () => {
    btn.dispatchEvent(new win.MouseEvent('mouseover', { bubbles: true }))
    assert.strictEqual(btn.style.outline, '2px solid #2563eb')
  })

  await check('Klick liefert HTML ohne outline an den Wizard', () => {
    // Direkter Klick: mouseout feuert nicht — genau der Bug-Zustand.
    btn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }))
    assert.strictEqual(msgs.length, 1)
    const msg = msgs[0]
    assert.strictEqual(msg.type, 'ab-pick')
    assert.ok(msg.html.includes('Sign up'), 'erfasstes HTML enthaelt das Element')
    assert.ok(!msg.html.includes('outline'), `outline im erfassten HTML: ${msg.html}`)
  })

  await check('Rahmen ist nach dem Klick entfernt', () => {
    assert.strictEqual(btn.style.outline, '')
  })
}

// ── 2) Reorder-Modus: Swap-Highlight nicht im erfassten HTML ───────────────
console.log('\n── Reorder-Modus: Swap-Highlight nicht im erfassten HTML ──')
{
  const fetches = []
  const { win } = bootPicker({ query: '?ab_pick=1&ab_reorder=1&ab_token=t' })
  win.fetch = (url, init) => { fetches.push(init.body); return Promise.resolve({ ok: true }) }
  const btnA = win.document.querySelector('button.cta')
  const btnB = win.document.querySelector('button.other')

  await check('Erster Klick markiert Element A orange', () => {
    btnA.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }))
    assert.strictEqual(btnA.style.outline, '2px solid #f59e0b')
  })

  await check('Zweiter Klick: original_html und reorder_html ohne Highlight', async () => {
    btnB.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }))
    await new Promise((r) => setTimeout(r, 0)) // fetch-Promise aufloesen
    assert.strictEqual(fetches.length, 1)
    const body = JSON.parse(fetches[0])
    assert.ok(body.original_html.includes('Sign up'), 'original_html enthaelt Element A')
    assert.ok(!body.original_html.includes('outline'), `original_html: ${body.original_html}`)
    assert.ok(body.reorder_html.includes('Secondary'), 'reorder_html enthaelt Element B')
    assert.ok(!body.reorder_html.includes('outline'), `reorder_html: ${body.reorder_html}`)
  })

  await check('Element A ist nach dem zweiten Klick entmarkiert', () => {
    assert.strictEqual(btnA.style.outline, '')
  })
}

// ── 3) returnToDashboard: abgestufte Zustellung ────────────────────────────
console.log('\n── returnToDashboard: abgestufte Zustellung ──')
const RTD_START = source.indexOf('        function returnToDashboard(el, sel, text) {')
const RTD_END = source.indexOf('        function onClick(e) {')
assert.ok(RTD_START > 0 && RTD_END > RTD_START, 'returnToDashboard in ab.js nicht gefunden')
const RTD_BLOCK = source.slice(RTD_START, RTD_END)

function makeReturnToDashboard(opts) {
  const o = opts || {}
  const encode = o.encode || globalThis.encodeURIComponent
  const styleContext = o.styleContext || (() => ({ css: '.cta{color:red}', computed: {} }))
  const collectCss = o.collectCss || (() => '.cta{color:red}')
  const mode = o.mode || 'element'
  const loc = { href: '', origin: 'https://shop.example.com' }
  const factory = new Function('styleContext', 'collectCss', 'cfg', 'origin', 'location', 'encodeURIComponent', 'JSON',
    RTD_BLOCK + '\nreturn returnToDashboard')
  const fn = factory(styleContext, collectCss, { mode }, 'https://www.getvariante.com', loc, encode, JSON)
  return { fn, loc }
}

function decodeFragment(href) {
  const hash = href.split('#')[1]
  assert.ok(hash, 'Fragment fehlt: ' + href)
  return JSON.parse(decodeURIComponent(hash))
}

await check('voller Payload: html, css und styleContext kommen an', () => {
  const el = { tagName: 'BUTTON', outerHTML: '<button class="cta">Sign up</button>' }
  const { fn, loc } = makeReturnToDashboard()
  assert.strictEqual(fn(el, '#cta', 'Sign up'), true)
  assert.ok(loc.href.startsWith('https://www.getvariante.com/picker-return#'), loc.href)
  const data = decodeFragment(loc.href)
  assert.strictEqual(data.selector, '#cta')
  assert.ok(data.html.includes('Sign up'))
  assert.ok(data.css.includes('.cta'))
  assert.ok(data.styleContext && data.styleContext.css.includes('.cta'))
})

await check('Encoder-Fehler beim vollen Payload → minimaler Payload kommt an', () => {
  // Simuliert eine Engine/Inhalte, bei denen der volle Payload nicht kodierbar
  // ist: kaputte UTF-16-Surrogate in HTML/CSS liessen encodeURIComponent in
  // aelteren Engines einen URIError werfen. Der volle Payload ist lang, der
  // minimale kurz — der Stub kippt an der Laenge.
  const encode = (s) => { if (s.length > 200) throw new URIError('URI malformed'); return globalThis.encodeURIComponent(s) }
  const el = { tagName: 'BUTTON', outerHTML: '<button class="cta">Sign up</button>' }
  const { fn, loc } = makeReturnToDashboard({ encode })
  assert.strictEqual(fn(el, '#cta', 'Sign up'), true)
  const data = decodeFragment(loc.href)
  assert.strictEqual(data.selector, '#cta')
  assert.strictEqual(data.mode, 'element')
  assert.strictEqual(data.tagName, 'BUTTON')
  assert.strictEqual(data.html, undefined)
  assert.strictEqual(data.css, undefined)
  assert.strictEqual(data.styleContext, undefined)
})

await check('auch der minimale Payload scheitert → false (Fehlermeldung bleibt korrekt)', () => {
  const encode = () => { throw new URIError('URI malformed') }
  const { fn } = makeReturnToDashboard({ encode })
  assert.strictEqual(fn({ tagName: 'BUTTON', outerHTML: '<button>x</button>' }, '#cta', 'x'), false)
})

await check('Goal-Modus: kein styleContext/collectCss-Aufruf, mode=goal im Payload', () => {
  const { fn, loc } = makeReturnToDashboard({
    mode: 'goal',
    styleContext: () => { throw new Error('styleContext darf im Goal-Modus nicht laufen') },
    collectCss: () => { throw new Error('collectCss darf im Goal-Modus nicht laufen') },
  })
  assert.strictEqual(fn({ tagName: 'BUTTON', outerHTML: '<button>x</button>' }, '#goal', 'x'), true)
  const data = decodeFragment(loc.href)
  assert.strictEqual(data.mode, 'goal')
  assert.strictEqual(data.html, '')
})

await check('Premisse: JSON.stringify escaped lone Surrogates seit ES2019 selbst', () => {
  // Dokumentiert, warum der Fallback auf modernen Engines nur Defense-in-Depth
  // ist: well-formed stringify (ES2019+) wandelt lone Surrogates in ASCII-
  // Escapes um, encodeURIComponent wirft also nur noch auf aelteren Engines.
  // Der nackte Aufruf wirft weiterhin — daher der Fallback.
  assert.doesNotThrow(() => globalThis.encodeURIComponent(JSON.stringify({ html: '\uD800' })))
  assert.throws(() => globalThis.encodeURIComponent('\uD800'), URIError)
})

// ── Zusammenfassung ─────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
