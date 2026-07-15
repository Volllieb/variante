// Parität: site_host (Migration 021) == hostOf() (app/api/resolve/route.ts).
// Run: node __tests__/resolve-host-parity.mjs
//
// WARUM DIESER TEST EXISTIERT
// /api/resolve filtert den Host in der DB (Spalte site_host, generiert aus site_url).
// Laufen SQL-Normalisierung und hostOf() auseinander, fallen Kunden-Tests STILL aus
// der Resolve-Antwort — kein Fehler, kein Log, der A/B-Test läuft einfach nicht mehr.
// Genau dieser Bug war der Grund für Migration 021.
//
// Der Test liest BEIDE Seiten aus den echten Quelldateien (keine Kopie, die driften
// kann) und führt den SQL-Ausdruck gegen echtes Postgres aus (pglite/WASM, dev-only).
// Ändert jemand hostOf() ODER die Migration ohne die andere Seite → schlägt fehl.

import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const here = dirname(fileURLToPath(import.meta.url))
const ROUTE = resolve(here, '../app/api/resolve/route.ts')
const MIGRATION = resolve(here, '../../db/migrations/021_resolve_scaling.sql')

// --- Seite 1: hostOf() aus der echten Route ziehen ---
// hostOf ist eine reine String-Funktion ohne Imports — sie lässt sich isoliert
// aus dem Quelltext instanziieren, ohne die Route (und damit Supabase) zu laden.
const routeSrc = readFileSync(ROUTE, 'utf8')
const fnMatch = routeSrc.match(/function hostOf\(u: string \| null \| undefined\): string \{([\s\S]*?)\n\}/)
assert(fnMatch, 'hostOf() nicht in resolve/route.ts gefunden — Test anpassen!')
const hostOf = new Function('u', fnMatch[1].replace(/: string/g, ''))

// --- Seite 2: GENERATED-Ausdruck aus der echten Migration ziehen ---
const migrationSrc = readFileSync(MIGRATION, 'utf8')
const exprMatch = migrationSrc.match(/GENERATED ALWAYS AS \(([\s\S]*?)\) STORED/)
assert(exprMatch, 'GENERATED-Ausdruck nicht in 021_resolve_scaling.sql gefunden — Test anpassen!')
const expr = exprMatch[1].trim()

// --- Echtes Postgres, echte generierte Spalte ---
const db = new PGlite()
await db.exec(`
  create table tests (
    id serial primary key,
    site_url text,
    site_host text generated always as (${expr}) stored
  );
`)

const cases = [
  'https://example.com',
  'https://www.example.com',
  'http://example.com',
  'http://www.example.com/',
  'https://example.com/pricing',
  'https://www.example.com/pricing?utm_source=ph',
  'https://example.com/pricing#hero',
  'https://EXAMPLE.com/Path',
  '  https://example.com/x  ',
  'example.com',
  'www.example.com',
  'www.example.com/path',
  'https://sub.example.com/path',
  'https://example.com:3000/path',
  'https://example.co.uk/a/b?c=1#d',
  'https://wwwfoo.com',          // "www" ohne Punkt darf NICHT gestrippt werden
  'https://www.www.example.com', // nur das erste "www." fällt weg
  '',
  null,
]

let failed = 0
for (const url of cases) {
  const { rows } = await db.query('insert into tests (site_url) values ($1) returning site_host', [url])
  const sql = rows[0].site_host
  const js = hostOf(url)
  // SQL liefert NULL, JS liefert '' — beide bedeuten "kein Host" und matchen
  // in der Route keinen echten (nicht-leeren) Host. Daher äquivalent.
  const ok = sql === js || (sql === null && js === '')
  if (ok) {
    console.log(`✓ ${JSON.stringify(url)} → ${JSON.stringify(sql)}`)
  } else {
    failed++
    console.error(`✗ ${JSON.stringify(url)}: sql=${JSON.stringify(sql)} js=${JSON.stringify(js)}`)
  }
}

// Kernregel des Fixes: ein Host darf NIE die Tests eines anderen Hosts sehen.
{
  await db.query("insert into tests (site_url) values ('https://kunde-a.de/x'), ('https://www.kunde-b.de/y')")
  const { rows } = await db.query("select site_url from tests where site_host = 'kunde-a.de'")
  if (rows.length === 1 && rows[0].site_url === 'https://kunde-a.de/x') {
    console.log('✓ Host-Isolation: kunde-a.de sieht nur eigene Tests')
  } else {
    failed++
    console.error(`✗ Host-Isolation verletzt: ${JSON.stringify(rows)}`)
  }
}

await db.close()

if (failed) {
  console.error(`\n✗ ${failed} Abweichung(en): Migration 021 und hostOf() stimmen NICHT überein.`)
  process.exit(1)
}
console.log('\n✓ Parität bestätigt: SQL == hostOf().')
