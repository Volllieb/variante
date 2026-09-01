// abSource — lädt den echten CSS-Sammler aus public/ab.js.
//
// collectCss & Co. sind Interna des Snippet-IIFEs und von aussen nicht
// erreichbar. Die Node-Tests kopierten den Quelltext deshalb früher 1:1 in
// die Testdatei — dann prüften sie ihre eigene Kopie, und Regressionen in
// public/ab.js (die beide master-Preview-Bugs) blieben unsichtbar, während
// die Suite grün meldete. Dieser Loader schneidet die CSS-Sektion textuell
// aus der ECHTEN Datei und evaluiert sie: die Tests laufen gegen den
// ausgelieferten Code.
//
// Sektion: von "// --- Relevantes CSS" bis "// --- Goal-Kandidaten". Enthält
// COMPUTED_PROPS, PSEUDO_RE, matchesPseudo, computedValues, computedBlock,
// computedMap, collectCss und styleContext — genau das, was die Tests
// brauchen, inklusive der Helfer, die die alten Kopien implizit mitnahmen.
//
// Die Funktionen referenzieren Browser-Globals (document, CSSRule,
// getComputedStyle, location). Die Test-Fixture muss sie VOR dem Aufruf auf
// globalThis setzen — siehe setupGlobals in collect-css-context.mjs.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const source = readFileSync(fileURLToPath(new URL('../../public/ab.js', import.meta.url)), 'utf8')

const START_MARK = '// --- Relevantes CSS'
const END_MARK = '// --- Goal-Kandidaten'
const start = source.indexOf(START_MARK)
const end = source.indexOf(END_MARK)
if (start === -1 || end === -1 || end <= start) {
  throw new Error('abSource: Sektions-Marker in public/ab.js nicht gefunden — Loader an das Datei-Format anpassen')
}

// new Function statt eval: der Body läuft als eigener Scope, die deklarierten
// Funktionen kommen über das return heraus. Freie Globals lösen über
// globalThis auf — deshalb muss die Fixture sie vor dem Aufruf setzen.
const factory = new Function(
  source.slice(start, end)
    + '\nreturn { COMPUTED_PROPS, PSEUDO_RE, matchesPseudo, computedValues, computedBlock, computedMap, collectCss, styleContext };'
)

export const abSource = factory()
