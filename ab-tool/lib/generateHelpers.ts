/**
 * CSS/Output-Helfer für /api/generate.
 * Extrahiert aus app/api/generate/route.ts (vorher 568 Zeilen Monolith).
 */

import { DELIM_START, DELIM_END, CSS_DELIM_START, CSS_DELIM_END } from '@/lib/generateConstants'

// CSS-Regeln parsen mit Brace-Tiefen-Tracking (kein naiver Split an '}' —
// bricht bei content: "}" oder data:image/svg-URLs mit geschweiften Klammern).
export function splitRules(css: string): string[] {
  const rules: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}') {
      depth--
      if (depth === 0) {
        rules.push(css.slice(start, i + 1))
        start = i + 1
      }
    }
  }
  return rules
}

// CSS-Filterung: Behält nur Regeln, deren Selektoren in original_html vorkommen.
// So bekommt das Modell keine überflüssigen Styles aus dem Seiten-CSS.
export function cssFilterRelevant(html: string | null, css: string | null): string {
  if (!html || !css) return css || '(kein Site-CSS vorhanden)'

  const classes = new Set<string>()
  const ids = new Set<string>()
  const tags = new Set<string>()

  let m: RegExpExecArray | null
  const classRe = /class="([^"]+)"/g
  while ((m = classRe.exec(html)) !== null) {
    m[1].split(/\s+/).forEach(c => classes.add(c))
  }
  const idRe = /id="([^"]+)"/g
  while ((m = idRe.exec(html)) !== null) ids.add(m[1])
  const tagRe = /<\s*(\w+)/g
  while ((m = tagRe.exec(html)) !== null) tags.add(m[1].toLowerCase())

  const rules = splitRules(css).map(r => {
    const brace = r.indexOf('{')
    if (brace === -1) return null
    const selector = r.slice(0, brace).trim()
    const body = r.slice(brace + 1, -1).trim() // -1 entfernt die schließende }
    const selClasses = [...selector.matchAll(/\.([\w-]+)/g)].map(x => x[1])
    const selIds = [...selector.matchAll(/#([\w-]+)/g)].map(x => x[1])
    const selTags = [...selector.matchAll(/(?:^|[+>~\s,])\s*(\w+)/g)].map(x => x[1].toLowerCase()).filter(Boolean)
    const relevant = selClasses.some(c => classes.has(c)) ||
      selIds.some(id => ids.has(id)) ||
      selTags.some(t => tags.has(t))
    return relevant ? `${selector} { ${body} }` : null
  }).filter(Boolean).join('\n')

  return rules || css // Fallback auf komplettes CSS, falls Filter zu aggressiv war
}

// Strukturierter Output per Delimiter: Das Modell wrappt sein HTML zwischen
// <<<VARIANT_HTML>>> und <</VARIANT_HTML>>>. Robuster als Markdown-Code-Fences.
export function parseStructuredOutput(text: string): string {
  const html = text.trim()
  // Primär: Delimiter-Extraktion
  const start = html.indexOf(DELIM_START)
  const end = html.indexOf(DELIM_END)
  if (start !== -1 && end !== -1 && end > start) {
    return html.slice(start + DELIM_START.length, end).trim()
  }
  // Fallback: Markdown-Fences
  const fence = html.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i)
  if (fence) return fence[1].trim()
  return html
}

// CSS-Delimiter für Reorder-Mode: reines CSS ohne HTML-Wrapper.
export function parseCssOutput(text: string): string {
  const css = text.trim()
  const start = css.indexOf(CSS_DELIM_START)
  const end = css.indexOf(CSS_DELIM_END)
  if (start !== -1 && end !== -1 && end > start) {
    return css.slice(start + CSS_DELIM_START.length, end).trim()
  }
  // Fallback: CSS-Code-Fences
  const fence = css.match(/^```(?:css)?\s*([\s\S]*?)\s*```$/i)
  if (fence) return fence[1].trim()
  // Fallback: kein Delimiter, kein Fence → nimm alles als CSS falls es CSS-Syntax hat
  if (/[{]/.test(css) && /}/.test(css)) return css
  return ''
}

// Minimale Output-Validierung: fängt offensichtlich kaputte Generationen, bevor sie
// in die DB geschrieben oder ans Preview gesendet werden.
export function validateOutput(html: string): { valid: boolean; warnings: string[] } {
  const w: string[] = []
  if (!html) w.push('Leeres HTML-Fragment')
  if (!/class="ab-v/.test(html) && !/class='ab-v/.test(html)) w.push('Fehlender .ab-v-Container')
  if (!html.includes('<style>')) w.push('Fehlender <style>-Block (hover/focus braucht einen)')
  if (/<\/?html/i.test(html)) w.push('Enthält <html>-Tag – entfernen')
  if (/```/.test(html)) w.push('Enthält Markdown-Code-Fences – stripFences hat nicht gegriffen')
  if (/<\/?body/i.test(html)) w.push('Enthält <body>-Tag – entfernen')
  return { valid: w.length === 0, warnings: w }
}
