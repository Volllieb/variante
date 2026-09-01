/**
 * previewDoc — ein srcDoc-Builder für alle Varianten-Vorschauen.
 *
 * Vorher gab es zwei fast identische Inline-Templates (StepReview im Wizard,
 * VariantPreview auf der Results-Seite), die beide dasselbe Problem hatten: A
 * wurde ohne jedes CSS gerendert und B nur mit seinem eigenen `variant_css`.
 *
 * Live sieht es anders aus. `applyDom` in ab.js tauscht B in den DOM der
 * Kundenseite; B erbt dort deren Stylesheet, und `variant_css` ist nur ein
 * DELTA darauf. Eine Vorschau muss diese Schichtung nachbauen, sonst zeigt sie
 * einen Browser-Default-Button statt des echten Elements:
 *
 *   1. Reset          — Box-Modell und Zentrierung im iframe
 *   2. baseCss        — `site_css` vom Picker: gematchte Regeln der Zielseite
 *                       plus der computed-styles-Block. BEIDE Seiten bekommen
 *                       ihn, sonst ist der A/B-Vergleich verzerrt.
 *   3. variantCss     — nur B, zuletzt, gewinnt bei gleicher Spezifität.
 *
 * Der computed-styles-Block aus ab.js zielt auf `.__ab_preview_root > *` —
 * daher der Wrapper hier. Das ist der einzige Berührungspunkt zwischen Snippet
 * und Dashboard-Vorschau; PREVIEW_ROOT_CLASS ist beidseitig hart verdrahtet.
 *
 * Grenzen, die nicht wegzukonfigurieren sind:
 * - `collectCss` in ab.js überspringt Cross-Origin-Stylesheets. Bei CDN-
 *   gehostetem CSS (Webflow, Framer, Tailwind-CDN) bleiben die Regeln leer und
 *   der computed-styles-Block trägt allein — der ist herkunftsunabhängig und
 *   deckt Farbe, Padding, Radius, Shadow, Typo-Metriken ab.
 * - Die CSP erlaubt `font-src 'self' data:`. Kunden-Webfonts laden im iframe
 *   also nicht; die Schrift fällt auf den Stack zurück, alles andere stimmt.
 */

import { sanitizeCssText } from '@/lib/sanitizeCssText'

/**
 * Selektoren, die den Rahmen der Vorschau kapern statt das Element zu treffen.
 *
 * `collectCss` in ab.js sammelt jede Regel ein, die eine Custom Property
 * erwaehnt — der Guard soll die `:root`-Tokens retten, trifft aber auch jede
 * Regel, die bloss `var(--bg)` BENUTZT. So landet `body { background-color:
 * var(--bg); min-height: 100vh }` im site_css, steht im srcDoc nach dem Reset
 * und ueberschreibt dessen Hintergrund. Auf vallisride.com wurde die Vorschau
 * dadurch hell und der weisse Button darauf unsichtbar.
 *
 * Das gepickte Element ist nie <html> oder <body> — diese Selektoren sind hier
 * immer Kollateral. `:root` bleibt: dort stehen die Custom Properties, ohne die
 * jedes var() in den Element-Regeln ins Leere greift. `body .foo` bleibt
 * ebenfalls, das zielt auf einen Nachfahren und gilt in der Vorschau zu Recht.
 */
const PAGE_LEVEL_SELECTOR_RE = /^\s*(?:html|body|\*)\s*$/i

/**
 * Entfernt Seiten-Selektoren aus einer Regelliste, Selektor fuer Selektor.
 *
 * `collectCss` liefert eine Regel pro Zeile (ein `cssText` je Eintrag,
 * zeilenweise zusammengefuegt), verschachtelte At-Rules sind dabei schon
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
 * in einer Deklaration. Eine Regel ohne `}` laesst den CSS-Parser alles
 * Nachfolgende als ihren Rumpf verschlucken: den computed-Block und das Delta
 * der Variante. In der Vorschau sah B dann exakt aus wie A.
 *
 * Das Snippet deckelt inzwischen auf Regelgrenzen. Diese Reparatur bleibt fuer
 * die Bestandsdaten: `site_css`, das vor 09/2026 abgeschnitten gespeichert
 * wurde, liegt unveraendert in der DB und wird nicht nachgezogen.
 *
 * Geschweifte Klammern in Strings oder `url()` wuerden die Zaehlung stoeren —
 * in gesammeltem `cssText` kommen sie praktisch nicht vor, und der Preis waere
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

/** Wrapper-Klasse um das Vorschau-HTML. Gegenstück: computedBlock() in public/ab.js. */
export const PREVIEW_ROOT_CLASS = '__ab_preview_root'

/**
 * Text eines HTML-Fragments — für die Text-Fallback-Ansicht und die Editoren.
 * Bewusst simpel: die Eingabe ist ein einzelnes Element, kein Dokument.
 */
export function extractTextFromHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

export interface PreviewDocOptions {
  /** Das Element-HTML (A: original_html, B: variant_html). */
  html: string
  /** Styles der Zielseite — identisch für A und B. */
  baseCss?: string | null
  /** Delta der Variante — nur für B, wird zuletzt eingehängt. */
  variantCss?: string | null
  /** Hintergrund der Vorschaufläche. Default: das dunkle Dashboard-Schwarz. */
  background?: string
}

/**
 * Baut das vollständige srcDoc. Der Aufrufer rendert es in ein iframe mit
 * `sandbox=""` — das bleibt die Sicherheitsgrenze für fremdes HTML. Das CSS
 * geht zusätzlich durch sanitizeCssText, weil ein `</style>` im eingesammelten
 * CSS sonst den Block schliesst und der Rest als Markup geparst würde.
 */
export function buildPreviewSrcDoc({
  html,
  baseCss,
  variantCss,
  background = '#0a0a0a',
}: PreviewDocOptions): string {
  // Erst sanitizen, dann die Seiten-Selektoren ziehen: sanitizeCssText kann
  // Deklarationen entfernen, aber nie Selektoren umschreiben.
  const base = stripPageLevelRules(dropUnterminatedTail(sanitizeCssText(baseCss)))
  // Auch fuer B. Ein generiertes `body { background: … }` wuerde den Rahmen
  // genauso kapern und den A/B-Vergleich verfaelschen, statt das Element zu zeigen.
  const variant = stripPageLevelRules(dropUnterminatedTail(sanitizeCssText(variantCss)))

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    :root { color-scheme: dark; }
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 14px; min-height: 72px; display: flex; align-items: center; justify-content: center; background: ${background}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .${PREVIEW_ROOT_CLASS} { max-width: 100%; }
${base}
${variant}
  </style></head><body><div class="${PREVIEW_ROOT_CLASS}">${html || ''}</div></body></html>`
}
