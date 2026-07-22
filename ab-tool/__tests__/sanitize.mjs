// Regressionstest für lib/sanitize.ts.
//
// Diese Datei existiert, weil die frühere Regex-Fassung des Sanitizers gegen
// Standard-Payloads durchlässig war (Plan SEC-01). Jeder Payload unten wurde
// gegen die alte Implementierung verifiziert — fünf davon kamen unverändert
// durch. Der Sanitizer entscheidet, was auf fremden Kundenwebsites im DOM
// landet; ein Bypass hier ist ein Stored XSS bei jedem Kunden.
//
// Ausführen: node --import tsx __tests__/sanitize.mjs  (Teil von `npm run test:node`)

import assert from 'node:assert'
import { sanitizeHtml, sanitizeCss } from '../lib/sanitize.ts'

let failed = 0
function check(name, fn) {
  try {
    fn()
    console.log('✓', name)
  } catch (err) {
    failed++
    console.error('✗', name, '\n   ', err.message)
  }
}

// ── Payloads, die KEINE Ausführung ermöglichen dürfen ──────────────────────
// Kriterium: nach der Sanitization darf weder ein Event-Handler-Attribut noch
// ein javascript:-URI noch ein <script>/<iframe> im Output stehen.
const XSS_PAYLOADS = [
  '<img src=x onerror=alert(1)>',
  '<img/src=x/onerror=alert(document.domain)>',      // Slash statt Whitespace
  '<svg/onload=alert(1)>',                            // Slash + SVG
  '<svg><script>alert(1)</script></svg>',
  '<a href=javascript:alert(1)>x</a>',                // unquoted
  '<a href="javascript:alert(1)">x</a>',
  '<a href=&#106;avascript:alert(1)>x</a>',           // HTML-Entity
  '<a href="jAvAsCrIpT:alert(1)">x</a>',
  '<scr<script>ipt>alert(1)</scr</script>ipt>',       // verschachtelt
  '<details open ontoggle=alert(1)>',
  '<body onload=alert(1)>',
  '<iframe src="https://evil.com"></iframe>',
  '<object data="https://evil.com"></object>',
  '<embed src="https://evil.com">',
  '<base href="https://evil.com/">',
  '<form action="//evil.com"><button>Login</button></form>',
  '<input name="password" type="password">',
  '<math><mtext><script>alert(1)</script></mtext></math>',
  '<div style="background:url(javascript:alert(1))">x</div>',
  '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>',
  '<img src=1 href=1 onerror="javascript:alert(1)">',
  '<template><script>alert(1)</script></template>',
  '<div data-x="<script>alert(1)</script>">y</div>',
]

const FORBIDDEN = [
  { re: /\son\w+\s*=/i, label: 'Event-Handler-Attribut' },
  { re: /[/\s]on\w+\s*=/i, label: 'Event-Handler nach Slash' },
  { re: /javascript\s*:/i, label: 'javascript:-URI' },
  { re: /<\s*script/i, label: '<script>' },
  { re: /<\s*iframe/i, label: '<iframe>' },
  { re: /<\s*object/i, label: '<object>' },
  { re: /<\s*embed/i, label: '<embed>' },
  { re: /<\s*base/i, label: '<base>' },
  { re: /<\s*form/i, label: '<form>' },
  { re: /<\s*input/i, label: '<input>' },
  { re: /data:text\/html/i, label: 'data:text/html' },
]

for (const payload of XSS_PAYLOADS) {
  check(`blockt: ${payload.slice(0, 58)}`, () => {
    const out = sanitizeHtml(payload)
    for (const { re, label } of FORBIDDEN) {
      assert.ok(!re.test(out), `${label} überlebt die Sanitization: ${out}`)
    }
  })
}

// ── Legitimer Generator-Output muss unbeschädigt bleiben ───────────────────
check('erhält den .ab-v-Container mit Style-Block', () => {
  const input = `<div class="ab-v">
  <style>
    .ab-v button { background: #0066FF; transition: all .2s ease; }
    .ab-v button:hover { background: #0052CC; }
    .ab-v button:focus-visible { outline: 3px solid #0066FF88; }
  </style>
  <button>Click me</button>
</div>`
  const out = sanitizeHtml(input)
  assert.match(out, /class="ab-v"/, '.ab-v-Container fehlt')
  assert.match(out, /<button>Click me<\/button>/, 'Button fehlt')
  assert.match(out, /:focus-visible/, 'focus-visible-Regel fehlt')
  assert.match(out, /background:\s*#0066FF/i, 'Farbe fehlt')
})

check('erhält Links, Bilder und inline SVG', () => {
  const out = sanitizeHtml(
    '<a href="https://example.com" rel="noopener" target="_blank">Los</a>' +
    '<img src="/hero.png" alt="Hero" width="200">' +
    '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z" fill="currentColor"/></svg>'
  )
  assert.match(out, /href="https:\/\/example\.com"/)
  assert.match(out, /alt="Hero"/)
  assert.match(out, /<svg[^>]*viewBox="0 0 24 24"/)
  assert.match(out, /<path[^>]*d="M4 4h16v16H4z"/)
})

check('erhält relative und Fragment-Links', () => {
  const out = sanitizeHtml('<a href="/pricing">P</a><a href="#top">T</a><a href="mailto:a@b.de">M</a>')
  assert.match(out, /href="\/pricing"/)
  assert.match(out, /href="#top"/)
  assert.match(out, /href="mailto:a@b\.de"/)
})

check('leerer / null Input ergibt leeren String', () => {
  assert.equal(sanitizeHtml(null), '')
  assert.equal(sanitizeHtml(undefined), '')
  assert.equal(sanitizeHtml(''), '')
})

// ── CSS ────────────────────────────────────────────────────────────────────
check('CSS: @import wird entfernt', () => {
  assert.ok(!/@import/i.test(sanitizeCss('@import url("//evil.com/x.css"); .a{color:red}')))
})

check('CSS: expression() wird neutralisiert', () => {
  assert.ok(!/expression\s*\(/i.test(sanitizeCss('.a{width:expression(alert(1))}')))
})

check('CSS: </style>-Ausbruch wird entfernt', () => {
  const out = sanitizeCss('.a{color:red}</style><script>alert(1)</script>')
  assert.ok(!/<\/?style/i.test(out), 'style-Tag überlebt')
})

check('CSS: javascript:-url() wird ersetzt', () => {
  const out = sanitizeCss('.a{background:url(javascript:alert(1))}')
  assert.ok(!/javascript:/i.test(out), `javascript: überlebt: ${out}`)
})

check('CSS: position:fixed wird zu static (Clickjacking auf Fremdseiten)', () => {
  const out = sanitizeCss('.ab-v{position:fixed;inset:0;z-index:99999}')
  assert.ok(!/position\s*:\s*fixed/i.test(out), `position:fixed überlebt: ${out}`)
  assert.match(out, /position:static/)
})

check('CSS: erlaubte url() bleiben erhalten', () => {
  const out = sanitizeCss('.a{background:url(https://cdn.example.com/x.png)}')
  assert.match(out, /https:\/\/cdn\.example\.com\/x\.png/)
})

check('CSS: normale Regeln bleiben unverändert', () => {
  const css = '.ab-v button{display:flex;border-radius:8px;background:#0066FF}'
  assert.equal(sanitizeCss(css), css)
})

// ── Der <style>-Inhalt in HTML geht ebenfalls durch sanitizeCss ────────────
check('HTML: <style>-Inhalt wird mitsaniert', () => {
  const out = sanitizeHtml('<div class="ab-v"><style>@import url("//evil.com/x.css");.a{color:red}</style></div>')
  assert.ok(!/@import/i.test(out), `@import im style-Block überlebt: ${out}`)
  assert.match(out, /color:red/)
})

console.log(failed === 0 ? '\n✓ Sanitizer: alle Checks bestanden.' : `\n✗ ${failed} Check(s) fehlgeschlagen.`)
process.exit(failed === 0 ? 0 : 1)
