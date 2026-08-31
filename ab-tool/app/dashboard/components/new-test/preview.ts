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

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    let css = sanitizeCss(b.css ?? '')
    let html = b.html || ''
    if (b.scopeToSelector) {
      css = scopeCssForPreview(css, b.selector)
      // A→B-Adoption nur im A/B-Vergleich (Block 0 = A); Einzel-Vorschauen
      // (StepReview) haben kein A zum Erben.
      const aHtml = i > 0 ? blocks[0].html ?? '' : ''
      html = markPreviewRoot(adoptPresentationPreview(aHtml, html))
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
