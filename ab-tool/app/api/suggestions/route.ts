import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized, paymentRequired } from '@/lib/auth'
import { BLOCKED_HOSTS, BLOCKED_HOSTNAMES } from '@/lib/ssrf'
import { safeError } from '@/lib/safeLog'

export const maxDuration = 60

// Geschätzte Kosten pro Suggestion-Call (gpt-4o-mini):
// ~5K Input (gekürztes HTML + System-Prompt) + ~1K Output = ~$0.001
// Konservativ auf $0.005 gerundet.
const ESTIMATED_COST = 0.005
const MAX_MONTHLY_COST = Number(process.env.OPENAI_MAX_MONTHLY_COST) || 20
const MODEL = 'gpt-4o-mini'

// Maximale HTML-Größe für die Analyse: 120KB. Reicht für die Struktur
// (Headlines, CTAs, Layout), spart Token-Kosten.
const MAX_HTML_BYTES = 120_000

// Nur relevante HTML-Elemente für CRO-Analyse: body-Inhalt ohne scripts/styles.
// Entfernt alles was Token kostet aber keine CRO-Insights liefert.
function stripForCRO(html: string): string {
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
function extractStructure(html: string): string {
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

const SYSTEM_PROMPT = `Du bist ein CRO-Spezialist (Conversion Rate Optimization) für A/B-Tests.
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
- Format: ein JSON-Array mit 4 Objekten, jedes mit "element", "original", "variant", "why".`

// Few-Shot-Beispiel für stabiles JSON-Format
const FEW_SHOT = `Beispiel für eine SaaS-Landingpage:

{
  "suggestions": [
    {
      "element": "H1-Headline",
      "original": "Welcome to Our Platform",
      "variant": "Convert 30% More Visitors — Without Changing Your Stack",
      "why": "Die aktuelle Headline ist generisch. Eine nutzenorientierte Headline mit konkretem Versprechen steigert die Verweildauer und Conversion."
    },
    {
      "element": "CTA-Button (Hero)",
      "original": "Get Started",
      "variant": "Start Free — No Credit Card",
      "why": "Der CTA kommuniziert keine Risikofreiheit. Der Zusatz 'No Credit Card' reduziert die Einstiegshürde und erhöht die Klickrate."
    },
    {
      "element": "Pricing-Sektion",
      "original": "Monatliche Abrechnung",
      "variant": "Jährliche Abrechnung als Default + 20% Rabatt-Badge",
      "why": "Jährliche Abrechnung erhöht den Customer Lifetime Value. Ein Rabatt-Badge macht den Vorteil sofort sichtbar."
    },
    {
      "element": "Footer / Ende der Page",
      "original": "Kein Social Proof vorhanden",
      "variant": "Testimonial-Leiste: 'Bereits 2,000+ Teams optimieren mit uns' + 3 Kundenlogos",
      "why": "Ohne Social Proof fehlt die soziale Bestätigung. Kundenlogos und Nutzerzahlen bauen Vertrauen auf und reduzieren Absprünge."
    }
  ]
}`

interface Suggestion {
  element: string
  original: string
  variant: string
  why: string
}

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

export async function POST(req: Request) {
  // Auth
  const user = await getApiUser(req)
  if (!user) return unauthorized('POST, OPTIONS')

  // Pro-Gate
  if (user.plan !== 'pro' && user.plan !== 'agency') {
    return paymentRequired('POST, OPTIONS', 'Page-specific AI suggestions require a Pro plan.')
  }

  let body: { url?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  const { url: rawUrl } = body
  if (!rawUrl || typeof rawUrl !== 'string') {
    return Response.json({ error: 'url required' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  // Normalize URL
  let url = rawUrl.trim()
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`

  // SSRF-Guard
  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    return Response.json({ error: 'Invalid URL' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }
  if (BLOCKED_HOSTS.test(hostname) || BLOCKED_HOSTNAMES.includes(hostname)) {
    return Response.json({ error: 'Blocked host' }, { status: 403, headers: corsHeaders('POST, OPTIONS') })
  }

  // Cost-Limit check (gleicher RPC wie /api/generate)
  const { supabase } = await import('@/lib/supabase')
  const { data: withinLimit, error: limitErr } = await supabase.rpc('increment_gen_cost', {
    p_user_id: user.userId,
    p_amount: ESTIMATED_COST,
    p_limit: MAX_MONTHLY_COST,
  })
  if (limitErr || withinLimit === false) {
    return Response.json(
      { error: 'monthly generation limit reached', message: `OpenAI budget exhausted ($${MAX_MONTHLY_COST}/mo). Resets on the 1st.` },
      { status: 429, headers: corsHeaders('POST, OPTIONS') }
    )
  }

  // Fetch page
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  let html = ''
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'variante-cro-analyzer/1.0', 'Accept': 'text/html' },
      redirect: 'follow',
    })
    html = await res.text()
  } catch {
    return Response.json({ error: 'Site unreachable or timed out' }, { status: 502, headers: corsHeaders('POST, OPTIONS') })
  } finally {
    clearTimeout(timeout)
  }

  if (!html || html.length < 100) {
    return Response.json({ error: 'Page returned no usable content' }, { status: 422, headers: corsHeaders('POST, OPTIONS') })
  }

  // Strip + extract structure
  const structure = extractStructure(html)
  const stripped = stripForCRO(html)

  // Build prompt
  const prompt = [
    'Analysiere diese Webseite und schlage 4 spezifische A/B-Tests vor.',
    '',
    'SEITEN-STRUKTUR (extrahiert):',
    structure || '(keine Struktur extrahierbar)',
    '',
    'SEITEN-HTML (gekürzt, ohne Scripts/Styles):',
    stripped,
    '',
    'Gib NUR das JSON-Array mit 4 Vorschlägen zurück. Kein Markdown, kein wrapping.',
  ].join('\n')

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'OPENAI_API_KEY missing' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }

  try {
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: FEW_SHOT },
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
      safeError('suggestions-openai-error', { status: aiRes.status, body: errText.slice(0, 300) })
      return Response.json({ error: 'AI generation failed' }, { status: 502, headers: corsHeaders('POST, OPTIONS') })
    }

    const json = await aiRes.json() as { choices: Array<{ message: { content: string } }> }
    const raw = json.choices?.[0]?.message?.content
    if (!raw) {
      return Response.json({ error: 'Empty AI response' }, { status: 502, headers: corsHeaders('POST, OPTIONS') })
    }

    // Parse JSON (mit Fallback für Markdown-Fences)
    let parsed: { suggestions?: Suggestion[] }
    try {
      const cleaned = raw.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      safeError('suggestions-parse-error', { raw: raw.slice(0, 300) })
      return Response.json({ error: 'Failed to parse AI response' }, { status: 502, headers: corsHeaders('POST, OPTIONS') })
    }

    const suggestions = parsed.suggestions?.slice(0, 4) ?? []
    if (suggestions.length === 0) {
      return Response.json({ error: 'No suggestions generated' }, { status: 422, headers: corsHeaders('POST, OPTIONS') })
    }

    return Response.json({ suggestions, analyzed_url: url }, { headers: corsHeaders('POST, OPTIONS') })
  } catch (err) {
    safeError('suggestions-unexpected', { message: String(err) })
    return Response.json({ error: 'Internal error' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }
}
