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

// Echter Browser-UA + Header. Viele Seiten (z. B. hinter Cloudflare/Shops)
// blocken generische Bot-User-Agents mit Connection-Reset → "fetch failed".
const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
}

/** Toggelt www. vor dem Host (für den Retry bei Netzwerkfehlern). */
function toggleWww(url: URL): string {
  const u = new URL(url.toString())
  u.hostname = u.hostname.startsWith('www.') ? u.hostname.slice(4) : `www.${u.hostname}`
  return u.toString()
}

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

/** Einzelner Fetch-Versuch. Wirft bei Netzwerkfehler oder !ok. */
async function fetchOnce(target: string): Promise<string> {
  const res = await fetch(target, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: 'follow',
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  return res.text()
}

/**
 * Lead-Seite laden. Gibt rohes HTML + Titel + abgeleitete Sprache zurück.
 * Bei Netzwerkfehler (DNS/TLS/Reset) ein Retry mit getoggeltem www.
 */
async function fetchPage(parsed: URL): Promise<{ html: string; title: string; lang: string }> {
  let html = ''
  try {
    html = await fetchOnce(parsed.toString())
  } catch (first) {
    const firstMsg = first instanceof Error ? first.message : String(first)
    // Netzwerkfehler (nicht HTTP-Status) → www-Variante probieren.
    if (!/^HTTP \d/.test(firstMsg)) {
      try {
        html = await fetchOnce(toggleWww(parsed))
      } catch {
        throw new Error(`Seite nicht erreichbar (${firstMsg}). Blockt evtl. automatisierte Zugriffe oder braucht JavaScript.`)
      }
    } else {
      throw new Error(`Seite antwortete mit ${firstMsg}.`)
    }
  }

  if (!html || html.length < 100) {
    throw new Error('Seite lieferte kaum Inhalt (rendert wahrscheinlich per JavaScript).')
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

  const { html, title, lang: pageLang } = await fetchPage(parsed)

  // Bestehende CRO-Engine wiederverwenden — identische Logik wie der Pagechecker.
  // Kontext schärft die Vorschläge: Lead-Seiten sind Anzeigen-Landingpages mit
  // bezahltem Traffic, Ziel = Direktkauf. Das lenkt die Analyse auf umsatznahe,
  // konkrete Varianten statt generischer Texttipps.
  const pageGoal = input.adContext
    ? `Direktkauf / Sales — Anzeigen-Landingpage mit bezahltem Traffic. Beworbenes Angebot: ${input.adContext}`
    : 'Direktkauf / Sales — Anzeigen-Landingpage mit bezahltem Traffic'
  const stripped = stripForCRO(html)
  const structure = extractStructure(html)
  const { suggestions, primarySuggestionIndex } = await analyzePageWithPrimary(stripped, structure, {
    pageGoal,
    industry: input.adContext,
  })

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
