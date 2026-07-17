// CRO-Analyse für das Hybrid-Onboarding (Plan §3.1 Schritt 4).
//
// Folgt dem Pattern von lib/croAnalyze.ts: roher fetch() gegen
// /v1/chat/completions mit response_format: json_object. Kein generateObject —
// das AI-SDK ist im Codebase nur in der Agent-Tool-Loop (/api/agent) im Einsatz.
//
// Unterschied zu analyzePage(): multimodal. Der Screenshot geht als image_url
// mit, damit das Modell den visuellen Kontext hat (Ghost-Button auf Gradient
// sieht man nicht im HTML). Die SELEKTOREN kommen aber ausschließlich aus dem
// HTML — das ist der ganze Punkt von Option A (Plan §0b).
//
// Arbeitsteilung Modell ↔ Server (Abweichung vom Plan-Entwurf, siehe unten):
//   Modell:  changes[] mit selector + sauberem CSS + rationale.
//   Server:  !important anhängen, injectedCss bauen, Highlight-Outlines bauen.
// Der Plan (§3.1) lässt das Modell injectedCss INKLUSIVE Highlight-Outlines
// schreiben. Das ginge live schief: §3.6 liefert genau dieses injectedCss später
// per Snippet an echte Besucher aus — die säßen dann vor gelb umrandeten Buttons.
// Deshalb: Live-CSS und Preview-Deko sind hier zwei getrennte Strings.

import * as cheerio from 'cheerio'
import { safeError } from '@/lib/safeLog'
import { sanitizeCss } from '@/lib/sanitize'
import type { ExtractedPage } from '@/lib/extractPageCode'

// Plan §7 Punkt 2: gpt-4o für die Preview (der Aha-Moment rechtfertigt $0.01),
// gpt-4o-mini für Refine (reiner CSS-Tweak).
const MODEL_PREVIEW = 'gpt-4o'
const MODEL_REFINE = 'gpt-4o-mini'

const MAX_CHANGES = 4

export interface PreviewChange {
  id: string
  selector: string
  css: string
  rationale: string
  highlightColor: string
}

export interface PreviewAnalysis {
  changes: PreviewChange[]
  /** Live-CSS: nur die Änderungen, mit !important. Geht später als variant_b_css raus. */
  injectedCss: string
  summary: string
}

const HIGHLIGHT_PALETTE = ['#FFD700', '#0D99FF', '#FF6B6B', '#4ADE80']

const SYSTEM_PROMPT = `You are a CRO (conversion rate optimization) expert who writes CSS.

You receive a screenshot of a page, the page's real HTML, and a list of candidate
elements with VERIFIED CSS selectors extracted from that HTML server-side.

Your job: pick 2-4 elements and describe a higher-converting visual variant of each,
expressed purely as CSS.

HARD RULES:
1. The "selector" of every change MUST be copied verbatim from the candidate element
   list. Never invent, simplify or shorten a selector. Never guess one from the
   screenshot. If an element you want to change is not in the candidate list, pick a
   different element.
2. "css" is a plain CSS declaration list (e.g. "background: #0D99FF; color: #fff;").
   No selector, no braces, no !important — the server adds that.
3. Only visual properties: color, background, border, border-radius, padding, margin,
   font-size, font-weight, letter-spacing, line-height, text-transform, box-shadow,
   opacity, display (flex/block/inline-flex only), gap, width, max-width, text-align.
4. Never use: position: fixed, position: absolute, display: none, visibility: hidden,
   z-index, transform, content, @import, url() with anything but https:.
5. Whatever you change, the element must stay READABLE — if you set a background,
   set a matching color too. If you enlarge text, keep it inside its container.
6. Focus on what actually moves conversion: CTA contrast and size, headline clarity
   and hierarchy, trust signals, pricing emphasis. No decorative changes.

Respond with JSON only:
{
  "changes": [
    { "selector": "<verbatim from candidates>", "css": "<declarations>", "rationale": "<one sentence, why this lifts conversion>" }
  ],
  "summary": "<short sentence naming what changed>"
}`

interface RawChange {
  selector?: unknown
  css?: unknown
  rationale?: unknown
}

/**
 * Analysiert Screenshot + echten Seitencode und gibt DOM-verifizierte
 * CSS-Changes zurück. Wirft bei API-/Parse-Fehlern.
 *
 * `page.elements` ist die Kandidatenliste — nur daraus darf das Modell wählen.
 * Fehlt sie (Fallback: fetch schlug fehl, nur Screenshot da), läuft die Analyse
 * im Screenshot-only-Modus mit entsprechend schlechterer Selektor-Genauigkeit
 * (Plan §5, "fetch(url) schlägt fehl").
 */
export async function analyzePreview(
  url: string,
  screenshotUrl: string,
  page: ExtractedPage | null
): Promise<PreviewAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY missing')

  const hasCode = Boolean(page?.elements?.length)

  const promptParts: string[] = [`Page: ${url}`]
  if (page?.title) promptParts.push(`Title: ${page.title}`)

  if (hasCode) {
    promptParts.push(
      '',
      'CANDIDATE ELEMENTS (selectors verified against the real DOM — copy one verbatim into "selector"):',
      page!.elements!.map((e) => `- ${e.selector}  [${e.kind}, <${e.tag}>]  text: "${e.text}"`).join('\n')
    )
    if (page!.css) {
      promptParts.push('', 'CSS CONTEXT (design tokens and matched rules):', truncate(page!.css, 6000))
    }
    if (page!.html) {
      promptParts.push('', 'PAGE HTML (body, scripts/styles stripped):', truncate(page!.html, 24_000))
    }
  } else {
    // Ohne Code-Kontext ist jeder Selektor geraten. Das Modell soll dann bei den
    // konservativsten Selektoren bleiben, statt sich Klassennamen auszudenken.
    promptParts.push(
      '',
      'NOTE: The page code could not be fetched. Only the screenshot is available.',
      'Use ONLY simple, near-certain selectors: h1, h2, header a, main button, form button.',
      'Do not invent class names — a wrong selector means the change never applies.'
    )
  }

  promptParts.push('', 'Return the JSON object described in the system prompt.')

  const parsed = await callOpenAI(apiKey, MODEL_PREVIEW, [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'text', text: promptParts.join('\n') },
        { type: 'image_url', image_url: { url: screenshotUrl } },
      ],
    },
  ])

  const changes = normalizeChanges(parsed.changes, page)
  if (changes.length === 0) throw new Error('No usable changes generated')

  return {
    changes,
    injectedCss: buildInjectedCss(changes),
    summary: typeof parsed.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim().slice(0, 200)
      : changes.map((c) => c.rationale).join(' '),
  }
}

/**
 * Verfeinert bestehende Changes anhand von User-Feedback ("make the button more
 * rounded"). gpt-4o-mini reicht — kein Vision, kein Neu-Analysieren, nur ein
 * CSS-Tweak auf einer bereits gefundenen Selektor-Menge.
 *
 * Die Selektoren sind eingefroren: Refine darf CSS ändern, aber keine neuen
 * Elemente erfinden — sonst verlieren wir die DOM-Verifikation aus der Analyse.
 */
export async function refinePreview(
  changes: PreviewChange[],
  feedback: string,
  changeId?: string
): Promise<PreviewAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY missing')

  const target = changeId ? changes.find((c) => c.id === changeId) : undefined
  const scope = target
    ? `Only modify the change with id "${target.id}" (selector ${target.selector}). Return the others unchanged.`
    : 'Modify whichever changes the feedback applies to. Return the others unchanged.'

  const prompt = [
    'Current variant changes:',
    JSON.stringify(changes.map((c) => ({ id: c.id, selector: c.selector, css: c.css, rationale: c.rationale })), null, 2),
    '',
    `User feedback: "${feedback.slice(0, 500)}"`,
    '',
    scope,
    'Keep every "id" and "selector" EXACTLY as given — never add, remove or rewrite a selector.',
    'Return the same JSON shape: { "changes": [{ "id", "selector", "css", "rationale" }], "summary" }.',
  ].join('\n')

  const parsed = await callOpenAI(apiKey, MODEL_REFINE, [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ])

  // Selektor-Whitelist: nur was schon in changes stand, überlebt.
  const allowed = new Map(changes.map((c) => [c.selector, c]))
  const refined = normalizeChanges(parsed.changes, null, allowed)
  if (refined.length === 0) throw new Error('Refine produced no usable changes')

  return {
    changes: refined,
    injectedCss: buildInjectedCss(refined),
    summary: typeof parsed.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim().slice(0, 200)
      : refined.map((c) => c.rationale).join(' '),
  }
}

// ─── OpenAI ───

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<Record<string, unknown>>
}

async function callOpenAI(
  apiKey: string,
  model: string,
  messages: ChatMessage[]
): Promise<{ changes?: unknown; summary?: unknown }> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    safeError('previewAnalyze-openai-error', { message: `status ${res.status}: ${errText.slice(0, 300)}` })
    throw new Error('AI generation failed')
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const raw = json.choices?.[0]?.message?.content
  if (!raw) throw new Error('Empty AI response')

  try {
    const cleaned = raw.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    safeError('previewAnalyze-parse-error', { message: raw.slice(0, 300) })
    throw new Error('Failed to parse AI response')
  }
}

// ─── Normalisierung & Validierung ───

/**
 * Filtert die Modell-Ausgabe auf das, was wir gefahrlos rendern und später live
 * ausliefern können: Selektor existiert im DOM, CSS ist harmlos und nicht leer.
 * Alles andere fliegt raus — lieber zwei gute Changes als vier halbgare.
 */
function normalizeChanges(
  raw: unknown,
  page: ExtractedPage | null,
  allowedSelectors?: Map<string, PreviewChange>
): PreviewChange[] {
  if (!Array.isArray(raw)) return []

  const verify = buildSelectorVerifier(page, allowedSelectors)
  const out: PreviewChange[] = []
  const seen = new Set<string>()

  for (const item of raw as RawChange[]) {
    if (out.length >= MAX_CHANGES) break
    const selector = typeof item?.selector === 'string' ? item.selector.trim() : ''
    const css = typeof item?.css === 'string' ? item.css : ''
    const rationale = typeof item?.rationale === 'string' ? item.rationale.trim() : ''
    if (!selector || !css) continue
    if (seen.has(selector)) continue
    if (!verify(selector)) continue

    const safeCss = sanitizeDeclarations(css)
    if (!safeCss) continue

    seen.add(selector)
    out.push({
      id: `change-${out.length + 1}`,
      selector,
      css: safeCss,
      rationale: rationale.slice(0, 200) || 'Higher-contrast variant of this element.',
      highlightColor: HIGHLIGHT_PALETTE[out.length % HIGHLIGHT_PALETTE.length],
    })
  }

  return out
}

/**
 * Selektor-Prüfung, in absteigender Härte:
 *   1. Refine  → nur Selektoren die vorher schon da waren.
 *   2. Option A → gegen das echte HTML matchen (der 99%-Fall aus Plan §0b).
 *   3. Fallback → nur eine kleine Whitelist trivialer Selektoren.
 */
function buildSelectorVerifier(
  page: ExtractedPage | null,
  allowedSelectors?: Map<string, PreviewChange>
): (selector: string) => boolean {
  if (allowedSelectors) return (s) => allowedSelectors.has(s)

  if (page?.html) {
    const $ = cheerio.load(page.html)
    const candidates = new Set((page.elements ?? []).map((e) => e.selector))
    return (s) => {
      // Kandidatenliste ist der Normalfall; ein Selektor der nicht daher stammt,
      // muss wenigstens im DOM etwas treffen.
      if (candidates.has(s)) return true
      try {
        return $(s).length > 0
      } catch {
        return false
      }
    }
  }

  // Screenshot-only: alles was nach ausgedachtem Klassennamen aussieht, raus.
  const SAFE_FALLBACK = /^(?:h[1-6]|p|button|a|form|header|main|section|nav)(?:\s+(?:h[1-6]|p|button|a))?$/
  return (s) => SAFE_FALLBACK.test(s.trim())
}

// Eigenschaften die Layout oder Sichtbarkeit der Fremdseite zerlegen können
// (Plan §5, "AI schreibt CSS das nicht funktioniert").
const BANNED_PROPERTY = /^(?:position|z-index|content|behavior|transform|animation|transition|inset|top|right|bottom|left|float|clip|clip-path|pointer-events|will-change|filter|backdrop-filter)$/
const BANNED_VALUE = /(?:expression\s*\(|javascript:|vbscript:|<\/?\s*style)/i

/**
 * Zerlegt die Deklarationsliste, wirft verbotene Properties/Werte raus und
 * hängt !important an — das braucht es, um gegen die Original-Styles der Seite
 * durchzukommen.
 */
function sanitizeDeclarations(css: string): string {
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

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}\n… [truncated]` : s
}
