// collectCss + styleContext (aus public/ab.js)
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
// Run: node --import tsx __tests__/collect-css-context.mjs

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
var COMPUTED_PROPS = ['color','background-color','background-image','background-size','background-position','background-repeat','border','border-width','border-style','border-color','border-radius','padding','margin','width','height','font-family','font-size','font-weight','line-height','letter-spacing','text-align','text-transform','text-decoration','white-space','display','flex-direction','align-items','justify-content','gap','object-fit','box-shadow','transition','transform','transform-origin','animation','backdrop-filter','cursor','opacity']
function computedBlock(el) {
  try {
    var cs = getComputedStyle(el)
    var lines = []
    for (var i = 0; i < COMPUTED_PROPS.length; i++) {
      var v = cs.getPropertyValue(COMPUTED_PROPS[i])
      if (v && v !== 'none' && v !== 'normal') lines.push('  ' + COMPUTED_PROPS[i] + ': ' + v + ';')
    }
    if (!lines.length) return ''
    return '/* computed styles of original element (reference) */\n.__original {\n' + lines.join('\n') + '\n}'
  } catch (_) { return '' }
}
function computedMap(el) {
  try {
    var cs = getComputedStyle(el)
    var out = {}
    for (var i = 0; i < COMPUTED_PROPS.length; i++) {
      var v = cs.getPropertyValue(COMPUTED_PROPS[i])
      if (v && v !== 'none' && v !== 'normal') out[COMPUTED_PROPS[i]] = v
    }
    return out
  } catch (_) { return {} }
}

var PSEUDO_RE = /:(hover|focus|active|focus-visible|focus-within)\b/
function matchesPseudo(el, sel) {
  var base = sel.replace(/:(hover|focus|active|focus-visible|focus-within)\b/g, '').trim()
  if (!base) return false
  try { return el.matches(base) } catch (_) { return false }
}
function collectCss(el) {
  var out = [], seen = {}
  function push(rule) { if (!seen[rule.cssText]) { seen[rule.cssText] = true; out.push(rule.cssText) } }
  function consider(rule, condPrefix) {
    try {
      var sel = rule.selectorText; if (!sel) return
      if (sel.indexOf(':root') > -1 || rule.cssText.indexOf('--') > -1) { pushWrapped(rule, condPrefix); return }
      if (PSEUDO_RE.test(sel)) { if (matchesPseudo(el, sel)) pushWrapped(rule, condPrefix); return }
      if (el.matches(sel)) pushWrapped(rule, condPrefix)
    } catch (_) {}
  }
  function pushWrapped(rule, condPrefix) {
    push(condPrefix ? { cssText: condPrefix + ' { ' + rule.cssText + ' }' } : rule)
  }
  function condPrefixOf(rule) {
    try {
      if ((rule.type === CSSRule.MEDIA_RULE || rule.type === CSSRule.SUPPORTS_RULE) && rule.conditionText) {
        return '@' + (rule.type === CSSRule.MEDIA_RULE ? 'media' : 'supports') + ' ' + rule.conditionText
      }
      if (rule.layerName) return '@layer ' + rule.layerName
    } catch (_) {}
    return null
  }
  try {
    var sheets = document.styleSheets
    for (var i = 0; i < sheets.length; i++) {
      var href = sheets[i].href
      if (href && href.indexOf(location.origin) !== 0 && href.charAt(0) !== '/') continue
      var rules; try { rules = sheets[i].cssRules } catch (_) { continue }
      if (!rules) continue
      for (var j = 0; j < rules.length; j++) {
        var rule = rules[j]
        if (rule.type === CSSRule.STYLE_RULE) consider(rule, null)
        else if (rule.cssRules) {
          var prefix = condPrefixOf(rule)
          for (var k = 0; k < rule.cssRules.length; k++) {
            if (rule.cssRules[k].type === CSSRule.STYLE_RULE) consider(rule.cssRules[k], prefix)
          }
        }
      }
    }
  } catch (_) {}
  var rulesText = out.join('\n').slice(0, 18000)
  var comp = computedBlock(el)
  return (comp ? rulesText + '\n\n' + comp : rulesText).slice(0, 24000)
}

function styleContext(el) {
  return { css: collectCss(el), computed: computedMap(el) }
}

// ── Fixture ─────────────────────────────────────────────────────────────────

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
  // Die 1:1-Kopie referenziert Browser-Globals — fuer node bereitstellen.
  globalThis.document = dom.window.document
  globalThis.CSSRule = dom.window.CSSRule
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
  globalThis.location = { origin: 'https://example.com' }
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

console.log(`\n${'─'.repeat(46)}`)
console.log(`  ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.log('  ❌ collectCss/styleContext kaputt.')
  process.exit(1)
}
console.log('  ✅ Alle Tests bestanden.')
