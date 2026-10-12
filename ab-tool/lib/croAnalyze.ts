// Wiederverwendbare CRO-Analyse — extrahiert aus /api/suggestions,
// damit Suggestions-Route und Agent-Tools (/api/agent) dieselbe Logik nutzen.
// Kein Cost-Tracking hier — das machen die Aufrufer (increment_gen_cost RPC).
// Cache-Layer: site_insights vermeidet wiederholte Fetch+Analyze (24h TTL).

import { safeError } from '@/lib/safeLog'
import { supabase } from '@/lib/supabase'
import { extractCandidates, detectPageLanguage, type ElementCandidate } from '@/lib/croExtract'
import { CRO_SYSTEM_PROMPT, FEW_SHOT_EXAMPLE, renderCandidates } from '@/lib/croPrompts'

const MODEL = 'gpt-4o-mini'

// Cache-TTL: 24 Stunden. Danach wird die Seite neu analysiert.
const CACHE_TTL_HOURS = 24

// Wie viel rohes HTML in den Prompt geht. Kandidatenliste und extrahierte
// Struktur tragen das Signal; das HTML liefert nur noch Formulierungs-Kontext.
// Vorher gingen die vollen 80 KB mit — ~25k Token pro Scan, also 12% des
// TPM-Budgets fuer eine einzige Anfrage.
const PROMPT_HTML_CHARS = 12_000

export interface CROSuggestion {
  element: string // "CTA-Button (Hero)"
  original: string // "Get Started"
  variant: string // "Start Free — No Credit Card"
  why: string // CRO-Begründung
  type?: 'text' | 'color' | 'css' | 'layout' // Art der Änderung (für Agent-Variant-Gen)
  selector?: string // CSS-Selector, falls aus dem HTML extrahierbar
}

// ─── OpenAI-Call ───

export interface AnalyzePageResult {
  suggestions: CROSuggestion[]
  /** 0-basierter Index des AI-gewählten besten Erst-Test-Elements */
  primarySuggestionIndex: number
}

/**
 * Fehlerklassen, die der Aufrufer unterscheiden kann. Frueher warf diese Datei
 * fuer JEDEN Zustand 'AI generation failed' — die Route konnte daraus nur
 * "Analyse fehlgeschlagen, versuch es erneut" machen, auch wenn ein weiterer
 * Versuch garantiert wieder scheitert (fehlendes Guthaben, falscher Key).
 */
export class AnalyzeError extends Error {
  constructor(
    readonly kind: 'no-key' | 'auth' | 'quota' | 'rate-limit' | 'upstream' | 'empty' | 'parse' | 'no-candidates',
    message: string,
  ) {
    super(message)
    this.name = 'AnalyzeError'
  }
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])
const MAX_ATTEMPTS = 3

/** Gesamtbudget fuer alle Versuche — die Route hat maxDuration 60s. */
const AI_TOTAL_BUDGET_MS = 35_000
const AI_ATTEMPT_TIMEOUT_MS = 18_000

function classifyStatus(status: number, body: string): AnalyzeError {
  if (status === 401 || status === 403) {
    return new AnalyzeError('auth', `OpenAI rejected the API key (${status})`)
  }
  if (status === 429) {
    // insufficient_quota ist KEIN Rate-Limit: erneut versuchen hilft nie.
    return /insufficient_quota|billing|exceeded your current quota/i.test(body)
      ? new AnalyzeError('quota', 'OpenAI account is out of credit')
      : new AnalyzeError('rate-limit', 'OpenAI rate limit reached')
  }
  return new AnalyzeError('upstream', `OpenAI returned ${status}`)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Ruft OpenAI mit Retry auf. Transiente Zustaende (429-Rate-Limit, 5xx,
 * Netzwerkabbruch) bekommen bis zu MAX_ATTEMPTS Versuche mit Backoff — genau
 * die Faelle, in denen der Nutzer bisher "Bitte versuche es erneut" gelesen
 * und selbst geklickt hat. Endzustaende (Key, Guthaben) brechen sofort ab.
 */
async function callOpenAI(body: unknown, apiKey: string): Promise<string> {
  const deadline = Date.now() + AI_TOTAL_BUDGET_MS
  let last: AnalyzeError | null = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const remaining = deadline - Date.now()
    if (remaining <= 1_000) break

    let res: Response
    try {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(Math.min(AI_ATTEMPT_TIMEOUT_MS, remaining)),
        body: JSON.stringify(body),
      })
    } catch (err) {
      // Timeout/Netzwerk — transient, also erneut versuchen solange Budget da ist.
      last = new AnalyzeError('upstream', err instanceof Error ? err.message : 'network error')
      safeError('croAnalyze-openai-network', { message: `attempt ${attempt}: ${last.message}` })
      const backoff = Math.min(500 * attempt, deadline - Date.now())
      if (backoff > 0) await sleep(backoff)
      continue
    }

    if (res.ok) {
      const json = await res.json() as {
        choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
      }
      const raw = json.choices?.[0]?.message?.content
      if (!raw) throw new AnalyzeError('empty', 'OpenAI returned an empty response')
      if (json.choices?.[0]?.finish_reason === 'length') {
        safeError('croAnalyze-truncated', { message: `finish_reason=length, ${raw.length} chars` })
      }
      return raw
    }

    const text = await res.text().catch(() => '')
    const err = classifyStatus(res.status, text)
    safeError('croAnalyze-openai-error', { message: `attempt ${attempt}: ${res.status} ${text.slice(0, 200)}` })
    if (err.kind === 'auth' || err.kind === 'quota') throw err
    last = err
    if (!RETRYABLE_STATUS.has(res.status)) throw err

    // Retry-After respektieren, sonst quadratischer Backoff (0.6s, 2.4s).
    const retryAfter = Number(res.headers.get('retry-after'))
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1000, 5_000)
      : 600 * attempt * attempt
    if (waitMs >= deadline - Date.now()) break
    await sleep(waitMs)
  }

  throw last ?? new AnalyzeError('upstream', 'OpenAI request failed')
}

export async function analyzePage(
  html: string,
  structure: string,
  options?: { pageGoal?: string; industry?: string }
): Promise<CROSuggestion[]> {
  const result = await analyzePageWithPrimary(html, structure, options)
  return result.suggestions
}

/**
 * Analyse mit Primary-Index fuer den Wizard.
 *
 * Das Modell waehlt AUS der Kandidatenliste (Index), es erfindet keine
 * Selektoren mehr. Der Selektor am Ergebnis stammt damit immer aus dem DOM.
 */
export async function analyzePageWithPrimary(
  html: string,
  structure: string,
  options?: { pageGoal?: string; industry?: string; candidates?: ElementCandidate[]; language?: string | null }
): Promise<AnalyzePageResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new AnalyzeError('no-key', 'OPENAI_API_KEY missing')

  const candidates = options?.candidates ?? extractCandidates(html)
  if (candidates.length === 0) {
    throw new AnalyzeError('no-candidates', 'No testable elements found in the page HTML')
  }

  const context: string[] = []
  if (options?.pageGoal) context.push(`Conversion goal of the page: ${options.pageGoal}`)
  if (options?.industry) context.push(`Industry: ${options.industry}`)
  // Ohne diesen Satz hat das Modell die deutschen Stripe-Texte in englische
  // Varianten uebersetzt — eine Variante in der falschen Sprache ist als
  // A/B-Test wertlos, egal wie gut die Copy ist.
  const language = options?.language ?? detectPageLanguage(html)
  if (language) {
    context.push(`The page is written in "${language}". Every "variant" MUST be in that language.`)
  }

  // Die Kandidatenliste und die Struktur tragen das Signal. Das rohe HTML war
  // vorher bis 80 KB gross (~25k Token pro Scan) und hat die Antwort messbar
  // nicht verbessert — es hat vor allem das TPM-Budget des OpenAI-Keys
  // aufgefressen, und genau daraus entstehen die 429, die der Nutzer als
  // "KI-Analyse fehlgeschlagen" gesehen hat.
  const prompt = [
    `Analyse this page and propose ${Math.min(4, candidates.length)} specific A/B tests — each on a DIFFERENT candidate.`,
    ...(context.length ? ['', ...context] : []),
    '',
    'CANDIDATES (choose by index — these are the only testable elements):',
    renderCandidates(candidates),
    '',
    'PAGE STRUCTURE:',
    structure || '(no structure extractable)',
    '',
    'HTML EXCERPT (for wording context only):',
    html.slice(0, PROMPT_HTML_CHARS),
    '',
    `Return ONLY the JSON object with "suggestions" (${Math.min(4, candidates.length)} items, each with a distinct "candidate") and "primarySuggestionIndex".`,
  ].join('\n')

  const raw = await callOpenAI({
    model: MODEL,
    messages: [
      { role: 'system', content: CRO_SYSTEM_PROMPT },
      { role: 'user', content: FEW_SHOT_EXAMPLE },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 2048,
    response_format: { type: 'json_object' },
  }, apiKey)

  let parsed: { suggestions?: Array<CROSuggestion & { candidate?: number }>; primarySuggestionIndex?: number }
  try {
    const cleaned = raw.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    safeError('croAnalyze-parse-error', { message: raw.slice(0, 300) })
    throw new AnalyzeError('parse', 'Could not parse the AI response')
  }

  // Index → verifizierter Selektor. Ein Vorschlag mit unbekanntem Index behaelt
  // KEINEN Selektor, statt einen erfundenen zu bekommen.
  //
  // Doppelte Kandidaten fliegen raus: auf einer Seite mit nur zwei Kandidaten
  // (news.ycombinator.com) hat das Modell dieselben zwei Elemente zweimal
  // vorgeschlagen — vier Zeilen, aber nur zwei Tests. Lieber zwei ehrliche.
  const usedCandidates = new Set<number>()
  const suggestions: CROSuggestion[] = []
  for (const s of parsed.suggestions ?? []) {
    if (suggestions.length >= 4) break
    const idx = typeof s.candidate === 'number' ? s.candidate : -1
    const candidate = idx >= 0 && idx < candidates.length ? candidates[idx] : null
    if (candidate) {
      if (usedCandidates.has(idx)) continue
      usedCandidates.add(idx)
    }
    suggestions.push({
      element: s.element ?? candidate?.text ?? 'Element',
      original: s.original ?? candidate?.text ?? '',
      variant: s.variant ?? '',
      why: s.why ?? '',
      type: s.type,
      ...(candidate ? { selector: candidate.selector } : {}),
    })
  }

  const withSelector = suggestions.findIndex((s) => s.selector)
  const primarySuggestionIndex = typeof parsed.primarySuggestionIndex === 'number'
    && parsed.primarySuggestionIndex >= 0
    && parsed.primarySuggestionIndex < suggestions.length
    && !!suggestions[parsed.primarySuggestionIndex]?.selector
    ? parsed.primarySuggestionIndex
    // Fallback: der erste Vorschlag, der wirklich einen Selektor hat — ein
    // "Best pick" ohne Selektor waere im Wizard nicht anklickbar.
    : Math.max(0, withSelector)

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
