/**
 * previewDoc — der eine srcDoc-Builder für alle Varianten-Vorschauen.
 *
 * Wizard (ButtonEditor/TextInputEditor/StepReview) und Results
 * (VariantPreview) bauten lange zwei getrennte Vorschau-Modelle mit
 * unvereinbarer Signatur. Die Trennung galt als bewusst — sie ist aber der
 * Grund, warum Fixes wie der computed-Block nur auf einer Hälfte ankamen.
 * Dieses Modul ist jetzt der einzige Builder; die Layer sind überall gleich:
 *
 *   1. Reset          — Box-Modell, Hintergrund, Schrift des iframe
 *   2. siteCss        — Regeln der Zielseite (tests.site_css vom Picker).
 *                       BEIDE Seiten bekommen sie, sonst ist der A/B-
 *                       Vergleich verzerrt. Seiten-Selektoren (html/body/*)
 *                       fliegen raus: sie kapern den Rahmen statt das
 *                       Element zu treffen.
 *   3. computed-Blöcke — die gemessenen Computed-Styles des Originals,
 *                       getrennt nach Ruhe- (computedBlock()) und
 *                       Hover-Zustand (hoverBlock() in ab.js). Sie sitzen als
 *                       Daten im site_css und werden hier auf den Wrapper
 *                       normalisiert (s. u.). Bei CDN-gehostetem CSS (Webflow,
 *                       Framer, Tailwind-CDN), das collectCss cross-origin
 *                       nicht einsammeln kann, tragen sie die Vorschau allein.
 *   4. variantCss     — Delta der Variante, zuletzt, gewinnt bei gleicher
 *                       Spezifität (wie forceImportant() zur Laufzeit).
 *
 * Computed-Block-Formate: ab.js schreibt seit dem Delta-Modell
 * `.__original { … }` (Daten für delta.ts / Draft-Resume), Bestandszeilen
 * tragen `.__ab_preview_root > * { … }`. Beide Formate werden beim Bauen auf
 * `.${PREVIEW_ROOT_CLASS} > *` normalisiert — der gespeicherte Text bleibt
 * unverändert, keine Migration. width/height/transform-origin fliegen beim
 * Anwenden raus: Pixel-Snapshots der Original-Box würden die Variante auf
 * deren Maße einfrieren, obwohl längerer Text wachsen soll — Padding und
 * Font bestimmen die Box ohnehin.
 *
 * Hover: `.__original_hover { … }` trägt nur die Properties, die :hover am
 * Original ändert, und wird als `> *:hover` emittiert — die Vorschau verhält
 * sich damit wie die echte Seite. Vorher steckte der Hover-Zustand im einzigen
 * computed-Block (der Picker misst im click-Handler, also mit Zeiger auf dem
 * Element) und wirkte unbedingt: A sah im Wizard dauerhaft gehovert aus,
 * obwohl der Live-Test korrekt rendert. Mit `state: 'hover'` blendet der Wizard
 * den Block bewusst statisch ein — damit der Zustand auch bearbeitbar ist.
 *
 * Grenzen, die nicht wegzukonfigurieren sind:
 * - Die CSP erlaubt `font-src 'self' data:`. Kunden-Webfonts laden im iframe
 *   also nicht; die Schrift fällt auf den Stack zurück, alles andere stimmt.
 */

import { sanitizeCssText } from '@/lib/sanitizeCssText'

/** Wrapper-Klasse um jedes Vorschau-HTML. Gegenstück: computedBlock() in public/ab.js. */
export const PREVIEW_ROOT_CLASS = '__ab_preview_root'

/** Marker auf der B-Wurzel in der Vorschau — analog data-ab-el zur Laufzeit. */
export const PREVIEW_MARK = 'data-ab-preview-el'

/**
 * Text eines HTML-Fragments — für die Text-Fallback-Ansicht und die Editoren.
 * Bewusst simpel: die Eingabe ist ein einzelnes Element, kein Dokument.
 */
export function extractTextFromHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

/**
 * Selektoren, die den Rahmen der Vorschau kapern statt das Element zu treffen.
 *
 * `collectCss` in ab.js sammelt jede Regel ein, die eine Custom Property
 * DEKLARIERT — der Guard soll die `:root`-Tokens retten. Alte site_css-Zeilen
 * (vor 09/2026) enthalten aber auch Regeln, die `var(--bg)` bloss BENUTZEN.
 * So landet `body { background-color: var(--bg); min-height: 100vh }` im
 * site_css, steht im srcDoc nach dem Reset und überschreibt dessen
 * Hintergrund. Auf vallisride.com wurde die Vorschau dadurch hell und der
 * weisse Button darauf unsichtbar.
 *
 * Das gepickte Element ist nie <html> oder <body> — diese Selektoren sind hier
 * immer Kollateral. `:root` bleibt: dort stehen die Custom Properties, ohne die
 * jedes var() in den Element-Regeln ins Leere greift. `body .foo` bleibt
 * ebenfalls, das zielt auf einen Nachfahren und gilt in der Vorschau zu Recht.
 */
const PAGE_LEVEL_SELECTOR_RE = /^\s*(?:html|body|\*)\s*$/i

/**
 * Entfernt Seiten-Selektoren aus einer Regelliste, Selektor für Selektor.
 *
 * `collectCss` liefert eine Regel pro Zeile (ein `cssText` je Eintrag,
 * zeilenweise zusammengefügt), verschachtelte At-Rules sind dabei schon
 * flachgeklopft. Die zeilenweise Verarbeitung ist deshalb kein Parser-Ersatz,
 * sondern passt exakt auf das Format des Erzeugers. Aus `body, .cta { … }` wird
 * `.cta { … }`, statt die ganze Regel zu verlieren.
 */
function stripPageLevelRules(css: string): string {
  return css
    .split('\n')
    .map((line) => {
      const brace = line.indexOf('{')
      if (brace === -1) return line
      const selectors = line.slice(0, brace).split(',')
      const kept = selectors.filter((s) => !PAGE_LEVEL_SELECTOR_RE.test(s))
      if (kept.length === selectors.length) return line
      return kept.length === 0 ? null : kept.join(',') + line.slice(brace)
    })
    .filter((line): line is string => line !== null)
    .join('\n')
}

/**
 * Schneidet eine am Ende offen gebliebene Regel ab.
 *
 * `collectCss` deckelte das eingesammelte CSS lange auf 18 000 Zeichen — mitten
 * in einer Deklaration. Eine Regel ohne `}` lässt den CSS-Parser alles
 * Nachfolgende als ihren Rumpf verschlucken: den computed-Block und das Delta
 * der Variante. In der Vorschau sah B dann exakt aus wie A.
 *
 * Das Snippet deckelt inzwischen auf Regelgrenzen. Diese Reparatur bleibt für
 * die Bestandsdaten: `site_css`, das vor 09/2026 abgeschnitten gespeichert
 * wurde, liegt unverändert in der DB und wird nicht nachgezogen.
 *
 * Geschweifte Klammern in Strings oder `url()` würden die Zählung stören —
 * in gesammeltem `cssText` kommen sie praktisch nicht vor, und der Preis wäre
 * ein CSS-Parser im Client-Bundle.
 */
function dropUnterminatedTail(css: string): string {
  let depth = 0
  let lastBalanced = 0
  for (let i = 0; i < css.length; i++) {
    const ch = css[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth = Math.max(0, depth - 1)
      if (depth === 0) lastBalanced = i + 1
    }
  }
  return depth === 0 ? css : css.slice(0, lastBalanced)
}

// --- computed-Block ---------------------------------------------------------

/** Kommentar, mit dem computedBlock() in ab.js seinen Block eröffnet. */
const COMPUTED_MARKER = '/* computed styles of original element (reference) */'
/** Gegenstück für den :hover-Block (hoverBlock() in ab.js). */
const HOVER_COMPUTED_MARKER = '/* computed :hover styles of original element (reference) */'
/**
 * Beide in Produktion vorkommenden Selektoren des computed-Blocks.
 *
 * Das `\b` hinter `original` grenzt gegen `.__original_hover` ab: `_` ist ein
 * Wortzeichen, dort gibt es also keine Wortgrenze. Ohne diese Schärfung würde
 * der Ruhe-Block-Regex den Hover-Block greifen und dessen Werte unbedingt als
 * Normalzustand rendern — genau der Fehler, den diese Trennung behebt.
 */
const COMPUTED_SELECTOR_RE = /\.__original\b|\.__ab_preview_root\s*>\s*\*/
const HOVER_COMPUTED_SELECTOR_RE = /\.__original_hover\b/
/** Pixel-Snapshots der Original-Box — beim Anwenden schädlich (s. Modul-Docblock). */
const BOX_FREEZE_LINE_RE = /^\s*(?:width|height|transform-origin)\s*:/
/**
 * Im Hover-Block bleibt transform-origin stehen: ein Hover-`scale()` ohne
 * seinen Ursprung wächst aus der falschen Ecke. width/height sind auch hier
 * eingefrorene Snapshots und fliegen raus.
 */
const HOVER_BOX_FREEZE_LINE_RE = /^\s*(?:width|height)\s*:/

interface ComputedBlockFound {
  /** Position des Selektors im css-Text. */
  selectorStart: number
  /** Position NACH der schliessenden Klammer. */
  end: number
}

/**
 * Findet einen computed-Block im site_css. Bevorzugt über den Marker-Kommentar
 * von ab.js; ohne ihn (handgeschriebene Fixtures, alte Zeilen) über den
 * Selektor allein — dieselbe Heuristik wie collectedOriginalComputed() in
 * delta.ts.
 */
function findComputedBlock(css: string, marker: string, selectorRe: RegExp): ComputedBlockFound | null {
  const markerAt = css.indexOf(marker)
  const from = markerAt !== -1 ? markerAt + marker.length : 0
  const selMatch = selectorRe.exec(css.slice(from))
  if (!selMatch) return null
  const selectorStart = from + selMatch.index
  const braceAt = css.indexOf('{', selectorStart + selMatch[0].length)
  if (braceAt === -1) return null
  let depth = 0
  for (let i = braceAt; i < css.length; i++) {
    const ch = css.charAt(i)
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return { selectorStart, end: i + 1 }
    }
  }
  return null
}

/**
 * Hebt beide computed-Blöcke aus dem site_css und gibt ihre Deklarationen
 * zurück. Der gespeicherte Text bleibt unverändert — es wird nur die Kopie im
 * srcDoc umgebaut. Den Selektor setzt buildPreviewSrcDoc, weil er vom
 * gewählten Zustand (normal/hover) abhängt.
 */
function extractComputedBlocks(css: string): { rest: string; computed: string; computedHover: string } | null {
  let rest = css
  function cut(marker: string, selectorRe: RegExp, freezeRe: RegExp): string {
    const found = findComputedBlock(rest, marker, selectorRe)
    if (!found) return ''
    const braceAt = rest.indexOf('{', found.selectorStart)
    const body = rest.slice(braceAt + 1, found.end - 1)
    const markerAt = rest.indexOf(marker)
    const cutFrom = markerAt !== -1 && markerAt < found.selectorStart ? markerAt : found.selectorStart
    rest = (rest.slice(0, cutFrom) + rest.slice(found.end)).trim()
    return body
      .split('\n')
      .filter((line) => !freezeRe.test(line))
      .join('\n')
  }
  // Reihenfolge: erst der Ruhe-Block, dann der Hover-Block aus dem Rest —
  // jeder Schnitt verschiebt die Positionen des jeweils anderen.
  const computed = cut(COMPUTED_MARKER, COMPUTED_SELECTOR_RE, BOX_FREEZE_LINE_RE)
  const computedHover = cut(HOVER_COMPUTED_MARKER, HOVER_COMPUTED_SELECTOR_RE, HOVER_BOX_FREEZE_LINE_RE)
  if (!computed.trim() && !computedHover.trim()) return rest === css ? null : { rest, computed: '', computedHover: '' }
  return { rest, computed, computedHover }
}

// --- Wizard-Helfer (aus new-test/preview.ts übernommen) ----------------------

/** Setzt den Marker auf das Wurzelelement des Fragments. */
export function markPreviewRoot(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const root = doc.body.firstElementChild
    if (!root) return html
    root.setAttribute(PREVIEW_MARK, '1')
    return root.outerHTML
  } catch {
    return html
  }
}

/**
 * Markiert jede Deklaration eines Regelblocks mit !important — dieselbe
 * Logik wie forceImportant() in ab.js. Ohne sie verlöre das gescopte Delta
 * in der Vorschau gegen A's Inline-Styles und ID-Regeln, während es in der
 * Produktion gewinnt: die Vorschau zeigte systematisch A statt B.
 */
function forceImportantPreview(block: string): string {
  const open = block.indexOf('{')
  const close = block.lastIndexOf('}')
  if (open === -1 || close <= open) return block
  const body = block.slice(open + 1, close)
  const parts: string[] = []
  let buf = ''
  let depth = 0
  for (let i = 0; i < body.length; i++) {
    const c = body.charAt(i)
    if (c === '(') depth++
    else if (c === ')') depth = Math.max(0, depth - 1)
    if (c === ';' && depth === 0) { parts.push(buf); buf = '' }
    else buf += c
  }
  if (buf.trim()) parts.push(buf)
  const out: string[] = []
  for (const p of parts) {
    const decl = p.trim()
    if (!decl) continue
    if (/!important\s*$/i.test(decl)) out.push(decl)
    else out.push(decl + ' !important')
  }
  if (!out.length) return block
  return block.slice(0, open + 1) + ' ' + out.join('; ') + ';' + block.slice(close)
}

/**
 * Derselbe literal-Selektor-Tausch wie scopeCssToVariant() in ab.js — nur für
 * die Vorschau. CSS, das den Selektor nicht enthält (z. B. .ab-v-CSS aus dem
 * Figma-Pfad), bleibt unverändert.
 */
export function scopeCssForPreview(css: string, selector: string | null | undefined): string {
  if (!css || !selector || css.indexOf(selector) === -1) return css
  const attr = `[${PREVIEW_MARK}]`
  const swapped = css.split(selector).join(attr)
  // Nur Blöcke, deren Selektor NACH dem Tausch auf den Preview-Marker zeigt —
  // exakt die Begrenzung von scopeCssToVariant in ab.js.
  return swapped.replace(/([^{}]+)(\{[^{}]*\})/g, (match, sel, block) => {
    if (sel.indexOf(attr) === -1) return match
    return sel + forceImportantPreview(block)
  })
}

/**
 * Macht `:hover`-Regeln unbedingt wirksam — ausschliesslich für die
 * Hover-Ansicht des Wizards.
 *
 * Der gemessene Hover-Zustand von A kommt aus dem computed-Block, aber die
 * Hover-Änderungen, die der User gerade an B macht, stehen als `…:hover { … }`
 * im Varianten-CSS. Ohne diesen Schritt zeigt der Toggle nur die halbe
 * Wahrheit. Angefasst wird nur der Selektorteil; Deklarationen (und damit
 * z. B. `transition`) bleiben unberührt.
 */
export function forceHoverSelectors(css: string): string {
  if (!css) return css
  return css.replace(/([^{}]+)(\{[^{}]*\})/g, (match, sel: string, block: string) => {
    if (!/:hover\b/.test(sel)) return match
    return sel.replace(/:hover\b/g, '') + block
  })
}

/**
 * Überträgt Klassen/Inline-Styles/data-* von A's Wurzel auf B — dasselbe,
 * was adoptPresentation() in ab.js zur Laufzeit tut. Ohne diesen Schritt
 * sieht ein scratch/AI-B (nur class="ab-variant-b") in der Vorschau nackt
 * aus, während es in Produktion A's Styles bekommt — die Vorschau hätte
 * einen systematischen B-Nachteil.
 */
function adoptPresentationPreview(aHtml: string, bHtml: string): string {
  try {
    const aDoc = new DOMParser().parseFromString(aHtml, 'text/html')
    const bDoc = new DOMParser().parseFromString(bHtml, 'text/html')
    const src = aDoc.body.firstElementChild
    const dst = bDoc.body.firstElementChild
    if (!src || !dst) return bHtml
    const dstCls = dst.getAttribute('class') || ''
    if (dstCls.replace(/\b(?:ab-variant-b|ab-v)\b/g, '').trim()) return bHtml
    const cls = src.getAttribute('class')
    if (cls) dst.setAttribute('class', (cls + ' ' + dstCls).trim())
    const style = src.getAttribute('style')
    if (style && !dst.getAttribute('style')) dst.setAttribute('style', style)
    if (src.attributes) {
      for (const attr of Array.from(src.attributes)) {
        const name = attr.name
        if (name.indexOf('data-ab-') === 0) continue
        if (name.indexOf('data-') === 0 && !dst.hasAttribute(name)) {
          dst.setAttribute(name, src.getAttribute(name)!)
        }
      }
    }
    return dst.outerHTML
  } catch {
    return bHtml
  }
}

// --- Builder -----------------------------------------------------------------

export interface PreviewBlock {
  /** Das Element-HTML dieses Blocks (A: original_html, B: variant_html). */
  html: string
  /** Varianten-CSS dieses Blocks (Delta des Editors oder KI-CSS). */
  css?: string | null
  /** true: css wurde gegen den Element-Selektor generiert → aufs B-Element scopen. */
  scopeToSelector?: boolean
  /** Der Original-Selektor, gegen den gescopt wird. */
  selector?: string | null
  /**
   * A-HTML, von dem dieser Block seine Präsentation erbt (adoptPresentation).
   * Default: Block 0 = A — die indexbasierte Regel. Einzel-Vorschauen
   * (StepReview rendert B allein pro iframe) müssen A explizit mitgeben,
   * sonst läuft die Adoption nie und ein scratch-/KI-B rendert nackt.
   */
  adoptFrom?: string | null
}

export interface PreviewDocOptions {
  /** Styles der Zielseite — identisch für alle Blöcke (tests.site_css). */
  siteCss?: string | null
  /** Hintergrund der Vorschaufläche. Default: das dunkle Dashboard-Schwarz. */
  background?: string
  /**
   * Welchen Zustand des Originals die Vorschau zeigt.
   *
   * `normal` (Default) verhält sich wie die echte Seite. `hover` zeigt den
   * gemessenen Hover-Zustand statisch, damit der Wizard ihn anzeigen und
   * bearbeiten lassen kann, ohne dass der User die Maus stillhalten muss.
   */
  state?: 'normal' | 'hover'
}

/**
 * Baut das vollständige srcDoc. Der Aufrufer rendert es in ein iframe mit
 * `sandbox=""` — das bleibt die Sicherheitsgrenze für fremdes HTML. Das CSS
 * geht zusätzlich durch sanitizeCssText, weil ein `</style>` im eingesammelten
 * CSS sonst den Block schliesst und der Rest als Markup geparst würde.
 */
export function buildPreviewSrcDoc(
  blocks: PreviewBlock[],
  opts?: PreviewDocOptions
): string {
  const background = opts?.background ?? '#0a0a0a'
  // Erst sanitizen, dann die Seiten-Selektoren ziehen: sanitizeCssText kann
  // Deklarationen entfernen, aber nie Selektoren umschreiben.
  const siteFull = stripPageLevelRules(dropUnterminatedTail(sanitizeCssText(opts?.siteCss)))
  const extracted = extractComputedBlocks(siteFull)
  const site = extracted ? extracted.rest : siteFull
  const cssParts = [site]
  if (extracted && extracted.computed.trim()) {
    cssParts.push(`.${PREVIEW_ROOT_CLASS} > * {${extracted.computed}}`)
  }
  if (extracted && extracted.computedHover.trim()) {
    // 'normal' verhaelt sich wie die echte Seite: die gemessenen Hover-Werte
    // greifen nur bei echtem Hover. 'hover' blendet sie unbedingt ein — und
    // steht NACH dem Ruhe-Block, gewinnt also bei gleicher Spezifitaet.
    const hoverSel =
      opts?.state === 'hover' ? `.${PREVIEW_ROOT_CLASS} > *` : `.${PREVIEW_ROOT_CLASS} > *:hover`
    cssParts.push(`${hoverSel} {${extracted.computedHover}}`)
  }
  const bodies: string[] = []

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    let css = stripPageLevelRules(dropUnterminatedTail(sanitizeCssText(b.css)))
    let html = b.html || ''
    if (b.scopeToSelector) {
      css = scopeCssForPreview(css, b.selector)
      // A→B-Adoption: explizites adoptFrom, sonst Block 0 = A. Einzel-
      // Vorschauen (StepReview rendert B allein pro iframe) geben A explizit
      // mit — die indexbasierte Regel griffe dort nie.
      const aHtml = b.adoptFrom ?? (i > 0 ? blocks[0].html ?? '' : '')
      html = markPreviewRoot(adoptPresentationPreview(aHtml, html))
    }
    // In der Hover-Ansicht muss auch das gelten, was der User gerade an B's
    // Hover aendert — sonst zeigt der Toggle nur A's gemessenen Hover.
    if (opts?.state === 'hover') css = forceHoverSelectors(css)
    if (css.trim()) cssParts.push(css)
    bodies.push(`<div class="${PREVIEW_ROOT_CLASS}">${html}</div>`)
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    :root { color-scheme: dark; }
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 14px; min-height: 100%; background: ${background}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { display: flex; align-items: flex-start; justify-content: center; gap: 28px; flex-wrap: wrap; }
    .${PREVIEW_ROOT_CLASS} { display: flex; align-items: center; justify-content: center; min-width: 80px; max-width: 100%; }
${cssParts.join('\n')}
  </style></head><body>${bodies.join('')}</body></html>`
}
