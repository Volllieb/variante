/**
 * generatePatternVariant — Wendet ein CRO-Pattern via KI auf ein Element an.
 *
 * Ruft /api/test-wizard/generate mit dem Pattern-Prompt-Template auf.
 * Trennt UI-Logik von API-Kommunikation.
 */

import type { InspirationPattern } from './types'
import type { VariantResult } from '../NewTestDrawer'

interface GeneratePatternInput {
  pattern: InspirationPattern
  elementName: string
  original: string
  elementType: string
  selector?: string
}

/**
 * Wendet ein Pattern auf ein Element an.
 * Das Prompt-Template wird mit den Element-Informationen befüllt.
 *
 * @returns Das generierte VariantResult
 * @throws Error wenn die Generierung fehlschlägt
 */
export async function generatePatternVariant({
  pattern,
  elementName,
  original,
  elementType,
  selector,
}: GeneratePatternInput): Promise<VariantResult> {
  // Prompt-Template befüllen
  const prompt = pattern.promptTemplate
    .replace(/\{element\}/g, elementName)
    .replace(/\{original\}/g, original)
    .replace(/\{elementType\}/g, elementType)
    .replace(/\{selector\}/g, selector || elementName)

  const res = await fetch('/api/test-wizard/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      element: elementName,
      original,
      elementType,
      selector: selector || undefined,
      variantDescription: prompt,
      type: 'text',
    }),
  })

  if (!res.ok) {
    let msg = `Pattern generation failed (${res.status})`
    try {
      const err = await res.json()
      if (err.message) msg = err.message
    } catch { /* use default */ }
    throw new Error(msg)
  }

  const data: VariantResult = await res.json()
  return data
}
