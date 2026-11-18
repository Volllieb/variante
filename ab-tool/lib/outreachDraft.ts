// Outreach-Draft-Engine — internes Marketing-Tool.
//
// Wiederverwendung der bestehenden CRO-Engine (lib/croAnalyze.ts) für
// personalisierte Cold-Email-Entwürfe: Lead-URL rein → begründete
// Conversion-Vorschläge + fertiger, on-brand Cold-Mail-Entwurf raus.
//
// Bewusst NICHT über /api/suggestions oder /api/test-wizard/scan — die sind
// auth-/plan-/budget-gated (Kundenschutz). Hier rufen wir die Lib direkt auf.
//
// Brand-Voice: .claude/brand-voice-guidelines.md §7 (Cold-Email-Blaupause).

import { stripForCRO, extractStructure, analyzePageWithPrimary, type CROSuggestion } from '@/lib/croAnalyze'
import { isBlockedHost } from '@/lib/ssrf'
import { safeError } from '@/lib/safeLog'

const MODEL = 'gpt-4o-mini'

export interface OutreachInput {
  /** Landingpage des Leads (die beworbene Kaufseite). */
  url: string
  /** Kontext der laufenden Anzeige, z. B. "Workbook-Vorlagen, läuft seit >1 Jahr". */
  adContext?: string
  /** Absendername für die Signatur (Default: "variante"). */
  senderName?: string
  /** Erzwinge Mail-Sprache; sonst aus <html lang> abgeleitet (Default: de). */
  lang?: string
}

export interface OutreachEmail {
  subject: string
  body: string
}

export interface OutreachDraft {
  analyzedUrl: string
  pageTitle: string
  lang: string
  /** Der stärkste Erst-Test-Vorschlag — Aufhänger der Mail. */
  primary: CROSuggestion
  /** Alle Vorschläge (für Kontext / spätere Varianten). */
  suggestions: CROSuggestion[]
  email: OutreachEmail
}

const FETCH_TIMEOUT_MS = 25_000
const MAX_TITLE_LEN = 200

/** URL normalisieren + SSRF-Guard. Wirft bei ungültiger/geblockter URL. */
export function normalizeUrl(rawUrl: string): URL {
  let url = (rawUrl ?? '').trim()
  if (!url) throw new Error('url required')
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('invalid URL')
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('only http/https allowed')
  }
  if (isBlockedHost(parsed.hostname.toLowerCase())) {
    throw new Error('URL not allowed')
  }
  return parsed
}

/** Lead-Seite laden. Gibt rohes HTML + Titel + abgeleitete Sprache zurück. */
async function fetchPage(url: string): Promise<{ html: string; title: string; lang: string }> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'variante-outreach/1.0', Accept: 'text/html' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: 'follow',
  })
  if (!res.ok) {
    throw new Error(`page returned status ${res.status}`)
  }
  const html = await res.text()
  if (!html || html.length < 100) {
    throw new Error('page returned minimal content (may require JavaScript)')
  }
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim().slice(0, MAX_TITLE_LEN) ?? ''
  const lang = html.match(/<html[^>]*\slang="([a-z]{2})/i)?.[1]?.toLowerCase() ?? ''
  return { html, title, lang }
}

const EMAIL_SYSTEM_PROMPT = [
  'Du schreibst Cold-Emails für "variante" — ein Conversion-Tool für nicht-technische',
  'Unternehmer mit bezahltem Traffic. Es optimiert Headlines und Buttons, die direkt an',
  'der Kaufaktion hängen, ohne Entwickler.',
  '',
  'STIMME (Pflicht, aus der Brand-Voice-Guideline):',
  '- Ton: direkt, rational, nüchtern — wie ein Mitgründer, der dem Empfänger gerade Geld',
  '  auf dem Tisch zeigt. Premium (Trade Republic), nicht laut (AliExpress).',
  '- Kern-Argument: mehr Umsatz aus demselben Traffic, für den er eh schon zahlt.',
  '- Ein Gedanke pro Satz. Kurze Sätze. Du-Form, auf Augenhöhe.',
  '- Mit dem Problem / ihrer konkreten Anzeige öffnen, NICHT mit dem Produkt.',
  '',
  'HARTE REGELN:',
  '- Max. 90 Wörter im Body.',
  '- Genau EIN niedrigschwelliger CTA (z. B. "zeig ich dir in 10 Minuten"), kein Kaufdruck.',
  '- KEINE Emojis. KEINE Superlative/Hype ("revolutionär", "beste", "10x", "🚀").',
  '- KEINE Fake-Dringlichkeit, keine Feature-Liste als Opener.',
  '- Erste Zeile muss beweisen, dass es KEIN Massen-Mail ist: Bezug auf ihre echte Anzeige',
  '  und ein konkretes Element ihrer Seite.',
  '- Keine Versprechen über Features, die nicht genannt sind.',
  '',
  'Gib NUR ein JSON-Objekt {"subject": "...", "body": "..."} zurück. Kein Markdown.',
  'Im body stehen echte Zeilenumbrüche (\\n). Die Signatur ist der Absendername auf eigener Zeile.',
].join('\n')

/** Cold-Mail aus Analyse-Ergebnis + Anzeigenkontext generieren. */
async function generateColdEmail(params: {
  url: string
  pageTitle: string
  primary: CROSuggestion
  adContext?: string
  senderName: string
  lang: string
}): Promise<OutreachEmail> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY missing')

  const langName = params.lang === 'en' ? 'Englisch' : params.lang === 'de' ? 'Deutsch' : `der Sprache "${params.lang}"`

  const userPrompt = [
    `Schreibe die Cold-Email auf ${langName}.`,
    '',
    `Empfänger-Seite: ${params.url}`,
    params.pageTitle ? `Seitentitel: ${params.pageTitle}` : '',
    params.adContext ? `Laufende Anzeige (für die Personalisierung der ersten Zeile): ${params.adContext}` : '',
    '',
    'Konkretes Element ihrer Seite mit dem größten Conversion-Hebel:',
    `- Element: ${params.primary.element}`,
    `- Aktuell: "${params.primary.original}"`,
    `- Besserer Vorschlag: "${params.primary.variant}"`,
    `- Warum: ${params.primary.why}`,
    '',
    `Absendername für die Signatur: ${params.senderName}`,
  ].filter(Boolean).join('\n')

  const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: EMAIL_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    }),
  })

  if (!aiRes.ok) {
    const errText = await aiRes.text().catch(() => '')
    safeError('outreach-email-openai-error', { message: `status ${aiRes.status}: ${errText.slice(0, 300)}` })
    throw new Error('email generation failed')
  }

  const json = (await aiRes.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const raw = json.choices?.[0]?.message?.content
  if (!raw) throw new Error('empty AI response')

  let parsed: { subject?: string; body?: string }
  try {
    const cleaned = raw.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    safeError('outreach-email-parse-error', { message: raw.slice(0, 300) })
    throw new Error('failed to parse AI response')
  }

  const subject = (parsed.subject ?? '').trim()
  const body = (parsed.body ?? '').trim()
  if (!subject || !body) throw new Error('AI returned incomplete email')
  return { subject, body }
}

/**
 * Hauptfunktion: Lead-URL → Analyse (bestehende Engine) → Cold-Mail-Entwurf.
 * Wirft bei ungültiger URL, nicht erreichbarer Seite oder AI-Fehler.
 */
export async function generateOutreachDraft(input: OutreachInput): Promise<OutreachDraft> {
  const parsed = normalizeUrl(input.url)
  const url = parsed.toString()

  const { html, title, lang: pageLang } = await fetchPage(url)

  // Bestehende CRO-Engine wiederverwenden — identische Logik wie der Pagechecker.
  const stripped = stripForCRO(html)
  const structure = extractStructure(html)
  const { suggestions, primarySuggestionIndex } = await analyzePageWithPrimary(stripped, structure)

  if (suggestions.length === 0) {
    throw new Error('no suggestions generated')
  }
  const primary = suggestions[primarySuggestionIndex] ?? suggestions[0]

  const lang = (input.lang || pageLang || 'de').toLowerCase()
  const senderName = (input.senderName || 'variante').trim()

  const email = await generateColdEmail({
    url,
    pageTitle: title,
    primary,
    adContext: input.adContext,
    senderName,
    lang,
  })

  return {
    analyzedUrl: url,
    pageTitle: title,
    lang,
    primary,
    suggestions,
    email,
  }
}
