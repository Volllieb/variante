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
  composeVariant,
  diffCssToEntries,
  diffTextToEntry,
  entriesToEdits,
  describeChange,
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

console.log('\n── Änderungsliste (composeVariant / diffCssToEntries) ──\n')

const ORIGINAL_A = '<a class="hover-btn hover-btn--white" href="/x">Old text</a>'

const applied = (property, before, after) => ({
  id: String(Math.random()), property, before, after, source: 'manual', status: 'applied',
})

check('composeVariant: leere Liste → HTML ≡ A, CSS leer', () => {
  const out = composeVariant({ mode: 'inherit', entries: [], baseline: BASELINE }, ORIGINAL_A, SEL)
  assert.equal(out.html, ORIGINAL_A)
  assert.equal(out.css, '')
})

check('composeVariant: eine Farbzeile → genau eine Deklaration, Markup erbt A', () => {
  const out = composeVariant(
    { mode: 'inherit', entries: [applied('bgColor', '#2563eb', '#ff0000')], baseline: BASELINE },
    ORIGINAL_A,
    SEL
  )
  assert.equal(out.css, `${SEL} {\n  background-color: #ff0000;\n}`)
  assert.ok(out.html.startsWith('<a class="hover-btn hover-btn--white"'), out.html)
  assert.ok(out.html.includes('>Old text</a>'), out.html)
})

check('composeVariant: Textzeile ändert den Text, CSS bleibt leer', () => {
  const out = composeVariant(
    { mode: 'inherit', entries: [applied('text', 'Old text', 'Start free')], baseline: BASELINE },
    ORIGINAL_A,
    SEL
  )
  assert.equal(out.css, '')
  assert.ok(out.html.includes('>Start free</a>'), out.html)
})

check('composeVariant: Scratch emittiert auch baseline-gleiche Werte (absolut)', () => {
  const out = composeVariant(
    {
      mode: 'scratch',
      entries: [
        applied('text', 'Old text', 'Start'),
        applied('bgColor', '#2563eb', '#2563eb'),
      ],
      baseline: BASELINE,
    },
    ORIGINAL_A,
    SEL
  )
  assert.equal(out.html, '<button class="ab-variant-b">Start</button>')
  // bgColor == Baseline — im inherit-Modus fiele das raus, scratch ist absolut.
  assert.ok(out.css.includes('background-color: #2563eb;'), out.css)
  assert.ok(out.css.includes('transition: all 0.2s ease;'), out.css)
})

check('composeVariant: other-Zeilen werden als Roh-CSS angehängt', () => {
  const out = composeVariant(
    {
      mode: 'inherit',
      entries: [
        applied('bgColor', '#2563eb', '#ff0000'),
        { id: 'o', property: 'other', before: '', after: '', source: 'ai', status: 'applied', rawCss: `${SEL} { letter-spacing: 0.5px; }` },
      ],
      baseline: BASELINE,
    },
    ORIGINAL_A,
    SEL
  )
  assert.ok(out.css.includes('background-color: #ff0000;'), out.css)
  assert.ok(out.css.includes('letter-spacing: 0.5px;'), out.css)
})

check('diffCssToEntries: Wert gleich Baseline → keine Zeile', () => {
  const entries = diffCssToEntries(`${SEL} { background-color: #2563eb; }`, BASELINE, 'ai')
  assert.equal(entries.length, 0)
})

check('diffCssToEntries: geänderte Werte werden Zeilen mit before/after (status suggested)', () => {
  const entries = diffCssToEntries(`${SEL} { background-color: #ff0000; font-size: 20px; }`, BASELINE, 'ai')
  assert.equal(entries.length, 2)
  const bg = entries.find((e) => e.property === 'bgColor')
  assert.equal(bg.before, '#2563eb')
  assert.equal(bg.after, '#ff0000')
  assert.equal(bg.status, 'suggested')
  const fs = entries.find((e) => e.property === 'fontSize')
  assert.equal(fs.before, '16')
  assert.equal(fs.after, '20')
})

check('diffCssToEntries: padding-Shorthand wird zwei Zeilen', () => {
  const entries = diffCssToEntries(`${SEL} { padding: 20px 40px; }`, BASELINE, 'ai')
  assert.equal(entries.find((e) => e.property === 'paddingY').after, '20')
  assert.equal(entries.find((e) => e.property === 'paddingX').after, '40')
})

check('diffCssToEntries: unbekannte Property → genau EINE other-Zeile mit rawCss', () => {
  const css = `${SEL} { background-color: #ff0000; letter-spacing: 0.5px; }`
  const entries = diffCssToEntries(css, BASELINE, 'ai')
  const others = entries.filter((e) => e.property === 'other')
  assert.equal(others.length, 1)
  assert.ok(others[0].rawCss.includes('letter-spacing: 0.5px;'), others[0].rawCss)
})

check('diffCssToEntries: hover-Regeln werden hover-Zeilen', () => {
  const entries = diffCssToEntries(
    `${SEL}:hover { background-color: #111111; transform: scale(1.1); }`,
    BASELINE,
    'ai'
  )
  const bg = entries.find((e) => e.property === 'hoverBgColor')
  assert.equal(bg.after, '#111111')
  assert.equal(bg.before, '', 'hover hat keine Baseline')
  const scale = entries.find((e) => e.property === 'hoverScale')
  assert.equal(scale.after, '110')
})

check('diffCssToEntries: ohne Baseline haben alle Zeilen before ""', () => {
  const entries = diffCssToEntries(`${SEL} { background-color: #ff0000; }`, null, 'ai')
  assert.equal(entries.length, 1)
  assert.equal(entries[0].before, '')
})

check('diffTextToEntry: gleicher Text → null, anderer Text → Zeile', () => {
  assert.equal(diffTextToEntry('<b>A</b>', '<b>A</b>', 'ai'), null)
  const e = diffTextToEntry('<b>A</b>', '<b>B</b>', 'ai')
  assert.equal(e.property, 'text')
  assert.equal(e.before, 'A')
  assert.equal(e.after, 'B')
})

check('entriesToEdits: suggested wird ignoriert, applied wird gemappt', () => {
  const edits = entriesToEdits([
    { id: '1', property: 'bgColor', before: '', after: '#ff0000', source: 'ai', status: 'suggested' },
    applied('text', '', 'Go'),
    applied('fontSize', '', '20'),
  ])
  assert.equal(edits.bgColor, undefined)
  assert.equal(edits.text, 'Go')
  assert.equal(edits.fontSize, 20)
})

check('entriesToEdits: hover-Zeilen setzen hoverEnabled', () => {
  const edits = entriesToEdits([applied('hoverBgColor', '', '#111111')])
  assert.equal(edits.hoverEnabled, true)
  assert.equal(edits.hoverBgColor, '#111111')
})

check('describeChange: Label + Einheiten; before "" bleibt "" (→ "set to")', () => {
  const d = describeChange({ id: '1', property: 'fontSize', before: '', after: '20', source: 'manual', status: 'applied' })
  assert.equal(d.label, 'Font size')
  assert.equal(d.before, '')
  assert.equal(d.after, '20px')
  const c = describeChange({ id: '2', property: 'bgColor', before: '#111111', after: '#2563EB', source: 'ai', status: 'applied' })
  assert.equal(c.label, 'Background')
  assert.equal(c.before, '#111111')
  assert.equal(c.after, '#2563EB')
})

console.log(`\n${'─'.repeat(46)}`)
console.log(`  ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.log('  ❌ Delta-Generator kaputt.')
  process.exit(1)
}
console.log('  ✅ Alle Tests bestanden.')
