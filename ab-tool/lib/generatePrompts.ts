/**
 * Prompt-Builder für /api/generate.
 * Extrahiert aus app/api/generate/route.ts (vorher 568 Zeilen Monolith).
 */

import { cssFilterRelevant } from '@/lib/generateHelpers'
import {
  DELIM_START,
  DELIM_END,
  CSS_DELIM_START,
  CSS_DELIM_END,
} from '@/lib/generateConstants'

// Re-Export für Abwärtskompatibilität
export {
  ESTIMATED_COST_PER_GEN,
  TEMP_SESSION_GEN_LIMIT,
  MODEL,
  DELIM_START,
  DELIM_END,
  CSS_DELIM_START,
  CSS_DELIM_END,
} from '@/lib/generateConstants'

// Stabiler System-Prompt: rollt die Role aus, ohne dass das Modell raten muss.
export const SYSTEM_PROMPT =
  'Du bist ein spezialisierter HTML/CSS-Generierungs-Assistent für A/B-Tests. ' +
  'Deine Aufgabe ist es, ein Figma-Design präzise als valides HTML-Fragment umzusetzen, ' +
  'das isoliert in eine beliebige Website eingebunden werden kann. ' +
  'Prinzipien: (1) Isolation – dein Code darf nie mit der umgebenden Seite interferieren ' +
  '(deshalb .ab-v-Scoping). (2) Barrierefreiheit – :focus-visible auf interaktiven Elementen. ' +
  '(3) Visuelle Treue – das Ergebnis muss dem Figma-Design so nah wie möglich kommen. ' +
  '(4) Keine Annahmen – wenn das Figma-JSON eine Eigenschaft nicht explizit angibt, ' +
  'orientiere dich am Original-HTML und Site-CSS.'

// System-Prompt für Reorder-Tests: erzeugt reines CSS, kein HTML.
export const REORDER_SYSTEM_PROMPT =
  'Du bist ein CSS-Spezialist für Layout-A/B-Tests. ' +
  'Deine Aufgabe: zwei HTML-Elemente visuell tauschen — NUR mit CSS. ' +
  'WICHTIG: Du darfst NUR CSS ausgeben. Kein HTML, keine Erklärungen. ' +
  'Verwende flexbox order, flex-direction (row-reverse, column-reverse) oder CSS Grid order. ' +
  'Alle Selektoren MÜSSEN mit der DOM-Struktur der Seite funktionieren — du bekommst ' +
  'die exakten CSS-Selektoren beider Elemente. ' +
  'Setze KEINE Annahmen über Eltern-Container voraus — verwende nur die Selektoren, die du bekommst. ' +
  'Füge kurze CSS-Kommentare hinzu, die erklären, was getauscht wird.'

// Framework-Hinweise: jedes Framework bekommt spezifische Regeln.
export const FRAMEWORK_HINTS: Record<string, string> = {
  react:
    'React/JSX-Umgebung: Verwende className statt class. Keine JSX-spezifischen Attribute ' +
    '(htmlFor, dangerouslySetInnerHTML, etc.) – wir brauchen rohes HTML, das per innerHTML gesetzt wird.',
  next:
    'Next.js/React-Umgebung: className statt class. Keine Next-Komponenten (Image, Link). ' +
    'Reines HTML-Fragment wie für innerHTML.',
  vue:
    'Vue-Umgebung: class (nicht className). Keine Vue-Template-Syntax (v-for, v-if, @click). ' +
    'Reines HTML-Fragment.',
  custom: '',
}

// Minimales Beispiel (Few-Shot): zeigt dem Modell die erwartete Abbildung von
// Figma-JSON → HTML.
export const FEW_SHOT_PROMPT = `Beispiel für die erwartete Abbildung:

Figma-JSON:
${JSON.stringify({
    type: 'FRAME', name: 'Button', width: 200, height: 48,
    layoutMode: 'HORIZONTAL', justify: 'CENTER', align: 'CENTER',
    cornerRadius: 8,
    fills: [{ type: 'solid', hex: '#0066FF', opacity: 1 }],
    children: [{
      type: 'TEXT', name: 'Label', text: 'Click me', fontSize: 16,
      fontFamily: 'Inter', textAlign: 'CENTER',
      fills: [{ type: 'solid', hex: '#FFFFFF', opacity: 1 }],
    }],
  }, null, 2)}

Erwartetes HTML:
${DELIM_START}
<div class="ab-v">
  <style>
    .ab-v button {
      display: flex; align-items: center; justify-content: center;
      width: 200px; height: 48px; border: none; border-radius: 8px;
      background: #0066FF; color: #FFFFFF;
      font-family: 'Inter', sans-serif; font-size: 16px;
      cursor: pointer; transition: all .2s ease;
    }
    .ab-v button:hover { background: #0052CC; }
    .ab-v button:focus-visible {
      outline: 3px solid #0066FF88; outline-offset: 2px;
    }
  </style>
  <button>Click me</button>
</div>
${DELIM_END}

Jetzt das echte Figma-Design:`

const SCOPE_RULE: Record<string, string> = {
  text: '- SCOPE: NUR Textinhalte ändern. Layout, Farben, Größen, Struktur exakt wie im Original belassen.',
  color: '- SCOPE: NUR Farben/Hintergründe/Hover-Farben ändern. Text und Struktur unverändert lassen.',
  all: '',
}

// Gemeinsame Ausgabe-Regeln.
export function outputRules(scope: string): string {
  const lines = [
    'REGELN:',
    '- Wickle das Element in EINEN Container mit der Klasse "ab-v" (z. B. <div class="ab-v">…</div>).',
    '- Gib GENAU EINEN <style>-Block aus, dessen Selektoren ALLE mit ".ab-v" beginnen.',
    '  Niemals globale Selektoren wie "button{}" oder ":root".',
    '- Pflicht: klickbare Elemente (Button/Link) brauchen .ab-v …:hover UND .ab-v …:focus-visible',
    '  mit sichtbarem Feedback, plus "transition: all .2s ease" im Grundzustand.',
    '- Nutze die :hover/transition-Werte aus dem Site-CSS als Referenz, damit das Hover-Feedback zum Look der Seite passt.',
    '- Alles Übrige als Inline-Styles. Keine Tailwind-Utilities.',
    '- Gib NUR das HTML-Fragment zurück, kein DOCTYPE, kein <html>, kein <body>.',
    '- Keine Erklärungen, kein Markdown, keine Code-Fences.',
  ]
  if (SCOPE_RULE[scope]) lines.push(SCOPE_RULE[scope])
  return lines.join('\n')
}

export function buildPrompt(
  originalHtml: string | null,
  siteCss: string | null,
  framework: string | null,
  frameContent: unknown,
  scope: string,
  userInstructions: string
): string {
  const fw = framework || 'custom'
  const hint = FRAMEWORK_HINTS[fw] ?? FRAMEWORK_HINTS.custom
  const filteredCss = cssFilterRelevant(originalHtml, siteCss)
  return [
    'Du erstellst Variante B eines Website-Elements für einen A/B-Test.',
    'Ziel: das Figma-Design unten so EXAKT wie möglich als HTML nachbilden.',
    '',
    'Original-HTML (Variante A) — als Gerüst verwenden. Die Klassennamen darin',
    'entsprechen den unten gelieferten CSS-Regeln, sodass du genau weißt, wie A aussieht:',
    originalHtml || '(kein Original-HTML vorhanden)',
    '',
    'CSS-Regeln des Originals (gefiltert auf Elemente, die im Original-HTML vorkommen):',
    filteredCss,
    '',
    'Figma-Design (JSON):',
    JSON.stringify(frameContent, null, 2),
    '',
    `Framework: ${fw}`,
    '',
    outputRules(scope),
    hint,
    userInstructions ? `Nutzer-Vorgabe: ${userInstructions}` : '',
    '',
    `WICHTIG - Output-Format: Deine Antwort muss mit ${DELIM_START} beginnen und mit ${DELIM_END} enden.`,
    `Dazwischen steht NUR das HTML-Fragment. Kein Text vor ${DELIM_START} oder nach ${DELIM_END}.`,
  ]
    .filter(Boolean)
    .join('\n')
}

// Refine-Prompt: nimmt den vorigen Output + Freitext-Feedback.
export function buildRefinePrompt(previousHtml: string, feedback: string, scope: string, userInstructions: string): string {
  return [
    'Du verbesserst eine bestehende A/B-Test-Variante (HTML-Fragment).',
    '',
    'Bisheriges HTML:',
    previousHtml,
    '',
    'Änderungswunsch des Nutzers:',
    feedback,
    '',
    userInstructions ? `Zusätzliche Vorgabe: ${userInstructions}` : '',
    '',
    'Gib das KOMPLETTE überarbeitete Fragment zurück — selbe Regeln wie zuvor:',
    outputRules(scope),
  ].join('\n')
}

// Reorder-Prompt: erzeugt CSS, das zwei Elemente visuell tauscht.
export function buildReorderPrompt(
  selectorA: string,
  selectorB: string,
  siteCss: string | null,
  userInstructions: string
): string {
  const filteredCss = siteCss || '(kein Site-CSS vorhanden)'
  return [
    'Du erstellst CSS-Regeln für einen visuellen Element-Tausch in einem A/B-Test.',
    '',
    'Zwei Elemente sollen ihre Position im Layout tauschen — NUR mit CSS, KEINE DOM-Manipulation.',
    '',
    `Element A (Selektor): ${selectorA}`,
    `Element B (Selektor): ${selectorB}`,
    '',
    'Anleitung:',
    '- Beide Elemente sind Geschwister im selben Eltern-Container (flex/grid/normal flow).',
    '- Verwende flexbox `order` (wenn Eltern flex/grid) oder `flex-direction: row-reverse/column-reverse`.',
    '- Falls der Eltern-Container kein flex/grid ist, setze `display: flex` darauf (mit existierenden Layout-Werten aus dem Site-CSS).',
    '- Stelle sicher, dass die Selektoren exakt matchen — verwende die oben genannten Selektoren 1:1.',
    '- Keine Magic Numbers — orientiere dich an den Werten aus dem Site-CSS.',
    '',
    'Site-CSS (gefiltert, als Referenz für existierende Layout-Werte):',
    filteredCss,
    '',
    userInstructions ? `Nutzer-Vorgabe: ${userInstructions}` : '',
    '',
    'REGELN:',
    '- Gib NUR CSS aus. Kein HTML, keine Erklärungen, kein Markdown.',
    '- Jeder Selektor, den du verwendest, MUSS im Site-CSS oder in den genannten Selektoren vorkommen.',
    '- Keine globalen Selektoren wie `*` oder `body`.',
    '- Füge kurze CSS-Kommentare (`/* */`) hinzu, die erklären, was getauscht wird.',
    '',
    `WICHTIG - Output-Format: Deine Antwort muss mit ${CSS_DELIM_START} beginnen und mit ${CSS_DELIM_END} enden.`,
    `Dazwischen steht NUR das CSS. Kein Text vor ${CSS_DELIM_START} oder nach ${CSS_DELIM_END}.`,
  ].join('\n')
}
