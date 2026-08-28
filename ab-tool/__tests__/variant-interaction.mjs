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

// scopeCssToVariant und applyCss stehen direkt ueber ACTION_SEL_SRC und werden
// von applyDom benutzt (das CSS geht VOR dem Tausch rein) — mit extrahieren
// statt nachbauen, sonst driftet der Test vom echten Verhalten weg.
const START = source.indexOf('  function scopeCssToVariant')
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
     return { applyDom: applyDom, portInteraction: portInteraction, findAction: findAction, realHref: realHref, scopeCssToVariant: scopeCssToVariant }`
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

check('Mittelklick öffnet einen neuen Tab, wie beim echten Link', () => {
  const { dom, doc, api, nav } = page('<a id="cta" href="/signup">Get started</a>')
  api.applyDom('#cta', 'B', '<button class="ab-variant-b">Start free</button>', KEY)
  doc.querySelector(`[data-ab-el="${KEY}"]`)
    .dispatchEvent(new dom.window.MouseEvent('auxclick', { button: 1, bubbles: true, cancelable: true }))
  assert.equal(nav.opened, 'https://kunde.example/signup')
  assert.equal(nav.href, null, 'darf die aktuelle Seite nicht verlassen')
})

check('Strg-Klick öffnet einen neuen Tab', () => {
  const { dom, doc, api, nav } = page('<a id="cta" href="/signup">Get started</a>')
  api.applyDom('#cta', 'B', '<button class="ab-variant-b">Start free</button>', KEY)
  doc.querySelector(`[data-ab-el="${KEY}"]`)
    .dispatchEvent(new dom.window.MouseEvent('click', { ctrlKey: true, bubbles: true, cancelable: true }))
  assert.equal(nav.opened, 'https://kunde.example/signup')
  assert.equal(nav.href, null)
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

// ── Fall 7: Mauszeiger und Beschriftung ────────────────────────────────────
// Der Cursor kommt nicht vom Aussehen: <a href> bekommt vom Browser
// cursor:pointer, <button> nicht. Wird der Link zur <button>-Variante, zeigt
// der Zeiger dort einen Pfeil — B wirkt tot, obwohl der Klick funktioniert.
console.log('\n── Mauszeiger & Beschriftung ──\n')

check('cursor des Originals landet auf der Variante', () => {
  const { doc, api } = page('<style>.cta{cursor:pointer}</style><a id="cta" class="cta" href="/signup">Get started</a>')
  api.applyDom('#cta', 'B', '<button class="ab-variant-b">Start free</button>', KEY)
  assert.equal(doc.querySelector(`[data-ab-el="${KEY}"]`).style.cursor, 'pointer')
})

check('abweichender cursor (not-allowed) wird nicht zu pointer verbogen', () => {
  const { doc, api } = page('<style>.cta{cursor:not-allowed}</style><button id="cta" class="cta">Ausverkauft</button>', false)
  api.applyDom('#cta', 'B', '<button class="ab-variant-b">Ausverkauft</button>', KEY)
  assert.equal(doc.querySelector(`[data-ab-el="${KEY}"]`).style.cursor, 'not-allowed')
})

check('bringt B den cursor selbst mit, wird nichts gesetzt', () => {
  const { doc, api } = page('<style>.cta{cursor:pointer}.ab-variant-b{cursor:pointer}</style><a id="cta" class="cta" href="/signup">Get started</a>')
  api.applyDom('#cta', 'B', '<button class="ab-variant-b">Start free</button>', KEY)
  assert.equal(doc.querySelector(`[data-ab-el="${KEY}"]`).style.cursor, '')
})

check('title, aria-label und disabled wandern mit', () => {
  const { doc, api } = page('<button id="cta" title="Jetzt starten" aria-label="Kostenlos starten" disabled>Get started</button>', false)
  api.applyDom('#cta', 'B', '<button class="ab-variant-b">Start free</button>', KEY)
  const b = doc.querySelector(`[data-ab-el="${KEY}"]`)
  assert.equal(b.getAttribute('title'), 'Jetzt starten')
  assert.equal(b.getAttribute('aria-label'), 'Kostenlos starten')
  assert.ok(b.hasAttribute('disabled'))
})

check('eigenes aria-label der Variante bleibt', () => {
  const { doc, api } = page('<button id="cta" aria-label="Alt">Get started</button>', false)
  api.applyDom('#cta', 'B', '<button class="ab-variant-b" aria-label="Neu">Start free</button>', KEY)
  assert.equal(doc.querySelector(`[data-ab-el="${KEY}"]`).getAttribute('aria-label'), 'Neu')
})

// ── Fall 8: unveränderte Pfade ─────────────────────────────────────────────
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

// ── Kein ungestyltes Zwischenbild ───────────────────────────────────────────
// B wird erst nach zwei Roundtrips eingehaengt. Ging das <style> danach rein,
// existierte B einen Style-Recalc lang ohne sein CSS: das Element erscheint in
// Browser-Defaults (kleiner) und springt dann auf seine echte Groesse — sieht
// aus wie verspaetetes CSS und verfaelscht den Test.
console.log('')
console.log('── Kein ungestyltes Zwischenbild ──')
console.log('')

check('Varianten-CSS ist im DOM, bevor B eingehaengt wird', () => {
  const { doc, api } = page('<a id="cta" href="/signup">Get started</a>')
  const bAtInject = []
  const origAppend = doc.head.appendChild.bind(doc.head)
  doc.head.appendChild = function (n) {
    if (n.tagName === 'STYLE') bAtInject.push(doc.querySelector(`[data-ab-el="${KEY}"]`))
    return origAppend(n)
  }
  api.applyDom('#cta', 'B', '<a class="ab-variant-b">Start free</a>', KEY, '#cta { color: red }')
  assert.equal(bAtInject.length, 1, 'kein <style> injiziert')
  assert.equal(bAtInject[0], null, 'B stand beim CSS-Inject schon im DOM')
})

check('das injizierte CSS ist auf die B-Wurzel gescopt', () => {
  const { doc, api } = page('<a id="cta" href="/signup">Get started</a>')
  api.applyDom('#cta', 'B', '<a class="ab-variant-b">Start free</a>', KEY, '#cta { color: red }')
  const style = doc.querySelector(`style[data-ab-css="${KEY}"]`)
  assert.ok(style, 'kein <style data-ab-css> im head')
  assert.equal(style.textContent, `[data-ab-el="${KEY}"] { color: red }`)
})

check('ohne CSS wird auch kein leeres <style> gesetzt', () => {
  const { doc, api } = page('<a id="cta" href="/signup">Get started</a>')
  api.applyDom('#cta', 'B', '<a class="ab-variant-b">Start free</a>', KEY)
  assert.equal(doc.querySelector('style[data-ab-css]'), null)
})

// ── CSS ueberlebt den zweiten Durchlauf ─────────────────────────────────────
// reobserve() (MutationObserver, popstate) raeumte frueher alle injizierten
// <style> ab und rief run() erneut auf. applyDom stieg beim zweiten Durchlauf
// frueh aus ("B steht schon da") — und injizierte das CSS nie wieder. Auf jeder
// Seite, die ueberhaupt mutiert (Lazy-Loading, Karussell, Chat-Widget), stand B
// ab da im Browser-Default. Gemeldet als: nach einem Klick auf B (Ankerlink)
// und Zurueckscrollen hat das Element kein CSS mehr.
console.log('')
console.log('── CSS ueberlebt den zweiten Durchlauf ──')
console.log('')

const CSS = '#cta { color: red }'
const SCOPED = `[data-ab-el="${KEY}"] { color: red }`

check('entferntes <style> wird beim zweiten Durchlauf neu injiziert', () => {
  const { doc, api } = page('<a id="cta" href="/signup">Get started</a>')
  api.applyDom('#cta', 'B', '<a class="ab-variant-b">Start free</a>', KEY, CSS)
  doc.querySelector(`style[data-ab-css="${KEY}"]`).remove()

  const applied = api.applyDom('#cta', 'B', '<a class="ab-variant-b">Start free</a>', KEY, CSS)
  assert.equal(applied, true)
  const style = doc.querySelector(`style[data-ab-css="${KEY}"]`)
  assert.ok(style, 'CSS der Variante wurde nicht neu injiziert')
  assert.equal(style.textContent, SCOPED, 'neu injiziertes CSS ist nicht auf B gescopt')
})

check('lebendes <style> wird nicht dupliziert', () => {
  const { doc, api } = page('<a id="cta" href="/signup">Get started</a>')
  api.applyDom('#cta', 'B', '<a class="ab-variant-b">Start free</a>', KEY, CSS)
  api.applyDom('#cta', 'B', '<a class="ab-variant-b">Start free</a>', KEY, CSS)
  assert.equal(doc.querySelectorAll('style[data-ab-css]').length, 1)
  assert.equal(doc.querySelectorAll(`[data-ab-el="${KEY}"]`).length, 1)
})

// ── Einblend-Animationen ────────────────────────────────────────────────────
// Die Seite haengt bis reveal() auf opacity:0. Alle Entrance-Animationen der
// Seite sind dann durch — die des frisch eingefuegten B faengt genau dann erst
// an: B "baut sich auf", waehrend alles andere sofort da ist.
console.log('')
console.log('── Einblend-Animationen ──')
console.log('')

function withAnimations(dom, anims) {
  dom.window.Element.prototype.getAnimations = function () { return anims }
}
function anim(iterations, log, name) {
  return {
    effect: { getTiming: () => ({ iterations }) },
    finish() { log.push(name) },
  }
}

check('einmalige Animation der Variante wird auf den Endzustand vorgespult', () => {
  const { dom, api } = page('<a id="cta" href="/signup">Get started</a>')
  const finished = []
  withAnimations(dom, [anim(1, finished, 'fade-in-up')])
  api.applyDom('#cta', 'B', '<a class="ab-variant-b">Start free</a>', KEY)
  assert.deepEqual(finished, ['fade-in-up'])
})

check('endlos laufende Animation (Puls, Spinner) bleibt unangetastet', () => {
  const { dom, api } = page('<a id="cta" href="/signup">Get started</a>')
  const finished = []
  withAnimations(dom, [anim(Infinity, finished, 'puls'), anim(1, finished, 'fade-in-up')])
  api.applyDom('#cta', 'B', '<a class="ab-variant-b">Start free</a>', KEY)
  assert.deepEqual(finished, ['fade-in-up'])
})

check('eine werfende Animation stoppt die uebrigen nicht', () => {
  const { dom, api } = page('<a id="cta" href="/signup">Get started</a>')
  const finished = []
  withAnimations(dom, [
    { effect: null, finish() { throw new Error('InvalidState') } },
    anim(1, finished, 'fade-in-up'),
  ])
  api.applyDom('#cta', 'B', '<a class="ab-variant-b">Start free</a>', KEY)
  assert.deepEqual(finished, ['fade-in-up'])
})

console.log(`\n${passed} passed, ${failed} failed\n`)
process.exit(failed === 0 ? 0 : 1)
