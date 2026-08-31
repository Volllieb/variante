// Delta-Generator (app/dashboard/components/new-test/delta.ts)
//
// Der manuelle Editor baut Variante B nicht mehr neu, sondern als Delta auf A:
// Markup, Klassen und Attribute kommen von A; das CSS enthält nur, was von der
// gemessenen Baseline abweicht.
//
// Run: node --import tsx __tests__/delta-generator.mjs

import { strict as assert } from 'node:assert'
import { JSDOM } from 'jsdom'

// delta.ts nutzt DOMParser (inheritRootHtml) — im Browser vorhanden, in node
// nicht. Vor dem Import global bereitstellen.
globalThis.DOMParser = new JSDOM('<!DOCTYPE html>').window.DOMParser

const {
  buildStyleBaseline,
  generateButtonCss,
  inheritRootHtml,
  initialEdits,
  scratchVariantHtml,
} = await import('../app/dashboard/components/new-test/delta.ts')

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

const SEL = '.cta'

// Baseline, wie der Picker sie misst (rgb()-Farben, px-Werte).
const BASELINE = buildStyleBaseline({
  'background-color': 'rgb(37, 99, 235)',
  color: 'rgb(255, 255, 255)',
  'font-size': '16px',
  'font-weight': '600',
  'border-radius': '8px',
  'border-width': '0px',
  'border-style': 'none',
  'border-color': 'rgba(0, 0, 0, 0)',
  padding: '12px 24px',
})

console.log('\n── buildStyleBaseline ──\n')

check('rgb()-Werte werden zu Hex, px-Werte zu Zahlen', () => {
  assert.equal(BASELINE.bgColor, '#2563eb')
  assert.equal(BASELINE.textColor, '#ffffff')
  assert.equal(BASELINE.fontSize, 16)
  assert.equal(BASELINE.fontWeight, 600)
  assert.equal(BASELINE.borderRadius, 8)
  assert.equal(BASELINE.paddingY, 12)
  assert.equal(BASELINE.paddingX, 24)
  assert.equal(BASELINE.borderStyle, 'none')
  assert.equal(BASELINE.borderColor, undefined, 'transparent (rgba α=0) darf keine Baseline-Farbe sein')
})

check('leere/irrelevante Computed-Styles ergeben null', () => {
  assert.equal(buildStyleBaseline({}), null)
  assert.equal(buildStyleBaseline(null), null)
  assert.equal(buildStyleBaseline(undefined), null)
})

console.log('\n── Delta-CSS ──\n')

check('unveränderte Edits → leerer String (leeres Delta)', () => {
  const edits = initialEdits(BASELINE, 'Go')
  const css = generateButtonCss(edits, SEL, BASELINE, 'inherit')
  assert.equal(css, '')
})

check('eine geänderte Farbe → genau eine Deklaration', () => {
  const edits = { ...initialEdits(BASELINE, 'Go'), bgColor: '#ff0000' }
  const css = generateButtonCss(edits, SEL, BASELINE, 'inherit')
  assert.equal(css, `${SEL} {\n  background-color: #ff0000;\n}`)
})

check('Padding/Font-Size bleiben draussen, wenn nur die Farbe geändert ist', () => {
  const edits = { ...initialEdits(BASELINE, 'Go'), bgColor: '#ff0000' }
  const css = generateButtonCss(edits, SEL, BASELINE, 'inherit')
  assert.ok(!css.includes('padding'), css)
  assert.ok(!css.includes('font-size'), css)
})

check('mehrere Änderungen ergeben mehrere Deklarationen — und sonst keine', () => {
  const edits = { ...initialEdits(BASELINE, 'Go'), bgColor: '#ff0000', fontSize: 20 }
  const css = generateButtonCss(edits, SEL, BASELINE, 'inherit')
  assert.ok(css.includes('background-color: #ff0000;'), css)
  assert.ok(css.includes('font-size: 20px;'), css)
  assert.ok(!css.includes('padding:'), css)
  assert.ok(!css.includes('transition'), 'inherit-Modus emittiert keine transition')
})

check('ohne Baseline degeneriert inherit zum absoluten Verhalten (alte Semantik)', () => {
  const edits = { ...initialEdits(null, 'Go'), bgColor: '#00ff00' }
  const css = generateButtonCss(edits, SEL, null, 'inherit')
  assert.ok(css.includes('background-color: #00ff00;'), css)
  assert.ok(css.includes('padding: 12px 24px;'), css)
})

check('scratch-Modus emittiert volles CSS inkl. transition', () => {
  const edits = { ...initialEdits(BASELINE, 'Go'), bgColor: '#00ff00' }
  const css = generateButtonCss(edits, SEL, BASELINE, 'scratch')
  assert.ok(css.includes('background-color: #00ff00;'), css)
  assert.ok(css.includes('padding: 12px 24px;'), css)
  assert.ok(css.includes('transition: all 0.2s ease;'), css)
})

check('hover wird nur mit hoverEnabled emittiert', () => {
  const edits = { ...initialEdits(BASELINE, 'Go'), bgColor: '#ff0000' }
  assert.ok(!generateButtonCss(edits, SEL, BASELINE, 'inherit').includes(':hover'))
  const hoverCss = generateButtonCss(
    { ...edits, hoverEnabled: true, hoverBgColor: '#111111' },
    SEL, BASELINE, 'inherit'
  )
  assert.ok(hoverCss.includes(`${SEL}:hover {`), hoverCss)
  assert.ok(hoverCss.includes('background-color: #111111;'), hoverCss)
})

console.log('\n── Markup ──\n')

check('inherit: <a> mit Klassen und href bleibt <a> — nur der Text ändert sich', () => {
  const out = inheritRootHtml('<a class="hover-btn hover-btn--white" href="/x">Old text</a>', 'New text')
  assert.ok(out.startsWith('<a'), out)
  assert.ok(out.includes('class="hover-btn hover-btn--white"'), out)
  assert.ok(out.includes('href="/x"'), out)
  assert.ok(out.includes('>New text</a>'), out)
})

check('inherit: id wird entfernt, data-* bleibt erhalten', () => {
  const out = inheritRootHtml('<button id="signup-btn" class="btn" data-size="lg">Go</button>', 'Start')
  assert.ok(!out.includes('id='), out)
  assert.ok(out.includes('class="btn"'), out)
  assert.ok(out.includes('data-size="lg"'), out)
  assert.ok(out.includes('>Start</button>'), out)
})

check('inherit: Text wird escaped, wenn er im Fallback-Markup landet', () => {
  const out = inheritRootHtml('', '<b>bold</b> & more')
  assert.ok(out.includes('&lt;b&gt;bold&lt;/b&gt; &amp; more'), out)
})

check('scratch: erzeugt weiterhin <button class="ab-variant-b">', () => {
  const out = scratchVariantHtml('Start free')
  assert.equal(out, '<button class="ab-variant-b">Start free</button>')
})

console.log(`\n${'─'.repeat(46)}`)
console.log(`  ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.log('  ❌ Delta-Generator kaputt.')
  process.exit(1)
}
console.log('  ✅ Alle Tests bestanden.')
