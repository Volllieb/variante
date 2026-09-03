/**
 * Zod-Validierungsschemas für alle API-Routen.
 *
 * Vorher: Jede Route validierte manuell mit if/typeof/Längen-Checks —
 * inkonsistent, fehleranfällig, ~200 Zeilen Duplikation.
 *
 * Jetzt: Single Source of Truth. Zod v4 mit .describe() für LLM-Kontext
 * (agentTools.ts) und .refine() für Cross-Field-Validierung.
 */

import { z } from 'zod'

// ═══════════════════════════════════════════════════════════════════
// Primitive Schemas (wiederverwendbar)
// ═══════════════════════════════════════════════════════════════════

/** UUID v4 — ersetzt den in assign/event duplizierten UUID_RE-Regex */
export const testId = z.string().uuid()

/** URL mit Längenlimit (DB-Constraint) */
export const siteUrl = z.string().min(1).max(2048)

/** Test-Name */
export const testName = z.string().min(1).max(256)

/** CSS-Selector (optional, nullable in manchen Kontexten) */
export const cssSelector = z.string().max(512).nullable()

/**
 * Conversion-Goal-String.
 *
 * `url:<pfad>` wird abgelehnt (Katalog RUN-03): Das Dashboard bot den Zieltyp
 * an, ab.js hat ihn nie implementiert. Der Wert landete ungeprueft als
 * CSS-Selektor in `e.target.closest()`, der SyntaxError verschwand im catch der
 * Event-Delegation, und der Test zaehlte auf BEIDEN Armen dauerhaft null
 * Conversions — ohne Fehlermeldung. Solange die Auslieferung das nicht kann,
 * darf es hier auch nicht entstehen. Bestandszeilen bleiben unangetastet und
 * werden im Dashboard als nicht getrackt ausgewiesen.
 */
export const goalString = z
  .string()
  .max(256)
  .nullable()
  .refine(
    g => !(typeof g === 'string' && g.trim().toLowerCase().startsWith('url:')),
    'URL goals are not supported yet — use a click goal (e.g. "click:.cta-button")'
  )

/** Traffic-Split 0-100 (Prozent) */
export const trafficSplit = z.number().finite().min(0).max(100)

/** Minimale Visitors pro Arm */
export const minVisitors = z.number().int().min(0)

/** Minimaler Uplift (0-100%). POST hatte nur >=0, PATCH hat 0-100 */
export const minUplift = z.number().min(0).max(100)

/** Signifikanzniveau */
export const significanceLevel = z.union([z.literal(0.9), z.literal(0.95), z.literal(0.99)])

/** Test-Status (volle Enum, für PATCH) */
export const testStatus = z.enum(['draft', 'active', 'paused', 'done'])

/** Test-Status für Wizard-Create (done nicht erlaubt) */
export const wizardStatus = z.enum(['draft', 'active', 'paused'])

/** Variant-Typ für AI-Generierung */
export const variantType = z.enum(['text', 'color', 'css', 'layout'])

/** Conversion-Ziel für Agent/Suggestions */
export const pageGoal = z.enum(['signups', 'purchases', 'engagement'])

// ═══════════════════════════════════════════════════════════════════
// Request Body Schemas
// ═══════════════════════════════════════════════════════════════════

export const createTestBody = z.object({
  name: testName,
  site_url: siteUrl,
  selector: cssSelector.optional(),
  goal: goalString.optional(),
  traffic_split: trafficSplit.optional(),
  min_visitors: minVisitors.optional(),
  min_uplift: minUplift.optional(),
  significance_level: significanceLevel.optional(),
})

export const updateTestBody = z.object({
  name: testName.optional(),
  status: testStatus.optional(),
  site_url: siteUrl.optional(),
  selector: cssSelector.optional(),
  goal: goalString.optional(),
  traffic_split: trafficSplit.optional(),
  min_visitors: minVisitors.optional(),
  min_uplift: minUplift.optional(),
  significance_level: significanceLevel.optional(),
  winner: z.enum(['A', 'B']).optional(),
  variant_b_html: z.string().nullable().optional(),
  variant_b_css: z.string().nullable().optional(),
  original_html: z.string().nullable().optional(),
  // Styles der Zielseite — Basis der Varianten-Vorschau (lib/previewDoc.ts).
  // Limit wie in captureBody, das denselben collectCss-Output entgegennimmt.
  site_css: z.string().max(50_000).nullable().optional(),
  // Änderungsliste des Wizard (Delta-Modell) — reist als JSON-String.
  variant_b_changes: z.string().max(50_000).nullable().optional(),
  element_type: z.string().max(64).nullable().optional(),
  variant_text: z.string().max(2000).nullable().optional(),
  explanation: z.string().max(2000).nullable().optional(),
})

export const captureBody = z.object({
  testId: testId,
  selector: z.string().min(1),
  original_html: z.string().max(50_000).optional(),
  site_css: z.string().max(50_000).optional(),
  framework: z.string().optional(),
  goal_candidates: z.unknown().optional(),
  reorder_selector: z.string().optional(),
})

export const generateBody = z.object({
  testId: testId,
  frameContent: z.unknown().optional(),
  feedback: z.string().optional(),
  previousHtml: z.string().optional(),
  scope: z.enum(['text', 'color']).optional(),
  mode: z.enum(['content', 'reorder', 'both']).optional(),
  userInstructions: z.string().optional(),
  selector_b: z.string().optional(),
})

/**
 * Goal für den Wizard-Create: nicht nullable, url:-Goals abgelehnt (Katalog
 * RUN-03) und "click"/"click:" ohne Ziel abgelehnt — ab.js würde den leeren
 * Selektor als SyntaxError schlucken und der Test zählte dauerhaft null.
 * Case-/Whitespace-tolerant wie der Picker.
 */
const wizardGoal = z
  .string()
  .max(256)
  .refine(
    g => !g.trim().toLowerCase().startsWith('url:'),
    'URL goals are not supported yet — use a click goal (e.g. "click:.cta-button")'
  )
  .refine(
    g => !['click', 'click:'].includes(g.trim().toLowerCase()),
    'Click goal requires a CSS selector (e.g. "click:.cta-button")'
  )

export const wizardCreateBody = z.object({
  site_url: siteUrl,
  goal: wizardGoal,
  selector: cssSelector.optional(),
  // Die Route verlangt den Status — required statt optional, damit ein
  // fehlender Wert als 400 statt als Undefined-Sonderfall ankommt.
  status: wizardStatus,
  variant_b_html: z.string().nullable().optional(),
  variant_b_css: z.string().nullable().optional(),
  original_html: z.string().nullable().optional(),
  site_css: z.string().max(50_000).nullable().optional(),
  name: testName.optional(),
  // Änderungsliste des Wizard (Delta-Modell) — reist als JSON-String.
  variant_b_changes: z.string().max(50_000).nullable().optional(),
  element_type: z.string().max(64).nullable().optional(),
  variant_text: z.string().max(2000).nullable().optional(),
  explanation: z.string().max(2000).nullable().optional(),
})

export const wizardDraftBody = z.object({
  step: z.number().optional(),
  url: z.string().max(2048).nullable().optional(),
  selector: z.string().max(512).nullable().optional(),
  original_html: z.string().max(50_000).nullable().optional(),
  variant_b_html: z.string().max(50_000).nullable().optional(),
  variant_b_css: z.string().max(50_000).nullable().optional(),
  variant_text: z.string().nullable().optional(),
  goal: z.string().nullable().optional(),
  goal_selector: z.string().nullable().optional(),
  auto_name: z.string().nullable().optional(),
  // Änderungsliste des Wizard (Delta-Modell) — reist als JSON-String.
  variant_b_changes: z.string().max(50_000).nullable().optional(),
  element_type: z.string().max(64).nullable().optional(),
  element_name: z.string().max(256).nullable().optional(),
})

export const wizardGenerateBody = z.object({
  element: z.string().min(1).max(2000),
  original: z.string().min(1),
  variantDescription: z.string().max(2000).optional(),
  type: variantType.optional(),
  pageContext: z.string().optional(),
  selector: z.string().optional(),
  elementType: z.string().optional(),
})

export const addDomainBody = z.object({
  url: z.string().min(1),
})

export const agentBody = z.object({
  domain: z.string().min(1),
  pageGoal: pageGoal.optional(),
})

export const suggestionsBody = z.object({
  url: z.string().min(1),
})

export const eventBody = z.object({
  testId: testId,
  variant: z.enum(['A', 'B']),
  event: z.literal('conversion').optional().default('conversion'), // optional für alte ab.js-Versionen
  token: z.string().optional(), // optional für Graceful Degradation
})

export const snippetCheckBody = z.object({
  site_url: z.string().min(1),
  // Zusaetzlich zu site_url auch die Seiten pruefen, auf denen der User Tests
  // laufen hat. Optional und default aus, damit der Onboarding-Flow
  // (Domain verbinden -> verify) unveraendert nur die eine URL prueft.
  include_pages: z.boolean().optional(),
})

// ═══════════════════════════════════════════════════════════════════
// Query-Parameter Schemas
// ═══════════════════════════════════════════════════════════════════

export const notificationsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  since: z.string().datetime().optional(),
})

/**
 * `variant_b_changes` reist als JSON-String über den Draht (zod-Längenlimit),
 * gespeichert wird ein jsonb-Objekt. Supabase-js kann nur Objekte zuverlässig
 * in jsonb-Spalten schreiben — geparst wird deshalb hier, genau einmal.
 * Unparsebares JSON wird zu null (Bestandsdaten verlieren nichts; die Spalte
 * ist neu und nullable).
 */
export function parseChangesJson(raw: string | null | undefined): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
