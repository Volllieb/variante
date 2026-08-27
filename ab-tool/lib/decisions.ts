// Entscheidungs-Ableitung für die Dashboard-Overview.
//
// Die Overview beantwortet genau eine Frage: "Welcher Test will gerade etwas
// von mir?". Diese Datei enthält die Klassifizierung — rein, ohne DB und ohne
// React, damit sie als Node-Test läuft.
//
// Die Schwellen und die Gewinner-Logik kommen aus lib/significance.ts und
// werden hier NICHT nachgebaut. Eine zweite Wahrheit darüber, wann ein
// Ergebnis belastbar ist, ließe Cron und Dashboard dem Kunden gegenseitig
// widersprechen.

import {
  calcSignificance,
  evaluateWinner,
  hasSampleRatioMismatch,
  MIN_VISITORS_PER_ARM,
} from './significance'

/* ── Typen ── */

export type DecisionKind =
  | 'winner'
  | 'ready'
  | 'broken-data'
  | 'health'
  | 'draft'
  | 'stalled'

export type DecisionSeverity = 'ok' | 'pro' | 'err'

/**
 * Der Feld-Ausschnitt, den die Klassifizierung braucht. Bewusst strukturell
 * und nicht `TestRow` aus der Karte: lib/ soll nicht von app/ abhängen.
 */
export type DecisionTest = {
  id: string
  name: string
  status: string
  winner: string | null
  created_at: string
  visitors_a?: number | null
  visitors_b?: number | null
  conversions_a?: number | null
  conversions_b?: number | null
  health_status?: string | null
  health_issues?: string[] | null
  traffic_split?: number | null
  min_visitors?: number | null
  min_uplift?: number | null
}

export type Decision = {
  testId: string
  testName: string
  kind: DecisionKind
  severity: DecisionSeverity
  /** Grund im Klartext — was der User wissen muss, ohne die Zahlen zu lesen. */
  headline: string
  /** Primäre Aktion. `href: null` = der Aufrufer muss den Wizard öffnen. */
  action: { label: string; href: string | null }
}

/** Reihenfolge = Priorität. Die erste zutreffende Regel gewinnt. */
export const DECISION_ORDER: DecisionKind[] = [
  'winner',
  'ready',
  'broken-data',
  'health',
  'draft',
  'stalled',
]

export function decisionRank(kind: DecisionKind): number {
  const i = DECISION_ORDER.indexOf(kind)
  return i === -1 ? DECISION_ORDER.length : i
}

/** Ab hier läuft ein Test "schon lange" — doppelte Mindestlaufzeit. */
export const STALLED_AFTER_DAYS = 14

/** Hochrechnung: dauert es länger, ist Warten keine Strategie mehr. */
export const STALLED_PROJECTION_DAYS = 30

/* ── Restweg bis zur Entscheidung ── */

/**
 * Zeitbasis für alles, was gerendert wird: Mitternacht UTC des laufenden Tages.
 *
 * ponytail: Die Testkarte rechnete mit Date.now(). Zwischen dem Server-Render
 * und der Hydration im Browser liegen ein paar Millisekunden — bei einem Test
 * mit ein paar Besuchern pro Tag kippt das die Hochrechnung um einen ganzen Tag
 * ("~991d" gegen "~990d"), und React verwirft wegen des Unterschieds das
 * komplette Server-HTML. Auf den Tag quantisiert rendern beide Seiten dieselbe
 * Zahl — und die Anzeige springt nicht mehr bei jedem Reload.
 */
export function displayDay(now: number = Date.now()): number {
  return Math.floor(now / 86_400_000) * 86_400_000
}

export type DecisionEstimate = {
  /** Fehlende Besucher über beide Arme summiert. 0 = Schwelle erreicht. */
  visitorsNeeded: number
  /** Hochgerechnete Tage bis zur Schwelle. null = Tempo (noch) nicht messbar. */
  daysNeeded: number | null
}

/**
 * Wie weit ist der Test noch von einer möglichen Entscheidung entfernt?
 *
 * Bezugsgröße ist dieselbe Schwelle, die evaluateWinner() anlegt: Besucher PRO
 * ARM gegen max(MIN_VISITORS_PER_ARM, tests.min_visitors). Das Tempo ist der
 * Schnitt seit created_at — unter einem halben Tag Laufzeit wird nicht
 * hochgerechnet, sonst macht ein einziger Besucher in der ersten Minute daraus
 * eine Prognose von Tausenden pro Tag.
 */
export function estimateTimeToDecision(t: DecisionTest, now = Date.now()): DecisionEstimate {
  const vA = t.visitors_a ?? 0
  const vB = t.visitors_b ?? 0
  const target = Math.max(t.min_visitors ?? 0, MIN_VISITORS_PER_ARM)
  const visitorsNeeded = Math.max(0, target - vA) + Math.max(0, target - vB)
  if (visitorsNeeded === 0) return { visitorsNeeded: 0, daysNeeded: 0 }

  const elapsedDays = (now - new Date(t.created_at).getTime()) / 86_400_000
  const total = vA + vB
  if (!Number.isFinite(elapsedDays) || elapsedDays < 0.5 || total <= 0) {
    return { visitorsNeeded, daysNeeded: null }
  }
  const perDay = total / elapsedDays
  if (perDay <= 0) return { visitorsNeeded, daysNeeded: null }
  // Vor dem Aufrunden auf vier Nachkommastellen kürzen. Ohne das macht
  // Math.ceil() aus 10.0000000058 Tagen "~11d" — die paar Millisekunden
  // zwischen created_at und dem Render entscheiden dann über einen ganzen Tag.
  const days = Math.ceil(Number((visitorsNeeded / perDay).toFixed(4)))
  return { visitorsNeeded, daysNeeded: Math.max(1, days) }
}

/* ── Klassifizierung ── */

function decision(
  t: DecisionTest,
  kind: DecisionKind,
  severity: DecisionSeverity,
  headline: string,
  label: string,
  href: string | null = `/dashboard/results/${t.id}`
): Decision {
  return { testId: t.id, testName: t.name, kind, severity, headline, action: { label, href } }
}

function classify(t: DecisionTest, now: number): Decision | null {
  const vA = t.visitors_a ?? 0
  const vB = t.visitors_b ?? 0
  const cA = t.conversions_a ?? 0
  const cB = t.conversions_b ?? 0
  const isDraft = t.status === 'draft'
  const issues = Array.isArray(t.health_issues) ? t.health_issues : []

  // 1 — Gewinner steht fest und wartet auf den Rollout.
  if (t.winner !== null && t.status === 'done') {
    return t.winner === 'B'
      ? decision(t, 'winner', 'ok', 'Variant B won — roll it out on your site', 'View result')
      : decision(t, 'winner', 'ok', 'Variant A won — keep the original', 'View result')
  }

  // tests.significance schreibt nur der Tages-Cron. Die Kachel daneben zeigt
  // über SigPie den Live-Wert aus denselben Zählern — beide müssen dieselbe
  // Zahl nennen, sonst widerspricht die Entscheidungs-Zeile der Karte.
  const sig = calcSignificance(vA, cA, vB, cB)
  const verdict = evaluateWinner({
    significance: sig,
    cA,
    cB,
    vA,
    vB,
    createdAt: t.created_at,
    minVisitorsPerArm: t.min_visitors ?? undefined,
    minUplift: t.min_uplift ?? undefined,
    now,
  })

  // 2 — Statistisch entschieden, aber im Datensatz steht noch kein Gewinner.
  if (verdict.winner !== null && t.winner === null) {
    return decision(
      t,
      'ready',
      'ok',
      `Ready to call — variant ${verdict.winner} is ahead at ${Math.round(sig * 100)}% confidence`,
      'Declare winner'
    )
  }

  // 3 — Traffic-Verteilung passt nicht zum konfigurierten Split. Solange das
  //     so ist, ist jede Aussage über den Gewinner wertlos.
  if (hasSampleRatioMismatch(vA, vB, t.traffic_split ?? 50)) {
    return decision(
      t,
      'broken-data',
      'err',
      'Traffic split is off — the numbers are not trustworthy yet',
      'Check setup'
    )
  }

  // 4 — Health-Probleme. Drafts sind hier ausgenommen: sie sind nicht kaputt,
  //     sondern unfertig, und gehören in Regel 5 (Wizard statt Results-Seite).
  if (!isDraft && t.health_status === 'issues' && issues.length > 0) {
    return decision(
      t,
      'health',
      'err',
      `${issues.length} setup issue${issues.length === 1 ? '' : 's'} — this test is not tracking`,
      'Fix test'
    )
  }

  // 5 — Draft mit offenen Schritten: der Wizard, nicht die Results-Seite.
  if (isDraft && issues.length > 0) {
    return decision(
      t,
      'draft',
      'pro',
      `Draft — ${issues.length} step${issues.length === 1 ? '' : 's'} left before it can go live`,
      'Finish setup',
      null
    )
  }

  // 6 — Läuft lange und kommt nicht an. "not-significant" heißt: Stichprobe
  //     und Laufzeit reichen längst, das Signal fehlt trotzdem — das wird
  //     durch Warten nicht besser. Bei fehlenden Besuchern entscheidet die
  //     Hochrechnung.
  const isLive = t.status === 'active' || t.status === 'paused'
  const runtimeDays = (now - new Date(t.created_at).getTime()) / 86_400_000
  if (
    isLive &&
    Number.isFinite(runtimeDays) &&
    runtimeDays > STALLED_AFTER_DAYS &&
    (verdict.reason === 'not-enough-visitors' || verdict.reason === 'not-significant')
  ) {
    const est = estimateTimeToDecision(t, now)
    const stuck =
      verdict.reason === 'not-significant' ||
      est.daysNeeded === null ||
      est.daysNeeded > STALLED_PROJECTION_DAYS
    if (stuck) {
      const detail =
        verdict.reason === 'not-significant'
          ? 'enough traffic, still no clear difference'
          : est.daysNeeded === null
            ? 'almost no traffic is reaching it'
            : `at this pace it needs ~${est.daysNeeded} more days`
      return decision(
        t,
        'stalled',
        'pro',
        `Running ${Math.floor(runtimeDays)} days — ${detail}`,
        'Review test'
      )
    }
  }

  return null
}

/**
 * Alle Tests, die eine Handlung brauchen — sortiert nach Dringlichkeit.
 * Tests ohne offene Entscheidung tauchen nicht auf.
 */
export function deriveDecisions(tests: DecisionTest[], now = Date.now()): Decision[] {
  const out: Decision[] = []
  for (const t of tests) {
    const d = classify(t, now)
    if (d) out.push(d)
  }
  return out.sort((a, b) => decisionRank(a.kind) - decisionRank(b.kind))
}

/**
 * Sortiert Tests nach Entscheidungsreife statt nach Besuchern: erst die mit
 * offener Entscheidung (in deren Priorität), danach nach Signifikanz und
 * Besuchern. Das ist die Reihenfolge für die Top-5 auf der Overview.
 */
export function sortByDecisionReadiness<T extends DecisionTest>(
  tests: T[],
  decisions: Decision[]
): T[] {
  const rank = new Map(decisions.map((d) => [d.testId, decisionRank(d.kind)]))
  const fallback = DECISION_ORDER.length
  return [...tests].sort((a, b) => {
    const ra = rank.get(a.id) ?? fallback
    const rb = rank.get(b.id) ?? fallback
    if (ra !== rb) return ra - rb
    const sa = calcSignificance(a.visitors_a ?? 0, a.conversions_a ?? 0, a.visitors_b ?? 0, a.conversions_b ?? 0)
    const sb = calcSignificance(b.visitors_a ?? 0, b.conversions_a ?? 0, b.visitors_b ?? 0, b.conversions_b ?? 0)
    if (sa !== sb) return sb - sa
    const va = (a.visitors_a ?? 0) + (a.visitors_b ?? 0)
    const vb = (b.visitors_a ?? 0) + (b.visitors_b ?? 0)
    return vb - va
  })
}
