// CSS-Seite der Onboarding-Preview (lib/previewAnalyze.ts): Deklarationen der
// KI entschärfen, Live-CSS (variant_b_css) und Highlight-Deko bauen.

import { sanitizeCss } from '@/lib/sanitize'
import type { PreviewChange } from '@/lib/previewAnalyze'

// Eigenschaften die Layout oder Sichtbarkeit der Fremdseite zerlegen können
// (Plan §5, "AI schreibt CSS das nicht funktioniert").
const BANNED_PROPERTY = /^(?:position|z-index|content|behavior|transform|animation|transition|inset|top|right|bottom|left|float|clip|clip-path|pointer-events|will-change|filter|backdrop-filter)$/
const BANNED_VALUE = /(?:expression\s*\(|javascript:|vbscript:|<\/?\s*style)/i

/**
 * Zerlegt die Deklarationsliste, wirft verbotene Properties/Werte raus und
 * hängt !important an — das braucht es, um gegen die Original-Styles der Seite
 * durchzukommen.
 */
export function sanitizeDeclarations(css: string): string {
  const cleaned = sanitizeCss(css).replace(/[{}]/g, '')
  const decls: string[] = []

  for (const part of splitDeclarations(cleaned)) {
    const idx = part.indexOf(':')
    if (idx < 1) continue
    const prop = part.slice(0, idx).trim().toLowerCase()
    let value = part.slice(idx + 1).trim()
    if (!prop || !value) continue
    if (!/^[a-z-]+$/.test(prop)) continue
    if (BANNED_PROPERTY.test(prop)) continue
    if (BANNED_VALUE.test(value)) continue

    // display: none / visibility: hidden würden das Element aus der Variante
    // löschen — kein A/B-Test, sondern ein kaputter Screenshot.
    if (prop === 'display' && !/^(?:block|inline|inline-block|flex|inline-flex|grid)$/i.test(value)) continue
    if (prop === 'visibility' && !/^visible$/i.test(value)) continue
    if (prop === 'opacity' && Number(value) === 0) continue

    value = value.replace(/\s*!\s*important\s*$/i, '')
    if (!value) continue

    decls.push(`${prop}: ${value} !important`)
  }

  return decls.join('; ')
}

// Splittet an ';' — aber nicht innerhalb von rgb(…), var(…, …) o. ä.
function splitDeclarations(css: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of css) {
    if (ch === '(') depth++
    else if (ch === ')') depth = Math.max(0, depth - 1)
    if (ch === ';' && depth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) parts.push(current)
  return parts.map((p) => p.trim()).filter(Boolean)
}

// ─── CSS-Erzeugung ───

/** Live-CSS: exakt die Änderungen, sonst nichts. Landet als variant_b_css in der DB. */
export function buildInjectedCss(changes: PreviewChange[]): string {
  return changes.map((c) => `${c.selector} { ${c.css}; }`).join('\n')
}

/**
 * Preview-CSS für den Variant-Screenshot: Live-CSS + Highlight-Outlines, damit
 * der User im A/B-Toggle SIEHT was sich geändert hat, statt "spot the difference"
 * zu spielen. Wird nur an urlbox geschickt und NIE gespeichert.
 *
 * Die Pulse-Animation läuft im Screenshot natürlich nicht — sie ist für den Fall
 * da, dass dasselbe CSS mal in einem Live-Kontext gerendert wird; der Endzustand
 * (forwards) ist die sichtbare Outline.
 */
export function buildHighlightCss(changes: PreviewChange[]): string {
  const highlights = changes
    .map(
      (c) => `${c.selector} {
  outline: 3px solid ${c.highlightColor} !important;
  outline-offset: 4px !important;
  box-shadow: 0 0 20px ${c.highlightColor}66 !important;
  animation: variante-highlight-pulse 2s ease-out forwards !important;
}`
    )
    .join('\n')

  const keyframes = `@keyframes variante-highlight-pulse {
  0%   { outline-color: transparent; }
  35%  { outline-color: #fff; }
  100% { outline-color: currentColor; }
}`

  return `${buildInjectedCss(changes)}\n\n${keyframes}\n${highlights}`
}
