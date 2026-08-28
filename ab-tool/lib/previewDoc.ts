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
  const base = sanitizeCssText(baseCss)
  const variant = sanitizeCssText(variantCss)

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    :root { color-scheme: dark; }
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 14px; min-height: 72px; display: flex; align-items: center; justify-content: center; background: ${background}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .${PREVIEW_ROOT_CLASS} { max-width: 100%; }
${base}
${variant}
  </style></head><body><div class="${PREVIEW_ROOT_CLASS}">${html || ''}</div></body></html>`
}
