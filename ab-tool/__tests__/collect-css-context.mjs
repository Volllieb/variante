// collectCss + styleContext (direkt aus public/ab.js geladen)
//
// collectCss sammelt die CSS-Regeln, die auf das gepickte Element matchen —
// inkl. :hover/:focus-visible, :root und Custom Properties. Regeln aus
// @media/@supports/@layer-Blöcken werden MIT ihrem Wrapper gesammelt: eine
// Mobile-only-Regel darf nicht zu einer unbedingten Regel werden. Genau das
// war vorher kaputt (der Wrapper ging beim Absteigen in rule.cssRules
// verloren) und verfälschte Figma-Prompt und Results-Vorschau.
//
// styleContext bündelt das CSS mit den gemessenen Computed-Styles — der
// Rückkanal des Pickers trägt beides zum Wizard (Delta-Editor + Vorschau).
//
// Die Funktionen kommen aus dem ECHTEN public/ab.js (helpers/abSource.mjs):
// früher stand hier eine 1:1-Kopie, die still eigene Bugs trug und grün
// meldete, während das ausgelieferte Snippet rot war. Das soll nie wieder
// möglich sein.
//
// Run: node --import tsx __tests__/collect-css-context.mjs

import { strict as assert } from 'node:assert'
import { JSDOM } from 'jsdom'
import { abSource } from './helpers/abSource.mjs'

const { collectCss, styleContext, restingValues, hoverStyles } = abSource

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

// ── Fixture ─────────────────────────────────────────────────────────────────

// collectCss referenziert Browser-Globals — vor jedem Aufruf bereitstellen.
function setupGlobals(dom) {
  globalThis.document = dom.window.document
  globalThis.CSSRule = dom.window.CSSRule
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
  globalThis.location = { origin: 'https://example.com' }
}

function buildPage() {
  const dom = new JSDOM(
    `<!DOCTYPE html><html><head><style>
      .cta { color: #111; padding: 12px 24px; }
      .cta:hover { color: #f00; }
      :root { --accent: #2563eb; }
      @media (max-width: 600px) {
        .cta { font-size: 14px; padding: 8px 16px; }
      }
      @supports (display: grid) {
        .cta { display: grid; }
      }
      @media (min-width: 900px) {
        .unrelated { color: teal; }
      }
    </style></head><body><a class="cta" href="/signup">Go</a></body></html>`,
    { url: 'https://example.com/' }
  )
  setupGlobals(dom)
  return dom
}

console.log('\n── collectCss: @media-Wrapper ──\n')

check('Mobile-only-Regel kommt MIT Wrapper zurueck, nicht flachgeklopft', () => {
  const dom = buildPage()
  const el = dom.window.document.querySelector('.cta')
  const css = collectCss(el)
  assert.ok(
    css.includes('@media (max-width: 600px) { .cta { font-size: 14px; padding: 8px 16px; } }'),
    'Wrapped-Regel fehlt:\n' + css
  )
})

check('@supports-Wrapper bleibt erhalten', () => {
  const dom = buildPage()
  const el = dom.window.document.querySelector('.cta')
  const css = collectCss(el)
  assert.ok(css.includes('@supports (display: grid) { .cta { display: grid; } }'), css)
})

check('unbedingte Regeln und :hover kommen weiterhin flach mit', () => {
  const dom = buildPage()
  const el = dom.window.document.querySelector('.cta')
  const css = collectCss(el)
  // cssom (jsdom) normalisiert Farben zu rgb() — beide Serialisierungen gelten.
  assert.ok(/\.cta \{ color: (rgb\(17, 17, 17\)|#111); padding: 12px 24px; \}/.test(css), css)
  assert.ok(/\.cta:hover \{ color: (rgb\(255, 0, 0\)|#f00); \}/.test(css), css)
})

check(':root / Custom Properties werden gesammelt', () => {
  const dom = buildPage()
  const el = dom.window.document.querySelector('.cta')
  const css = collectCss(el)
  assert.ok(css.includes('--accent'), css)
})

check('nicht matchende Regeln (auch in @media) bleiben draussen', () => {
  const dom = buildPage()
  const el = dom.window.document.querySelector('.cta')
  const css = collectCss(el)
  assert.ok(!css.includes('unrelated'), css)
})

console.log('\n── collectCss: Regressionen aus dem Preview-Fix ──\n')

// master-Regression: indexOf('--') als Custom-Property-Guard sammelte jede
// Regel ein, die var(--bg) bloss BENUTZT — darunter body-Regeln, die in der
// Vorschau den Rahmen kaperten und das Budget sprengten. Nur DEFINITIONEN
// (`--x: wert`) gehören zu den :root-Tokens.
check('Regel, die var(--bg) nur BENUTZT, landet nicht im Ergebnis', () => {
  const dom = new JSDOM(
    `<!DOCTYPE html><html><head><style>
      :root { --bg: #f7f5f2; }
      body { background: var(--bg); min-height: 100vh; }
      .cta { color: #111; }
    </style></head><body><a class="cta">Go</a></body></html>`,
    { url: 'https://example.com/' }
  )
  setupGlobals(dom)
  const el = dom.window.document.querySelector('.cta')
  const css = collectCss(el)
  assert.ok(!/var\(--bg\)/.test(css), 'var()-Nutzer ist drin:\n' + css)
  // Die Definition selbst bleibt — ohne sie griffe jedes var() ins Leere.
  assert.ok(css.includes('--bg: #f7f5f2'), 'Definition fehlt:\n' + css)
  assert.ok(css.includes('.cta'), 'Element-Regel fehlt:\n' + css)
})

// master-Regression: die Kappung schnitt mitten in eine Deklaration. Die
// offene Regel liess den CSS-Parser alles Nachfolgende verschlucken —
// computed-Block und Varianten-Delta — und B sah exakt aus wie A.
check('Budget-Ueberlauf: alle Regeln geschlossen, computed-Block ueberlebt', () => {
  const rules = []
  for (let n = 0; n < 900; n++) {
    rules.push(`.cta { color: rgb(${n % 255}, 0, 0); margin: ${n}px 0; }`)
  }
  const dom = new JSDOM(
    `<!DOCTYPE html><html><head><style>${rules.join('\n')}</style></head><body><a class="cta">Go</a></body></html>`,
    { url: 'https://example.com/' }
  )
  setupGlobals(dom)
  const el = dom.window.document.querySelector('.cta')
  // jsdom kaskadiert Stylesheets nicht in getComputedStyle — Inline-Style
  // setzen, damit der computed-Block messbaren Input hat.
  el.style.cssText = 'color: rgb(1, 2, 3); padding: 4px 8px;'
  const css = collectCss(el)
  assert.ok(css.length > 18000, 'Fixture zu klein (erwartet >18000 Zeichen): ' + css.length)
  const open = (css.match(/\{/g) || []).length
  const close = (css.match(/\}/g) || []).length
  assert.equal(open, close, `Klammern nicht ausgeglichen (${open} offen, ${close} geschlossen)`)
  assert.ok(css.includes('.__original'), 'computed-Block fehlt:\n' + css.slice(-400))
  assert.ok(css.includes('padding: 4px 8px'), 'gemessene Styles fehlen im computed-Block:\n' + css.slice(-400))
})

console.log('\n── styleContext ──\n')

check('styleContext buendelt css + computed-Map', () => {
  const dom = buildPage()
  const el = dom.window.document.querySelector('.cta')
  // jsdom kaskadiert Stylesheets nicht in getComputedStyle — Inline-Style setzen,
  // damit computedMap messbaren Input hat.
  el.style.cssText = 'color: rgb(1, 2, 3); font-size: 16px;'
  const ctx = styleContext(el)
  assert.equal(typeof ctx.css, 'string')
  assert.ok(ctx.css.includes('@media (max-width: 600px)'), ctx.css)
  assert.equal(typeof ctx.computed, 'object')
  assert.equal(ctx.computed.color, 'rgb(1, 2, 3)')
  assert.equal(ctx.computed['font-size'], '16px')
})

console.log('\n── Ruhe- vs. Hover-Zustand ──\n')

// Der Klick-Handler misst zwangslaeufig MIT :hover — der Zeiger liegt auf dem
// Element. restingValues umgeht das ueber einen Klon an derselben Position, der
// nicht unter dem Zeiger liegt.
check('restingValues misst am Klon und raeumt ihn wieder ab', () => {
  const dom = buildPage()
  const el = dom.window.document.querySelector('.cta')
  const parent = el.parentNode
  const before = parent.childNodes.length
  const seen = []
  const real = dom.window.getComputedStyle.bind(dom.window)
  globalThis.getComputedStyle = (node) => { seen.push(node); return real(node) }
  const vals = restingValues(el)
  assert.equal(parent.childNodes.length, before, 'Klon wurde nicht entfernt')
  assert.ok(seen.length > 0, 'getComputedStyle wurde nie aufgerufen')
  assert.ok(seen.every((n) => n !== el), 'am Original gemessen statt am Klon')
  assert.equal(typeof vals, 'object')
})

// Der Hover-Zustand kommt aus den geschriebenen :hover-Regeln, nicht aus
// getComputedStyle: waehrend einer laufenden Transition liefert die Messung
// Zwischenwerte, und beim Klick per Tastatur gibt es gar keinen Hover.
check('hoverStyles liest die :hover-Regel des Elements', () => {
  const dom = buildPage()
  const el = dom.window.document.querySelector('.cta')
  const hover = hoverStyles(el)
  // Fixture: .cta:hover { color: #f00 }
  assert.ok(hover.color, JSON.stringify(hover))
  assert.ok(/red|#f00|rgb\(255, 0, 0\)/.test(hover.color), hover.color)
  // Was die Hover-Regel NICHT setzt, gehoert auch nicht in den Hover-Block.
  assert.equal(hover.padding, undefined, JSON.stringify(hover))
})

check('kein Hover-Effekt → kein computedHover, kein .__original_hover', () => {
  const dom = new JSDOM(
    '<!DOCTYPE html><html><head><style>.plain { color: #111; }</style></head>' +
    '<body><a class="plain" href="/x">Go</a></body></html>',
    { url: 'https://example.com/' }
  )
  setupGlobals(dom)
  const el = dom.window.document.querySelector('.plain')
  const ctx = styleContext(el)
  assert.equal(ctx.computedHover, undefined)
  assert.ok(!ctx.css.includes('.__original_hover'), ctx.css.slice(-300))
})

check('styleContext trennt Ruhe- und Hover-Zustand in zwei Bloecke', () => {
  const dom = buildPage()
  const el = dom.window.document.querySelector('.cta')
  el.style.cssText = 'background-color: rgb(37, 99, 235);'
  const ctx = styleContext(el)
  assert.equal(ctx.computed['background-color'], 'rgb(37, 99, 235)', 'Ruhezustand verfaelscht')
  assert.ok(ctx.computedHover.color, JSON.stringify(ctx.computedHover))
  assert.ok(ctx.css.includes('.__original {'), ctx.css.slice(-400))
  assert.ok(ctx.css.includes('.__original_hover {'), ctx.css.slice(-400))
})

console.log(`\n${'─'.repeat(46)}`)
console.log(`  ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.log('  ❌ collectCss/styleContext kaputt.')
  process.exit(1)
}
console.log('  ✅ Alle Tests bestanden.')
