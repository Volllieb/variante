#!/usr/bin/env node
/**
 * sri.mjs — hält den SRI-Hash des Snippets mit `public/ab.js` synchron.
 *
 * Der Hash steht fest im Snippet, das Kunden in ihr <head> kopieren. Driftet er,
 * blockiert der Browser `ab.js` auf JEDER Kundenseite — kein Test, kein Tracking,
 * kein Picker, und zwar still (nur eine Console-Meldung). Genau das war passiert:
 * der Hash in `lib/snippetCode.ts` passte zu keiner je ausgelieferten Version.
 *
 *   node scripts/sri.mjs --check   Bricht ab, wenn Hash != ab.js (in vercel-build)
 *   node scripts/sri.mjs --write   Schreibt den aktuellen Hash in beide Dateien
 *
 * Gehasht wird LF-normalisiert: Vercel checkt mit LF aus, ein Windows-Arbeitskopie
 * mit CRLF wuerde sonst einen Hash erzeugen, der zur Auslieferung nicht passt.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const AB_JS = join(root, 'public', 'ab.js')
const TARGETS = [join(root, 'lib', 'snippetCode.ts'), join(root, '..', 'README.md')]
const RE = /sha384-[A-Za-z0-9+/=]+/g

const expected = 'sha384-' + createHash('sha384')
  .update(readFileSync(AB_JS, 'utf8').replace(/\r\n/g, '\n'), 'utf8')
  .digest('base64')

const mode = process.argv.includes('--write') ? 'write' : 'check'
let drifted = false

for (const file of TARGETS) {
  const src = readFileSync(file, 'utf8')
  const found = src.match(RE) ?? []
  const bad = found.filter((h) => h !== expected)
  if (!found.length) {
    console.error(`SRI: kein sha384-Hash in ${file} gefunden — Snippet-Block umbenannt?`)
    drifted = true
    continue
  }
  if (!bad.length) continue
  drifted = true
  if (mode === 'write') {
    writeFileSync(file, src.replace(RE, expected))
    console.log(`SRI: ${file} aktualisiert`)
  } else {
    console.error(`SRI: ${file} hat ${bad[0]}, ab.js ist ${expected}`)
  }
}

if (mode === 'check' && drifted) {
  console.error('\nSRI-Hash veraltet — `npm run sri` in ab-tool/ ausfuehren und mitcommitten.')
  process.exit(1)
}
if (!drifted) console.log(`SRI: in sync (${expected})`)
