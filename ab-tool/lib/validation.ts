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

/** Conversion-Goal-String */
export const goalString = z.string().max(256).nullable()

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
  variant_b_html: z.string().nullable().optional(),
  variant_b_css: z.string().nullable().optional(),
  original_html: z.string().nullable().optional(),
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

export const wizardCreateBody = z.object({
  site_url: siteUrl,
  goal: goalString.refine(
    g => g !== 'click' && g !== 'click:',
    'Click goal requires a CSS selector (e.g. "click:.cta-button")'
  ),
  selector: cssSelector.optional(),
  status: wizardStatus.optional(),
  variant_b_html: z.string().nullable().optional(),
  variant_b_css: z.string().nullable().optional(),
  original_html: z.string().nullable().optional(),
  name: testName.optional(),
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
})

// ═══════════════════════════════════════════════════════════════════
// Query-Parameter Schemas
// ═══════════════════════════════════════════════════════════════════

export const notificationsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  since: z.string().datetime().optional(),
})
