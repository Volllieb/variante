// Security: Sanitization für KI-generiertes HTML und CSS.
//
// Dieser Code entscheidet, was auf FREMDEN Kundenwebsites im DOM landet:
// /api/resolve liefert variant_b_html/css an ab.js, das es per innerHTML bzw.
// outerHTML injiziert. Ein Bypass hier ist ein Stored XSS bei jedem Kunden —
// und, weil variante sein eigenes Snippet ausliefert, auch im eigenen Dashboard.
//
// ── Warum DOMPurify und nicht mehr Regex (Plan SEC-01) ──
// Die Vorgängerversion arbeitete mit fünf Regexes. `ON_EVENT_RE` verlangte
// Whitespace vor dem Event-Attribut (/\s+on\w+/), HTML erlaubt aber auch `/`
// als Attributtrenner. Empirisch bestätigte Bypässe der alten Fassung:
//
//   <img/src=x/onerror=alert(document.domain)>   -> unverändert durchgelassen
//   <svg/onload=alert(1)>                        -> unverändert durchgelassen
//   <a href=javascript:alert(1)>                 -> Regex verlangte Quotes
//   <a href=&#106;avascript:alert(1)>            -> HTML-Entity
//   <form action=//evil.com>                     -> Tag nicht auf der Blockliste
//   <scr<script>ipt>                             -> ließ ein rohes <script> zurück
//
// Ein Parser ist hier die einzig belastbare Antwort: DOMPurify baut den echten
// DOM auf und serialisiert nur, was die Allowlist erlaubt. Regressionstest:
// __tests__/sanitize.mjs.

import DOMPurify from 'isomorphic-dompurify'
import { sanitizeCssText } from '@/lib/sanitizeCssText'

// Allowlist statt Blockliste: alles, was hier nicht steht, fliegt raus.
// Der Umfang orientiert sich an dem, was der Generator laut Prompt erzeugt
// (app/api/generate/route.ts): ein .ab-v-Container, ein <style>-Block,
// Text, Buttons, Links, Bilder, einfache SVGs.
const ALLOWED_TAGS = [
  'div', 'span', 'p', 'section', 'article', 'header', 'footer', 'main', 'aside',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'button', 'img', 'picture', 'source',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'strong', 'b', 'em', 'i', 'u', 's', 'small', 'mark', 'br', 'hr', 'code', 'pre', 'blockquote',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
  'figure', 'figcaption', 'time', 'abbr', 'label',
  // Der Generator liefert genau EINEN gescopten <style>-Block; ohne ihn gäbe
  // es kein :hover/:focus-visible. Inhalt geht zusätzlich durch sanitizeCss().
  'style',
  'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'g',
  'defs', 'linearGradient', 'radialGradient', 'stop', 'use', 'symbol', 'title', 'text', 'tspan',
]

const ALLOWED_ATTR = [
  'class', 'id', 'style', 'title', 'lang', 'dir', 'role',
  'href', 'target', 'rel',
  'src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading', 'decoding',
  'colspan', 'rowspan', 'scope', 'datetime', 'for',
  // SVG
  'viewBox', 'xmlns', 'fill', 'stroke', 'stroke-width', 'stroke-linecap',
  'stroke-linejoin', 'stroke-dasharray', 'd', 'cx', 'cy', 'r', 'rx', 'ry',
  'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points', 'transform', 'opacity',
  'fill-opacity', 'stroke-opacity', 'offset', 'stop-color', 'gradientUnits',
  'preserveAspectRatio', 'aria-hidden', 'aria-label', 'aria-labelledby', 'aria-describedby',
]

// DOMPurify normalisiert Attributnamen auf Kleinschreibung, bevor es sie gegen
// ALLOWED_ATTR prüft. Ohne diese Zeile fällt jedes camelCase-SVG-Attribut
// (viewBox, preserveAspectRatio, gradientUnits) still raus und generierte
// Icons rendern als leere Boxen.
const ALLOWED_ATTR_NORMALIZED = ALLOWED_ATTR.map((a) => a.toLowerCase())

// Erlaubte URL-Schemata für href/src/xlink:href.
// http(s), mailto, tel, Fragmente, relative Pfade, data:image.
// Kein javascript:, kein data:text/html.
const SAFE_URL_RE =
  /^(?:https?:\/\/|mailto:|tel:|\/|\.\/|\.\.\/|#|data:image\/(?:png|jpe?g|gif|webp|svg\+xml);base64,)/i
const URL_ATTRS = ['href', 'src', 'xlink:href', 'srcset']

// Zwei Lücken, die DOMPurify mit Standardkonfiguration offen lässt und die
// beide vom Regressionstest belegt sind:
//
//  1. Inline-style wird nicht inhaltlich geprüft —
//     style="background:url(javascript:alert(1))" käme unverändert durch.
//  2. Die eingebaute IS_ALLOWED_URI ist bewusst permissiv (u. a. um beliebige
//     Nicht-URL-Attributwerte durchzulassen). Wir wollen für echte URL-
//     Attribute eine engere Schema-Allowlist.
//
// Beides über ALLOWED_URI_REGEXP zu lösen funktioniert NICHT: die Option wird
// von DOMPurify gegen *jeden* Attributwert getestet, nicht nur gegen URLs —
// rel="noopener" und viewBox="0 0 24 24" fielen damit ebenfalls raus.
// Der Hook trifft daher gezielt nur die URL-Attribute.
let hookRegistered = false
function ensureAttributeHooks() {
  if (hookRegistered) return
  hookRegistered = true
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    const el = node as Element
    if (typeof el.getAttribute !== 'function') return

    const style = el.getAttribute('style')
    if (style) {
      const cleaned = sanitizeCssText(style)
      if (cleaned.trim()) el.setAttribute('style', cleaned)
      else el.removeAttribute('style')
    }

    for (const attr of URL_ATTRS) {
      const value = el.getAttribute(attr)
      if (value === null) continue
      // Whitespace und Steuerzeichen raus, bevor geprüft wird: ein Tab mitten
      // in "java<TAB>script:" ist für den Browser ein gültiges javascript:.
      // Nur für die Prüfung — gespeichert wird der Originalwert.
      const normalized = value.replace(/[\u0000-\u0020]/g, '')
      if (!SAFE_URL_RE.test(normalized)) el.removeAttribute(attr)
    }
  })
}

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return ''
  ensureAttributeHooks()
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTR_NORMALIZED,
    // Explizit, auch wenn die Allowlist sie ohnehin nicht enthält — macht die
    // Absicht im Code sichtbar und überlebt ein späteres Aufweichen der Liste.
    FORBID_TAGS: [
      'script', 'iframe', 'object', 'embed', 'base', 'meta', 'link',
      'form', 'input', 'textarea', 'select', 'noscript', 'template',
    ],
    FORBID_ATTR: ['formaction', 'srcdoc', 'ping'],
    // Kein USE_PROFILES: die Option ÜBERSCHREIBT ALLOWED_TAGS/ALLOWED_ATTR
    // vollständig. Zusammen gesetzt wäre die Allowlist oben wirkungslos.
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: true,
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
  })
  // Der <style>-Inhalt kommt aus demselben LLM-Output und wird von DOMPurify
  // nicht inhaltlich geprüft — separat durch sanitizeCssText schicken.
  return clean.replace(
    /<style\b([^>]*)>([\s\S]*?)<\/style>/gi,
    (_m, attrs: string, css: string) => `<style${attrs}>${sanitizeCssText(css)}</style>`
  )
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------
// Die Regeln liegen in lib/sanitizeCssText.ts, damit die Preview-Komponenten im
// Dashboard sie importieren koennen, ohne DOMPurify/jsdom in den Client-Bundle
// zu ziehen. Hier nur der Re-Export, damit bestehende Aufrufer und
// __tests__/sanitize.mjs unveraendert `sanitizeCss` aus lib/sanitize importieren.
export { sanitizeCssText as sanitizeCss } from '@/lib/sanitizeCssText'
