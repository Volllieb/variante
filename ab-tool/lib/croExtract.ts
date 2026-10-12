// HTML-Aufbereitung für die CRO-Analyse: Struktur, Style-Kontext und
// DOM-verifizierte Element-Kandidaten. Reine Funktionen, kein OpenAI, keine DB.
// Genutzt von lib/croAnalyze.ts, lib/agentTools.ts und den Scan-/Suggestion-Routen.

import * as cheerio from 'cheerio'
import { safeError } from '@/lib/safeLog'
import { redactPII } from '@/lib/pii'
import { extractRelevantElements } from '@/lib/extractPageCode'

// Maximale HTML-Größe für die Analyse: 80KB. Reicht für die Struktur
// (Headlines, CTAs, Layout), spart Token-Kosten und verhindert Timeouts.
const MAX_HTML_BYTES = 80_000

// Nur relevante HTML-Elemente für CRO-Analyse: body-Inhalt ohne scripts/styles.
// Entfernt alles was Token kostet aber keine CRO-Insights liefert.
export function stripForCRO(html: string): string {
  let cleaned = html
  // Entferne script-Tags komplett
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, '')
  // Entferne style-Tags komplett
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, '')
  // Entferne inline-CSS in style-Attributen (reduziert Token, nicht CRO-relevant)
  cleaned = cleaned.replace(/\sstyle="[^"]*"/gi, '')
  // Entferne SVG-Inhalte
  cleaned = cleaned.replace(/<svg[\s\S]*?<\/svg>/gi, '[SVG]')
  // Entferne data:-URIs und base64
  cleaned = cleaned.replace(/src="data:[^"]*"/gi, 'src="[embedded]"')
  cleaned = cleaned.replace(/srcset="[^"]*"/gi, 'srcset="[removed]"')
  // Entferne überflüssige Whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
  // Entferne Kommentare
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '')
  // PII-Redaktion (DSGVO/GDPR): Emails, Telefonnummern etc. durch Platzhalter ersetzen
  cleaned = redactPII(cleaned)
  return cleaned.slice(0, MAX_HTML_BYTES)
}

// DOM-Baum als strukturierte Page-Map: Hierarchie, CSS-Klassen, IDs, interaktive Elemente.
// Format: SECTION/HEADER/NAV/... mit eingerückten Kindern. CSS-Klassen nach Tag-Name.
// Max 3 Ebenen tief, ~5000 Zeichen. Gibt dem LLM visuellen und semantischen Kontext.
const MAX_STRUCTURE_CHARS = 5000

function attrVal(tag: string, attr: string): string {
  const m = tag.match(new RegExp(`${attr}="([^"]*)"`, 'i'))
  return m?.[1] ?? ''
}

function classStr(tag: string): string {
  const cls = attrVal(tag, 'class')
  if (!cls) return ''
  // Kürze lange Klassenlisten: nimm max 6 wichtigste
  const parts = cls.split(/\s+/).filter(Boolean)
  if (parts.length <= 6) return `.${parts.join('.')}`
  return `.${parts.slice(0, 5).join('.')}.…`
}

function idStr(tag: string): string {
  const id = attrVal(tag, 'id')
  return id ? `#${id}` : ''
}

function cleanText(raw: string): string {
  return raw.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 120)
}

// Extrahiert TAG[attr=val].class1.class2#id: "text content" Zeilen für Layout-Elemente
function extractBlockLines(innerHtml: string, depth: number): string[] {
  const lines: string[] = []
  const indent = '  '.repeat(depth)
  if (depth > 2) return lines // Max 3 Ebenen (0,1,2)

  // Headings h1-h6
  const headingRe = /<(h[1-6])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi
  let hm: RegExpExecArray | null
  while ((hm = headingRe.exec(innerHtml)) !== null) {
    const htag = hm[1]
    const attrs = hm[2] || ''
    const text = cleanText(hm[3])
    if (!text) continue
    const id = idStr(attrs)
    const cls = classStr(attrs)
    lines.push(`${indent}${htag.toUpperCase()}${id}${cls}: "${text}"`)
    if (lines.length * 80 > MAX_STRUCTURE_CHARS) return lines
  }

  // Buttons
  const btnRe = /<(button)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi
  let bm: RegExpExecArray | null
  while ((bm = btnRe.exec(innerHtml)) !== null) {
    const text = cleanText(bm[3])
    if (!text) continue
    const cls = classStr(bm[2] || '')
    const id = idStr(bm[2] || '')
    lines.push(`${indent}BUTTON${id}${cls}: "${text}"`)
    if (lines.length * 80 > MAX_STRUCTURE_CHARS) return lines
  }

  // Links (max 8 pro Ebene)
  const linkRe = /<(a)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi
  let lm: RegExpExecArray | null
  let linkCount = 0
  while ((lm = linkRe.exec(innerHtml)) !== null && linkCount < 8) {
    const text = cleanText(lm[3])
    const href = attrVal(lm[2] || '', 'href')
    if (!text || text === '#' || !href) continue
    linkCount++
    const cls = classStr(lm[2] || '')
    const id = idStr(lm[2] || '')
    const shortHref = href.replace(/^https?:\/\/[^/]+/, '').slice(0, 60)
    lines.push(`${indent}A[href=${shortHref}]${id}${cls}: "${text}"`)
    if (lines.length * 80 > MAX_STRUCTURE_CHARS) return lines
  }

  // Bilder (max 5)
  const imgRe = /<img(\s[^>]*?)\/?>/gi
  let im: RegExpExecArray | null
  let imgCount = 0
  while ((im = imgRe.exec(innerHtml)) !== null && imgCount < 5) {
    const attrs = im[1]
    const alt = attrVal(attrs, 'alt')
    const src = attrVal(attrs, 'src').replace(/^data:[^;]+;base64,[^"']*/, '[base64]').slice(0, 50)
    if (!src && !alt) continue
    imgCount++
    const cls = classStr(attrs)
    lines.push(`${indent}IMG[src=${src || '—'}]${alt ? `[alt=${alt.slice(0, 60)}]` : ''}${cls}`)
    if (lines.length * 80 > MAX_STRUCTURE_CHARS) return lines
  }

  // Form-Elemente
  const inputRe = /<(input|textarea|select)(\s[^>]*?)\/?>/gi
  let fm: RegExpExecArray | null
  while ((fm = inputRe.exec(innerHtml)) !== null) {
    const tag = fm[1]
    const attrs = fm[2]
    const type = attrVal(attrs, 'type') || 'text'
    const placeholder = attrVal(attrs, 'placeholder')
    const name = attrVal(attrs, 'name') || attrVal(attrs, 'id')
    const label = placeholder || name || type
    lines.push(`${indent}${tag.toUpperCase()}[type=${type}]${name ? `[name=${name}]` : ''}: "${label.slice(0, 80)}"`)
    if (lines.length * 80 > MAX_STRUCTURE_CHARS) return lines
  }

  // Labels
  const labelRe = /<(label)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi
  let lblm: RegExpExecArray | null
  while ((lblm = labelRe.exec(innerHtml)) !== null) {
    const text = cleanText(lblm[3])
    if (!text) continue
    lines.push(`${indent}LABEL: "${text}"`)
  }

  // P-Texte (nur wenn substanziell, max 5 pro Ebene)
  const pRe = /<(p)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi
  let pm: RegExpExecArray | null
  let pCount = 0
  while ((pm = pRe.exec(innerHtml)) !== null && pCount < 5) {
    const text = cleanText(pm[3])
    if (!text || text.length < 30) continue
    pCount++
    const cls = classStr(pm[2] || '')
    lines.push(`${indent}P${cls}: "${text.slice(0, 150)}"`)
    if (lines.length * 80 > MAX_STRUCTURE_CHARS) return lines
  }

  return lines
}

export function extractStructure(html: string): string {
  // Titel & Meta separat
  const header: string[] = []
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]
  if (title) header.push(`PAGE: "${title.trim()}"`)
  const desc = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1]
  if (desc) header.push(`DESC: "${desc.trim()}"`)

  // Finde alle Container-Blöcke und ihre Positionen
  interface Block {
    tag: string
    attrs: string
    start: number
    end: number
    children: string[]
  }
  const blocks: Block[] = []

  // Suche alle öffnenden Container-Tags
  const openRe = /<(header|main|footer|nav|section|article|aside|form|div)(\s[^>]*)?>/gi
  let om: RegExpExecArray | null
  while ((om = openRe.exec(html)) !== null) {
    const tag = om[1]
    const attrs = om[2] || ''
    // Nur Container mit id, role, oder meaningful class behalten
    const id = attrVal(attrs, 'id')
    const cls = attrVal(attrs, 'class')
    const role = attrVal(attrs, 'role')
    // div nur behalten wenn es id oder semantische Klasse hat
    if (tag === 'div' && !id && !role && !cls) continue
    // Überspringe reine Layout-Divs (nur utility classes wie "flex", "grid", "container" etc)
    if (tag === 'div' && cls && /^(flex|grid|container|row|col|wrap|block|inline|relative|absolute|w-|h-|m[tblrxy]?-|p[tblrxy]?-|gap-|space-)/.test(cls) && !id) continue

    // Finde das passende Closing-Tag (naiv: nächstes </tag>)
    const closeRe = new RegExp(`<\\/${tag}\\s*>`, 'gi')
    closeRe.lastIndex = om.index + om[0].length
    const cm = closeRe.exec(html)
    if (!cm) continue

    blocks.push({ tag, attrs, start: om.index, end: cm.index + cm[0].length, children: [] })
  }

  // Filtere: nur Top-Level und direkte Kinder (kein Block liegt komplett in einem anderen)
  const topBlocks = blocks.filter(b => {
    return !blocks.some(other => other !== b && other.start < b.start && other.end > b.end)
  })

  // Für jeden Top-Level-Block: extrahiere inline-Elemente (headings, buttons, links, images)
  const lines: string[] = [...header, '']
  for (const block of topBlocks) {
    const id = idStr(block.attrs)
    const cls = classStr(block.attrs)
    const role = attrVal(block.attrs, 'role')
    const label = role ? `[role=${role}]` : ''
    lines.push(`${block.tag.toUpperCase()}${id}${label}${cls}`)

    // Extrahiere Inhalt dieses Blocks
    const inner = html.slice(block.start + block.attrs.length + block.tag.length + 2, html.indexOf(`</${block.tag}>`, block.start))
    const childLines = extractBlockLines(inner, 1)
    lines.push(...childLines)

    // Suche rekursiv Sub-Container innerhalb dieses Blocks
    const subRe = /<(section|article|aside|nav|form|div)(\s[^>]*)?>/gi
    subRe.lastIndex = 0
    let sm: RegExpExecArray | null
    while ((sm = subRe.exec(inner)) !== null) {
      const stag = sm[1]
      const sattrs = sm[2] || ''
      const sid = attrVal(sattrs, 'id')
      const scls = attrVal(sattrs, 'class')
      if (stag === 'div' && !sid && !scls) continue
      if (stag === 'div' && scls && /^(flex|grid|container|row|col|wrap|block|inline|relative|absolute|w-|h-|m[tblrxy]?-|p[tblrxy]?-|gap-|space-)/.test(scls) && !sid) continue

      const scloseRe = new RegExp(`<\\/${stag}\\s*>`, 'gi')
      scloseRe.lastIndex = sm.index + sm[0].length
      const scm = scloseRe.exec(inner)
      if (!scm) continue

      const srole = attrVal(sattrs, 'role')
      lines.push(`  ${stag.toUpperCase()}${sid ? `#${sid}` : ''}${srole ? `[role=${srole}]` : ''}${classStr(sattrs)}`)
      const subInner = inner.slice(sm.index + sm[0].length, scm.index)
      const subLines = extractBlockLines(subInner, 2)
      lines.push(...subLines)

      if (lines.join('\n').length > MAX_STRUCTURE_CHARS) break
    }

    if (lines.join('\n').length > MAX_STRUCTURE_CHARS) break
  }

  return lines.join('\n').slice(0, MAX_STRUCTURE_CHARS)
}

// Extrahiert CSS/Farb-Kontext für Variant-Generierung. Gibt dem LLM Infos über
// existierende Design-Tokens, Farbpalette und CSS-Klassen-Muster.
// Wird an generateVariantText als pageContext übergeben.
export function extractStyleContext(html: string): string {
  const parts: string[] = []

  // 1. CSS Custom Properties aus <style>-Tags
  const styleBlocks = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi)
  if (styleBlocks) {
    const props = new Set<string>()
    for (const block of styleBlocks) {
      const inner = block.replace(/<\/?style[^>]*>/gi, '')
      const varRe = /(--[\w-]+)\s*:\s*([^;]+)/g
      let vm: RegExpExecArray | null
      while ((vm = varRe.exec(inner)) !== null) {
        props.add(`${vm[1]}: ${vm[2].trim().slice(0, 40)}`)
      }
    }
    if (props.size > 0) {
      const list = [...props].slice(0, 15)
      parts.push(`Design-Tokens (CSS-Vars):\n  ${list.join('\n  ')}${props.size > 15 ? `\n  … +${props.size - 15} more` : ''}`)
    }
  }

  // 2. Tailwind-ähnliche Klassen-Muster erkennen (häufigste prefixes)
  const classPatterns = new Map<string, number>()
  const clsRe = /class="([^"]*)"/gi
  let cm: RegExpExecArray | null
  while ((cm = clsRe.exec(html)) !== null) {
    for (const c of cm[1].split(/\s+/)) {
      const prefix = c.split('-')[0]
      if (prefix.length >= 2) classPatterns.set(prefix, (classPatterns.get(prefix) ?? 0) + 1)
    }
  }
  if (classPatterns.size > 0) {
    const topPatterns = [...classPatterns.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    parts.push(`Häufigste Klassen-Präfixe (→ Framework-Hinweis): ${topPatterns.map(([k, v]) => `${k}(${v}×)`).join(', ')}`)
  }

  // 3. Farbpalette aus inline-Styles und style-Tags (Hex, rgb, hsl)
  const colors = new Set<string>()
  const colorRe = /(?:color|background|background-color|border-color|fill|stroke)\s*:\s*(#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|hsl\([^)]+\))/gi
  let colm: RegExpExecArray | null
  while ((colm = colorRe.exec(html)) !== null) {
    colors.add(colm[1].toLowerCase())
  }
  if (colors.size > 0) {
    parts.push(`Farbpalette (${colors.size} Farben): ${[...colors].slice(0, 12).join(', ')}${colors.size > 12 ? ' …' : ''}`)
  }

  // 4. Key-Elemente mit IDs und Klassen (für CSS-Selektoren)
  const keyElements: string[] = []
  const keyRe = /<(button|a|h[1-3]|input|form|section|header|nav)(\s[^>]*)?>/gi
  let km: RegExpExecArray | null
  while ((km = keyRe.exec(html)) !== null) {
    const tag = km[1]
    const attrs = km[2] || ''
    const id = attrVal(attrs, 'id')
    const cls = attrVal(attrs, 'class')
    if (id) {
      const text = cleanText(html.slice(km.index, html.indexOf(`</${tag}>`, km.index)))
      keyElements.push(`${tag}#${id}${cls ? `.${cls.split(/\s+/).slice(0, 3).join('.')}` : ''}${text ? ` → "${text.slice(0, 60)}"` : ''}`)
    }
    if (keyElements.length >= 15) break
  }
  if (keyElements.length > 0) {
    parts.push(`Elemente mit ID (für Selektoren):\n  ${keyElements.join('\n  ')}`)
  }

  return parts.join('\n\n').slice(0, 3000)
}

// ─── Kandidaten: DOM-verifizierte Elemente statt geratener Selektoren ───

/** Ein Element, das der Scan wirklich testen kann. */
export interface ElementCandidate {
  selector: string
  text: string
  tag: string
  kind: 'cta' | 'heading' | 'text' | 'form'
}

/**
 * Baut die Kandidatenliste aus dem HTML — jeder Selektor ist gegen den
 * geparsten DOM verifiziert (genau ein Treffer) und stammt nicht vom Modell.
 *
 * Warum ueberhaupt: Das Modell hat Selektoren frei erfunden. Gemessen an vier
 * realen Seiten kam bei drei von vier Vorschlaegen gar keiner zurueck, und der
 * eine, der kam, war ein href ("/signup") statt eines Selektors. Ein Vorschlag
 * ohne Selektor ist im Wizard wertlos: er erzeugt einen Test, der live auf
 * nichts zeigt und still nichts zaehlt.
 */
export function extractCandidates(html: string): ElementCandidate[] {
  try {
    const $ = cheerio.load(html)
    // Textgleiche Kandidaten zusammenfassen: Seiten rendern dieselbe Headline
    // oft mehrfach (Desktop/Mobile, Overlay-Kopien). extractRelevantElements
    // dedupliziert nur ueber den Selektor, das Modell sah also dasselbe Element
    // zweimal — und hat auf stripe.com prompt zwei Vorschlaege fuer dieselbe
    // Headline gebaut. Der erste Treffer gewinnt (DOM-Reihenfolge = eher oben).
    const seenText = new Set<string>()
    const out: ElementCandidate[] = []
    for (const e of extractRelevantElements($)) {
      const key = `${e.kind}:${e.text.toLowerCase().replace(/\s+/g, ' ').trim()}`
      if (seenText.has(key)) continue
      const candidate: ElementCandidate = { selector: e.selector, text: e.text, tag: e.tag, kind: e.kind }
      if (!isTestableCandidate(candidate)) continue
      seenText.add(key)
      out.push(candidate)
    }
    return out
  } catch (err) {
    safeError('croAnalyze-candidates', { message: err instanceof Error ? err.message : String(err) })
    return []
  }
}

/** Sprache der Seite aus <html lang>, sonst null. */
export function detectPageLanguage(html: string): string | null {
  const lang = html.match(/<html[^>]*\slang=["']([a-zA-Z-]{2,8})["']/i)?.[1]
  return lang ? lang.toLowerCase() : null
}

// Reine Navigations-, Consent- und Chrome-Controls. Sie sehen fuer den
// Kandidaten-Extraktor aus wie CTAs (Tag <button>, Klasse "…button…"), taugen
// aber als A/B-Test nichts: auf stripe.com hat das Modell prompt den
// "Zurück"-Button zum besten Test-Element gekuert.
const UTILITY_CONTROL =
  /^(zurück|zurueck|back|next|weiter|vor|previous|close|schliessen|schließen|menu|menü|toggle|open menu|search|suche|skip to (main )?content|zum inhalt springen|accept( all)?|alle akzeptieren|ablehnen|decline|reject( all)?|einstellungen|settings|play|pause|deutsch|english( \(us\))?|language|sprache|share|teilen|copy|kopieren|print|drucken|more|mehr|\d+|[<>«»→←↑↓✕×]+)$/i

// Consent- und Rechts-Links tragen freien Text ("Cookie Preferences",
// "Datenschutzerklärung") und rutschen deshalb an der Exact-Match-Liste vorbei.
// Auf vercel.com hat das Modell "Cookie Preferences" zum besten Test gekuert.
const CONSENT_OR_LEGAL =
  /(cookie|consent|privacy|datenschutz|impressum|imprint|terms|agb|legal|gdpr|dsgvo)/i

function isTestableCandidate(c: ElementCandidate): boolean {
  const text = c.text.trim()
  if (text.length < 2) return false
  if (UTILITY_CONTROL.test(text)) return false
  // Headlines und Fliesstext duerfen ueber Datenschutz reden — nur anklickbare
  // Controls fliegen raus. Der Consent-Link traegt oft keine CTA-Klasse und
  // landet deshalb als kind 'text' in der Liste; die Tag-Pruefung faengt ihn.
  const isControl = c.kind === 'cta' || c.tag === 'a' || c.tag === 'button'
  if (isControl && CONSENT_OR_LEGAL.test(text)) return false
  return true
}
