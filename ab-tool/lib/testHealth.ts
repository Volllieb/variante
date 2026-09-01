/**
 * Server-seitiges Pendant zu compute_test_health() (db/migrations/037).
 *
 * Plan DB-02: Der DB-Trigger blockt eine Aktivierung mit fehlenden
 * Pflichtfeldern nur noch stumm (status bleibt 'draft'). Damit der Client
 * eine verständliche Fehlermeldung bekommt statt eines stillen No-Ops,
 * validieren die API-Routen (test-wizard/create, tests/[id] PATCH) hier
 * *vor* dem Schreiben — mit denselben Issue-Codes, die TestCard.tsx schon
 * fürs Health-Badge anzeigt.
 */

export const TEST_HEALTH_ISSUE_LABELS: Record<string, string> = {
  missing_name: 'No name',
  missing_site_url: 'No website',
  missing_selector: 'No element selected',
  missing_variant: 'No variant design',
  missing_goal: 'No conversion goal',
  empty_variant: 'Variant is identical to the original',
}

export interface TestHealthFields {
  name?: string | null
  site_url?: string | null
  selector?: string | null
  goal?: string | null
  variant_b_html?: string | null
  variant_b_css?: string | null
  original_html?: string | null
}

function isBlank(v: string | null | undefined): boolean {
  return !v || v.trim() === ''
}

/**
 * Normalisiert Element-Markup für den Identitätsvergleich: id-Attribut raus
 * (B erbt A's Markup ohne id — das ist kein Unterschied), Whitespace flach.
 */
function normalizeElementHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/\s+id\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s?>/g, '>')
    .trim()
}

/**
 * Gibt die Issue-Codes zurück, die eine Aktivierung ('active') blocken würden.
 *
 * `empty_variant` greift, wenn B weder eigenes CSS noch eine Text-/Markup-
 * Änderung trägt — ein Test, der 50/50 dasselbe ausliefert, verbrennt nur
 * Besucher. Die Client-Gates (leere Änderungsliste) decken den Wizard ab;
 * dieser Guard fängt auch Resume-PATCH und Altbestand-Drafts ab.
 */
export function getTestHealthIssues(fields: TestHealthFields): string[] {
  const issues: string[] = []
  if (isBlank(fields.name)) issues.push('missing_name')
  if (isBlank(fields.site_url)) issues.push('missing_site_url')
  if (isBlank(fields.selector)) issues.push('missing_selector')
  if (isBlank(fields.variant_b_html) && isBlank(fields.variant_b_css)) issues.push('missing_variant')
  if (
    isBlank(fields.variant_b_css) &&
    !isBlank(fields.original_html) &&
    !isBlank(fields.variant_b_html) &&
    normalizeElementHtml(fields.variant_b_html) === normalizeElementHtml(fields.original_html)
  ) {
    issues.push('empty_variant')
  }
  if (isBlank(fields.goal)) issues.push('missing_goal')
  return issues
}

export function describeTestHealthIssues(issues: string[]): string {
  return issues.map(code => TEST_HEALTH_ISSUE_LABELS[code] ?? code).join(', ')
}
