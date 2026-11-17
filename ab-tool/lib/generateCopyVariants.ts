// KI-Textvarianten für Headline und Haupt-Button (Wizard „Suggest copy“).
//
// Herkunft: scripts/copy-eval/ (Blindtest 16.11.2026, 5 Runden). Was dort
// gelernt wurde und hier fest eingebaut ist:
//   1. Seiten-Briefing zuerst: Ohne Verständnis der Seite verfehlten fast
//      alle Varianten den Sinn (Runde 1).
//   2. Sprache, Anrede, Marke, Länge und Schreibweise werden im CODE
//      festgelegt und geprüft, nicht nur „gewünscht“.
//   3. Rolle zählt: Headline = Aussage, CTA = Aktion mit erwarteter Reaktion.
//   4. Breit testen: keine Paraphrasen, keine verlorenen Verkaufsargumente.
//   5. Hebel-Bibliothek (lib/copyLevers.ts) statt fertiger Phrasenlisten.
//   6. Harte Regeln: bis zu 2× mit Feedback nachfragen, danach verwerfen.
//      Lieber 2 gute Varianten als 3 mit einer kaputten.
// Modell: gpt-5.4-mini (in den Bewertungen gleichauf mit gpt-5.5, deutlich günstiger).

import * as cheerio from 'cheerio'
import { safeFetch } from '@/lib/safeFetch'
import { safeError } from '@/lib/safeLog'
import { CTA_LEVERS, HEADLINE_LEVERS, LEVER_BLOCK, type LeverId } from '@/lib/copyLevers'

const MODEL = 'gpt-5.4-mini'

export type CopyKind = 'headline' | 'cta'

export interface CopyVariant {
  text: string
  lever: LeverId
  why: string
}

export interface GenerateCopyInput {
  /** Seite, auf der das Element steht (verifizierte Domain des Nutzers). */
  url: string
  /** Aktueller Text des Elements. */
  original: string
  kind: CopyKind
  /** CSS-Selektor, um Nachbarn (Text darunter, Linkziel) im HTML zu finden. */
  selector?: string
  /** Bereits geladenes HTML der Seite (Landing-Demo) — spart den zweiten Fetch. */
  html?: string
}

export interface GenerateCopyResult {
  variants: CopyVariant[]
  /** Anzahl Varianten, die nach allen Nachfragen noch eine Regel brachen. */
  dropped: number
  language: 'German' | 'English'
}

// ─── Seite lesen ───

type Page = {
  htmlLang: string
  title: string
  description: string
  siteName: string
  outline: string[]
  nav: string[]
  pageText: string
  /** Text direkt unter dem Element (Subline) bzw. Linkziel des Buttons */
  below: string
  href: string
  target: string
  headline: string
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim()

function readPage(html: string, selector?: string): Page {
  const $ = cheerio.load(html)
  $('script, style, noscript, svg, template, iframe').remove()
  $('br').replaceWith(' ')
  $('p, div, span, li, h1, h2, h3, h4, a, button, td').each((_, el) => { $(el).append(' ') })

  let below = '', href = '', target = ''
  if (selector) {
    try {
      const el = $(selector).first()
      if (el.length) {
        below = clean(el.nextAll('p').first().text() || el.parent().nextAll().find('p').first().text()).slice(0, 320)
        href = (el.attr('href') || el.closest('a').attr('href') || '').slice(0, 200)
        if (href.startsWith('#') && href.length > 1) {
          const sec = $(`[id="${href.slice(1).replace(/"/g, '')}"]`).first()
          const head = clean(sec.find('h1, h2, h3').first().text())
          target = ((head ? `${head}: ` : '') + clean(sec.text())).slice(0, 200)
        }
      }
    } catch {
      // Ungültiger Selektor für cheerio — Nachbarn sind optional
    }
  }

  return {
    htmlLang: ($('html').attr('lang') || '').slice(0, 2).toLowerCase(),
    title: clean($('title').first().text()),
    description: clean($('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || ''),
    siteName: clean($('meta[property="og:site_name"]').attr('content') || ''),
    outline: $('h1, h2, h3').toArray().map((el) => `${el.tagName}: ${clean($(el).text())}`).filter((s) => s.length > 5).slice(0, 30),
    nav: [...new Set($('nav a, header a').toArray().map((el) => clean($(el).text())).filter((t) => t.length > 1 && t.length < 30))].slice(0, 15),
    pageText: clean($('main').text() || $('body').text()).slice(0, 6000),
    below,
    href,
    target,
    headline: clean($('h1').first().text()).slice(0, 200),
  }
}

// ─── Sprache: im Code festlegen ───

const DE = /\b(und|der|die|das|für|mit|ist|nicht|jetzt|dein|deine|ihr|ihre|wir|sie|auf|zu|von|ein|eine)\b/gi
const EN = /\b(the|and|for|with|your|you|get|now|our|we|is|are|to|of|a|an)\b/gi

function detectLanguage(p: Page, original: string): 'German' | 'English' {
  const sample = `${original} ${p.pageText.slice(0, 2500)}`
  const de = (sample.match(DE) ?? []).length
  const en = (sample.match(EN) ?? []).length
  if (de === en) return p.htmlLang === 'de' ? 'German' : 'English'
  return de > en ? 'German' : 'English'
}

// ─── OpenAI ───

/**
 * Fehler mit stabilem Code (z. B. `openai_404_model_not_found`, `page_fetch_403`).
 * Die Route gibt den Code als `details` zurück: ohne Vercel-Login sind die
 * Function-Logs nicht lesbar, und „temporarily unavailable" allein sagte beim
 * ersten Live-Test (16.11.2026) nichts über die Ursache.
 */
export class CopyGenError extends Error {
  constructor(public code: string, message: string) {
    super(message)
    this.name = 'CopyGenError'
  }
}

// Rückfallebene, falls der Key ein Modell nicht freigeschaltet hat (404/403).
// gpt-4.1-mini ist kein Reasoning-Modell und kennt reasoning_effort nicht.
const MODEL_CHAIN: { model: string; reasoning: boolean }[] = [
  { model: MODEL, reasoning: true },
  { model: 'gpt-5-mini', reasoning: true },
  { model: 'gpt-4.1-mini', reasoning: false },
]
let modelIndex = 0

async function callJson<T>(system: string, user: string, name: string, schema: object): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new CopyGenError('openai_key_missing', 'OPENAI_API_KEY missing')
  for (;;) {
    const { model, reasoning } = MODEL_CHAIN[modelIndex]
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } },
        ...(reasoning ? { reasoning_effort: 'low', max_completion_tokens: 6000 } : { max_completion_tokens: 2000 }),
      }),
      signal: AbortSignal.timeout(25_000),
    })
    const body = await res.json() as { choices?: { message: { content: string } }[]; error?: { message: string; code?: string } }
    if (res.ok) return JSON.parse(body.choices?.[0]?.message?.content ?? '{}') as T
    const code = `openai_${res.status}${body.error?.code ? `_${body.error.code}` : ''}`
    // Modell nicht verfügbar → nächstes Modell, für diese Instanz gemerkt
    if ((res.status === 404 || res.status === 403 || body.error?.code === 'model_not_found') && modelIndex < MODEL_CHAIN.length - 1) {
      safeError('copy-variants-model-fallback', { message: `${model}: ${code}` })
      modelIndex++
      continue
    }
    throw new CopyGenError(code, `OpenAI ${res.status} (${model}): ${(body.error?.message ?? '').slice(0, 160)}`)
  }
}

// ─── Stufe 1: Seiten-Briefing ───

type Brief = {
  brand_names: string[]
  business: string
  offer: string
  audience: string
  primary_goal: string
  visitor_problem: string
  differentiators: string[]
  verified_facts: string[]
  tone: string
  form_of_address: 'du' | 'Sie' | 'you' | 'none'
}

const BRIEF_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['brand_names', 'business', 'offer', 'audience', 'primary_goal', 'visitor_problem', 'differentiators', 'verified_facts', 'tone', 'form_of_address'],
  properties: {
    brand_names: { type: 'array', items: { type: 'string' }, description: 'Company, brand and product names exactly as the page spells them (case included)' },
    business: { type: 'string', description: 'What this business/site is, one sentence' },
    offer: { type: 'string', description: 'What exactly the visitor can get or do here' },
    audience: { type: 'string', description: 'Who the page is written for' },
    primary_goal: { type: 'string', description: 'The one action the page wants visitors to take' },
    visitor_problem: { type: 'string', description: 'The problem or desire that brings visitors here' },
    differentiators: { type: 'array', items: { type: 'string' }, description: 'What sets it apart, as stated on the page' },
    verified_facts: { type: 'array', items: { type: 'string' }, description: 'Concrete facts stated on the page (numbers, prices, trial terms, guarantees, locations). Quote them; empty if none' },
    tone: { type: 'string', description: 'Voice of the page in a few words' },
    form_of_address: { type: 'string', enum: ['du', 'Sie', 'you', 'none'] },
  },
}

const BRIEF_SYSTEM = 'You analyse a web page for a conversion copywriter. Read everything given and describe the page precisely and concretely. Only state what the page itself says or clearly implies. Never invent facts. If something is unclear, say so briefly instead of guessing.'

// Briefing pro URL kurz zwischenspeichern: Headline und Button derselben
// Seite teilen sich ein Briefing (spart einen Aufruf pro Element).
// Als Promise gespeichert: Headline und Button werden in der Landing-Demo
// parallel erzeugt und sollen auf DASSELBE Briefing warten statt zwei zu bestellen.
const briefCache = new Map<string, { at: number; brief: Promise<Brief> }>()
const BRIEF_TTL_MS = 30 * 60_000

/** Seite über den SSRF-geschützten Fetch laden. */
export async function fetchPageHtml(url: string): Promise<string> {
  const res = await safeFetch(url, { timeoutMs: 10_000, maxSize: 2_000_000, headers: { 'Accept-Language': 'de,en;q=0.8' } })
  if (!res.ok) throw new CopyGenError(`page_fetch_${res.status || 'error'}`, `page fetch failed: ${res.status} ${res.error ?? ''}`.trim())
  return res.text
}

function getBrief(url: string, page: Page): Promise<Brief> {
  const hit = briefCache.get(url)
  if (hit && Date.now() - hit.at < BRIEF_TTL_MS) return hit.brief
  const input = [
    `URL: ${url}`,
    `Title: ${page.title}`,
    page.description ? `Meta description: ${page.description}` : '',
    page.nav.length ? `Navigation: ${page.nav.join(' | ')}` : '',
    `Headings:\n${page.outline.join('\n')}`,
    `Visible text:\n${page.pageText}`,
  ].filter(Boolean).join('\n\n')
  const brief = callJson<Brief>(BRIEF_SYSTEM, input, 'page_brief', BRIEF_SCHEMA)
    // Ein abgeschnittenes Briefing kam im Eval einmal vor — ein Retry genügt
    .catch(() => callJson<Brief>(BRIEF_SYSTEM, input, 'page_brief', BRIEF_SCHEMA))
  brief.catch(() => briefCache.delete(url)) // Fehlschläge nicht cachen
  briefCache.set(url, { at: Date.now(), brief })
  if (briefCache.size > 200) briefCache.delete(briefCache.keys().next().value as string)
  return brief
}

// ─── Stufe 2: Varianten ───

const SYSTEM = `You are a senior conversion copywriter. You write test variants for ONE element of a live page. Each variant is a hypothesis for an A/B test against the original.

First understand the page from the brief: what is offered, to whom, and what the visitor should do next. A variant that misses what the page is about is worthless, however well written.

GOAL: more conversions, measurably. Most sites have little traffic, so only big differences show up in a test. Test broad before deep:
- Each variant is a bold, clearly different hypothesis: a different message, promise or reason to act. Never a paraphrase of the original ("Start free trial" → "Start your trial" is worthless: same message, and it lost "free").
- Keep the original's selling points (e.g. "free", "no credit card", numbers, guarantees, deadlines) unless the variant swaps them for a stronger fact from the brief. Losing a selling point makes a variant worse, not different.
- The 3 variants must also differ clearly from each other.

The element's ROLE decides what a good variant is. Never write one role's text for the other:
- HEADLINE = a catchphrase/statement. It tells the visitor in a few words what this page is about and why it matters to them. It is NOT a request: no call to action, no imperative aimed at the visitor ("Help…", "Support…", "Start…", "Get…", "Jetzt…"), no donation or price ask. It must still make sense if the button below were removed.
- CTA = a button label. The visitor clicks and expects a reaction, so the label names that action and what happens next (e.g. "Support the ride", "Start free trial", "Jetzt Demo buchen"). It starts with or contains a clear action verb, fits the link destination, and is never a slogan or a description.

${LEVER_BLOCK}
Write exactly 3 variants, each with a different lever from the list for this element's role.

Rules (all mandatory):
1. Write in the required language and form of address. Never switch language.
2. Stay within the character limit. Count characters. Shorter is fine.
3. Use only facts from the brief's verified facts or the page. No invented numbers, prices, ratings, customer counts, guarantees, "free" or "no credit card" claims.
4. Brand and product names exactly as given under "Brand names" (spelling and case). Avoid ordinary words that look like a misspelling of a brand name (for the brand "Variante" never write "variant", "variants", "Variant").
5. Keep the job of the element: a headline must still tell the visitor where they are; a CTA must still describe the same action (same destination).
6. Match the original's formatting exactly as given under "Formatting": capitalisation style (ALL CAPS, Title Case, Sentence case, all lowercase), trailing symbols such as "→", and ending punctuation. No emojis, no exclamation marks unless the original uses them.
7. "why": one short sentence in English: what changes compared to the original and why that could convert better.
8. "lever": the id of the lever the variant tests.`

/** Nur die Hebel der Rolle: eine Headline mit CTA-Hebel (oder umgekehrt) lässt das Schema gar nicht zu. */
export function leversFor(kind: CopyKind): LeverId[] {
  return Object.keys(kind === 'headline' ? HEADLINE_LEVERS : CTA_LEVERS) as LeverId[]
}

const variantSchema = (kind: CopyKind) => ({
  type: 'object', additionalProperties: false, required: ['variants'],
  properties: {
    variants: {
      type: 'array', minItems: 3, maxItems: 3,
      items: {
        type: 'object', additionalProperties: false, required: ['text', 'lever', 'why'],
        properties: {
          text: { type: 'string' },
          lever: { type: 'string', enum: leversFor(kind) },
          why: { type: 'string' },
        },
      },
    },
  },
})

// ─── Harte Regeln ───

export function limitsFor(kind: CopyKind, original: string): { maxChars: number; maxWords?: number } {
  const len = original.length
  return kind === 'headline'
    ? { maxChars: Math.max(Math.round(len * 1.15), len + 6) }
    : { maxChars: Math.max(len + 6, 18), maxWords: Math.max(original.split(/\s+/).length + 1, 3) }
}

function tooLong(v: string, lim: { maxChars: number; maxWords?: number }): boolean {
  return v.length > lim.maxChars || (lim.maxWords !== undefined && v.split(/\s+/).filter(Boolean).length > lim.maxWords)
}

const wordsOf = (s: string) => new Set((s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((w) => w.length > 2))
export function tooClose(v: string, original: string): boolean {
  const a = wordsOf(v), b = wordsOf(original)
  if (!a.size || !b.size) return false
  const inter = [...a].filter((w) => b.has(w)).length
  return inter / new Set([...a, ...b]).size >= 0.6
}

// Jede Variante soll einen ANDEREN Hebel testen (Versprechen im Wizard und in
// der Outreach). Der Prompt verlangt das, das Modell hält sich aber nicht
// immer daran: vallisride.com, 17.11.2026 → „Würzburg To New Zealand“ und
// „Germany To New Zealand“, beide h_specific. Deshalb hier im Code prüfen.
export function variantConflict(v: CopyVariant, accepted: CopyVariant[]): string | null {
  const sameLever = accepted.find((a) => a.lever === v.lever)
  if (sameLever) return `uses the lever ${v.lever} again (already used by "${sameLever.text}") — pick a different lever`
  const near = accepted.find((a) => a.text.toLowerCase() === v.text.toLowerCase() || tooClose(v.text, a.text))
  if (near) return `is too similar to the accepted variant "${near.text}" — write a clearly different hypothesis`
  return null
}

// Nur echte Kaufanreize; „trial“ ist keiner („Create free account“ ist ein legitimer Tausch)
const SELLING_POINTS = ['free', 'kostenlos', 'gratis', 'no credit card', 'keine kreditkarte', 'ohne kreditkarte', 'guarantee', 'garantie', 'sale', 'rabatt', 'deal', '%']
export function droppedSellingPoints(v: string, original: string): string[] {
  const o = original.toLowerCase(), x = v.toLowerCase()
  return SELLING_POINTS.filter((s) => o.includes(s) && !x.includes(s))
}

const VERBS_EN = 'help|support|start|get|try|join|buy|shop|sign|book|create|keep|fuel|donate|discover|see|learn|explore|download|order|claim|grab|follow|subscribe|send|contact|request|watch|build|launch|sync|add|save|find|choose|pick|plan|schedule|talk|chat|test|compare|view|read|register|upgrade|back|ride|go'
const VERBS_DE = 'hilf|helfen|unterstütze|unterstützen|starte|starten|hol|holen|jetzt|kaufe|kaufen|entdecke|entdecken|buche|buchen|teste|testen|sichere|sichern|melde|anmelden|erstelle|erstellen|probiere|ausprobieren|bestelle|bestellen|lade|laden|sieh|ansehen|erfahren|kontaktiere|registriere|registrieren|vergleiche|vergleichen|abonniere|abonnieren|shoppe|shoppen|finde|finden|wähle|wählen|sprich|anfragen|frage'
const ACTION_START = new RegExp(`^(${VERBS_EN}|${VERBS_DE})\\b`, 'i')

// Marke: nur der Firmenname (steckt in der Domain), z. B. getvariante.com → „Variante“.
const normBrand = (s: string) => s.toLowerCase().replace(/['’]s\b/g, '').replace(/[^\p{L}\p{N}]/gu, '')

function companyBrands(names: string[], url: string): string[] {
  let host = ''
  try { host = normBrand(new URL(url).hostname.replace(/^www\./, '').replace(/\.[a-z]+$/, '')) } catch { return [] }
  return [...new Set(names)].filter((b) => { const n = normBrand(b); return n.length >= 4 && (host.includes(n) || n.includes(host)) })
}

function lev(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  }
  return d[a.length][b.length]
}

export function brandIssues(v: string, company: string[], pageText: string): string[] {
  const issues: string[] = []
  const words = v.match(/[\p{L}\p{N}](?:[\p{L}\p{N}.'’-]*[\p{L}\p{N}])?/gu) ?? []
  for (const brand of company) {
    for (const part of brand.split(/\s+/)) {
      const np = normBrand(part)
      if (np.length < 4) continue
      for (const w of words) {
        const nw = normBrand(w)
        if (nw === np) {
          if (w !== part && !pageText.includes(w)) issues.push(`writes the brand "${part}" as "${w}"`)
          continue
        }
        if (np.length >= 5 && lev(nw, np) <= 2 && nw.slice(0, 4) === np.slice(0, 4)) {
          issues.push(`uses "${w}", which looks like a misspelling of the brand "${part}"`)
        }
      }
    }
  }
  return [...new Set(issues)]
}

// ─── Schreibweise des Originals ───

type CaseStyle = 'upper' | 'lower' | 'title' | 'sentence'
type Format = { caseStyle: CaseStyle; trailing: string }
const CASE_LABEL: Record<CaseStyle, string> = { upper: 'ALL CAPS', lower: 'all lowercase', title: 'Title Case', sentence: 'Sentence case' }

export function formatOf(original: string, language: 'German' | 'English'): Format {
  const letters = original.match(/\p{L}/gu) ?? []
  const upper = letters.filter((c) => c === c.toUpperCase() && c !== c.toLowerCase()).length
  const trailing = /\s*([→›»>]|->|\.\.\.|…|\.)$/u.exec(original.trim())?.[1] ?? ''
  let caseStyle: CaseStyle = 'sentence'
  if (letters.length >= 2 && upper === letters.length) caseStyle = 'upper'
  else if (upper === 0 && letters.length && /^\p{L}/u.test(original.trim())) caseStyle = 'lower'
  else if (language === 'English') {
    // Deutsch kennt kein Title Case („Socken Adventskalender“ ist normale Rechtschreibung)
    const long = (original.match(/\p{L}[\p{L}'’-]*/gu) ?? []).filter((w) => w.length > 3)
    if (long.length >= 2 && long.every((w) => w[0] === w[0].toUpperCase())) caseStyle = 'title'
  }
  return { caseStyle, trailing }
}

export function applyFormat(text: string, f: Format, brands: string[]): string {
  let t = text.trim().replace(/\s*([→›»>]|->)$/u, '')
  if (f.caseStyle === 'upper') t = t.toUpperCase()
  if (f.caseStyle === 'lower') {
    t = t.toLowerCase()
    for (const b of brands) t = t.replace(new RegExp(b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), b)
    t = t.replace(/(^|\s)i(?=['’\s]|$)/g, '$1I')
  }
  if (f.trailing && /[→›»>]|->/.test(f.trailing)) t = `${t} ${f.trailing}`
  return t
}

// ─── Hero-Elemente finden (Landing-Demo, ohne Picker) ───
// Portiert aus scripts/copy-eval/run.mts (dort an 15 echten Seiten geprüft):
// Headline = erste H1/H2, die mehr ist als Logo/Marke und kein Login-Modal;
// CTA = erster klick-artiger Link/Button im selben Abschnitt wie die Headline.

export interface HeroElement {
  text: string
  selector: string
  /** outerHTML, gekürzt — Basis von Variante A im Wizard-Entwurf */
  html: string
  tag: string
  href?: string
}

const NAV_WORDS = /^(log ?in|sign ?in|anmelden|einloggen|menu|menü|skip|cart|warenkorb|search|suche|account|konto|close|schließen|de|en)$/i
const AUTH_HEADING = /^(log ?in|sign ?(in|up)|anmelden|einloggen|registrieren|create (an )?account|konto erstellen)\b/i

function dedupeText(t: string): string {
  const half = t.length / 2
  if (Number.isInteger(half - 0.5)) {
    const a = t.slice(0, Math.floor(half)).trim(), b = t.slice(Math.ceil(half)).trim()
    if (a && a === b) return a
  }
  return t
}

const SAFE_IDENT = /^[A-Za-z_][\w-]*$/
type CheerioEl = Parameters<cheerio.CheerioAPI>[0]

/** Möglichst kurzer, eindeutiger CSS-Selektor (wie ab.js' cssSelector: id, sonst Klassenpfad). */
function cssPath($: cheerio.CheerioAPI, el: CheerioEl): string {
  const parts: string[] = []
  let node = $(el)
  for (let depth = 0; node.length && depth < 8; depth++) {
    const raw = node.get(0) as { tagName?: string } | undefined
    const tag = (raw?.tagName ?? '').toLowerCase()
    if (!tag || tag === 'html' || tag === 'body') break
    const id = node.attr('id')
    if (id && SAFE_IDENT.test(id)) { parts.unshift(`#${id}`); break }
    const cls = (node.attr('class') ?? '').split(/\s+/).filter((c) => SAFE_IDENT.test(c)).slice(0, 2)
    let part = tag + cls.map((c) => `.${c}`).join('')
    const same = node.parent().children(tag)
    if (same.length > 1) part += `:nth-of-type(${same.index(node) + 1})`
    parts.unshift(part)
    const sel = parts.join(' > ')
    try { if ($(sel).length === 1) return sel } catch { /* weiter nach oben */ }
    node = node.parent()
  }
  // Nicht eindeutig geworden (z. B. 4× <h1> ohne Klassen): voller Pfad mit nth-of-type ab <body>
  const full: string[] = []
  let cur = $(el)
  while (cur.length) {
    const tag = ((cur.get(0) as { tagName?: string } | undefined)?.tagName ?? '').toLowerCase()
    if (!tag || tag === 'html' || tag === 'body') break
    const id = cur.attr('id')
    if (id && SAFE_IDENT.test(id)) { full.unshift(`#${id}`); break }
    full.unshift(`${tag}:nth-of-type(${cur.parent().children(tag).index(cur) + 1})`)
    cur = cur.parent()
  }
  return (full[0]?.startsWith('#') ? '' : 'body > ') + full.join(' > ')
}

export function findHeroElements(html: string): { headline: HeroElement | null; cta: HeroElement | null; title: string } {
  const $ = cheerio.load(html)
  $('script, style, noscript, template, iframe').remove()
  const clean = (s: string) => s.replace(/\s+/g, ' ').trim()
  // <br> und Blockgrenzen ohne Leerzeichen: "files<br>without" → "fileswithout"
  const textOf = (el: CheerioEl) => {
    const c = $(el).clone()
    c.find('br').replaceWith(' ')
    c.find('p, div, span, li').each((_, x) => { $(x).append(' ') })
    return dedupeText(clean(c.text()))
  }
  const title = clean($('title').first().text())
  const siteName = clean($('meta[property="og:site_name"]').attr('content') || '').toLowerCase()

  const order = new Map<CheerioEl, number>()
  $('*').toArray().forEach((el, i) => order.set(el, i))
  const pos = (el: CheerioEl) => order.get(el) ?? 0

  const isBrandOnly = (t: string) => {
    const l = t.toLowerCase()
    return t.length < 12 && ((!!siteName && l.includes(siteName)) || title.toLowerCase().startsWith(l) || /^[A-Z0-9 .&-]+$/.test(t))
  }
  const hEl = [...$('h1').toArray(), ...$('h2').toArray()].find((el) => {
    const t = textOf(el)
    if ($(el).closest('dialog, [role="dialog"], [aria-modal="true"], form, .modal').length) return false
    return t.length >= 3 && t.length <= 200 && !isBrandOnly(t) && !AUTH_HEADING.test(t)
  })
  const hPos = hEl ? pos(hEl) : -1

  const looksLikeAction = (el: CheerioEl) => {
    const t = textOf(el)
    if (t.length < 2 || t.length > 40 || NAV_WORDS.test(t)) return false
    if ((t.match(/\p{L}/gu) ?? []).length < 3) return false
    return !$(el).closest('nav').length
  }
  const isCta = (el: CheerioEl) => {
    if (!looksLikeAction(el)) return false
    const cls = `${$(el).attr('class') ?? ''} ${$(el).attr('id') ?? ''}`
    return /btn|button|cta|primary/i.test(cls) || (el as { tagName?: string }).tagName === 'button'
  }
  let ctaEl: CheerioEl | undefined
  if (hEl) {
    let box = $(hEl).parent()
    for (let i = 0; i < 6 && box.length && !ctaEl; i++, box = box.parent()) {
      // Im Hero steht der Button nicht immer HINTER der Headline im DOM
      // (vallisride.com: Button-Spalte vor dem <h1>). Hinter der Headline zuerst,
      // sonst irgendwo im selben Abschnitt.
      const all = box.find('a, button').toArray()
      const after = all.filter((el) => pos(el) > hPos)
      ctaEl = after.find(isCta) ?? all.find(isCta) ?? after.find(looksLikeAction)
    }
  }
  ctaEl ??= $('a, button').toArray().find((el) => pos(el) > hPos && isCta(el))

  const toHero = (el: CheerioEl | undefined): HeroElement | null => {
    if (!el) return null
    const tag = ((el as { tagName?: string }).tagName ?? '').toLowerCase()
    const href = $(el).attr('href')
    return { text: textOf(el), selector: cssPath($, el), html: ($.html(el) ?? '').slice(0, 1500), tag, ...(href ? { href: href.slice(0, 300) } : {}) }
  }
  return { headline: toHero(hEl), cta: toHero(ctaEl), title }
}

// ─── Hauptfunktion ───

export async function generateCopyVariants(input: GenerateCopyInput): Promise<GenerateCopyResult> {
  const { url, original, kind, selector } = input

  const html = input.html ?? await fetchPageHtml(url)
  const page = readPage(html, selector)
  const brief = await getBrief(url, page)

  const language = detectLanguage(page, original)
  const fmt = formatOf(original, language)
  const lim = limitsFor(kind, original)
  const brands = [...new Set([...(brief.brand_names ?? []), page.siteName].filter((s) => s && s.length >= 3 && s.length <= 30))]
  const company = companyBrands(brands, url)
  const address = brief.form_of_address === 'none' ? 'match the page' : brief.form_of_address

  const user = [
    `PAGE BRIEF\n${JSON.stringify(brief, null, 2)}`,
    `ELEMENT\n${kind === 'headline'
      ? 'Role: HEADLINE. Main headline at the top of the page.'
      : `Role: CTA. Primary button.${page.href ? ` Clicking it goes to: ${page.href}` : ''}${page.target ? ` (that section is about: "${page.target}")` : ''}`}`,
    `Original: "${original}" (${original.length} characters)`,
    kind === 'headline' && page.below ? `Text directly below the headline: "${page.below}"` : '',
    kind === 'cta' && page.headline ? `Main headline of the page: "${page.headline}"` : '',
    `REQUIREMENTS\nLanguage: ${language}\nForm of address: ${address}\nBrand names (exact spelling): ${brands.join(', ') || '—'}\nFormatting: ${CASE_LABEL[fmt.caseStyle]}${fmt.trailing ? `, ends with "${fmt.trailing}"` : ', no trailing symbol'}\nMaximum length: ${lim.maxChars} characters${lim.maxWords ? `, at most ${lim.maxWords} words` : ''}`,
  ].filter(Boolean).join('\n\n')

  const violations = (text: string): string[] => {
    const p: string[] = []
    if (tooLong(text, lim)) p.push(`is ${text.length} characters (limit ${lim.maxChars}${lim.maxWords ? `, ${lim.maxWords} words` : ''})`)
    for (const b of brandIssues(text, company, `${page.title} ${page.pageText}`)) p.push(b)
    if (tooClose(text, original)) p.push('is only a paraphrase of the original — write a clearly different hypothesis')
    const lost = droppedSellingPoints(text, original)
    if (lost.length) p.push(`drops the original's selling point ${lost.map((s) => `"${s}"`).join(', ')} — keep it and change something else`)
    if (kind === 'headline' && ACTION_START.test(text.trim())) p.push('is a request/call to action — a HEADLINE must be a statement')
    return p
  }

  const keep: CopyVariant[] = []
  let feedback = ''
  for (let attempt = 0; attempt < 3 && keep.length < 3; attempt++) {
    const ask = attempt === 0
      ? user
      : `${user}\n\nAlready accepted (do not repeat, write different ones): ${keep.map((v) => `"${v.text}" (${v.lever})`).join(', ') || 'none'}${keep.length ? `\nLevers already used, do NOT use them again: ${keep.map((v) => v.lever).join(', ')}` : ''}\nYour previous answer broke mandatory rules:\n- ${feedback}\nWrite 3 new variants that follow every rule.`
    const r = await callJson<{ variants: CopyVariant[] }>(SYSTEM, ask, 'copy_variants', variantSchema(kind))
    const problems: string[] = []
    for (const v0 of r.variants ?? []) {
      const v = { ...v0, text: applyFormat(v0.text, fmt, company) }
      const p = violations(v.text)
      const conflict = p.length ? null : variantConflict(v, keep)
      if (p.length) problems.push(...p.map((x) => `"${v.text}" ${x}`))
      else if (conflict) problems.push(`"${v.text}" ${conflict}`)
      else if (keep.length < 3) keep.push(v)
    }
    feedback = problems.join('\n- ')
  }

  if (!keep.length) safeError('copy-variants-all-dropped', { message: `${kind} on ${new URL(url).hostname}` })
  return { variants: keep, dropped: 3 - keep.length, language }
}
