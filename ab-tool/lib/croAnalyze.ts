// Wiederverwendbare CRO-Analyse — extrahiert aus /api/suggestions,
// damit Suggestions-Route und Agent-Tools (/api/agent) dieselbe Logik nutzen.
// Kein Cost-Tracking hier — das machen die Aufrufer (increment_gen_cost RPC).
// Cache-Layer: site_insights vermeidet wiederholte Fetch+Analyze (24h TTL).

import { safeError } from '@/lib/safeLog'
import { redactPII } from '@/lib/pii'
import { supabase } from '@/lib/supabase'

const MODEL = 'gpt-4o-mini'

// Cache-TTL: 24 Stunden. Danach wird die Seite neu analysiert.
const CACHE_TTL_HOURS = 24

// Maximale HTML-Größe für die Analyse: 80KB. Reicht für die Struktur
// (Headlines, CTAs, Layout), spart Token-Kosten und verhindert Timeouts.
const MAX_HTML_BYTES = 80_000

export interface CROSuggestion {
  element: string // "CTA-Button (Hero)"
  original: string // "Get Started"
  variant: string // "Start Free — No Credit Card"
  why: string // CRO-Begründung
  type?: 'text' | 'color' | 'css' | 'layout' // Art der Änderung (für Agent-Variant-Gen)
  selector?: string // CSS-Selector, falls aus dem HTML extrahierbar
}

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
const SECTION_TAGS = /<\/(?:header|main|footer|nav|section|article|aside|form|div)(?:\s[^>]*)?>/gi
const BLOCK_TAGS = /<(header|main|footer|nav|section|article|aside|form|div)(\s[^>]*)?>/gi
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

export const CRO_SYSTEM_PROMPT = `Du bist ein CRO-Spezialist (Conversion Rate Optimization) für A/B-Tests.
Analysiere die bereitgestellte Webseite und schlage 4 konkrete, umsetzbare A/B-Tests vor.

KRITERIEN für deine Analyse:
1. **Headlines & Copy**: Sind die Überschriften nutzenorientiert? Könnte eine andere Formulierung mehr Conversions bringen?
2. **CTAs (Buttons/Links)**: Sind die Call-to-Action-Texte handlungsorientiert? Könnte ein anderer Text, eine andere Farbe oder Platzierung besser konvertieren?
3. **Social Proof**: Fehlen Testimonials, Kundenlogos, Bewertungen oder Nutzerzahlen?
4. **Reibungsverluste**: Zu lange Formulare, unnötige Pflichtfelder, unklare nächste Schritte?
5. **Dringlichkeit & Knappheit**: Fehlen zeitlich begrenzte Angebote oder Verfügbarkeitshinweise?
6. **Vertrauen**: Fehlen Gütesiegel, Garantien, Rückgaberecht-Hinweise?
7. **Above the Fold**: Ist der wichtigste Inhalt ohne Scrollen sichtbar?

REGELN:
- Jeder Vorschlag MUSS sich auf ein konkretes Element der analysierten Seite beziehen.
- Keine generischen Tipps — jeder Vorschlag muss spezifisch zur übergebenen Seite passen.
- Gib NUR valides JSON zurück, kein Markdown, keine Erklärungen.
- Format: ein JSON-Objekt {"suggestions": [...]} mit 4 Objekten, jedes mit
  "element", "original", "variant", "why", "type" und optional "selector".
- "type" ist die Art der Änderung: "text" (Copy-Änderung), "color" (Farbwechsel),
  "css" (Styling-Tweak) oder "layout" (Umordnung/Sichtbarkeit).
- "selector" nur angeben, wenn er sich eindeutig aus dem HTML ableiten lässt
  (id oder eindeutige Klasse). Im Zweifel weglassen.
- "primarySuggestionIndex": der Index (0–3) des EINEN Vorschlags, der den
  größten Conversion-Impact verspricht. Wähle den, der am schnellsten und
  einfachsten umsetzbar ist UND die höchste Conversion-Wirkung hat.
  Bevorzuge: Button/CTA > Headline > Social Proof > Layout.`

// Few-Shot-Beispiel für stabiles JSON-Format
export const FEW_SHOT_EXAMPLE = `Beispiel für eine SaaS-Landingpage:

{
  "suggestions": [
    {
      "element": "H1-Headline",
      "original": "Welcome to Our Platform",
      "variant": "Convert 30% More Visitors — Without Changing Your Stack",
      "why": "Die aktuelle Headline ist generisch. Eine nutzenorientierte Headline mit konkretem Versprechen steigert die Verweildauer und Conversion.",
      "type": "text"
    },
    {
      "element": "CTA-Button (Hero)",
      "original": "Get Started",
      "variant": "Start Free — No Credit Card",
      "why": "Der CTA kommuniziert keine Risikofreiheit. Der Zusatz 'No Credit Card' reduziert die Einstiegshürde und erhöht die Klickrate.",
      "type": "text",
      "selector": "#hero-cta"
    },
    {
      "element": "Pricing-Sektion",
      "original": "Monatliche Abrechnung",
      "variant": "Jährliche Abrechnung als Default + 20% Rabatt-Badge",
      "why": "Jährliche Abrechnung erhöht den Customer Lifetime Value. Ein Rabatt-Badge macht den Vorteil sofort sichtbar.",
      "type": "layout"
    },
    {
      "element": "Footer / Ende der Page",
      "original": "Kein Social Proof vorhanden",
      "variant": "Testimonial-Leiste: 'Bereits 2,000+ Teams optimieren mit uns' + 3 Kundenlogos",
      "why": "Ohne Social Proof fehlt die soziale Bestätigung. Kundenlogos und Nutzerzahlen bauen Vertrauen auf und reduzieren Absprünge.",
      "type": "layout"
    }
  ]
}`

// GPT-4o-mini-Call: Seite analysieren, Suggestions als Array zurückgeben.
// Wirft bei API-/Parse-Fehlern; leeres Array ist ein valides Ergebnis
// (Aufrufer entscheidet, wie er damit umgeht).
export interface AnalyzePageResult {
  suggestions: CROSuggestion[]
  /** 0-basierter Index des AI-gewählten besten Erst-Test-Elements */
  primarySuggestionIndex: number
}

export async function analyzePage(
  html: string,
  structure: string,
  options?: { pageGoal?: string; industry?: string }
): Promise<CROSuggestion[]> {
  const result = await analyzePageWithPrimary(html, structure, options)
  return result.suggestions
}

/** Erweiterte Analyse mit Primary-Suggestion-Index für den neuen Wizard-Flow. */
export async function analyzePageWithPrimary(
  html: string,
  structure: string,
  options?: { pageGoal?: string; industry?: string }
): Promise<AnalyzePageResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY missing')

  const context: string[] = []
  if (options?.pageGoal) context.push(`Conversion-Ziel der Seite: ${options.pageGoal}`)
  if (options?.industry) context.push(`Branche: ${options.industry}`)

  const prompt = [
    'Analysiere diese Webseite und schlage 4 spezifische A/B-Tests vor.',
    ...(context.length ? ['', ...context] : []),
    '',
    'SEITEN-STRUKTUR (extrahiert):',
    structure || '(keine Struktur extrahierbar)',
    '',
    'SEITEN-HTML (gekürzt, ohne Scripts/Styles):',
    html,
    '',
    'Gib NUR das JSON-Objekt {"suggestions": [...]} mit 4 Vorschlägen zurück. Kein Markdown, kein wrapping.',
  ].join('\n')

  const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(45_000), // 45s — maxDuration der Route ist 60s
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: CRO_SYSTEM_PROMPT },
        { role: 'user', content: FEW_SHOT_EXAMPLE },
        { role: 'assistant', content: '{"suggestions":[...]}' }, // acknowledge example
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    }),
  })

  if (!aiRes.ok) {
    const errText = await aiRes.text().catch(() => '')
    safeError('croAnalyze-openai-error', { message: `status ${aiRes.status}: ${errText.slice(0, 300)}` })
    throw new Error('AI generation failed')
  }

  const json = await aiRes.json() as { choices: Array<{ message: { content: string } }> }
  const raw = json.choices?.[0]?.message?.content
  if (!raw) throw new Error('Empty AI response')

  // Parse JSON (mit Fallback für Markdown-Fences)
  let parsed: { suggestions?: CROSuggestion[]; primarySuggestionIndex?: number }
  try {
    const cleaned = raw.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    safeError('croAnalyze-parse-error', { message: raw.slice(0, 300) })
    throw new Error('Failed to parse AI response')
  }

  const suggestions = (parsed.suggestions ?? []).slice(0, 4)
  const primarySuggestionIndex = typeof parsed.primarySuggestionIndex === 'number'
    && parsed.primarySuggestionIndex >= 0
    && parsed.primarySuggestionIndex < suggestions.length
    ? parsed.primarySuggestionIndex
    : 0 // Fallback: erstes Element

  return { suggestions, primarySuggestionIndex }
}

// ─── Cache-Layer: site_insights als Analyse-Cache ───

// Prüft ob für userId+pageUrl eine frische Analyse (< 24h) in site_insights liegt.
// Gibt die gespeicherten CRO-Vorschläge zurück oder null bei Cache-Miss.
export async function getCachedInsights(
  userId: string,
  pageUrl: string
): Promise<{ suggestions: CROSuggestion[]; analyzedAt: string; testResults?: Record<string, unknown>[] } | null> {
  const { data } = await supabase
    .from('site_insights')
    .select('top_opportunities, analyzed_at, test_results_json')
    .eq('user_id', userId)
    .eq('page_url', pageUrl)
    .maybeSingle()

  if (!data?.top_opportunities || !data?.analyzed_at) return null

  const age = Date.now() - new Date(data.analyzed_at).getTime()
  if (age > CACHE_TTL_HOURS * 3_600_000) return null

  return {
    suggestions: data.top_opportunities as CROSuggestion[],
    analyzedAt: data.analyzed_at,
    testResults: (data.test_results_json as Record<string, unknown>[]) ?? undefined,
  }
}

// Schreibt Analyse-Ergebnisse in site_insights (upsert via unique constraint).
// Überschreibt existierende Einträge — analyzed_at wird aktualisiert.
export async function cacheInsights(
  userId: string,
  pageUrl: string,
  suggestions: CROSuggestion[],
  meta?: { structure?: string; title?: string; industry?: string; pageGoal?: string }
): Promise<void> {
  const hostname = new URL(pageUrl).hostname.replace(/^www\./, '')

  const { error } = await supabase.from('site_insights').upsert({
    user_id: userId,
    domain: hostname,
    page_url: pageUrl,
    top_opportunities: suggestions,
    analysis_json: meta ? { structure: meta.structure, title: meta.title } : null,
    detected_industry: meta?.industry ?? null,
    page_goal: meta?.pageGoal ?? null,
    analyzed_at: new Date().toISOString(),
  }, { onConflict: 'user_id, domain, page_url' })

  if (error) safeError('cacheInsights-upsert', error)
}
