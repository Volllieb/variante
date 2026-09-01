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

import type { UserEdits, StyleBaseline, EditorMode, ChangeEntry, ChangeProperty, VariantChangeSet } from './types'
import { extractTextFromHtml } from '@/lib/previewDoc'

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

// ─── Änderungsliste: Zeilen ↔ UserEdits / CSS ───

/** Zeilen-ID für ChangeEntries — crypto im Browser und in node ≥ 18. */
export function entryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Applied-Zeilen → UserEdits für den CSS-Generator.
 * `suggested`-Zeilen (KI-Vorschläge, noch nicht angenommen) und die
 * `other`-Sammelzeile werden ignoriert — deren Roh-CSS hängt composeVariant
 * separat an.
 */
export function entriesToEdits(entries: ChangeEntry[]): UserEdits {
  const edits: UserEdits = {}
  for (const e of entries) {
    if (e.status !== 'applied') continue
    switch (e.property) {
      case 'text': edits.text = e.after; break
      case 'bgColor': edits.bgColor = e.after; break
      case 'textColor': edits.textColor = e.after; break
      case 'borderColor': edits.borderColor = e.after; break
      case 'borderStyle': edits.borderStyle = e.after; break
      case 'fontSize': {
        const n = parseFloat(e.after)
        if (!Number.isNaN(n)) edits.fontSize = n
        break
      }
      case 'fontWeight': {
        const n = parseFloat(e.after)
        if (!Number.isNaN(n)) edits.fontWeight = n
        break
      }
      case 'borderRadius': {
        const n = parseFloat(e.after)
        if (!Number.isNaN(n)) edits.borderRadius = n
        break
      }
      case 'paddingX': {
        const n = parseFloat(e.after)
        if (!Number.isNaN(n)) edits.paddingX = n
        break
      }
      case 'paddingY': {
        const n = parseFloat(e.after)
        if (!Number.isNaN(n)) edits.paddingY = n
        break
      }
      case 'borderWidth': {
        const n = parseFloat(e.after)
        if (!Number.isNaN(n)) edits.borderWidth = n
        break
      }
      case 'hoverScale': {
        const n = parseFloat(e.after)
        if (!Number.isNaN(n)) edits.hoverScale = n
        break
      }
      case 'hoverBgColor': {
        edits.hoverEnabled = true
        edits.hoverBgColor = e.after
        break
      }
      case 'hoverShadow': {
        edits.hoverEnabled = true
        edits.hoverShadow = e.after === 'on' || e.after === 'true'
        break
      }
      case 'other': break
    }
  }
  return edits
}

/** Scratch-Tag: Text/Headline-Elemente bauen <span>, alles andere <button> — wie die Editoren. */
function scratchTagOf(originalHtml: string): 'button' | 'span' {
  const m = /^<\s*([a-zA-Z][\w-]*)/.exec(originalHtml.trim())
  const tag = (m?.[1] ?? '').toLowerCase()
  return /^(h[1-6]|p|span|div|label|li|strong|em|b|i)$/.test(tag) ? 'span' : 'button'
}

/**
 * Komponiert variant_b_html/-css aus der Änderungsliste.
 *
 * Eine leere Liste ergibt wörtlich A — der Server-Guard (`empty_variant` in
 * lib/testHealth.ts) erkennt daran die Identität. `other`-Zeilen werden als
 * Roh-CSS hinter das generierte Delta gehängt; damit überlebt nicht auf
 * Regler abbildbares KI-CSS (letter-spacing, box-shadow-Formate, …) das
 * Annehmen eines Vorschlags unverändert.
 */
export function composeVariant(
  set: VariantChangeSet,
  originalHtml: string,
  selector: string
): { html: string; css: string } {
  const applied = set.entries.filter((e) => e.status === 'applied')
  const edits = entriesToEdits(applied)
  const originalText = extractTextFromHtml(originalHtml)
  const text = edits.text ?? originalText

  const html = applied.length === 0
    ? originalHtml
    : set.mode === 'inherit'
      ? inheritRootHtml(originalHtml, text)
      : scratchVariantHtml(text, scratchTagOf(originalHtml))

  const css = generateButtonCss(
    edits,
    selector,
    set.mode === 'inherit' ? set.baseline : null,
    set.mode
  )
  const raw = applied
    .filter((e) => e.property === 'other' && e.rawCss)
    .map((e) => e.rawCss!.trim())
    .filter(Boolean)
    .join('\n\n')
  return { html, css: mergeVariantCss(css, raw) }
}

// ─── KI-CSS → Zeilen ───

/**
 * Der kanonische Hover-Schatten von generateButtonCss — nur dieser exakte
 * Wert wird auf die hoverShadow-Zeile abgebildet, alles andere bleibt Roh-CSS.
 */
const CANONICAL_HOVER_SHADOW = '0 4px 12px rgba(0,0,0,0.15)'

/**
 * Farbwert → Hex, aber nur wenn verlustfrei: rgba() mit Alpha < 1 und
 * benannte Farben bleiben Roh-CSS statt still zu Hex abgerundet zu werden.
 */
function toHexExact(value: string): string | null {
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toLowerCase()
  const rgba = /^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)$/i.exec(value)
  if (rgba && parseFloat(rgba[1]) < 1) return null
  return rgbToHex(value) ?? null
}

/**
 * Anzeige-/Vergleichswert der Baseline für ein Property — null wenn keine
 * messbar war. Exportiert: StepChange nutzt ihn als Startwert neuer Zeilen.
 */
export function baselineValue(baseline: StyleBaseline | null, property: ChangeProperty): string | null {
  if (!baseline) return null
  // hover-Properties haben bewusst keine Baseline: computed kann :hover nicht messen.
  const map: Partial<Record<ChangeProperty, keyof StyleBaseline>> = {
    bgColor: 'bgColor', textColor: 'textColor', fontSize: 'fontSize',
    fontWeight: 'fontWeight', borderRadius: 'borderRadius', paddingX: 'paddingX',
    paddingY: 'paddingY', borderWidth: 'borderWidth', borderColor: 'borderColor',
    borderStyle: 'borderStyle',
  }
  const field = map[property] ?? null
  if (!field) return null
  const v = baseline[field]
  return v === undefined || v === null ? null : String(v)
}

/**
 * KI-CSS → ChangeEntries. Regex-basiert wie baselineFromCss (kein DOMParser),
 * damit test:node es abdeckt.
 *
 * - Deklarationen, deren Wert der Baseline entspricht, fallen raus.
 * - `:hover`/`:focus`-Regeln werden auf hoverBgColor/hoverScale/hoverShadow
 *   abgebildet, statt sie stumm in die Grundzeilen zu mischen.
 * - Nicht abbildbare Properties (letter-spacing, benannte Farben, …) werden
 *   zu EINER `other`-Zeile zusammengefasst — als komplette Regelblöcke, damit
 *   das Roh-CSS beim Anhängen gültig bleibt.
 *
 * Zeilen kommen mit status 'suggested' zurück: Der KI-Pfad will sie als
 * Vorschläge. Aufrufer, die einen Bestand rekonstruieren (Draft-Resume ohne
 * variant_b_changes), mappen danach selbst auf 'applied' — der Parse-Pfad
 * ist derselbe, nur der Status unterscheidet sich.
 */
export function diffCssToEntries(
  css: string | null | undefined,
  baseline: StyleBaseline | null,
  source: ChangeEntry['source']
): ChangeEntry[] {
  if (!css) return []
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const entries: ChangeEntry[] = []
  const otherRules: string[] = []

  for (const rule of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = rule[1].trim()
    const isHover = /:(?:hover|focus|active)\b/.test(selector)
    const decls: Array<{ prop: string; value: string }> = []
    for (const d of rule[2].matchAll(/([\w-]+)\s*:\s*([^;{}]+)/g)) {
      decls.push({ prop: d[1].trim().toLowerCase(), value: d[2].trim() })
    }

    const rawDecls: Array<{ prop: string; value: string }> = []
    const pushEntry = (property: ChangeProperty, after: string) => {
      const base = baselineValue(baseline, property)
      if (base !== null && base === after) return
      entries.push({ id: entryId(), property, before: base ?? '', after, source, status: 'suggested' })
    }

    for (const decl of decls) {
      if (decl.value === '') continue

      if (isHover) {
        if (decl.prop === 'background-color' || decl.prop === 'background') {
          const hex = toHexExact(decl.value)
          if (hex) pushEntry('hoverBgColor', hex)
          else rawDecls.push(decl)
        } else if (decl.prop === 'transform') {
          const m = /^scale\(\s*([\d.]+)\s*\)$/i.exec(decl.value)
          if (m) pushEntry('hoverScale', String(Math.round(parseFloat(m[1]) * 100)))
          else rawDecls.push(decl)
        } else if (decl.prop === 'box-shadow') {
          if (decl.value.replace(/\s+/g, ' ') === CANONICAL_HOVER_SHADOW) pushEntry('hoverShadow', 'on')
          else rawDecls.push(decl)
        } else {
          rawDecls.push(decl)
        }
        continue
      }

      const target = BASELINE_PROPS[decl.prop]
      if (!target) { rawDecls.push(decl); continue }

      if (target === 'background-color' || target === 'color' || target === 'border-color') {
        const hex = toHexExact(decl.value)
        if (!hex) { rawDecls.push(decl); continue }
        const property = target === 'background-color' ? 'bgColor' : target === 'color' ? 'textColor' : 'borderColor'
        pushEntry(property, hex)
      } else if (target === 'font-size' || target === 'border-radius' || target === 'border-width') {
        const px = pxOf(decl.value)
        if (px === undefined) { rawDecls.push(decl); continue }
        const property = target === 'font-size' ? 'fontSize' : target === 'border-radius' ? 'borderRadius' : 'borderWidth'
        pushEntry(property, String(px))
      } else if (target === 'padding') {
        const parts = decl.value.trim().split(/\s+/).map(pxOf)
        if (parts.length >= 1 && parts[0] !== undefined) {
          pushEntry('paddingY', String(parts[0]))
          pushEntry('paddingX', String(parts.length >= 2 && parts[1] !== undefined ? parts[1] : parts[0]))
        } else {
          rawDecls.push(decl)
        }
      } else if (target === 'font-weight') {
        const w = parseInt(decl.value, 10)
        if (Number.isNaN(w)) { rawDecls.push(decl); continue }
        pushEntry('fontWeight', String(w))
      } else if (target === 'border-style') {
        pushEntry('borderStyle', decl.value)
      }
    }

    if (rawDecls.length) {
      otherRules.push(`${selector} { ${rawDecls.map((d) => `${d.prop}: ${d.value};`).join(' ')} }`)
    }
  }

  if (otherRules.length) {
    entries.push({
      id: entryId(),
      property: 'other',
      before: '',
      after: 'Custom CSS',
      source,
      status: 'suggested',
      rawCss: otherRules.join('\n'),
    })
  }

  return entries
}

/** Text-Änderung als Zeile — null, wenn A und B denselben Text tragen. */
export function diffTextToEntry(
  originalHtml: string,
  variantHtml: string | null | undefined,
  source: ChangeEntry['source']
): ChangeEntry | null {
  const before = extractTextFromHtml(originalHtml)
  const after = extractTextFromHtml(variantHtml ?? '')
  if (before === after) return null
  return { id: entryId(), property: 'text', before, after, source, status: 'suggested' }
}

// ─── UI-Beschriftung ───

const CHANGE_LABELS: Record<ChangeProperty, string> = {
  text: 'Text',
  bgColor: 'Background',
  textColor: 'Text colour',
  fontSize: 'Font size',
  fontWeight: 'Font weight',
  borderRadius: 'Border radius',
  paddingX: 'Padding horizontal',
  paddingY: 'Padding vertical',
  borderWidth: 'Border width',
  borderColor: 'Border colour',
  borderStyle: 'Border style',
  hoverBgColor: 'Hover background',
  hoverScale: 'Hover scale',
  hoverShadow: 'Hover shadow',
  other: 'Custom CSS',
}

/** Einheiten für die Anzeige — Zahlen reisen ohne Einheit durch die Zeilen. */
const CHANGE_UNITS: Partial<Record<ChangeProperty, string>> = {
  fontSize: 'px',
  borderRadius: 'px',
  paddingX: 'px',
  paddingY: 'px',
  borderWidth: 'px',
  hoverScale: '%',
}

/**
 * UI-Beschriftung einer Zeile — die eine Stelle für Step 2 und Step 4.
 * `before: ''` heißt: keine Baseline messbar — der Aufrufer zeigt dann
 * „set to X" statt „#111111 → #2563EB".
 */
export function describeChange(entry: ChangeEntry): { label: string; before: string; after: string } {
  const label = CHANGE_LABELS[entry.property]
  const unit = CHANGE_UNITS[entry.property]
  const fmt = (v: string): string => {
    if (v === '') return ''
    if (entry.property === 'hoverShadow') return v === 'on' || v === 'true' ? 'Shadow' : 'No shadow'
    return unit ? `${v}${unit}` : v
  }
  return { label, before: fmt(entry.before), after: fmt(entry.after) }
}
