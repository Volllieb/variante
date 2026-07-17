// Server-seitige Code-Extraktion für das Hybrid-Onboarding (Plan §0b, "Option A").
//
// Warum: Wenn GPT nur einen Screenshot sieht, RÄT es CSS-Selektoren aus Pixeln.
// Bei Tailwind ("inline-flex items-center gap-2 …") oder CSS Modules
// ("Hero_cta__a1b2c") geht das regelmäßig daneben — der Selektor matcht live nicht
// und die Variante wird nie ausgeliefert. Also holen wir das echte HTML und geben
// dem Modell die tatsächlichen Klassen/IDs, aus denen es nur noch auswählen muss.
//
// Für SPAs (leerer #root/#__next/#app) liefert fetch() nur eine Shell ohne Inhalt.
// Die erkennen wir hier und melden es dem Aufrufer — der Client zeigt dann den
// Snippet-first-Fallback (Plan §0b, Fallback 1).

import * as cheerio from 'cheerio'
import type { AnyNode } from 'domhandler'
import { redactPII } from '@/lib/pii'
import { safeError } from '@/lib/safeLog'
import { assertSafeUrl, isBlockedHost } from '@/lib/ssrf'

const FETCH_TIMEOUT_MS = 8000

// Genug HTML für Hero + erste Sektionen, ohne die Token-Kosten zu sprengen.
const MAX_HTML_CHARS = 60_000
// CSS wird nur als Kontext gebraucht (Farben, Design-Tokens), nicht vollständig.
const MAX_CSS_CHARS = 20_000
// Pro <link rel=stylesheet> laden wir maximal so viel; große Frameworks-Bundles
// (Tailwind-Output ~3 MB) würden sonst Timeout und Token-Budget killen.
const MAX_STYLESHEETS = 3
const MAX_STYLESHEET_BYTES = 400_000

export type SpaType = 'react' | 'next' | 'vue' | 'angular' | 'unknown'

export interface ExtractedElement {
  /** Tag-Name, z. B. "button" */
  tag: string
  /** Vorgeschlagener CSS-Selektor, DOM-verifiziert (matcht genau dieses Element). */
  selector: string
  /** Sichtbarer Text, gekürzt. */
  text: string
  /** Rolle im Sinne der CRO-Analyse. */
  kind: 'cta' | 'heading' | 'text' | 'form'
}

export interface ExtractedPage {
  isSpa: boolean
  spaType?: SpaType
  /** Gekürztes <body>-HTML, ohne Scripts/Styles, PII-redigiert. */
  html?: string
  /** Zusammengesuchte CSS-Regeln (inline <style> + verlinkte Stylesheets). */
  css?: string
  /** Kandidaten-Elemente mit garantiert im DOM existierenden Selektoren. */
  elements?: ExtractedElement[]
  /** <title> der Seite — Kontext für den Prompt. */
  title?: string
}

/**
 * Holt die Seite, erkennt SPAs und extrahiert HTML/CSS/Elemente.
 * Wirft bei Netzwerk-/HTTP-Fehlern; der Aufrufer fällt dann auf
 * Screenshot-only-Analyse zurück (Plan §5, "fetch(url) schlägt fehl").
 */
export async function extractPageCode(url: string): Promise<ExtractedPage> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'variante-preview-bot/1.0', Accept: 'text/html' },
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Failed to fetch ${res.status}`)
  // SSRF: die Route prüft die EINGABE-URL, aber redirect:'follow' kann danach
  // auf interne Hosts umleiten (public URL → 302 → 169.254.169.254). res.url ist
  // das finale Ziel — wenn das geblockt ist, verwerfen wir die Antwort.
  if (res.url) assertSafeUrl(res.url)

  const html = await res.text()
  const $ = cheerio.load(html)

  const spa = detectSpa($, html)
  if (spa.isSpa) return { isSpa: true, spaType: spa.spaType }

  const elements = extractRelevantElements($)
  const css = await extractCss($, url)

  // Scripts/Styles raus — das Modell braucht die Struktur, nicht das Bundle.
  $('script, style, noscript, svg, iframe').remove()
  const body = $('body').html() ?? ''

  return {
    isSpa: false,
    title: $('title').first().text().trim() || undefined,
    html: redactPII(body).slice(0, MAX_HTML_CHARS),
    css,
    elements,
  }
}

// ─── SPA-Erkennung ───

// Fünf Indikatoren, Schwelle ≥2 (Plan §5). Bewusst konservativ: eine SSR-Seite
// fälschlich als SPA zu klassifizieren kostet den Aha-Moment, andersherum
// analysiert GPT nur eine leere Shell und schlägt Unsinn vor.
function detectSpa($: cheerio.CheerioAPI, rawHtml: string): { isSpa: boolean; spaType?: SpaType } {
  const isEmpty = (sel: string) => {
    const el = $(sel)
    return el.length > 0 && el.children().length === 0 && el.text().trim() === ''
  }

  const rootEmpty = isEmpty('#root')
  const nextEmpty = isEmpty('#__next')
  const appEmpty = isEmpty('#app')
  const minimalHtml = rawHtml.length < 500
  const noSemanticTags =
    $('header').length === 0 && $('nav').length === 0 && $('main').length === 0

  const score = [rootEmpty, nextEmpty, appEmpty, minimalHtml, noSemanticTags].filter(Boolean).length
  if (score < 2) return { isSpa: false }

  const spaType: SpaType = rootEmpty
    ? 'react'
    : nextEmpty
      ? 'next'
      : appEmpty
        ? 'vue'
        : $('[ng-version]').length > 0 || $('app-root').length > 0
          ? 'angular'
          : 'unknown'

  return { isSpa: true, spaType }
}

// ─── Selektor-Bau ───

// Utility-Klassen (Tailwind & Co.) sind als Selektor wertlos — sie matchen
// hunderte Elemente. Semantische Klassen ("hero-cta", "Hero_cta__a1b2c") nicht.
const UTILITY_CLASS =
  /^(?:sm|md|lg|xl|2xl|hover|focus|active|group|dark|first|last|odd|even|motion|print|peer|has|aria|data)[:-]|^(?:flex|grid|block|inline|hidden|relative|absolute|fixed|sticky|static|container|row|col|wrap|items|justify|self|content|place|gap|space|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|w|h|min|max|text|font|leading|tracking|bg|border|rounded|shadow|opacity|z|overflow|cursor|select|transition|duration|ease|delay|animate|transform|translate|rotate|scale|skew|origin|whitespace|break|truncate|antialiased|uppercase|lowercase|capitalize|underline|list|order|basis|grow|shrink|inset|top|bottom|left|right|float|clear|object|align|table|filter|backdrop|ring|outline|divide|placeholder|appearance|pointer|resize|sr|not)(?:-|$)/

function isUsableClass(c: string): boolean {
  if (!c || c.length < 3) return false
  if (UTILITY_CLASS.test(c)) return false
  // Klassen mit Sonderzeichen (Tailwind-Arbitrary-Values wie "w-[32px]")
  // müssten escaped werden — nicht das Risiko wert.
  return /^[a-zA-Z_][\w-]*$/.test(c)
}

/**
 * Baut den kürzesten Selektor, der GENAU dieses Element trifft, und verifiziert
 * ihn direkt gegen den geparsten DOM. Gibt null zurück, wenn kein eindeutiger
 * Selektor gefunden wird — dann fliegt das Element aus den Kandidaten, statt dem
 * Modell einen Selektor anzubieten der live danebengreift.
 */
function buildSelector($: cheerio.CheerioAPI, el: AnyNode): string | null {
  const $el = $(el)
  const tag = (el as { tagName?: string }).tagName?.toLowerCase() ?? 'div'

  const matchesOnlyThis = (sel: string): boolean => {
    try {
      const found = $(sel)
      return found.length === 1 && found[0] === el
    } catch {
      return false
    }
  }

  // 1. ID — der stabilste Fall.
  const id = $el.attr('id')
  if (id && /^[a-zA-Z_][\w-]*$/.test(id) && matchesOnlyThis(`#${id}`)) return `#${id}`

  // 2. data-Attribute (data-testid, data-cta, …) — von Devs bewusst vergeben.
  for (const attr of ['data-testid', 'data-test', 'data-cy', 'data-id']) {
    const val = $el.attr(attr)
    if (val) {
      const sel = `[${attr}="${cssEscapeAttr(val)}"]`
      if (matchesOnlyThis(sel)) return sel
    }
  }

  // 3. Semantische Klassen — einzeln, dann kombiniert.
  const classes = ($el.attr('class') ?? '').split(/\s+/).filter(isUsableClass)
  for (const c of classes) {
    if (matchesOnlyThis(`.${c}`)) return `.${c}`
  }
  if (classes.length > 1) {
    const combined = `.${classes.slice(0, 3).join('.')}`
    if (matchesOnlyThis(combined)) return combined
  }
  if (classes.length > 0) {
    const withTag = `${tag}.${classes[0]}`
    if (matchesOnlyThis(withTag)) return withTag
  }

  // 4. Verankerung an einem Container mit ID/semantischer Klasse.
  const anchor = $el.parents().toArray().find((p) => {
    const pid = $(p).attr('id')
    if (pid && /^[a-zA-Z_][\w-]*$/.test(pid)) return true
    return ($(p).attr('class') ?? '').split(/\s+/).some(isUsableClass)
  })
  if (anchor) {
    const pid = $(anchor).attr('id')
    const pcls = ($(anchor).attr('class') ?? '').split(/\s+/).filter(isUsableClass)[0]
    const base = pid && /^[a-zA-Z_][\w-]*$/.test(pid) ? `#${pid}` : pcls ? `.${pcls}` : null
    if (base) {
      const scoped = `${base} ${tag}`
      if (matchesOnlyThis(scoped)) return scoped
      // nth-of-type als letzter Anker innerhalb des Containers
      const siblings = $(anchor).find(tag).toArray()
      const idx = siblings.findIndex((s) => s === el)
      if (idx >= 0) {
        const nth = `${base} ${tag}:nth-of-type(${idx + 1})`
        if (matchesOnlyThis(nth)) return nth
      }
    }
  }

  // 5. Eindeutiges Tag auf der ganzen Seite (typisch: das einzige <h1>).
  if (matchesOnlyThis(tag)) return tag

  return null
}

function cssEscapeAttr(v: string): string {
  return v.replace(/["\\]/g, '\\$&')
}

// ─── Element-Extraktion ───

const CTA_TEXT =
  /\b(get|start|try|buy|sign|join|book|demo|free|download|subscribe|contact|request|learn more|jetzt|kostenlos|starten|testen|kaufen|anmelden|buchen|mehr erfahren)\b/i

function textOf($el: cheerio.Cheerio<AnyNode>): string {
  return $el.text().replace(/\s+/g, ' ').trim().slice(0, 120)
}

/**
 * Sammelt die CRO-relevanten Kandidaten (CTAs, Headlines, Hero-Text, Formulare)
 * mit verifizierten Selektoren. Reihenfolge = DOM-Reihenfolge, also grob
 * "above the fold zuerst" — das passt zum 1440x900-Screenshot.
 */
export function extractRelevantElements($: cheerio.CheerioAPI): ExtractedElement[] {
  const out: ExtractedElement[] = []
  const seen = new Set<string>()

  const push = (el: AnyNode, kind: ExtractedElement['kind']) => {
    if (out.length >= 25) return
    const $el = $(el)
    const text = textOf($el)
    if (!text) return
    const selector = buildSelector($, el)
    if (!selector || seen.has(selector)) return
    seen.add(selector)
    out.push({
      tag: (el as { tagName?: string }).tagName?.toLowerCase() ?? 'div',
      selector,
      text,
      kind,
    })
  }

  // Headlines
  $('h1, h2').slice(0, 8).each((_, el) => push(el, 'heading'))

  // Buttons + CTA-Links
  $('button, [role="button"]').slice(0, 10).each((_, el) => push(el, 'cta'))
  $('a').toArray().slice(0, 60).forEach((el) => {
    const $el = $(el)
    const text = textOf($el)
    if (!text) return
    const looksLikeCta =
      CTA_TEXT.test(text) || ($el.attr('class') ?? '').toLowerCase().includes('btn') ||
      ($el.attr('class') ?? '').toLowerCase().includes('button')
    if (looksLikeCta) push(el, 'cta')
  })

  // Hero-Fließtext (substanzielle Absätze)
  $('p').toArray().slice(0, 20).forEach((el) => {
    if (textOf($(el)).length >= 40) push(el, 'text')
  })

  // Formulare (Reibungsverluste)
  $('form').slice(0, 3).each((_, el) => push(el, 'form'))

  return out
}

// ─── CSS-Extraktion ───

async function extractCss($: cheerio.CheerioAPI, pageUrl: string): Promise<string> {
  const parts: string[] = []

  $('style').each((_, el) => {
    const css = $(el).html()
    if (css) parts.push(css)
  })

  const hrefs: string[] = []
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href')
    if (href) hrefs.push(href)
  })

  for (const href of hrefs.slice(0, MAX_STYLESHEETS)) {
    try {
      const abs = new URL(href, pageUrl)
      // SSRF: <link href> ist Angreifer-kontrolliert (die analysierte Seite
      // bestimmt ihn) — interne Ziele weder direkt noch via Redirect abholen.
      if (isBlockedHost(abs.hostname)) continue
      const res = await fetch(abs.toString(), {
        headers: { 'User-Agent': 'variante-preview-bot/1.0' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      if (!res.ok) continue
      if (res.url && isBlockedHost(new URL(res.url).hostname)) continue
      const text = await res.text()
      parts.push(text.slice(0, MAX_STYLESHEET_BYTES))
    } catch (err) {
      // Ein fehlendes Stylesheet ist kein Grund die Preview abzubrechen —
      // die Selektoren kommen aus dem HTML, das CSS ist nur Farbkontext.
      safeError('extractPageCode-stylesheet', err)
    }
    if (parts.join('').length > MAX_CSS_CHARS * 4) break
  }

  return condenseCss(parts.join('\n')).slice(0, MAX_CSS_CHARS)
}

/**
 * Dampft CSS auf das ein, was für die Variant-Generierung zählt: Design-Tokens
 * (Custom Properties) und Regeln mit Farb-/Typo-/Spacing-Deklarationen.
 * Ein Tailwind-Bundle hat zehntausende Utility-Regeln — die interessieren nicht.
 */
function condenseCss(css: string): string {
  const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, '')

  const tokens: string[] = []
  const rootRe = /:root\s*\{([^}]*)\}/g
  let rm: RegExpExecArray | null
  while ((rm = rootRe.exec(cleaned)) !== null) {
    const vars = rm[1].match(/--[\w-]+\s*:\s*[^;]+/g)
    if (vars) tokens.push(`:root { ${vars.slice(0, 40).join('; ')} }`)
    if (tokens.length >= 3) break
  }

  const rules: string[] = []
  const ruleRe = /([^{}@]+)\{([^}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = ruleRe.exec(cleaned)) !== null) {
    const selector = m[1].trim()
    const decls = m[2].trim()
    if (!selector || !decls || selector.startsWith(':root')) continue
    if (selector.length > 120) continue
    if (!/(color|background|border|font|padding|margin|border-radius|box-shadow)/.test(decls)) continue
    rules.push(`${selector} { ${decls.slice(0, 200)} }`)
    if (rules.join('\n').length > MAX_CSS_CHARS) break
  }

  return [...tokens, ...rules].join('\n')
}
