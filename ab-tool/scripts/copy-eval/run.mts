// Copy-Eval v2: Taugen KI-Varianten für Headline + CTA, bevor wir sie wieder
// in den Wizard bauen? (Plan „KI-Varianten zurückholen“, Schritt 1)
//
// Lehre aus Lauf 1 (16.11.2026, Blindbewertung): fast alle Varianten schlecht.
// Ursachen: zu wenig Kontext (Modell verstand die Seite nicht), Sprache und
// Länge nur „gewünscht“ statt festgelegt. v2 deshalb in zwei Stufen:
//   1. Seiten-Briefing: ein Call pro Seite liest viel Seitentext und hält fest,
//      was angeboten wird, für wen, mit welchen belegten Fakten, in welcher
//      Sprache und Anrede.
//   2. Varianten: Briefing + Rolle des Elements + Nachbarn (Subline, CTA-Ziel)
//      + harte Vorgaben (Sprache, Anrede, Zeichenlimit). Das Limit wird im
//      Code geprüft; zu lange Varianten gehen einmal mit Feedback zurück.
//
// Arme: mini = gpt-5.4-mini, big = gpt-5.5 (Briefing jeweils mit demselben Modell).
// Der alte gpt-4o-mini-Pfad ist raus: In Lauf 1 eindeutig unbrauchbar.
//
// Aufruf (in ab-tool/):  npx tsx scripts/copy-eval/run.mts <out.json>
// Optional: EVAL_LIMIT=2 für einen Probelauf. Kostet Cent-Beträge.

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as cheerio from 'cheerio'
import type { Element } from 'domhandler'
import { PAGES } from './pages.ts'
import { LEVER_BLOCK, LEVER_IDS } from '../../lib/copyLevers.ts'

// ─── Env von Hand laden (kein Next-Runtime) ───
for (const line of readFileSync(resolve('.env.local'), 'utf8').split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}
const KEY = process.env.OPENAI_API_KEY
if (!KEY) throw new Error('OPENAI_API_KEY fehlt in .env.local')

const OUT = process.argv[2]
if (!OUT) throw new Error('Pfad für die Ausgabe fehlt: npx tsx scripts/copy-eval/run.mts <out.json>')

// ─── Extraktion ───
type Extracted = {
  htmlLang: string
  title: string
  description: string
  headline: { text: string; tag: string } | null
  subline: string
  cta: { text: string; href: string; target: string } | null
  outline: string[]   // Überschriften h1–h3 in Reihenfolge
  nav: string[]       // Menüpunkte
  pageText: string    // sichtbarer Text, gekürzt
  siteName: string    // og:site_name, Originalschreibweise
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim()
const NAV_WORDS = /^(log ?in|sign ?in|anmelden|einloggen|menu|menü|skip|cart|warenkorb|search|suche|account|konto|close|schließen|de|en)$/i

/** "X X" (responsive Doppel-Markup) → "X" */
function dedupe(t: string): string {
  const half = t.length / 2
  if (Number.isInteger(half - 0.5)) {
    const a = t.slice(0, Math.floor(half)).trim(), b = t.slice(Math.ceil(half)).trim()
    if (a && a === b) return a
  }
  return t
}

function extract(html: string): Extracted {
  const $ = cheerio.load(html)
  $('script, style, noscript, svg, template, iframe').remove()
  $('br').replaceWith(' ')
  $('p, div, span, li, h1, h2, h3, h4, a, button, td').each((_, el) => { $(el).append(' ') })

  const htmlLang = ($('html').attr('lang') || '').slice(0, 2).toLowerCase()
  const title = clean($('title').first().text())
  const description = clean($('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '')
  const siteNameRaw = clean($('meta[property="og:site_name"]').attr('content') || '')
  const siteName = siteNameRaw.toLowerCase()

  const order = new Map<Element, number>()
  $('*').toArray().forEach((el, i) => order.set(el, i))
  const pos = (el: Element) => order.get(el) ?? 0

  // Headline: erste H1, die mehr ist als der Markenname/Logo. Sonst erste H2.
  const isBrandOnly = (t: string) => {
    const l = t.toLowerCase()
    return t.length < 12 && (!!siteName && l.includes(siteName) || title.toLowerCase().startsWith(l) || /^[A-Z0-9 .&-]+$/.test(t))
  }
  const candidates = [...$('h1').toArray(), ...$('h2').toArray()]
  // Login-/Signup-Modale tragen oft eine eigene H1 („Log In“) — die ist nie die Headline.
  const AUTH_HEADING = /^(log ?in|sign ?(in|up)|anmelden|einloggen|registrieren|create (an )?account|konto erstellen)\b/i
  const hEl = candidates.find((el) => {
    const t = dedupe(clean($(el).text()))
    if ($(el).closest('dialog, [role="dialog"], [aria-modal="true"], form, .modal').length) return false
    return t.length >= 3 && !isBrandOnly(t) && !AUTH_HEADING.test(t)
  })
  const headline = hEl ? { text: dedupe(clean($(hEl).text())), tag: hEl.tagName } : null
  const hPos = hEl ? pos(hEl) : -1

  // Subline: erster Absatz nach der Headline mit vernünftiger Länge
  const subEl = $('p').toArray().find((el) => pos(el) > hPos && clean($(el).text()).length >= 20 && clean($(el).text()).length <= 320)
  const subline = subEl ? clean($(subEl).text()) : ''

  // CTA: erster klick-artiger Link/Button nach der Headline, außerhalb der Navigation
  const isCta = (el: Element) => {
    const t = clean($(el).text())
    if (t.length < 2 || t.length > 40 || NAV_WORDS.test(t)) return false
    if ((t.match(/\p{L}/gu) ?? []).length < 3) return false   // „(138)“, „→“
    if ($(el).closest('nav').length) return false
    const cls = ($(el).attr('class') || '') + ' ' + ($(el).attr('id') || '')
    return /btn|button|cta|primary/i.test(cls) || el.tagName === 'button'
  }
  // Zuerst im selben Abschnitt wie die Headline suchen (Vorfahren hochlaufen),
  // sonst irgendwo danach. Klasse ist dort kein Muss: Im Hero ist der erste
  // kurze Link nach der Headline fast immer der CTA.
  const all = $('a, button').toArray()
  let ctaEl: Element | undefined
  if (hEl) {
    let box = $(hEl).parent()
    for (let i = 0; i < 6 && box.length && !ctaEl; i++, box = box.parent()) {
      const inBox = box.find('a, button').toArray().filter((el) => pos(el) > hPos)
      ctaEl = inBox.find(isCta) ?? inBox.find((el) => {
        const t = clean($(el).text())
        return t.length >= 2 && t.length <= 40 && !NAV_WORDS.test(t) && (t.match(/\p{L}/gu) ?? []).length >= 3 && !$(el).closest('nav').length
      })
    }
  }
  ctaEl ??= all.find((el) => pos(el) > hPos && isCta(el)) ?? all.find(isCta)
  // Sprungziel auflösen: "#support" → worum geht es in dem Abschnitt? Ohne das
  // weiß das Modell nicht, welche Reaktion der Klick auslöst.
  const href = ctaEl ? ($(ctaEl).attr('href') || '').slice(0, 200) : ''
  let target = ''
  if (href.startsWith('#') && href.length > 1) {
    const sec = $(`[id="${href.slice(1).replace(/"/g, '')}"]`).first()
    const head = clean(sec.find('h1, h2, h3').first().text())
    target = (head ? `${head}: ` : '') + clean(sec.text()).slice(0, 200)
  }
  const cta = ctaEl ? { text: dedupe(clean($(ctaEl).text())), href, target } : null

  const outline = $('h1, h2, h3').toArray().map((el) => `${el.tagName}: ${dedupe(clean($(el).text()))}`).filter((s) => s.length > 5).slice(0, 30)
  const nav = [...new Set($('nav a, header a').toArray().map((el) => clean($(el).text())).filter((t) => t.length > 1 && t.length < 30))].slice(0, 15)
  const pageText = clean($('main').text() || $('body').text()).slice(0, 6000)
  return { htmlLang, title, description, headline, subline, cta, outline, nav, pageText, siteName: siteNameRaw }
}

// ─── Sprache: im Code festlegen, nicht dem Modell überlassen ───
const DE = /\b(und|der|die|das|für|mit|ist|nicht|jetzt|dein|deine|ihr|ihre|wir|sie|auf|zu|von|ein|eine)\b/gi
const EN = /\b(the|and|for|with|your|you|get|now|our|we|is|are|to|of|a|an)\b/gi
function detectLanguage(ex: Extracted): 'German' | 'English' {
  const sample = `${ex.headline?.text ?? ''} ${ex.subline} ${ex.pageText.slice(0, 2500)}`
  const de = (sample.match(DE) ?? []).length
  const en = (sample.match(EN) ?? []).length
  if (de === en) return ex.htmlLang === 'de' ? 'German' : 'English'
  return de > en ? 'German' : 'English'
}

// ─── OpenAI-Aufruf mit Structured Output ───
type Usage = { tokens: number }
async function callJson<T>(model: string, system: string, user: string, name: string, schema: object, usage: Usage): Promise<T> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } },
      reasoning_effort: 'low',
      max_completion_tokens: 6000,
    }),
  })
  const body = await res.json() as { choices?: { message: { content: string } }[]; usage?: { total_tokens: number }; error?: { message: string } }
  if (!res.ok) throw new Error(`${res.status} ${body.error?.message ?? ''}`.slice(0, 200))
  usage.tokens += body.usage?.total_tokens ?? 0
  return JSON.parse(body.choices?.[0]?.message?.content ?? '{}') as T
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
const BRIEF_SYSTEM = `You analyse a web page for a conversion copywriter. Read everything given and describe the page precisely and concretely. Only state what the page itself says or clearly implies. Never invent facts. If something is unclear, say so briefly instead of guessing.`

function briefInput(ex: Extracted, url: string): string {
  return [
    `URL: ${url}`,
    `Title: ${ex.title}`,
    ex.description ? `Meta description: ${ex.description}` : '',
    ex.nav.length ? `Navigation: ${ex.nav.join(' | ')}` : '',
    `Headings:\n${ex.outline.join('\n')}`,
    `Visible text:\n${ex.pageText}`,
  ].filter(Boolean).join('\n\n')
}

// ─── Stufe 2: Varianten ───
const VARIANT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['variants'],
  properties: {
    variants: {
      type: 'array', minItems: 3, maxItems: 3,
      items: {
        type: 'object', additionalProperties: false, required: ['text', 'angle', 'why'],
        properties: {
          text: { type: 'string' },
          angle: { type: 'string', enum: ['clarity', 'outcome', 'friction'] },
          why: { type: 'string' },
        },
      },
    },
  },
}

const VARIANT_SYSTEM = `You are a senior conversion copywriter. You write test variants for ONE element of a live page. Each variant is a hypothesis for an A/B test against the original.

First understand the page from the brief: what is offered, to whom, and what the visitor should do next. A variant that misses what the page is about is worthless, however well written.

GOAL: more conversions, measurably. Most sites have little traffic, so only big differences show up in a test. Test broad before deep:
- Each variant is a bold, clearly different hypothesis: a different message, promise or reason to act. Never a paraphrase of the original ("Start free trial" → "Start your trial" is worthless: same message, and it lost "free").
- Keep the original's selling points (e.g. "free", "no credit card", numbers, guarantees, deadlines) unless the variant swaps them for a stronger fact from the brief. Losing a selling point makes a variant worse, not different.
- The 3 variants must also differ clearly from each other.

The element's ROLE decides what a good variant is. Never write one role's text for the other:
- HEADLINE = a catchphrase/statement. It tells the visitor in a few words what this page is about and why it matters to them. It is NOT a request: no call to action, no imperative aimed at the visitor ("Help…", "Support…", "Start…", "Get…", "Jetzt…"), no donation or price ask. It must still make sense if the button below were removed.
- CTA = a button label. The visitor clicks and expects a reaction, so the label names that action and what happens next (e.g. "Support the ride", "Start free trial", "Jetzt Demo buchen"). It starts with or contains a clear action verb, fits the link destination, and is never a slogan or a description.

Write exactly 3 variants, each pulling a different lever:
- "clarity": makes immediately clear what the visitor gets here
- "outcome": leads with the result the visitor wants
- "friction": removes the main doubt or effort that stops the visitor

Rules (all mandatory):
1. Write in the required language and form of address. Never switch language.
2. Stay within the character limit. Count characters. Shorter is fine.
3. Use only facts from the brief's verified facts or the page. No invented numbers, prices, ratings, customer counts, guarantees, "free" or "no credit card" claims.
4. Brand and product names exactly as given under "Brand names" (spelling and case). Avoid ordinary words that look like a misspelling of a brand name (for the brand "Variante" never write "variant", "variants", "Variant").
5. Keep the job of the element: a headline must still tell the visitor where they are; a CTA must still describe the same action (same destination).
6. Match the original's formatting exactly as given under "Formatting": capitalisation style (ALL CAPS, Title Case, Sentence case, all lowercase), trailing symbols such as "→", and ending punctuation. No emojis, no exclamation marks unless the original uses them.
7. "why": one short sentence in German: what changes compared to the original and why that could convert better.`

// Runde 5: derselbe Prompt, aber die drei groben Blickwinkel werden durch die
// Hebel-Bibliothek ersetzt (levers.ts). Alles andere bleibt identisch, damit
// der Vergleich nur den Prompt misst.
const [BASE_HEAD, BASE_REST] = VARIANT_SYSTEM.split('Write exactly 3 variants, each pulling a different lever:')
const BASE_RULES = BASE_REST.slice(BASE_REST.indexOf('Rules (all mandatory):'))
const LEVER_SYSTEM = `${BASE_HEAD}${LEVER_BLOCK}
Write exactly 3 variants, each with a different lever from the list for this element's role.

${BASE_RULES}
8. "lever": the id of the lever the variant tests.`

const LEVER_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['variants'],
  properties: {
    variants: {
      type: 'array', minItems: 3, maxItems: 3,
      items: {
        type: 'object', additionalProperties: false, required: ['text', 'lever', 'why'],
        properties: {
          text: { type: 'string' },
          lever: { type: 'string', enum: LEVER_IDS },
          why: { type: 'string' },
        },
      },
    },
  },
}

type Prompt = { model: string; system: string; schema: object }
type Variant = { text: string; angle: string; lever?: string; why: string; flags?: string[] }
type ArmResult = { variants: Variant[]; ms: number; tokens: number; retried: boolean; attempts?: number; dropped?: number; brief?: Brief; error?: string }

function limitsFor(kind: 'headline' | 'cta', original: string) {
  const len = original.length
  return kind === 'headline'
    ? { maxChars: Math.max(Math.round(len * 1.15), len + 6) }
    : { maxChars: Math.max(len + 6, 18), maxWords: Math.max(original.split(/\s+/).length + 1, 3) }
}

// ─── Formatierung des Originals übernehmen ───
// Ein Button in ALL CAPS bleibt ALL CAPS, ein „→“ am Ende bleibt am Ende.
// Groß-/Kleinschreibung und Endzeichen sind deterministisch, also setzt der
// Code sie durch, statt dem Modell zu vertrauen. Title Case vs. Satzschreibung
// ist bei deutschen Substantiven nicht mechanisch lösbar → nur Vorgabe + Prüfung.
type CaseStyle = 'upper' | 'lower' | 'title' | 'sentence'
type Format = { caseStyle: CaseStyle; trailing: string }
const LETTERS = /\p{L}/gu
function formatOf(original: string): Format {
  const letters = original.match(LETTERS) ?? []
  const upper = letters.filter((c) => c === c.toUpperCase() && c !== c.toLowerCase()).length
  const trailing = /\s*([→›»>]|->|\.\.\.|…|\.)$/u.exec(original.trim())?.[1] ?? ''
  let caseStyle: CaseStyle = 'sentence'
  if (letters.length >= 2 && upper === letters.length) caseStyle = 'upper'
  // „30 days of …“ ist Satzschreibung, keine Kleinschreibung: nur wenn der Text mit einem Buchstaben beginnt
  else if (upper === 0 && letters.length && /^\p{L}/u.test(original.trim())) caseStyle = 'lower'
  else {
    const words = original.match(/\p{L}[\p{L}'’-]*/gu) ?? []
    const long = words.filter((w) => w.length > 3)
    if (long.length >= 2 && long.every((w) => w[0] === w[0].toUpperCase())) caseStyle = 'title'
  }
  return { caseStyle, trailing }
}
const CASE_LABEL: Record<CaseStyle, string> = { upper: 'ALL CAPS', lower: 'all lowercase', title: 'Title Case', sentence: 'Sentence case' }
function describeFormat(f: Format): string {
  return `${CASE_LABEL[f.caseStyle]}${f.trailing ? `, ends with "${f.trailing}"` : ', no trailing symbol'}`
}
/** Setzt Großschreibung und Endzeichen des Originals durch. Marken bleiben exakt. */
function applyFormat(text: string, f: Format, brands: string[]): string {
  let t = text.trim().replace(/\s*([→›»>]|->)$/u, '')
  if (f.caseStyle === 'upper') t = t.toUpperCase()
  if (f.caseStyle === 'lower') {
    t = t.toLowerCase()
    for (const b of brands) t = t.replace(new RegExp(b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), b)
    // Englisches „I“ bleibt groß, sonst „i'll fuel a day“ (letzter Prüflauf, vallisride.com)
    t = t.replace(/(^|\s)i(?=['’\s]|$)/g, '$1I')
  }
  if (f.trailing && /[→›»>]|->/.test(f.trailing)) t = `${t} ${f.trailing}`
  return t
}

function tooLong(v: string, lim: { maxChars: number; maxWords?: number }) {
  return v.length > lim.maxChars || (lim.maxWords !== undefined && v.split(/\s+/).filter(Boolean).length > lim.maxWords)
}

async function makeBrief(model: string, url: string, ex: Extracted): Promise<Brief> {
  const usage: Usage = { tokens: 0 }
  try {
    return await callJson<Brief>(model, BRIEF_SYSTEM, briefInput(ex, url), 'page_brief', BRIEF_SCHEMA, usage)
  } catch {
    // Runde 4: einmal kam das Briefing leer zurück (abgeschnittenes JSON) — ein Retry genügt
    return await callJson<Brief>(model, BRIEF_SYSTEM, briefInput(ex, url), 'page_brief', BRIEF_SCHEMA, usage)
  }
}

async function runArm(prompt: Prompt, url: string, ex: Extracted, language: string, brief: Brief): Promise<Record<'headline' | 'cta', ArmResult | null>> {
  const { model } = prompt
  const usage: Usage = { tokens: 0 }
  const briefMs = 0

  const out: Record<'headline' | 'cta', ArmResult | null> = { headline: null, cta: null }
  await Promise.all((['headline', 'cta'] as const).map(async (kind) => {
    const el = ex[kind]
    if (!el) return
    const lim = limitsFor(kind, el.text)
    const address = brief.form_of_address === 'none' ? 'match the page' : brief.form_of_address
    const brands = brandList(ex, brief)
    const fmt0 = formatOf(el.text)
    // Deutsch kennt kein Title Case: „Socken Adventskalender“ ist normale Rechtschreibung.
    // Runde 5 machte daraus „Passform, Die Du Spürst“.
    const fmt: Format = language === 'German' && fmt0.caseStyle === 'title' ? { ...fmt0, caseStyle: 'sentence' } : fmt0
    const user = [
      `PAGE BRIEF\n${JSON.stringify(brief, null, 2)}`,
      `ELEMENT\n${kind === 'headline'
        ? `Role: HEADLINE. Main headline (${ex.headline!.tag}) at the top of the page.`
        : `Role: CTA. Primary button in the hero section.${ex.cta!.href ? ` Clicking it goes to: ${ex.cta!.href}` : ''}${ex.cta!.target ? ` (that section is about: "${ex.cta!.target}")` : ''}`}`,
      `Original: "${el.text}" (${el.text.length} characters)`,
      kind === 'headline' && ex.subline ? `Text directly below the headline: "${ex.subline}"` : '',
      kind === 'headline' && ex.cta ? `Button below: "${ex.cta.text}"` : '',
      kind === 'cta' && ex.headline ? `Headline above the button: "${ex.headline.text}"` : '',
      kind === 'cta' && ex.subline ? `Text above the button: "${ex.subline}"` : '',
      `REQUIREMENTS\nLanguage: ${language}\nForm of address: ${address}\nBrand names (exact spelling): ${brands.join(', ') || '—'}\nFormatting: ${describeFormat(fmt)}\nMaximum length: ${lim.maxChars} characters${lim.maxWords ? `, at most ${lim.maxWords} words` : ''}`,
    ].filter(Boolean).join('\n\n')

    const t1 = Date.now()
    try {
      // Harte Regeln im Code: Verstöße gehen mit konkretem Feedback zurück ans
      // Modell (höchstens 2×). Was danach noch eine harte Regel bricht, wird
      // VERWORFEN statt angezeigt — lieber 2 gute Varianten als 3 mit einer kaputten.
      // (Runde 5: Nachfragen allein reichte nicht, z. B. ging „free“ trotz Feedback verloren.)
      const company = companyBrands(brands, url)
      const violations = (text: string): string[] => {
        const p: string[] = []
        if (tooLong(text, lim)) p.push(`is ${text.length} characters / ${text.split(/\s+/).filter(Boolean).length} words (limit ${lim.maxChars} characters${lim.maxWords ? `, ${lim.maxWords} words` : ""})`)
        for (const b of brandIssues(text, company, `${ex.title} ${ex.pageText}`)) p.push(b)
        if (tooClose(text, el.text)) p.push("is only a paraphrase of the original — write a clearly different hypothesis")
        const lost = droppedSellingPoints(text, el.text)
        if (lost.length) p.push(`drops the original's selling point ${lost.map((s) => `"${s}"`).join(", ")} — keep it (in this language) and change something else`)
        if (kind === "headline" && ACTION_START.test(text.trim())) p.push("is a request/call to action — a HEADLINE must be a statement about what this page offers")
        return p
      }
      const finalize = (v: Variant) => ({ ...v, text: applyFormat(v.text, fmt, company), ...(v.lever ? { angle: v.lever } : {}) })
      const keep: Variant[] = []
      let feedback = ""
      let attempts = 0
      let retried = false
      for (; attempts < 3 && keep.length < 3; attempts++) {
        const ask = attempts === 0 ? user : `${user}\n\nAlready accepted (do not repeat, write different ones): ${keep.map((v) => `"${v.text}"`).join(', ') || 'none'}\nYour previous answer broke mandatory rules:\n- ${feedback}\nWrite 3 new variants that follow every rule.`
        if (attempts > 0) retried = true
        const r = await callJson<{ variants: Variant[] }>(model, prompt.system, ask, "copy_variants", prompt.schema, usage)
        const problems: string[] = []
        for (const v0 of r.variants) {
          const v = finalize(v0)
          const p = violations(v.text)
          if (p.length) problems.push(...p.map((x) => `"${v.text}" ${x}`))
          else if (keep.length < 3 && !keep.some((k) => k.text.toLowerCase() === v.text.toLowerCase())) keep.push(v)
        }
        feedback = problems.join('\n- ')
      }
      const dropped = 3 - keep.length
      const variants = keep
      out[kind] = { variants, ms: briefMs + Date.now() - t1, tokens: 0, retried, attempts, dropped, brief }
    } catch (e) {
      out[kind] = { variants: [], ms: Date.now() - t1, tokens: 0, retried: false, brief, error: String(e).slice(0, 200) }
    }
  }))
  for (const k of ['headline', 'cta'] as const) if (out[k]) out[k]!.tokens = usage.tokens
  return out
}

// ─── Marke: exakte Schreibweise erzwingen ───
// Lauf 3 schrieb auf getvariante.com „better variants“ — liest sich wie die
// falsch geschriebene Marke „Variante“. Darf in keiner Variante vorkommen.
function brandList(ex: Extracted, brief: Brief): string[] {
  const fromTitle = ex.title.split(/\s[|–—·:-]\s/).map((s) => s.trim()).filter((s) => s && s.length <= 25 && s.split(/\s+/).length <= 3)
  const all = [...(brief.brand_names ?? []), ex.siteName, ...fromTitle.slice(-1)]
  return [...new Set(all.map((s) => s.trim()).filter((s) => s.length >= 3 && s.length <= 30))]
}

function lev(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  }
  return d[a.length][b.length]
}

// Geprüft wird nur der FIRMENNAME, d. h. ein Name, der in der Domain steckt
// (getvariante.com → „Variante“). Lauf 4 prüfte jeden Namen aus dem Briefing,
// auch Produktbegriffe wie „Analytics“ oder „Forms“, und schickte korrekte
// Varianten mit unsinnigem Feedback zurück.
const normBrand = (s: string) => s.toLowerCase().replace(/['’]s\b/g, '').replace(/[^\p{L}\p{N}]/gu, '')
function companyBrands(brands: string[], url: string): string[] {
  const host = normBrand(new URL(url).hostname.replace(/^www\./, '').replace(/\.[a-z]+$/, ''))
  return brands.filter((b) => { const n = normBrand(b); return n.length >= 4 && (host.includes(n) || n.includes(host)) })
}

/** Wörter, die dem Firmennamen ähneln, ihn aber nicht exakt treffen. */
function brandIssues(v: string, company: string[], pageText: string): string[] {
  const issues: string[] = []
  const words = v.match(/[\p{L}\p{N}](?:[\p{L}\p{N}.'’-]*[\p{L}\p{N}])?/gu) ?? []
  for (const brand of company) {
    for (const part of brand.split(/\s+/)) {
      const np = normBrand(part)
      if (np.length < 4) continue
      for (const w of words) {
        const nw = normBrand(w)
        if (nw === np) {
          // Gleicher Name, andere Schreibweise: nur ok, wenn die Seite selbst sie so schreibt
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

// ─── Breit testen: keine Paraphrasen, keine verlorenen Verkaufsargumente ───
const wordsOf = (s: string) => new Set((s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((w) => w.length > 2))
function tooClose(v: string, original: string): boolean {
  const a = wordsOf(v), b = wordsOf(original)
  if (!a.size || !b.size) return false
  const inter = [...a].filter((w) => b.has(w)).length
  return inter / new Set([...a, ...b]).size >= 0.6
}
// Nur echte Kaufanreize. „trial“ ist keiner (Lauf 4: „Create free account“
// statt „Start free trial“ ist ein legitimer Tausch, kein Verlust).
const SELLING_POINTS = ['free', 'kostenlos', 'gratis', 'no credit card', 'keine kreditkarte', 'ohne kreditkarte', 'guarantee', 'garantie', 'sale', 'rabatt', 'deal', '%']
function droppedSellingPoints(v: string, original: string): string[] {
  const o = original.toLowerCase(), x = v.toLowerCase()
  return SELLING_POINTS.filter((s) => o.includes(s) && !x.includes(s))
}

// ─── Automatische Checks ───
const VERBS_EN = 'help|support|start|get|try|join|buy|shop|sign|book|create|keep|fuel|donate|discover|see|learn|explore|download|order|claim|grab|follow|subscribe|send|contact|request|watch|build|launch|sync|add|save|find|choose|pick|plan|schedule|talk|chat|test|compare|view|read|register|upgrade|back|ride|go'
const VERBS_DE = 'hilf|helfen|unterstütze|unterstützen|starte|starten|hol|holen|jetzt|kaufe|kaufen|entdecke|entdecken|buche|buchen|teste|testen|sichere|sichern|melde|anmelden|erstelle|erstellen|probiere|ausprobieren|bestelle|bestellen|lade|laden|sieh|ansehen|mehr erfahren|erfahren|kontaktiere|kontakt|registriere|registrieren|vergleiche|vergleichen|abonniere|abonnieren|lege|legen|shoppe|shoppen|finde|finden|wähle|wählen|sprich|anfragen|frage'
const ACTION_START = new RegExp(`^(${VERBS_EN}|${VERBS_DE})\\b`, 'i')
function checks(v: string, original: string, kind: 'headline' | 'cta', ex: Extracted, language: string, brands: string[]): string[] {
  const flags: string[] = []
  for (const b of brandIssues(v, brands, `${ex.title} ${ex.pageText}`)) flags.push(`Marke: ${b}`)
  if (tooClose(v, original)) flags.push('zu nah am Original')
  const fo = formatOf(original).caseStyle, fv = formatOf(v).caseStyle
  // Deutsch schreibt Substantive groß — Title Case vs. Satzschreibung ist dort nicht erkennbar
  const caseOnly = language === 'German' && [fo, fv].every((c) => c === 'title' || c === 'sentence')
  if (fo !== fv && v.length > 8 && !caseOnly) flags.push(`Schreibweise: ${CASE_LABEL[fv]} statt ${CASE_LABEL[fo]}`)
  for (const s of droppedSellingPoints(v, original)) flags.push(`Verkaufsargument weg: „${s}“`)
  const src = `${ex.title} ${ex.description} ${ex.pageText} ${original}`.toLowerCase()
  if (!v.trim()) flags.push('leer')
  if (v.trim().toLowerCase() === original.trim().toLowerCase()) flags.push('identisch')
  if (tooLong(v, limitsFor(kind, original))) flags.push(`zu lang (${v.length} Zeichen)`)
  for (const n of v.match(/\d[\d.,]*\s?%?/g) ?? []) {
    if (!src.includes(n.trim().toLowerCase())) flags.push(`Zahl erfunden? „${n.trim()}“`)
  }
  for (const w of ['free', 'kostenlos', 'gratis', 'no credit card', 'keine kreditkarte', 'guarantee', 'garantie', 'garantiert']) {
    if (v.toLowerCase().includes(w) && !src.includes(w)) flags.push(`Claim nicht auf der Seite: „${w}“`)
  }
  // Rollen-Check: Headline darf keine Aufforderung sein, CTA braucht eine Aktion
  if (kind === 'headline' && ACTION_START.test(v.trim())) flags.push('Headline klingt nach Button')
  // Kein Gegen-Check für CTAs: Eine Verbliste trifft „In den Warenkorb“ oder
  // „Set up now“ nicht und meldete in Runde 3 fast nur Fehlalarme.
  const de = (v.match(DE) ?? []).length, en = (v.match(EN) ?? []).length
  if (language === 'German' && en > de && en > 0) flags.push('Sprache: EN statt DE')
  if (language === 'English' && de > en && de > 0) flags.push('Sprache: DE statt EN')
  return flags
}

// ─── Lauf ───
// Runde 5: gleiches Modell, gleiches Briefing — nur der Prompt unterscheidet sich.
const MODEL = 'gpt-5.4-mini'
const ARMS: Record<'base' | 'levers', Prompt> = {
  base: { model: MODEL, system: VARIANT_SYSTEM, schema: VARIANT_SCHEMA },
  levers: { model: MODEL, system: LEVER_SYSTEM, schema: LEVER_SCHEMA },
}
const results: unknown[] = []
// EVAL_ONLY=allbirds,test-page → nur Seiten, deren URL einen der Begriffe enthält
const only = (process.env.EVAL_ONLY ?? '').split(',').filter(Boolean)
const pages = PAGES.filter((p) => !only.length || only.some((o) => p.url.includes(o))).slice(0, Number(process.env.EVAL_LIMIT) || PAGES.length)

for (const page of pages) {
  process.stdout.write(`${page.url} … `)
  let ex: Extracted
  try {
    const res = await fetch(page.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', 'Accept-Language': 'de,en;q=0.8' },
      signal: AbortSignal.timeout(20_000),
      redirect: 'follow',
    })
    ex = extract(await res.text())
  } catch (e) {
    console.log(`Fetch-Fehler: ${String(e).slice(0, 80)}`)
    results.push({ ...page, fetchError: String(e).slice(0, 200) })
    continue
  }
  const language = detectLanguage(ex)
  // EXTRACT_ONLY=1: nur Extraktion prüfen, keine API-Calls
  if (process.env.EXTRACT_ONLY) {
    console.log(`${language} | H: ${JSON.stringify(ex.headline?.text)} | Sub: ${JSON.stringify(ex.subline.slice(0, 60))} | CTA: ${JSON.stringify(ex.cta?.text)} → ${ex.cta?.href}`)
    continue
  }
  let brief: Brief
  try {
    brief = await makeBrief(MODEL, page.url, ex)
  } catch (e) {
    console.log(`Briefing-Fehler: ${String(e).slice(0, 80)}`)
    results.push({ ...page, fetchError: `Briefing: ${String(e).slice(0, 200)}` })
    continue
  }
  // Letzter Prüflauf: nur der Kandidat fürs Produkt (Hebel-Prompt)
  const levers = await runArm(ARMS.levers, page.url, ex, language, brief)

  const elements: Record<string, unknown> = {}
  const pageBrands = companyBrands([...new Set([...(brief.brand_names ?? []), ex.siteName].filter((s) => s && s.length >= 3))], page.url)
  for (const kind of ['headline', 'cta'] as const) {
    const el = ex[kind]
    if (!el) { elements[kind] = { missing: true }; continue }
    const arms = { levers: levers[kind]! }
    for (const a of Object.values(arms)) for (const v of a.variants) v.flags = checks(v.text, el.text, kind, ex, language, pageBrands)
    elements[kind] = { original: el.text, limits: limitsFor(kind, el.text), arms }
  }
  console.log(`ok (${language}, Anrede ${brief.form_of_address})`)
  results.push({ ...page, language, title: ex.title, subline: ex.subline, ctaHref: ex.cta?.href ?? '', brief, elements })
}

writeFileSync(OUT, JSON.stringify({ ranAt: new Date().toISOString(), version: 7, models: { levers: `${MODEL} · Hebel-Prompt, harte Regeln` }, results }, null, 2))
console.log(`\nGeschrieben: ${OUT}`)
