// Variant-Generator für Nicht-Figma-Elemente (Text, Farbe, CSS, Layout).
// Das existierende /api/generate arbeitet nur mit Figma-JSON — der Agent
// braucht einen leichtgewichtigen Generator für CRO-Vorschläge.

import { safeError } from '@/lib/safeLog'

const MODEL = 'gpt-4o-mini'

export type VariantType = 'text' | 'color' | 'css' | 'layout'

export interface GenerateVariantInput {
  element: string // Beschreibung des Elements
  original: string // Original-Text/Farbe/CSS
  variantDescription: string // Was geändert werden soll
  type: VariantType
  pageContext?: string // Optional: umgebender HTML-Kontext + Style-Info (von extractStyleContext)
  selector?: string // Optional: CSS-Selector des Elements (für css/layout)
}

export interface GenerateVariantOutput {
  variant: string // Der neue Wert (Text, Hex-Code oder CSS)
  variant_html?: string // HTML-Fragment (nur bei type=text mit Ziel-Element)
  variant_css?: string // CSS-Regeln (bei type=css/layout/color)
  explanation: string // Warum diese Änderung
}

// System-Prompts mit eingebetteten Few-Shot-Beispielen. Jeder Prompt zeigt
// dem Model exakt was ein gutes Ergebnis ist — vorher gab's nur 2-3 Sätze.
// response_format: json_object garantiert strukturierten Output.

const TEXT_SHOT = `Beispiel-Eingabe:
Element: CTA-Button (Hero)
Original: "Get Started"
Gewünschte Änderung: Der CTA kommuniziert keine Risikofreiheit. Füge "No Credit Card" hinzu.

Richtige Ausgabe:
{"variant":"Start Free — No Credit Card"}

Beispiel-Eingabe:
Element: H1-Headline
Original: "Welcome to Our Platform"
Gewünschte Änderung: Die Headline ist generisch. Nutzenorientiert mit konkretem Versprechen.

Richtige Ausgabe:
{"variant":"Convert 30% More Visitors — Without Changing Your Stack"}`

const COLOR_SHOT = `Beispiel-Eingabe:
Element: CTA-Button (Hero)
Original: "#2563eb" (blau)
Gewünschte Änderung: Höherer Kontrast zum weißen Hintergrund, mehr Dringlichkeit.
Seiten-Kontext: Farbpalette: #2563eb, #1e40af, #f97316, #ffffff

Richtige Ausgabe:
{"variant":"#f97316"}

Beispiel-Eingabe:
Element: Pricing-Highlight-Badge
Original: "#6b7280" (grau)
Gewünschte Änderung: Soll auffallen und "empfohlen" signalisieren.
Seiten-Kontext: Farbpalette: #3b82f6, #10b981, #ef4444, #f59e0b, #6b7280

Richtige Ausgabe:
{"variant":"#10b981"}`

const CSS_SHOT = `Beispiel-Eingabe:
Element: CTA-Button (Hero)
Original: padding: 8px 16px; font-size: 14px
Gewünschte Änderung: Button ist zu klein und wird übersehen. Größer und prominenter.
CSS-Selector: #hero-cta

Richtige Ausgabe:
{"variant":"#hero-cta {\\n  padding: 14px 32px;\\n  font-size: 18px;\\n  font-weight: 600;\\n  border-radius: 8px;\\n  box-shadow: 0 4px 12px rgba(0,0,0,0.15);\\n}"}

Beispiel-Eingabe:
Element: Testimonial-Karten
Original: keine border-radius, kein shadow
Gewünschte Änderung: Karten wirken flach. Box-Shadow und border-radius für Tiefe.
CSS-Selector: .testimonial-card

Richtige Ausgabe:
{"variant":".testimonial-card {\\n  border-radius: 12px;\\n  box-shadow: 0 2px 8px rgba(0,0,0,0.08);\\n  transition: box-shadow 0.2s ease;\\n}\\n.testimonial-card:hover {\\n  box-shadow: 0 6px 20px rgba(0,0,0,0.12);\\n}"}`

const LAYOUT_SHOT = `Beispiel-Eingabe:
Element: Pricing-Sektion
Original: Monatliche Abrechnung als Default
Gewünschte Änderung: Jährliche Abrechnung soll Default sein + 20% Rabatt-Badge visuell hervorheben.
CSS-Selector: .pricing-toggle

Richtige Ausgabe:
{"variant":".pricing-toggle {\\n  display: flex;\\n  align-items: center;\\n  gap: 12px;\\n}\\n.pricing-toggle .yearly-option {\\n  position: relative;\\n}\\n.pricing-toggle .yearly-option::after {\\n  content: '-20%';\\n  position: absolute;\\n  top: -8px;\\n  right: -40px;\\n  background: #10b981;\\n  color: white;\\n  font-size: 12px;\\n  font-weight: 700;\\n  padding: 2px 8px;\\n  border-radius: 100px;\\n}"}

Beispiel-Eingabe:
Element: Feature-Sektion
Original: 3 Feature-Karten in einer Zeile
Gewünschte Änderung: Mobile: untereinander statt nebeneinander für bessere Lesbarkeit.
CSS-Selector: .features-grid

Richtige Ausgabe:
{"variant":"@media (max-width: 768px) {\\n  .features-grid {\\n    display: flex;\\n    flex-direction: column;\\n    gap: 24px;\\n  }\\n}"}`

const SYSTEM_PROMPTS: Record<VariantType, string> = {
  text: `Du bist ein Conversion-Copywriter. Erstelle eine textliche Variante,
die auf Conversion optimiert ist. Maximal 2 Sätze oder eine prägnante Phrase.
Orientiere dich am Tonfall der bestehenden Seite.

Gib NUR gültiges JSON zurück: {"variant": "der neue text"}`,

  color: `Du bist ein UI-Designer. Schlage EINE Farbe (Hex-Code) vor, die
den Kontrast und die visuelle Hierarchie verbessert. Wähle eine Farbe aus der
existierenden Farbpalette der Seite, wenn eine angegeben ist — nur wenn keine
passt, schlage eine neue vor.

Gib NUR gültiges JSON zurück: {"variant": "#hexcode"}`,

  css: `Du bist ein CSS-Spezialist. Erstelle CSS-Regeln für die beschriebene
Änderung. Verwende den angegebenen CSS-Selector. Halte dich an das existierende
Design-System (Klassen-Präfixe, Token-Namen aus dem Seiten-Kontext).

Gib NUR gültiges JSON zurück: {"variant": "selector {\\n  property: value;\\n}"}`,

  layout: `Du bist ein Layout-Spezialist. Erstelle CSS-Regeln die die
beschriebene Layout-Änderung umsetzen. Verwende flexbox, grid oder position.
Berücksichtige mobile Responsivität wenn sinnvoll.

Gib NUR gültiges JSON zurück: {"variant": "selector {\\n  property: value;\\n}"}`,
}

// Few-Shot-Beispiele pro Typ — wird als user/assistant-Paar vor den eigentlichen Prompt gehängt.
const FEW_SHOTS: Record<VariantType, string> = {
  text: TEXT_SHOT,
  color: COLOR_SHOT,
  css: CSS_SHOT,
  layout: LAYOUT_SHOT,
}

// Entfernt Markdown-Fences, die das Modell trotz Anweisung manchmal anhängt.
function stripFences(raw: string): string {
  return raw.replace(/^```(?:css|html|json)?\s*/i, '').replace(/```\s*$/, '').trim()
}

// JSON-Schema für structured output (wird nur als Description im System-Prompt kommuniziert,
// response_format: json_object übernimmt die Validierung serverseitig).
const OUTPUT_SCHEMA_DESC = `Output-Format (STRICT): {"variant": "..."}`

export async function generateVariantText(
  input: GenerateVariantInput
): Promise<GenerateVariantOutput> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY missing')

  const systemPrompt = SYSTEM_PROMPTS[input.type] ?? SYSTEM_PROMPTS.text
  const fewShot = FEW_SHOTS[input.type] ?? ''

  const userPrompt = [
    `Element: ${input.element}`,
    `Original: ${input.original}`,
    `Gewünschte Änderung: ${input.variantDescription}`,
    input.selector ? `CSS-Selector des Elements: ${input.selector}` : '',
    input.pageContext ? `Seiten-Kontext:\n${input.pageContext.slice(0, 2500)}` : '',
    '',
    `Gib NUR gültiges JSON zurück: {"variant": "..."}`,
  ].filter(Boolean).join('\n')

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: `${systemPrompt}\n\n${OUTPUT_SCHEMA_DESC}` },
  ]

  // Few-Shot als user/assistant-Paar (wenn vorhanden)
  if (fewShot) {
    messages.push({ role: 'user', content: fewShot })
    messages.push({ role: 'assistant', content: 'Verstanden. Ich antworte mit gültigem JSON im Format {"variant": "..."}.' })
  }

  messages.push({ role: 'user', content: userPrompt })

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    safeError('generateVariantText-openai-error', { message: `status ${res.status}: ${errText.slice(0, 200)}` })
    throw new Error('Variant generation failed')
  }

  const json = await res.json() as { choices: Array<{ message: { content: string } }> }
  const rawContent = json.choices?.[0]?.message?.content?.trim() ?? ''
  if (!rawContent) throw new Error('Empty variant generation response')

  // Parse JSON — response_format: json_object garantiert gültiges JSON
  let parsed: { variant?: string }
  try {
    const cleaned = stripFences(rawContent)
    parsed = JSON.parse(cleaned)
  } catch {
    safeError('generateVariantText-parse-error', { message: rawContent.slice(0, 200) })
    throw new Error('Failed to parse variant JSON')
  }

  const variant = (parsed.variant ?? '').trim()
  if (!variant) throw new Error('Empty variant in JSON response')

  const output: GenerateVariantOutput = {
    variant,
    explanation: input.variantDescription,
  }

  // text: variant IST die Variante. variant_html explizit setzen, damit der
  // Agent nicht selbst result.variant → variant_html mappen muss.
  if (input.type === 'text') {
    output.variant_html = variant
  }
  // color mit Selector: zusätzlich als CSS-Regel ausgeben, damit ab.js sie injecten kann.
  if (input.type === 'color' && input.selector) {
    output.variant_css = `${input.selector} { background-color: ${variant}; }`
  }
  // css/layout: variant sind die CSS-Regeln.
  if (input.type === 'css' || input.type === 'layout') {
    output.variant_css = variant
  }

  return output
}

// ─── Best-Practice-Variant (ohne User-Input) ───

const BEST_PRACTICE_SYSTEM = `Du bist ein CRO-UI-Spezialist. Generiere die EINE beste Variante für ein Element,
basierend auf bewährten Conversion-Mustern. Kein User-Input — du entscheidest autonom.

REGELN:
- Text-Buttons: füge Dringlichkeit oder Risikofreiheit hinzu ("No Credit Card", "Free", "Instant")
- Farben: höherer Kontrast zum Hintergrund, auffälliger ohne schrill zu sein
- CSS: Button größer (padding, font-size), abgerundet (border-radius), mit Schatten für Tiefe
- Niemals display:none, visibility:hidden, position:fixed/absolute, z-index
- Niemals den Text komplett ersetzen — nur optimieren
- CSS-Selektor verwenden wo angegeben

Gib NUR gültiges JSON zurück: {"variant": "...", "variant_html": "...", "variant_css": "...", "explanation": "..."}`

export interface BestPracticeInput {
  element: string       // Beschreibung
  original: string      // Original-Text/HTML
  elementType: string   // 'button' | 'headline' | 'text' | 'form' | 'element'
  selector?: string
  pageContext?: string  // Style-Kontext (Farbpalette, Klassen-Prefixe)
}

export async function generateBestPracticeVariant(
  input: BestPracticeInput
): Promise<GenerateVariantOutput> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY missing')

  const selectorHint = input.selector ? `CSS-Selector: ${input.selector}` : ''
  const contextHint = input.pageContext ? `Seiten-Kontext:\n${input.pageContext.slice(0, 2000)}` : ''

  const userPrompt = [
    `Element-Typ: ${input.elementType}`,
    `Element: ${input.element}`,
    `Original: ${input.original}`,
    selectorHint,
    contextHint,
    '',
    'Generiere die beste CRO-Variante für dieses Element. Wende bewährte Conversion-Muster an.',
    'Gib NUR gültiges JSON zurück: {"variant": "...", "variant_html": "...", "variant_css": "...", "explanation": "..."}',
  ].filter(Boolean).join('\n')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: BEST_PRACTICE_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    safeError('generateBestPracticeVariant-openai-error', { message: `status ${res.status}: ${errText.slice(0, 200)}` })
    throw new Error('Best-practice variant generation failed')
  }

  const json = await res.json() as { choices: Array<{ message: { content: string } }> }
  const rawContent = json.choices?.[0]?.message?.content?.trim() ?? ''
  if (!rawContent) throw new Error('Empty best-practice variant response')

  let parsed: { variant?: string; variant_html?: string; variant_css?: string; explanation?: string }
  try {
    const cleaned = stripFences(rawContent)
    parsed = JSON.parse(cleaned)
  } catch {
    safeError('generateBestPracticeVariant-parse-error', { message: rawContent.slice(0, 200) })
    throw new Error('Failed to parse best-practice variant JSON')
  }

  if (!parsed.variant) throw new Error('Empty variant in best-practice response')

  return {
    variant: parsed.variant,
    variant_html: parsed.variant_html,
    variant_css: parsed.variant_css,
    explanation: parsed.explanation ?? `CRO-optimierte Variante für "${input.element}"`,
  }
}
