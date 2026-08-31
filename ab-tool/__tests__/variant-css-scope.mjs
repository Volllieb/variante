// Variant-CSS-Scoping (aus public/ab.js)
//
// Das CSS einer Variante wird gegen den ORIGINAL-Selektor generiert. Ersetzt
// das B-HTML das Element durch anderes Markup, trifft dieser Selektor nichts
// mehr und B rendert ungestylt.
//
// Auf einer Kundenseite gemessen, bevor das gefixt war:
//   CSS:  #hero-meta-right > div.hero-actions > a.hover-btn.hover-btn--white
//   B:    <button class="ab-variant-b">
//   Ist:  grau, outset, radius 0, padding 0, 13px  (Browser-Default)
//   Soll: weiss, 2px solid #000, radius 11px, padding 12/24, 16px
//
// Seit dem Klassen-Erbe (B trägt A's Klassen) matcht A's Site-CSS auch auf B —
// eine ID-basierte Site-Regel würde das gescopte Delta sonst schlagen. Deshalb
// bekommen die Deklarationen umgeschriebener Blöcke !important.
//
// Run: node --import tsx __tests__/variant-css-scope.mjs

import { strict as assert } from 'node:assert'
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

// ── 1:1 aus public/ab.js ────────────────────────────────────────────────────
function scopeCssToVariant(css, selector, key) {
  if (!css || !selector || css.indexOf(selector) === -1) return css
  var attr = '[data-ab-el="' + key + '"]'
  var swapped = css.split(selector).join(attr)
  return swapped.replace(/([^{}]+)(\{[^{}]*\})/g, function (match, sel, block) {
    if (sel.indexOf(attr) === -1) return match
    return sel + forceImportant(block)
  })
}

function forceImportant(block) {
  var open = block.indexOf('{')
  var close = block.lastIndexOf('}')
  if (open === -1 || close <= open) return block
  var body = block.slice(open + 1, close)
  var parts = [], buf = '', depth = 0
  for (var i = 0; i < body.length; i++) {
    var c = body.charAt(i)
    if (c === '(') depth++
    else if (c === ')') depth = Math.max(0, depth - 1)
    if (c === ';' && depth === 0) { parts.push(buf); buf = '' }
    else buf += c
  }
  if (buf.trim()) parts.push(buf)
  var out = []
  for (var p = 0; p < parts.length; p++) {
    var decl = parts[p].trim()
    if (!decl) continue
    if (/!important\s*$/i.test(decl)) out.push(decl)
    else out.push(decl + ' !important')
  }
  if (!out.length) return block
  return block.slice(0, open + 1) + ' ' + out.join('; ') + ';' + block.slice(close)
}

const KEY = '7a5c06fb-dead-4beef-8888-000000000000'
const SEL = '#hero > div.actions > a.cta.cta--white'
const CSS =
  `${SEL} {\n  background-color: #ffffff;\n  border-radius: 11px;\n}\n\n` +
  `${SEL}:hover {\n  background-color: #ff0000;\n}`

console.log('\n── scopeCssToVariant ──\n')

check('Selektor wird durch die B-Wurzel ersetzt', () => {
  const out = scopeCssToVariant(CSS, SEL, KEY)
  assert.ok(out.includes(`[data-ab-el="${KEY}"] {`), out)
  assert.ok(!out.includes(SEL), 'Original-Selektor steht noch drin')
})

check(':hover bleibt als Suffix erhalten', () => {
  const out = scopeCssToVariant(CSS, SEL, KEY)
  assert.ok(out.includes(`[data-ab-el="${KEY}"]:hover {`), out)
})

check('CSS ohne den Selektor bleibt unveraendert (Reorder-Modus)', () => {
  const other = '#ganz-woanders { order: 2 }'
  assert.equal(scopeCssToVariant(other, SEL, KEY), other)
})

check('leeres CSS bleibt leer', () => {
  assert.equal(scopeCssToVariant('', SEL, KEY), '')
  assert.equal(scopeCssToVariant(null, SEL, KEY), null)
})

console.log('\n── !important gegen A\'s Site-Regeln ──\n')

check('Deklarationen umgeschriebener Bloecke bekommen !important', () => {
  const out = scopeCssToVariant(CSS, SEL, KEY)
  assert.ok(out.includes('background-color: #ffffff !important;'), out)
  assert.ok(out.includes('border-radius: 11px !important;'), out)
  assert.ok(out.includes('background-color: #ff0000 !important;'), out)
})

check('bereits vorhandenes !important wird nicht verdoppelt', () => {
  const css = `${SEL} {\n  color: #000 !important;\n}`
  const out = scopeCssToVariant(css, SEL, KEY)
  assert.ok(out.includes('color: #000 !important;'), out)
  assert.ok(!out.includes('!important !important'), out)
})

check('Suffixe wie " > span" ueberleben den Tausch UND bekommen !important', () => {
  const css = `${SEL} > span {\n  font-weight: 600;\n}`
  const out = scopeCssToVariant(css, SEL, KEY)
  assert.ok(out.includes(`[data-ab-el="${KEY}"] > span {`), out)
  assert.ok(out.includes('font-weight: 600 !important;'), out)
})

check('.ab-v-CSS ohne den Selektor bleibt unberuehrt (Figma-Pfad)', () => {
  const figmaCss = '.ab-v .btn {\n  background: #f0f;\n}'
  assert.equal(scopeCssToVariant(figmaCss, SEL, KEY), figmaCss)
})

check('Regel im @media-Wrapper wird umgeschrieben, Wrapper bleibt', () => {
  const css = `@media (max-width: 600px) {\n  ${SEL} {\n    font-size: 14px;\n  }\n}`
  const out = scopeCssToVariant(css, SEL, KEY)
  assert.ok(out.includes('@media (max-width: 600px)'), out)
  assert.ok(out.includes(`[data-ab-el="${KEY}"] {`), out)
  assert.ok(out.includes('font-size: 14px !important;'), out)
  assert.ok(!out.includes(SEL), 'Original-Selektor steht noch drin')
})

console.log('\n── Anwendung im DOM ──\n')

function buildPage() {
  return new JSDOM(
    '<!DOCTYPE html><html><head></head><body>' +
      '<div id="hero"><div class="actions">' +
      '<a class="cta cta--white" href="#support">make it possible</a>' +
      '</div></div></body></html>'
  )
}

check('B mit anderem Tag/Klassen wird von der gescopten Regel getroffen', () => {
  const dom = buildPage()
  const doc = dom.window.document
  const el = doc.querySelector(SEL)
  assert.ok(el, 'Original-Element nicht gefunden')

  // applyDom: Element durch B-Markup ersetzen, B-Wurzel markieren
  const tmp = doc.createElement('div')
  tmp.innerHTML = '<button class="ab-variant-b">make it possible</button>'
  const node = tmp.firstElementChild
  node.setAttribute('data-ab-el', KEY)
  el.replaceWith(node)

  // genau das war der Bug: der Original-Selektor trifft B nicht
  assert.equal(doc.querySelector(SEL), null, 'Original-Selektor trifft B doch')

  const scoped = scopeCssToVariant(CSS, SEL, KEY)
  const style = doc.createElement('style')
  style.setAttribute('data-ab-css', KEY)
  style.textContent = scoped
  doc.head.appendChild(style)

  // Jede Regel im injizierten Stylesheet muss auf B zeigen
  const rules = Array.from(style.sheet.cssRules)
  assert.ok(rules.length >= 2, `nur ${rules.length} Regeln`)
  const base = rules.find(r => !r.selectorText.includes(':hover'))
  assert.ok(node.matches(base.selectorText), `B matcht "${base.selectorText}" nicht`)
  assert.ok(
    rules.some(r => r.selectorText.includes(`[data-ab-el="${KEY}"]:hover`)),
    'keine gescopte :hover-Regel'
  )
})

check('ohne B-Anwendung bleibt der Original-Selektor gueltig', () => {
  const dom = buildPage()
  const doc = dom.window.document
  const el = doc.querySelector(SEL)
  // applyDom liefert false (kein HTML) -> CSS unveraendert injizieren
  const style = doc.createElement('style')
  style.textContent = CSS
  doc.head.appendChild(style)
  const rules = Array.from(style.sheet.cssRules)
  const base = rules.find(r => !r.selectorText.includes(':hover'))
  assert.ok(el.matches(base.selectorText), 'Original trifft sich selbst nicht mehr')
})

console.log(`\n${'─'.repeat(46)}`)
console.log(`  ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.log('  ❌ Variant-CSS-Scoping kaputt.')
  process.exit(1)
}
console.log('  ✅ Alle Tests bestanden.')
