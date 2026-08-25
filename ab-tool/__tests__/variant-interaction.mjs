// Interaktivität der Variante B (aus public/ab.js)
//
// Die KI generiert B aus dem TEXT des Originals. Aus
//   <a href="/signup" class="cta">Get started</a>
// wird regelmäßig
//   <button class="ab-variant-b">Start free</button>
// — ein Bild von einem Button. Ohne href und ohne den Listener des Originals
// passiert beim Klick nichts: B kann per Definition nicht konvertieren, der
// Test kippt systematisch gegen B, und der Besucher in B findet den Weg zum
// Ziel gar nicht mehr.
//
// Getestet wird der ECHTE Code: der Block von INTERACTIVE_SEL bis einschließlich
// applyDom wird aus public/ab.js extrahiert und in einem JSDOM ausgeführt.
// Kein 1:1-Duplikat im Test → keine Drift.
//
// Run: node --import tsx __tests__/variant-interaction.mjs

import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { JSDOM } from 'jsdom'

let passed = 0
let failed = 0
function check(label, fn) {
  try {
    fn()
    console.log(`  ✓ ${label}`)
    passed++
  } catch (err) {
    console.log(`  ✗ ${label} — ${err.message}`)
    failed++
  }
}

// ── Code aus ab.js extrahieren ──────────────────────────────────────────────
const AB_JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'ab.js')
const source = readFileSync(AB_JS, 'utf8')

const START = source.indexOf('  var ACTION_SEL_SRC')
const END = source.indexOf('  // --- Einen Test auflösen')
assert.ok(START > 0 && END > START, 'Interaktions-Block in ab.js nicht gefunden')
const BLOCK = source.slice(START, END)

// applyDom nutzt beginApply/endApply (MutationObserver-Guard) und sanitizeSvgs.
// Beide sind für dieses Verhalten irrelevant → Stubs.
function loadInto(dom, win) {
  const factory = new dom.window.Function(
    'document', 'window', 'MouseEvent',
    `var beginApply = function () {}
     var endApply = function () {}
     var sanitizeSvgs = function () {}
     ${BLOCK}
     return { applyDom: applyDom, portInteraction: portInteraction, findAction: findAction, realHref: realHref }`
  )
  return factory(dom.window.document, win || dom.window, dom.window.MouseEvent)
}

const KEY = 'a1b2c3d4-0000-4000-8000-000000000000'

// JSDOM navigiert nicht und lässt window.location auch nicht neu definieren.
// Der extrahierte Code bekommt `window` aber als Parameter — ein vorgelagertes
// Objekt mit eigenem location/open reicht daher zum Beobachten.
// Für den Bridge-Pfad (MouseEvent mit `view: window`) muss das echte
// window durchgereicht werden, sonst greift dort nur der Fallback.
function page(bodyHtml, fakeWindow = true) {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${bodyHtml}</body></html>`, {
    url: 'https://kunde.example/pricing/',
  })
  const nav = { href: null, opened: null }
  let win
  if (fakeWindow) {
    win = Object.create(dom.window)
    Object.defineProperty(win, 'location', {
      value: { set href(v) { nav.href = v }, get href() { return dom.window.location.href } },
    })
    win.open = (url) => { nav.opened = url }
  }
  return { dom, doc: dom.window.document, api: loadInto(dom, win), nav }
}

// ── Fall 1: A ist ein Link, B ist ein <a> ───────────────────────────────────
console.log('\n── A ist ein Link ──\n')

check('href/target/rel wandern auf das <a> der Variante', () => {
  const { doc, api } = page('<a id="cta" href="/signup" target="_blank" rel="noopener">Get started</a>')
  const applied = api.applyDom('#cta', 'B', '<a class="ab-variant-b">Start free</a>', KEY)
  assert.equal(applied, true)
  const b = doc.querySelector(`[data-ab-el="${KEY}"]`)
  assert.equal(b.getAttribute('href'), '/signup')
  assert.equal(b.getAttribute('target'), '_blank')
  assert.equal(b.getAttribute('rel'), 'noopener')
})

check('relatives href bleibt relativ (löst gegen dieselbe Seite auf)', () => {
  const { doc, api } = page('<a id="cta" href="checkout.html">Buy</a>')
  api.applyDom('#cta', 'B', '<a class="ab-variant-b">Buy now</a>', KEY)
  assert.equal(doc.querySelector(`[data-ab-el="${KEY}"]`).getAttribute('href'), 'checkout.html')
})

check('eigenes href der Variante wird NICHT überschrieben', () => {
  const { doc, api } = page('<a id="cta" href="/signup">Get started</a>')
  api.applyDom('#cta', 'B', '<a href="/trial" class="ab-variant-b">Start trial</a>', KEY)
  assert.equal(doc.querySelector(`[data-ab-el="${KEY}"]`).getAttribute('href'), '/trial')
})

// ── Fall 2: A ist ein Link, B ist ein <button> ──────────────────────────────
console.log('\n── A ist ein Link, B ein <button> ──\n')

check('<button> navigiert beim Klick zur URL des Originals', () => {
  const { dom, doc, api, nav } = page('<a id="cta" href="/signup">Get started</a>')
  api.applyDom('#cta', 'B', '<button class="ab-variant-b">Start free</button>', KEY)
  const b = doc.querySelector(`[data-ab-el="${KEY}"]`)
  assert.equal(b.tagName, 'BUTTON')
  assert.equal(b.getAttribute('data-ab-href'), 'https://kunde.example/signup')
  b.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }))
  assert.equal(nav.href, 'https://kunde.example/signup', 'kein location.href gesetzt')
})

check('target="_blank" öffnet ein neues Fenster statt zu navigieren', () => {
  const { dom, doc, api, nav } = page('<a id="cta" href="/signup" target="_blank">Get started</a>')
  api.applyDom('#cta', 'B', '<button class="ab-variant-b">Start free</button>', KEY)
  doc.querySelector(`[data-ab-el="${KEY}"]`)
    .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }))
  assert.equal(nav.opened, 'https://kunde.example/signup')
  assert.equal(nav.href, null, 'darf nicht zusaetzlich navigieren')
})

check('Klick bubbelt weiter — der Conversion-Listener sieht ihn', () => {
  const { dom, doc, api } = page('<a id="cta" href="/signup">Get started</a>')
  api.applyDom('#cta', 'B', '<button class="ab-variant-b">Start free</button>', KEY)
  let hit = 0
  doc.addEventListener('click', (e) => {
    if (e.target.closest(`[data-ab-el="${KEY}"]`)) hit++
  }, true)
  doc.querySelector(`[data-ab-el="${KEY}"]`)
    .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }))
  assert.equal(hit, 1)
})

// ── Fall 3: Wrapper-Auswahl ────────────────────────────────────────────────
console.log('\n── Picker hat den Wrapper getroffen ──\n')

check('Link aus dem Wrapper landet auf dem Button in der Variante', () => {
  const { doc, api } = page('<div id="hero-actions"><span>Los geht’s</span><a href="/signup" class="cta">Get started</a></div>')
  api.applyDom('#hero-actions', 'B', '<div class="ab-v"><a class="cta2">Start free</a></div>', KEY)
  const b = doc.querySelector(`[data-ab-el="${KEY}"]`)
  assert.equal(b.querySelector('a').getAttribute('href'), '/signup')
})

// ── Fall 4: A hängt an einem JS-Listener ───────────────────────────────────
console.log('\n── A wird von JS gesteuert (React, SPA-Router) ──\n')

check('Klick auf B wird an das versteckte A weitergereicht', () => {
  const { dom, doc, api } = page('<button id="cta" class="cta">Get started</button>', false)
  const original = doc.getElementById('cta')
  let fired = 0
  original.addEventListener('click', () => { fired++ })
  api.applyDom('#cta', 'B', '<button class="ab-variant-b">Start free</button>', KEY)
  doc.querySelector(`[data-ab-el="${KEY}"]`)
    .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }))
  assert.equal(fired, 1, 'Listener des Originals wurde nicht ausgelöst')
})

check('delegierter Handler auf document erreicht das Original (bleibt im DOM)', () => {
  const { dom, doc, api } = page('<div id="root"><button id="cta" class="cta">Get started</button></div>', false)
  let delegated = 0
  doc.addEventListener('click', (e) => { if (e.target.closest('#cta')) delegated++ })
  api.applyDom('#cta', 'B', '<button class="ab-variant-b">Start free</button>', KEY)
  assert.ok(doc.getElementById('cta'), 'Original wurde entfernt statt versteckt')
  assert.equal(doc.getElementById('cta').style.display, 'none')
  assert.equal(doc.getElementById('cta').getAttribute('aria-hidden'), 'true')
  doc.querySelector(`[data-ab-el="${KEY}"]`)
    .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }))
  assert.equal(delegated, 1)
})

check('zweiter Durchlauf dupliziert die Variante nicht', () => {
  const { doc, api } = page('<div id="root"><button id="cta" class="cta">Get started</button></div>')
  api.applyDom('#cta', 'B', '<button class="ab-variant-b">Start free</button>', KEY)
  const again = api.applyDom('#cta', 'B', '<button class="ab-variant-b">Start free</button>', KEY)
  assert.equal(again, true, 'zweiter Aufruf muss "angewandt" melden (CSS-Scoping)')
  assert.equal(doc.querySelectorAll('.ab-variant-b').length, 1)
})

check('href="#" zählt als JS-Handler, nicht als Navigation', () => {
  const { dom, doc, api } = page('<a id="cta" href="#" class="cta">Open</a>', false)
  let fired = 0
  doc.getElementById('cta').addEventListener('click', () => { fired++ })
  api.applyDom('#cta', 'B', '<button class="ab-variant-b">Open now</button>', KEY)
  const b = doc.querySelector(`[data-ab-el="${KEY}"]`)
  assert.equal(b.getAttribute('data-ab-href'), null)
  b.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }))
  assert.equal(fired, 1)
})

// ── Fall 5: Inline-onclick ─────────────────────────────────────────────────
console.log('\n── A hat ein Inline-onclick ──\n')

check('onclick-Attribut wird übernommen', () => {
  const { doc, api } = page('<button id="cta" onclick="window.__hit=1" type="submit" name="go">Get started</button>')
  api.applyDom('#cta', 'B', '<button class="ab-variant-b">Start free</button>', KEY)
  const b = doc.querySelector(`[data-ab-el="${KEY}"]`)
  assert.equal(b.getAttribute('onclick'), 'window.__hit=1')
  assert.equal(b.getAttribute('type'), 'submit')
  assert.equal(b.getAttribute('name'), 'go')
  assert.ok(!doc.getElementById('cta'), 'Original haette ersetzt werden muessen')
})

// ── Fall 6: Barrierefreiheit ───────────────────────────────────────────────
console.log('\n── Barrierefreiheit ──\n')

check('nicht-interaktives B wird per Tastatur bedienbar', () => {
  const { dom, doc, api, nav } = page('<a id="cta" href="/signup">Get started</a>')
  api.applyDom('#cta', 'B', '<div class="ab-v">Start free</div>', KEY)
  const b = doc.querySelector(`[data-ab-el="${KEY}"]`)
  assert.equal(b.getAttribute('role'), 'button')
  assert.equal(b.getAttribute('tabindex'), '0')
  b.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
  assert.equal(nav.href, 'https://kunde.example/signup')
})

// ── Fall 7: unveränderte Pfade ─────────────────────────────────────────────
console.log('\n── Regression: bestehende Pfade ──\n')

check('Plain-Text-Variante behält das Original-Element samt href', () => {
  const { doc, api } = page('<a id="cta" href="/signup">Get started</a>')
  api.applyDom('#cta', 'B', 'Start free', KEY)
  const b = doc.querySelector(`[data-ab-el="${KEY}"]`)
  assert.equal(b.id, 'cta')
  assert.equal(b.getAttribute('href'), '/signup')
  assert.equal(b.textContent, 'Start free')
})

check('nicht-interaktives Original wird weiterhin einfach ersetzt', () => {
  const { doc, api } = page('<h1 id="hl">Alt</h1>')
  api.applyDom('#hl', 'B', '<h1 class="ab-variant-b">Neu</h1>', KEY)
  assert.ok(!doc.getElementById('hl'))
  assert.equal(doc.querySelector(`[data-ab-el="${KEY}"]`).textContent, 'Neu')
})

check('Variante A und fehlendes HTML ändern nichts', () => {
  const { api } = page('<a id="cta" href="/signup">Get started</a>')
  assert.equal(api.applyDom('#cta', 'A', '<button>x</button>', KEY), false)
  assert.equal(api.applyDom('#cta', 'B', '', KEY), false)
  assert.equal(api.applyDom('#weg', 'B', '<button>x</button>', KEY), false)
})

console.log(`\n${passed} passed, ${failed} failed\n`)
process.exit(failed === 0 ? 0 : 1)
