/**
 * mergeVariantEdits — Merged User-Edits mit dem KI-Vorschlag.
 *
 * Strategie:
 * - User-Edits überschreiben immer die KI-Werte
 * - Nicht editierte Properties bleiben vom KI-Vorschlag
 * - Wenn der User text geändert hat → variant_html wird aktualisiert
 * - Wenn der User CSS-Properties geändert hat → variant_css wird neu generiert
 *
 * Diese Funktion ist rein (keine Side-Effects) und testbar.
 */

import type { UserEdits } from './types'
import type { VariantResult } from '../NewTestDrawer'

export interface MergeResult {
  variant_html?: string
  variant_css?: string
}

/**
 * Extrahiert den Text aus variant_html (entfernt HTML-Tags).
 * Fallback: variant-Feld (reiner Text).
 */
function extractText(result: VariantResult): string | undefined {
  if (result.variant_html) {
    // Entferne HTML-Tags, behalte den reinen Text
    const text = result.variant_html.replace(/<[^>]*>/g, '').trim()
    if (text) return text
  }
  return result.variant || undefined
}

/**
 * Parst existierendes variant_css nach bekannten Properties.
 * Gibt ein Partial<UserEdits> mit gefundenen Werten zurück.
 *
 * Achtung: Verwendet einfaches Regex-Parsing — kein CSS-Parser.
 * Funktioniert zuverlässig für KI-generiertes CSS mit bekannten Properties.
 */
export function parseCssToEdits(css: string): Partial<UserEdits> {
  const edits: Partial<UserEdits> = {}

  const bgMatch = css.match(/background-color:\s*([^;]+)/)
  if (bgMatch) edits.bgColor = bgMatch[1].trim()

  // text-color: match 'color:' only when NOT preceded by 'background-' or 'border-'
  const colorMatch = css.match(/^\s*color:\s*([^;]+)/m)
  if (colorMatch) edits.textColor = colorMatch[1].trim()

  const fontSizeMatch = css.match(/font-size:\s*(\d+)px/)
  if (fontSizeMatch) edits.fontSize = parseInt(fontSizeMatch[1], 10)

  const fontWeightMatch = css.match(/font-weight:\s*(\d+)/)
  if (fontWeightMatch) edits.fontWeight = parseInt(fontWeightMatch[1], 10)

  const radiusMatch = css.match(/border-radius:\s*(\d+)px/)
  if (radiusMatch) edits.borderRadius = parseInt(radiusMatch[1], 10)

  const paddingMatch = css.match(/padding:\s*(\d+)px\s+(\d+)px/)
  if (paddingMatch) {
    edits.paddingY = parseInt(paddingMatch[1], 10)
    edits.paddingX = parseInt(paddingMatch[2], 10)
  }

  const borderWidthMatch = css.match(/border-width:\s*(\d+)px/)
  if (borderWidthMatch) edits.borderWidth = parseInt(borderWidthMatch[1], 10)

  const borderColorMatch = css.match(/border-color:\s*([^;]+)/)
  if (borderColorMatch) edits.borderColor = borderColorMatch[1].trim()

  return edits
}

/**
 * Parst CSS-String in React.CSSProperties für die Live-Preview.
 * Nutzt parseCssToEdits intern — keine duplizierte Logik.
 */
export function parseCssToStyle(css: string): React.CSSProperties {
  const edits = parseCssToEdits(css)
  const style: React.CSSProperties = {}

  if (edits.bgColor) style.backgroundColor = edits.bgColor
  if (edits.textColor) style.color = edits.textColor
  if (edits.fontSize) style.fontSize = edits.fontSize
  if (edits.fontWeight) style.fontWeight = edits.fontWeight
  if (edits.borderRadius) style.borderRadius = edits.borderRadius
  if (edits.paddingX !== undefined || edits.paddingY !== undefined) {
    const py = edits.paddingY ?? 12
    const px = edits.paddingX ?? 24
    style.paddingTop = py
    style.paddingBottom = py
    style.paddingLeft = px
    style.paddingRight = px
  }
  if (edits.borderWidth) style.borderWidth = edits.borderWidth
  if (edits.borderColor) style.borderColor = edits.borderColor

  return style
}

/**
 * Initialisiert UserEdits aus einem VariantResult.
 * Extrahiert Text aus variant_html/variant und CSS-Werte aus variant_css.
 */
export function initializeEditsFromVariant(result: VariantResult): UserEdits {
  const edits: UserEdits = {}

  const text = extractText(result)
  if (text) edits.text = text

  if (result.variant_css) {
    const parsed = parseCssToEdits(result.variant_css)
    Object.assign(edits, parsed)
  }

  return edits
}

/**
 * Merged User-Edits mit dem KI-Original.
 *
 * @param edits - Die User-Edits (nur geänderte Properties)
 * @param originalResult - Das originale KI-Ergebnis
 * @param selector - CSS-Selector des Elements (für variant_css)
 * @returns Gemergte variant_html und variant_css
 */
export function mergeVariantEdits(
  edits: UserEdits,
  originalResult: VariantResult,
  selector: string,
): MergeResult {
  const result: MergeResult = {}

  // ─── Text / variant_html ───
  if (edits.text) {
    // Wenn das Original HTML hatte, versuche den Text darin zu ersetzen
    if (originalResult.variant_html) {
      const originalText = extractText(originalResult)
      if (originalText && originalResult.variant_html.includes(originalText)) {
        result.variant_html = originalResult.variant_html.replace(originalText, edits.text)
      } else {
        result.variant_html = edits.text
      }
    } else {
      result.variant_html = edits.text
    }
  } else if (originalResult.variant_html) {
    result.variant_html = originalResult.variant_html
  }

  // ─── CSS ───
  const cssParts: string[] = []

  if (edits.bgColor) cssParts.push(`  background-color: ${edits.bgColor};`)
  if (edits.textColor) cssParts.push(`  color: ${edits.textColor};`)
  if (edits.fontSize) cssParts.push(`  font-size: ${edits.fontSize}px;`)
  if (edits.fontWeight) cssParts.push(`  font-weight: ${edits.fontWeight};`)
  if (edits.borderRadius) cssParts.push(`  border-radius: ${edits.borderRadius}px;`)
  if (edits.paddingX !== undefined || edits.paddingY !== undefined) {
    const py = edits.paddingY ?? 12
    const px = edits.paddingX ?? 24
    cssParts.push(`  padding: ${py}px ${px}px;`)
  }
  if (edits.borderWidth) cssParts.push(`  border-width: ${edits.borderWidth}px;`)
  if (edits.borderColor) cssParts.push(`  border-color: ${edits.borderColor};`)

  if (cssParts.length > 0) {
    result.variant_css = `${selector} {\n${cssParts.join('\n')}\n}`
  } else if (originalResult.variant_css) {
    result.variant_css = originalResult.variant_css
  }

  return result
}
