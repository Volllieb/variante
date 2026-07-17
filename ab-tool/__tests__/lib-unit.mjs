// Unit-Tests für lib/ — gegen die ECHTEN Module, nicht gegen Kopien.
// Run: node __tests__/lib-unit.mjs
//
// Abgedeckt:
//   determineWinner  (lib/significance.ts) — entscheidet, wann ein Kundentest
//                    beendet und B an ALLE ausgeliefert wird. War komplett ungetestet.
//   sanitizeHtml     (lib/sanitize.ts)     — letzte XSS-Schranke vor Fremd-DOMs.
//   scanPII/redactPII(lib/pii.ts)          — DSGVO-Schranke vor OpenAI.
//
// Node importiert die .ts-Module direkt (type stripping, Node ≥22.6).

import { strict as assert } from 'node:assert'
import { determineWinner } from '../lib/significance.ts'
import { sanitizeHtml } from '../lib/sanitize.ts'
import { scanPII, redactPII } from '../lib/pii.ts'

let failed = 0
function check(name, fn) {
  try { fn(); console.log(`✓ ${name}`) }
  catch (err) { failed++; console.error(`✗ ${name}: ${err.message}`) }
}

// ─────────────────────────────────────────────────────────────────────────────
// determineWinner — Signatur:
// (significance, cA, cB, vA, vB, minVisitors=100, minUplift=0.05, sigLevel=0.95)
// Die Regeln stehen als Kommentar in lib/significance.ts; hier werden sie geprüft.
// ─────────────────────────────────────────────────────────────────────────────

check('zu wenig Besucher → null (kein Winner, egal wie signifikant)', () => {
  // 50+40 = 90 < minVisitors 100 → null, obwohl significance = 0.99
  assert.equal(determineWinner(0.99, 5, 20, 50, 40), null)
})

check('Signifikanz unter Schwelle → null', () => {
  // Besucher reichen (500+500), aber 0.80 < 0.95
  assert.equal(determineWinner(0.80, 50, 60, 500, 500), null)
})

check('B schlechter als A → "A"', () => {
  // crA = 100/500 = 0.20, crB = 50/500 = 0.10 → B ist schlechter
  assert.equal(determineWinner(0.99, 100, 50, 500, 500), 'A')
})

check('B exakt gleich A → "A" (crB <= crA)', () => {
  assert.equal(determineWinner(0.99, 50, 50, 500, 500), 'A')
})

check('B besser, aber Uplift unter Schwelle → null (Test läuft weiter)', () => {
  // crA = 0.20, crB = 0.202 → Uplift 1% < minUplift 5% → NICHT 'A', sondern null.
  // Das ist die dokumentierte "ponytail"-Regel: null ≠ 'A'.
  assert.equal(determineWinner(0.99, 100, 101, 500, 500), null)
})

check('B besser mit Uplift über Schwelle → "B"', () => {
  // crA = 0.10, crB = 0.20 → Uplift 100% > 5%
  assert.equal(determineWinner(0.99, 50, 100, 500, 500), 'B')
})

check('Uplift knapp über der Schwelle → "B"', () => {
  // crA = 0.20 (100/500), crB = 0.212 (106/500) → Uplift 6% > 5%
  assert.equal(determineWinner(0.99, 100, 106, 500, 500), 'B')
})

check('Uplift rechnerisch exakt 5% → null (Float-Grenzfall, bewusst nicht "B")', () => {
  // 100/500 → 105/500 ist mathematisch exakt +5%, in Float aber
  // 0.049999999999999906 — also < minUplift (0.05) → null.
  // Kein Bug, den es zu beheben lohnt: der Test läuft dann einfach weiter,
  // statt vorschnell einen Winner zu deklarieren (konservative Richtung).
  // Eine Conversion mehr kippt es. Hier festgehalten, damit die Grenze
  // dokumentiert ist und niemand sie versehentlich per Epsilon "repariert".
  assert.equal(determineWinner(0.99, 100, 105, 500, 500), null)
})

check('crA = 0, B hat Conversions → "B" (Uplift = Infinity)', () => {
  // Division durch 0 vermieden: crA=0 → uplift = Infinity → B
  assert.equal(determineWinner(0.99, 0, 30, 500, 500), 'B')
})

check('custom minVisitors wird respektiert', () => {
  // 90 Besucher, aber minVisitors auf 50 gesenkt → Winner möglich
  assert.equal(determineWinner(0.99, 5, 20, 50, 40, 50), 'B')
})

check('custom significanceLevel wird respektiert', () => {
  // 0.92 reicht nicht für 0.95, aber für 0.90
  assert.equal(determineWinner(0.92, 50, 100, 500, 500, 100, 0.05, 0.95), null)
  assert.equal(determineWinner(0.92, 50, 100, 500, 500, 100, 0.05, 0.90), 'B')
})

check('custom minUplift wird respektiert', () => {
  // crA=0.20, crB=0.22 → Uplift 10%. Bei minUplift 20% → null, bei 5% → 'B'
  assert.equal(determineWinner(0.99, 100, 110, 500, 500, 100, 0.20), null)
  assert.equal(determineWinner(0.99, 100, 110, 500, 500, 100, 0.05), 'B')
})

// ─────────────────────────────────────────────────────────────────────────────
// sanitizeHtml — letzte Schranke, bevor AI-HTML per innerHTML in Kunden-DOMs geht.
// ─────────────────────────────────────────────────────────────────────────────

check('entfernt <script>-Tag inkl. Inhalt', () => {
  const out = sanitizeHtml('<div>hi<script>alert("xss")</script></div>')
  assert(!/<script/i.test(out), `script überlebt: ${out}`)
  assert(!out.includes('alert'), `script-Inhalt überlebt: ${out}`)
})

check('entfernt on*-Event-Handler', () => {
  const out = sanitizeHtml('<img src=x onerror="alert(1)">')
  assert(!/onerror/i.test(out), `onerror überlebt: ${out}`)
})

check('entfernt onclick auch bei einfachen Anführungszeichen', () => {
  const out = sanitizeHtml("<button onclick='steal()'>x</button>")
  assert(!/onclick/i.test(out), `onclick überlebt: ${out}`)
})

check('neutralisiert javascript:-URL in href', () => {
  const out = sanitizeHtml('<a href="javascript:alert(1)">klick</a>')
  assert(!/javascript:/i.test(out), `javascript:-URL überlebt: ${out}`)
})

check('entfernt <iframe>', () => {
  const out = sanitizeHtml('<div><iframe src="https://evil.com"></iframe></div>')
  assert(!/<iframe/i.test(out), `iframe überlebt: ${out}`)
})

check('lässt harmloses HTML unangetastet', () => {
  const safe = '<div class="ab-v"><style>.ab-v button{color:red}</style><button>Los</button></div>'
  assert.equal(sanitizeHtml(safe), safe)
})

check('null/undefined/leer → leerer String (kein Crash)', () => {
  assert.equal(sanitizeHtml(null), '')
  assert.equal(sanitizeHtml(undefined), '')
  assert.equal(sanitizeHtml(''), '')
})

// ─────────────────────────────────────────────────────────────────────────────
// scanPII — blockt /api/generate, bevor Daten an OpenAI gehen (DSGVO).
// ─────────────────────────────────────────────────────────────────────────────

check('findet E-Mail-Adresse', () => {
  const r = scanPII('<p>Kontakt: max.mustermann@example.com</p>')
  assert(r !== null, 'E-Mail nicht erkannt')
  assert(r.emails.length > 0, `emails leer: ${JSON.stringify(r)}`)
})

check('findet IBAN', () => {
  const r = scanPII('<p>IBAN: DE89370400440532013000</p>')
  assert(r !== null && r.ibans.length > 0, `IBAN nicht erkannt: ${JSON.stringify(r)}`)
})

check('findet Kreditkartennummer', () => {
  const r = scanPII('<p>Karte 4532148803436467 hinterlegt</p>')
  assert(r !== null && r.cards.length > 0, `Karte nicht erkannt: ${JSON.stringify(r)}`)
})

check('findet IP-Adresse', () => {
  const r = scanPII('<p>Server: 192.168.1.100 erreichbar</p>')
  assert(r !== null && r.ips.length > 0, `IP nicht erkannt: ${JSON.stringify(r)}`)
})

check('verwirft ungültige IP (999.999.999.999 ist keine IP)', () => {
  const r = scanPII('<p>Version 999.999.999.999 released</p>')
  const ips = r?.ips ?? []
  assert.equal(ips.length, 0, `ungültige IP als PII gewertet: ${JSON.stringify(ips)}`)
})

check('sauberes Marketing-HTML → null (kein False Positive)', () => {
  const r = scanPII('<div class="ab-v"><h1>Jetzt starten</h1><button>Gratis testen</button></div>')
  assert.equal(r, null, `False Positive: ${JSON.stringify(r)}`)
})

check('null / zu kurzer Input → null (kein Crash)', () => {
  assert.equal(scanPII(null), null)
  assert.equal(scanPII(''), null)
  assert.equal(scanPII('hi'), null) // unter PII_HAYSTACK_THRESHOLD
})

// ─────────────────────────────────────────────────────────────────────────────
// redactPII — Agent-Pfad: nicht blocken, sondern unkenntlich machen.
// ─────────────────────────────────────────────────────────────────────────────

check('ersetzt E-Mail durch [EMAIL] statt zu blocken', () => {
  const out = redactPII('<p>Mail an support@example.com bitte</p>')
  assert(out.includes('[EMAIL]'), `kein Platzhalter: ${out}`)
  assert(!out.includes('support@example.com'), `E-Mail überlebt: ${out}`)
})

check('redact ist idempotent (2× anwenden ändert nichts mehr)', () => {
  const once = redactPII('<p>Mail: a@b.de, IP 10.0.0.1</p>')
  assert.equal(redactPII(once), once, 'zweiter Durchlauf verändert das Ergebnis')
})

check('redact lässt PII-freien Text unverändert', () => {
  const clean = '<h1>Willkommen bei variante</h1>'
  assert.equal(redactPII(clean), clean)
})

// ─────────────────────────────────────────────────────────────────────────────

console.log(failed ? `\n✗ ${failed} Test(s) fehlgeschlagen.` : '\n✅ Alle lib-Unit-Tests bestanden.')
process.exit(failed ? 1 : 0)
