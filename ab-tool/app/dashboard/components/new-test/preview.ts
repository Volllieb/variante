/**
 * Vorschau-Helfer für den Wizard: rendert A/B in sandboxed iframes MIT dem
 * echten Site-CSS des Originals.
 *
 * Warum das nötig ist: die Vorschau enthielt bisher kein Seiten-CSS — A
 * rendert dort nackt, B mit seinem eigenen CSS, B sah also systematisch
 * besser aus als auf der echten Seite. Mit dem Klassen-Erbe wäre A und B
 * ohne Site-CSS identisch und beide ungestylt.
 *
 * `sanitizeCss` entfernt @import/expression()/fremde url(); @media bleibt
 * erhalten — echte iframe-Breite löst Media-Queries aus (kein transform:
 * scale, das täte es nicht).
 */

import { sanitizeCss } from '@/lib/sanitize'

/** Marker auf der B-Wurzel in der Vorschau — analog data-ab-el zur Laufzeit. */
export const PREVIEW_MARK = 'data-ab-preview-el'

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
 * Derselbe literal-Selektor-Tausch wie scopeCssToVariant() in ab.js — nur für
 * die Vorschau. CSS, das den Selektor nicht enthält (z. B. .ab-v-CSS aus dem
 * Figma-Pfad), bleibt unverändert.
 */
export function scopeCssForPreview(css: string, selector: string | null | undefined): string {
  if (!css || !selector || css.indexOf(selector) === -1) return css
  return css.split(selector).join(`[${PREVIEW_MARK}]`)
}

export interface PreviewBlock {
  html: string
  /** Varianten-CSS dieses Blocks (Delta des Editors oder KI-CSS). */
  css?: string | null
  /** true: css wurde gegen den Element-Selektor generiert → aufs B-Element scopen. */
  scopeToSelector?: boolean
  /** Der Original-Selektor, gegen den gescopt wird. */
  selector?: string | null
}

/** Baut das srcDoc eines Vorschau-iframes mit Site-CSS und A/B-Blöcken. */
export function buildPreviewSrcDoc(
  blocks: PreviewBlock[],
  siteCss?: string | null
): string {
  const cssParts = [sanitizeCss(siteCss ?? '')]
  const bodies: string[] = []

  for (const b of blocks) {
    let css = sanitizeCss(b.css ?? '')
    let html = b.html || ''
    if (b.scopeToSelector) {
      css = scopeCssForPreview(css, b.selector)
      html = markPreviewRoot(html)
    }
    if (css.trim()) cssParts.push(css)
    bodies.push(`<div class="__ab-preview-block">${html}</div>`)
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    :root { color-scheme: dark; }
    html, body { margin: 0; padding: 14px; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    *, *::before, *::after { box-sizing: border-box; }
    body { display: flex; align-items: flex-start; justify-content: center; gap: 28px; flex-wrap: wrap; min-height: 100%; }
    .__ab-preview-block { display: flex; align-items: center; justify-content: center; min-width: 80px; }
    ${cssParts.join('\n')}
  </style></head><body>${bodies.join('')}</body></html>`
}
