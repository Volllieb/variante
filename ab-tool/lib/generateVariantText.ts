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
  pageContext?: string // Optional: umgebender HTML-Kontext
  selector?: string // Optional: CSS-Selector des Elements (für css/layout)
}

export interface GenerateVariantOutput {
  variant: string // Der neue Wert (Text, Hex-Code oder CSS)
  variant_html?: string // HTML-Fragment (nur bei type=text mit Ziel-Element)
  variant_css?: string // CSS-Regeln (bei type=css/layout/color)
  explanation: string // Warum diese Änderung
}

const SYSTEM_PROMPTS: Record<VariantType, string> = {
  text: `Du bist ein Conversion-Copywriter. Erstelle eine textliche Variante,
die auf Conversion optimiert ist. Halte dich kurz — maximal 2 Sätze oder
eine prägnante Phrase. Gib NUR den neuen Text zurück, keine Erklärungen,
keine Anführungszeichen.`,

  color: `Du bist ein UI-Designer. Schlage eine Farbe vor, die den Kontrast
und die visuelle Hierarchie verbessert. Gib NUR den Hex-Code zurück (z.B. "#f97316").
Keine Erklärungen, kein CSS.`,

  css: `Du bist ein CSS-Spezialist. Erstelle CSS-Regeln für die beschriebene
Änderung. Gib NUR CSS zurück, keine Erklärungen, kein HTML, keine Markdown-Fences.`,

  layout: `Du bist ein Layout-Spezialist. Erstelle CSS-Regeln, die die
beschriebene Layout-Änderung umsetzen. Verwende flexbox, grid oder
position. Gib NUR CSS zurück, keine Erklärungen, keine Markdown-Fences.`,
}

// Entfernt Markdown-Fences, die das Modell trotz Anweisung manchmal anhängt.
function stripFences(raw: string): string {
  return raw.replace(/^```(?:css|html|json)?\s*/i, '').replace(/```\s*$/, '').trim()
}

export async function generateVariantText(
  input: GenerateVariantInput
): Promise<GenerateVariantOutput> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY missing')

  const systemPrompt = SYSTEM_PROMPTS[input.type] ?? SYSTEM_PROMPTS.text

  const userPrompt = [
    `Element: ${input.element}`,
    `Original: ${input.original}`,
    `Gewünschte Änderung: ${input.variantDescription}`,
    input.selector ? `CSS-Selector des Elements: ${input.selector}` : '',
    input.pageContext ? `Seiten-Kontext: ${input.pageContext.slice(0, 2000)}` : '',
  ].filter(Boolean).join('\n')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    safeError('generateVariantText-openai-error', { message: `status ${res.status}: ${errText.slice(0, 200)}` })
    throw new Error('Variant generation failed')
  }

  const json = await res.json() as { choices: Array<{ message: { content: string } }> }
  const raw = stripFences(json.choices?.[0]?.message?.content?.trim() ?? '')

  if (!raw) throw new Error('Empty variant generation response')

  const output: GenerateVariantOutput = {
    variant: raw,
    explanation: input.variantDescription,
  }

  // text: raw IST die Variante. variant_html explizit setzen, damit der
  // Agent nicht selbst result.variant → variant_html mappen muss.
  if (input.type === 'text') {
    output.variant_html = raw
  }
  // color mit Selector: zusätzlich als CSS-Regel ausgeben, damit ab.js sie injecten kann.
  if (input.type === 'color' && input.selector) {
    output.variant_css = `${input.selector} { background-color: ${raw}; }`
  }
  // css/layout: raw sind die CSS-Regeln.
  if (input.type === 'css' || input.type === 'layout') {
    output.variant_css = raw
  }

  return output
}
