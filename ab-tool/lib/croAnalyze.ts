// Wiederverwendbare CRO-Analyse — extrahiert aus /api/suggestions,
// damit Suggestions-Route und Agent-Tools (/api/agent) dieselbe Logik nutzen.
// Kein Cost-Tracking hier — das machen die Aufrufer (increment_gen_cost RPC).

import { safeError } from '@/lib/safeLog'

const MODEL = 'gpt-4o-mini'

// Maximale HTML-Größe für die Analyse: 120KB. Reicht für die Struktur
// (Headlines, CTAs, Layout), spart Token-Kosten.
const MAX_HTML_BYTES = 120_000

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
  return cleaned.slice(0, MAX_HTML_BYTES)
}

// Extrahiert eine Struktur-Übersicht: Headlines, Buttons, Links, alt-Texte.
// Hilft dem Modell, die Seite schneller zu verstehen.
export function extractStructure(html: string): string {
  const parts: string[] = []

  // Title
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]
  if (title) parts.push(`Title: "${title.trim()}"`)

  // Meta description
  const desc = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1]
  if (desc) parts.push(`Meta description: "${desc.trim()}"`)

  // h1
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean)
  if (h1s.length) parts.push(`H1: ${h1s.join(' | ')}`)

  // h2 (max 5)
  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean).slice(0, 5)
  if (h2s.length) parts.push(`H2s: ${h2s.join(' | ')}`)

  // Buttons / CTAs (max 8)
  const buttons = [...html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean).slice(0, 8)
  if (buttons.length) parts.push(`Buttons: ${buttons.join(' | ')}`)

  // Links mit Text (nicht leer, nicht "#", max 10)
  const links = [...html.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(t => t && t !== '#').slice(0, 10)
  if (links.length) parts.push(`Links: ${links.join(' | ')}`)

  return parts.join('\n')
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
  (id oder eindeutige Klasse). Im Zweifel weglassen.`

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
export async function analyzePage(
  html: string,
  structure: string,
  options?: { pageGoal?: string; industry?: string }
): Promise<CROSuggestion[]> {
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
  let parsed: { suggestions?: CROSuggestion[] }
  try {
    const cleaned = raw.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    safeError('croAnalyze-parse-error', { message: raw.slice(0, 300) })
    throw new Error('Failed to parse AI response')
  }

  return parsed.suggestions?.slice(0, 4) ?? []
}
