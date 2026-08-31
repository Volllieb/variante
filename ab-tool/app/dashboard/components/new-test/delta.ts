/**
 * Delta-Generator für den manuellen Editor (ButtonEditor / TextInputEditor).
 *
 * Kernidee: Variante B ist kein Neubau, sondern ein Delta auf Variante A.
 * Markup, Klassen und Attribute kommen von A — überschrieben wird nur, was der
 * Test tatsächlich verändert. Das responsive Verhalten von A (@media,
 * clamp(), Container-Queries) gilt dann weiter, weil dieselben Selektoren
 * weiter matchen.
 *
 * Bewusst ohne React-Imports: die Funktionen laufen im Browser (Editor),
 * in vitest/jsdom und in den node-Unit-Tests (`npm run test:node`).
 */

import type { UserEdits, StyleBaseline, EditorMode } from './types'

/**
 * Ausgangswerte des Editors, wenn keine Baseline gemessen werden konnte
 * (kein Style-Context vom Picker). Dann emittiert der Editor absolute Werte —
 * identisch zum Verhalten vor dem Delta-Modell.
 */
export const DEFAULT_EDITS: UserEdits = {
  text: '',
  bgColor: '#2563EB',
  textColor: '#FFFFFF',
  fontSize: 16,
  fontWeight: 600,
  borderRadius: 8,
  paddingX: 24,
  paddingY: 12,
  borderWidth: 0,
  borderColor: 'transparent',
  borderStyle: 'solid',
  hoverEnabled: false,
  hoverBgColor: '#1D4ED8',
  hoverScale: 105,
  hoverShadow: false,
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ─── HTML: Markup erben oder neu bauen ───

/**
 * `inherit`-Modus: parst originalHtml und behält Wurzel-Tag und alle
 * Attribute bei — insbesondere class, style und data-*. Entfernt wird nur
 * `id` (die bleibt beim Original; gleiches Muster wie in generatePrompts).
 * Geändert wird nur der Textinhalt.
 *
 * Ohne parsebares Original fällt das auf das scratch-Markup zurück —
 * adoptPresentation() in ab.js erbt A's Klassen dann zur Laufzeit.
 */
export function inheritRootHtml(originalHtml: string, text: string): string {
  try {
    const doc = new DOMParser().parseFromString(originalHtml, 'text/html')
    const root = doc.body.firstElementChild
    if (!root) throw new Error('no root element')
    root.removeAttribute('id')
    root.textContent = text
    return root.outerHTML
  } catch {
    return `<button class="ab-variant-b">${escapeHtml(text)}</button>`
  }
}

/** `scratch`-Modus: exakt das bisherige Markup. */
export function scratchVariantHtml(text: string, tag: 'button' | 'span' = 'button'): string {
  return `<${tag} class="ab-variant-b">${escapeHtml(text)}</${tag}>`
}

// ─── Baseline aus gemessenen Computed-Styles ───

function pxOf(v: string | undefined): number | undefined {
  const m = /^([\d.]+)px$/.exec(v ?? '')
  return m ? parseFloat(m[1]) : undefined
}

function rgbToHex(v: string | undefined): string | undefined {
  if (!v) return undefined
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v
  const rgba = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\)/i.exec(v)
  if (rgba && parseFloat(rgba[4]) === 0) return undefined // transparent
  const m = rgba ?? /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(v)
  if (!m) return undefined
  const hex = [1, 2, 3].map((i) => Number(m[i]).toString(16).padStart(2, '0')).join('')
  return `#${hex}`
}

/**
 * Übersetzt die Computed-Styles des Pickers in die Baseline des Editors.
 * Liefert null, wenn nichts Brauchbares messbar war — der Editor fällt dann
 * auf absolute Werte (DEFAULT_EDITS) zurück.
 *
 * border-style wird bewusst nicht auf die vier UI-Optionen eingeschränkt:
 * eine gemessene Baseline mit ridge/double/outset/… muss als Ausgangswert
 * durchgereicht werden, sonst behandelt das Delta ein unverändertes
 * "border-style: ridge" als Änderung und emittiert es fälschlich.
 */
export function buildStyleBaseline(
  computed: Record<string, string> | undefined | null
): StyleBaseline | null {
  if (!computed || typeof computed !== 'object') return null
  const b: StyleBaseline = {}

  const bg = rgbToHex(computed['background-color'])
  if (bg) b.bgColor = bg
  const textColor = rgbToHex(computed.color)
  if (textColor) b.textColor = textColor

  const fontSize = pxOf(computed['font-size'])
  if (fontSize !== undefined) b.fontSize = fontSize
  const fontWeight = parseInt(computed['font-weight'] ?? '', 10)
  if (!Number.isNaN(fontWeight)) b.fontWeight = fontWeight
  const borderRadius = pxOf(computed['border-radius'])
  if (borderRadius !== undefined) b.borderRadius = borderRadius

  // padding kann "12px", "12px 24px" oder "1px 2px 3px 4px" sein.
  const pad = (computed.padding ?? '').trim().split(/\s+/).map(pxOf)
  if (pad.length >= 1 && pad[0] !== undefined) {
    b.paddingY = pad[0]
    b.paddingX = pad.length >= 2 && pad[1] !== undefined ? pad[1] : pad[0]
  }

  const borderWidth = pxOf(computed['border-width'])
  if (borderWidth !== undefined) b.borderWidth = borderWidth
  const borderColor = rgbToHex(computed['border-color'])
  if (borderColor) b.borderColor = borderColor
  const borderStyle = (computed['border-style'] ?? '').trim()
  if (borderStyle) b.borderStyle = borderStyle

  return Object.keys(b).length ? b : null
}

// ─── Baseline aus bestehendem CSS (Draft-Resume, KI-Ergebnis) ───

/** Property-Namen, die buildStyleBaseline liest — inkl. Shorthands, die KI-CSS üblicherweise nutzt. */
const BASELINE_PROPS: Record<string, string> = {
  'background-color': 'background-color',
  background: 'background-color',
  color: 'color',
  'font-size': 'font-size',
  'font-weight': 'font-weight',
  'border-radius': 'border-radius',
  padding: 'padding',
  'border-width': 'border-width',
  'border-color': 'border-color',
  'border-style': 'border-style',
  border: 'border-color',
}

/**
 * Zerlegt CSS-Deklarationen in die Baseline-Form von buildStyleBaseline.
 *
 * Wird für zwei Fälle gebraucht, in denen die gemessenen Computed-Styles des
 * Pickers nicht verfügbar sind, aber das Aussehen des Originals trotzdem in
 * CSS vorliegt:
 *   - Draft-Resume: der Picker schreibt die gemessenen Styles als
 *     `.__original { … }`-Block in den gesammelten site_css.
 *   - KI-Ergebnis editieren: die Baseline des Editors soll das KI-Design
 *     sein, nicht das von A.
 */
export function baselineFromCss(css: string | null | undefined): StyleBaseline | null {
  if (!css) return null
  // Kommentare zuerst raus: "/* color: red */" würde sonst die Baseline
  // kapern, wenn es vor der echten Deklaration steht.
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const decls: Record<string, string> = {}
  for (const match of clean.matchAll(/[\w-]+\s*:\s*[^;{}]+/g)) {
    const sep = match[0].indexOf(':')
    if (sep === -1) continue
    const prop = match[0].slice(0, sep).trim().toLowerCase()
    const value = match[0].slice(sep + 1).trim()
    const target = BASELINE_PROPS[prop]
    if (target && !(target in decls)) decls[target] = value
  }
  return buildStyleBaseline(decls)
}

/**
 * Extrahiert den `.__original`-Block (gemessene Computed-Styles des Pickers)
 * aus dem gesammelten Site-CSS eines Drafts — als Property-Map in der Form
 * von `styleContext.computed` / `buildStyleBaseline`.
 */
export function collectedOriginalComputed(css: string | null | undefined): Record<string, string> | null {
  if (!css) return null
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const m = /\.__original\s*\{([^{}]*)\}/.exec(clean)
  if (!m) return null
  const decls: Record<string, string> = {}
  for (const match of m[1].matchAll(/[\w-]+\s*:\s*[^;{}]+/g)) {
    const sep = match[0].indexOf(':')
    if (sep === -1) continue
    decls[match[0].slice(0, sep).trim().toLowerCase()] = match[0].slice(sep + 1).trim()
  }
  return Object.keys(decls).length ? decls : null
}



/**
 * Hängt ein Delta an ein bestehendes Varianten-CSS an (KI-Ergebnis).
 *
 * Das Delta enthält nur die Properties, die der User im Editor geändert hat —
 * alles andere des KI-Designs (letter-spacing, box-shadow, …) steht im
 * Basis-CSS und darf beim Editieren nicht verschwinden. Das Delta kommt
 * NACH dem Basis-CSS, gewinnt also bei gleicher Spezifität — genau wie zur
 * Laufzeit (gescopte data-ab-el-Regeln gegen Site-Regeln).
 */
export function mergeVariantCss(
  baseCss: string | null | undefined,
  deltaCss: string
): string {
  const base = (baseCss ?? '').trim()
  const delta = deltaCss.trim()
  if (!base) return delta
  if (!delta) return base
  return `${base}\n\n${delta}`
}

/** Startwerte des Editors: Baseline, wenn vorhanden — sonst die Defaults. */
export function initialEdits(baseline: StyleBaseline | null, text: string): UserEdits {
  if (baseline) {
    return {
      text,
      bgColor: baseline.bgColor,
      textColor: baseline.textColor,
      fontSize: baseline.fontSize,
      fontWeight: baseline.fontWeight,
      borderRadius: baseline.borderRadius,
      paddingX: baseline.paddingX,
      paddingY: baseline.paddingY,
      borderWidth: baseline.borderWidth,
      borderColor: baseline.borderColor,
      borderStyle: baseline.borderStyle ?? 'solid',
      hoverEnabled: false,
      hoverBgColor: DEFAULT_EDITS.hoverBgColor,
      hoverScale: DEFAULT_EDITS.hoverScale,
      hoverShadow: false,
    }
  }
  return { ...DEFAULT_EDITS, text }
}

// ─── CSS-Delta ───

/**
 * Erzeugt das Varianten-CSS.
 *
 * `inherit`-Modus: nur Properties, die von der Baseline abweichen — eine
 * geänderte Hintergrundfarbe ergibt genau eine Deklaration. Padding,
 * Schriftgröße und alle Breakpoints bleiben A's Kaskade überlassen.
 * Ohne Baseline (kein Style-Context) degeneriert das zum alten Verhalten:
 * alle gesetzten Werte werden absolut emittiert.
 *
 * `scratch`-Modus: exakt das bisherige Verhalten inkl. transition.
 */
export function generateButtonCss(
  edits: UserEdits,
  selector: string,
  baseline: StyleBaseline | null,
  mode: EditorMode
): string {
  const isDelta = mode === 'inherit'
  const differs = (value: unknown, base: unknown): boolean =>
    value !== undefined && (!isDelta || !baseline || value !== base)

  const decls: string[] = []
  const add = (cond: boolean, prop: string, value: string) => {
    if (cond) decls.push(`  ${prop}: ${value};`)
  }

  add(differs(edits.bgColor, baseline?.bgColor), 'background-color', edits.bgColor!)
  add(differs(edits.textColor, baseline?.textColor), 'color', edits.textColor!)
  add(differs(edits.fontSize, baseline?.fontSize), 'font-size', `${edits.fontSize}px`)
  add(differs(edits.fontWeight, baseline?.fontWeight), 'font-weight', `${edits.fontWeight}`)
  add(differs(edits.borderRadius, baseline?.borderRadius), 'border-radius', `${edits.borderRadius}px`)
  add(differs(edits.borderWidth, baseline?.borderWidth), 'border-width', `${edits.borderWidth}px`)
  add(differs(edits.borderColor, baseline?.borderColor), 'border-color', edits.borderColor!)
  add(differs(edits.borderStyle, baseline?.borderStyle), 'border-style', edits.borderStyle!)
  if (edits.paddingX !== undefined || edits.paddingY !== undefined) {
    const py = edits.paddingY ?? baseline?.paddingY ?? 12
    const px = edits.paddingX ?? baseline?.paddingX ?? 24
    const changed =
      (edits.paddingY !== undefined && edits.paddingY !== baseline?.paddingY) ||
      (edits.paddingX !== undefined && edits.paddingX !== baseline?.paddingX)
    if (isDelta ? changed : true) decls.push(`  padding: ${py}px ${px}px;`)
  }

  // transition gehört zum scratch-Look. Im inherit-Modus bringt A seine
  // eigenen Transitions mit — ein leerer Zusatz würde das Delta unnötig füllen.
  if (!isDelta && decls.length) decls.push('  transition: all 0.2s ease;')

  const lines: string[] = []
  if (decls.length) {
    lines.push(`${selector} {`)
    lines.push(...decls)
    lines.push('}')
  }

  if (edits.hoverEnabled) {
    // Hover-Werte sind immer B-spezifisch (computed kann :hover nicht messen)
    // und werden emittiert, sobald sie gesetzt sind — wie vor dem Delta-Modell.
    const hoverDecls: string[] = []
    if (edits.hoverBgColor !== undefined) {
      hoverDecls.push(`  background-color: ${edits.hoverBgColor};`)
    }
    if (edits.hoverScale !== undefined && edits.hoverScale !== 100) {
      hoverDecls.push(`  transform: scale(${edits.hoverScale / 100});`)
    }
    if (edits.hoverShadow) {
      hoverDecls.push('  box-shadow: 0 4px 12px rgba(0,0,0,0.15);')
    }
    if (hoverDecls.length) {
      if (lines.length) lines.push('')
      lines.push(`${selector}:hover {`)
      lines.push(...hoverDecls)
      lines.push('}')
    }
  }

  return lines.join('\n')
}
