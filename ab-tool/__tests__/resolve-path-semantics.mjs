// Semantik des Test-Geltungsbereichs: pathOf() (/api/resolve) == pathMatches() (ab.js).
// Run: node __tests__/resolve-path-semantics.mjs
//
// WARUM DIESER TEST EXISTIERT
// Ein Test gilt für die ganze Domain, für genau die Startseite, oder für einen
// Pfad samt allem darunter. Welcher der drei Fälle greift, entscheiden ZWEI
// Funktionen in zwei Sprachen an zwei Orten: pathOf() zerlegt site_url auf dem
// Server, pathMatches() wendet das Ergebnis im Browser des Besuchers an.
//
// Laufen die auseinander, gibt es keinen Fehler und kein Log — die Variante
// erscheint auf den falschen Seiten oder gar nicht, und die Zähler mischen
// Publikum aus verschiedenen Kontexten in eine Statistik. Genau das war der
// Bug hinter Migration 040: pathOf() strippte den Slash von 'example.com/'
// mit weg, pathMatches() las das leere Ergebnis als "gilt überall", und jeder
// im Wizard angelegte Startseiten-Test lief in Wahrheit sitewide.
//
// Der Test liest BEIDE Funktionen aus den echten Quelldateien (keine Kopie,
// die driften kann) und prüft die Migration gegen echtes Postgres (pglite).

import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const here = dirname(fileURLToPath(import.meta.url))
const ROUTE = resolve(here, '../app/api/resolve/route.ts')
const ABJS = resolve(here, '../public/ab.js')
const MIG_021 = resolve(here, '../../db/migrations/021_resolve_scaling.sql')
const MIG_040 = resolve(here, '../../db/migrations/040_site_url_root_scope.sql')

// --- Seite 1: pathOf() aus der echten Route ziehen ---
// Reine String-Funktion ohne Imports — isoliert instanziierbar, ohne die Route
// (und damit Supabase) zu laden.
const routeSrc = readFileSync(ROUTE, 'utf8')
const pathOfMatch = routeSrc.match(/function pathOf\(u: string \| null \| undefined\): string \{([\s\S]*?)\n\}/)
assert(pathOfMatch, 'pathOf() nicht in resolve/route.ts gefunden — Test anpassen!')
const pathOf = new Function('u', pathOfMatch[1].replace(/: string/g, ''))

// --- Seite 2: pathMatches() aus dem echten Snippet ziehen ---
const abSrc = readFileSync(ABJS, 'utf8')
const matchesMatch = abSrc.match(/function pathMatches\(testPath, currentPath\) \{([\s\S]*?)\n {2}\}/)
assert(matchesMatch, 'pathMatches() nicht in public/ab.js gefunden — Test anpassen!')
const pathMatches = new Function('testPath', 'currentPath', matchesMatch[1])

// Normalisierung des aktuellen Pfads, wie run() in ab.js sie vornimmt.
const curPath = (pathname) => pathname.replace(/\/+$/, '') || '/'

// --- Teil 1: pathOf() zerlegt site_url in die drei Fälle ---
const scopeCases = [
  ['https://example.com', ''],
  ['https://www.example.com', ''],
  ['example.com', ''],
  ['https://example.com/', '/'],
  ['https://example.com//', '/'],
  ['https://example.com/?utm_source=ph', '/'],
  ['https://example.com/#hero', '/'],
  ['https://example.com/pricing', '/pricing'],
  ['https://example.com/pricing/', '/pricing'],
  ['https://example.com/pricing?utm_source=ph', '/pricing'],
  ['https://example.com/blog/2026', '/blog/2026'],
  ['  https://example.com/pricing  ', '/pricing'],
  [null, ''],
  [undefined, ''],
  ['', ''],
]

for (const [siteUrl, expected] of scopeCases) {
  const actual = pathOf(siteUrl)
  assert.equal(actual, expected, `pathOf(${JSON.stringify(siteUrl)}) -> ${JSON.stringify(actual)}, erwartet ${JSON.stringify(expected)}`)
}
console.log(`✓ pathOf(): ${scopeCases.length} Fälle`)

// --- Teil 2: Server und Client zusammen — welche Seite sieht die Variante? ---
// Die Route liefert `path: pathOf(site_url) || null` aus; das || null bildet den
// leeren Fall auf null ab, den pathMatches() wie '' behandelt.
const asDelivered = (siteUrl) => pathOf(siteUrl) || null

const matchCases = [
  // Ganze Domain: greift überall.
  ['https://example.com', '/', true],
  ['https://example.com', '/pricing', true],
  ['https://example.com', '/blog/post-1', true],

  // Nur die Startseite — der Fall, den Migration 040 überhaupt erst erreichbar macht.
  ['https://example.com/', '/', true],
  ['https://example.com/', '/pricing', false],
  ['https://example.com/', '/blog/post-1', false],

  // Ein Pfad: er selbst und alles darunter.
  ['https://example.com/pricing', '/pricing', true],
  ['https://example.com/pricing', '/pricing/', true],
  ['https://example.com/pricing', '/pricing/enterprise', true],
  ['https://example.com/pricing', '/', false],
  ['https://example.com/pricing', '/blog', false],
  // Kein Präfix auf Zeichenebene: /pricing darf /pricing-old nicht einsammeln.
  ['https://example.com/pricing', '/pricing-old', false],
  ['https://example.com/blog', '/blog-archiv', false],
]

for (const [siteUrl, pathname, expected] of matchCases) {
  const actual = pathMatches(asDelivered(siteUrl), curPath(pathname))
  assert.equal(actual, expected, `${siteUrl} auf ${pathname} -> ${actual}, erwartet ${expected}`)
}
console.log(`✓ pathOf + pathMatches: ${matchCases.length} Fälle`)

// --- Teil 3: Migration 040 gegen echtes Postgres ---
// Behauptung der Migration: Bestandstests behalten ihren heutigen sitewide-
// Geltungsbereich, Pfad-Tests bleiben unangetastet, site_host ändert sich nicht.
const exprMatch = readFileSync(MIG_021, 'utf8').match(/GENERATED ALWAYS AS \(([\s\S]*?)\) STORED/)
assert(exprMatch, 'GENERATED-Ausdruck nicht in 021_resolve_scaling.sql gefunden — Test anpassen!')

const db = new PGlite()
await db.exec(`
  create table schema_migrations (version text primary key);
  create table tests (
    id serial primary key,
    site_url text,
    site_host text generated always as (${exprMatch[1].trim()}) stored
  );
`)

const seed = [
  // [site_url vorher, site_url nachher]
  ['https://example.com/', 'https://example.com'],        // Wizard-Default: bleibt sitewide
  ['https://www.example.com/', 'https://www.example.com'],
  ['https://example.com//', 'https://example.com'],
  ['https://example.com', 'https://example.com'],          // schon ohne Slash
  ['https://example.com/pricing/', 'https://example.com/pricing/'],  // Pfad: unangetastet
  ['https://example.com/pricing', 'https://example.com/pricing'],
  ['https://example.com/blog/2026/', 'https://example.com/blog/2026/'],
]

for (const [before] of seed) {
  await db.query('insert into tests (site_url) values ($1)', [before])
}
const hostsBefore = (await db.query('select id, site_host from tests order by id')).rows

const migrationSql = readFileSync(MIG_040, 'utf8')
await db.exec(migrationSql)

const after = (await db.query('select id, site_url, site_host from tests order by id')).rows
after.forEach((row, i) => {
  const [before, expected] = seed[i]
  assert.equal(row.site_url, expected, `Migration 040: ${before} -> ${row.site_url}, erwartet ${expected}`)
  assert.equal(row.site_host, hostsBefore[i].site_host, `site_host von ${before} hat sich geändert: ${hostsBefore[i].site_host} -> ${row.site_host}`)
})
console.log(`✓ Migration 040: ${seed.length} Zeilen, site_host stabil`)

// Der entscheidende Punkt: nach der Migration ist der Wizard-Default weiterhin
// sitewide — kein laufender Test wechselt still den Geltungsbereich.
assert.equal(pathOf(after[0].site_url), '', 'Bestandstest läuft nach Migration 040 nicht mehr sitewide!')
assert.equal(pathMatches(asDelivered(after[0].site_url), '/pricing'), true)

// Idempotenz: zweiter Lauf ändert nichts mehr.
await db.exec(migrationSql)
const afterTwice = (await db.query('select id, site_url from tests order by id')).rows
afterTwice.forEach((row, i) => {
  assert.equal(row.site_url, seed[i][1], 'Migration 040 ist nicht idempotent')
})
const versions = (await db.query('select version from schema_migrations')).rows
assert.equal(versions.length, 1, 'schema_migrations doppelt befüllt')
console.log('✓ Migration 040: idempotent')

await db.close()
console.log('\n✅ Path-Semantik: Server und Client stimmen überein.')
