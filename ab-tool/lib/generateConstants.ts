/**
 * Gemeinsame Konstanten für generatePrompts.ts und generateHelpers.ts.
 * Extrahiert um Circular-Dependency zwischen den beiden zu vermeiden.
 */

/** HTML-Delimiter: Modell wrappt Output zwischen diesen Markern */
export const DELIM_START = '<<<VARIANT_HTML>>>'
export const DELIM_END = '<</VARIANT_HTML>>>'

/** CSS-Delimiter für Reorder-Mode */
export const CSS_DELIM_START = '<<<VARIANT_CSS>>>'
export const CSS_DELIM_END = '<</VARIANT_CSS>>>'

/** Geschätzte Kosten pro OpenAI-Generation (gpt-4o-mini) */
export const ESTIMATED_COST_PER_GEN = 0.005

/** Max Generationen pro Temp-Session (Figma-Onboarding) */
export const TEMP_SESSION_GEN_LIMIT = 3

/** OpenAI-Modell für die Variant-Generierung */
export const MODEL = 'gpt-4o-mini'
