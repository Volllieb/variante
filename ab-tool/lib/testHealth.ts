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
}

export interface TestHealthFields {
  name?: string | null
  site_url?: string | null
  selector?: string | null
  goal?: string | null
  variant_b_html?: string | null
  variant_b_css?: string | null
}

function isBlank(v: string | null | undefined): boolean {
  return !v || v.trim() === ''
}

/** Gibt die Issue-Codes zurück, die eine Aktivierung ('active') blocken würden. */
export function getTestHealthIssues(fields: TestHealthFields): string[] {
  const issues: string[] = []
  if (isBlank(fields.name)) issues.push('missing_name')
  if (isBlank(fields.site_url)) issues.push('missing_site_url')
  if (isBlank(fields.selector)) issues.push('missing_selector')
  if (isBlank(fields.variant_b_html) && isBlank(fields.variant_b_css)) issues.push('missing_variant')
  if (isBlank(fields.goal)) issues.push('missing_goal')
  return issues
}

export function describeTestHealthIssues(issues: string[]): string {
  return issues.map(code => TEST_HEALTH_ISSUE_LABELS[code] ?? code).join(', ')
}
