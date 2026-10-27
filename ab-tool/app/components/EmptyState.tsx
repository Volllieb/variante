import { type ReactNode } from 'react'
import { Inbox } from 'lucide-react'

import { Card } from './Card'

type EmptyStateProps = {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  children?: ReactNode
}

/**
 * Empty State (brandguidelines v3 §6.12) — Icon, Titel, ein Satz, eine Aktion.
 *
 * Phase 1: hing an Arbitrary-Pixelwerten und `rounded-lg` und baute die
 * gestrichelte Fläche selbst nach. Jetzt ist es die Card aus §6.3 mit
 * `variant="dashed"` — eine Stelle entscheidet, wie eine Card aussieht.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  children,
}: EmptyStateProps) {
  return (
    <Card
      variant="dashed"
     
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-2">
        <Icon className="h-6 w-6 text-text-3" />
      </div>
      <p className="mt-base text-body font-semibold text-text">{title}</p>
      {description && (
        <p className="mt-tight max-w-sm text-small leading-relaxed text-text-2">{description}</p>
      )}
      {children && <div className="mt-loose">{children}</div>}
    </Card>
  )
}
