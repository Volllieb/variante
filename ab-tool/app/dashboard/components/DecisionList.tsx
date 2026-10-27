'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight, Clock, Gauge, Pencil, Trophy } from 'lucide-react'
import type { Decision, DecisionKind } from '@/lib/decisions'
import { Button } from '@/app/components'

const ICONS: Record<DecisionKind, typeof Trophy> = {
  winner: Trophy,
  ready: Gauge,
  'broken-data': AlertTriangle,
  health: AlertTriangle,
  draft: Pencil,
  stalled: Clock,
}

const TONE: Record<Decision['severity'], string> = {
  ok: 'text-ok',
  pro: 'text-pro',
  err: 'text-err',
}

/** Mehr als das passt nicht auf einen Blick — der Rest lebt in /dashboard/tests. */
const MAX_VISIBLE = 5

/**
 * Ebene 2 der Overview: die Tests, die gerade eine Handlung brauchen.
 *
 * Leerer Zustand = kein Block. Ein "nichts zu tun"-Kasten wäre eine Zeile
 * Rauschen an der prominentesten Stelle der Seite.
 */
export function DecisionList({
  decisions,
  onFinishDraft,
}: {
  decisions: Decision[]
  /** Drafts haben kein Ergebnis — sie öffnen den Wizard statt der Results-Seite. */
  onFinishDraft?: (testId: string) => void
}) {
  if (decisions.length === 0) return null

  const visible = decisions.slice(0, MAX_VISIBLE)
  const hidden = decisions.length - visible.length

  return (
    <section
      aria-labelledby="decisions-heading"
      className="mb-6 rounded-md border border-border bg-bg-1"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2
          id="decisions-heading"
          className="text-meta font-medium uppercase tracking-wider text-text-3"
        >
          Needs your decision
        </h2>
        <span className="text-meta tabular-nums text-text-3">{decisions.length}</span>
      </div>

      <ul>
        {visible.map((d) => {
          const Icon = ICONS[d.kind]
          return (
            <li
              key={d.testId}
              className="surface-interactive flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <Icon className={`h-4 w-4 shrink-0 ${TONE[d.severity]}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-medium text-text" title={d.testName}>
                  {d.testName}
                </p>
                <p className="mt-0.5 truncate text-small text-text-2" title={d.headline}>
                  {d.headline}
                </p>
              </div>
              {d.action.href ? (
                <Link
                  href={d.action.href}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-bg-0 px-2.5 py-1.5 text-small font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:outline-none"
                >
                  {d.action.label}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => onFinishDraft?.(d.testId)}
                  className="shrink-0 gap-1 bg-bg-0 px-2.5 py-1.5 text-small"
                >
                  {d.action.label}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </li>
          )
        })}
      </ul>

      {hidden > 0 && (
        <div className="border-t border-border px-4 py-2.5 text-center">
          <Link
            href="/dashboard/tests"
            className="text-small font-medium text-text-3 transition-colors hover:text-text-2"
          >
            {hidden} more waiting →
          </Link>
        </div>
      )}
    </section>
  )
}
