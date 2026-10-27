'use client'

/**
 * Seitenkopf (brandguidelines v3 §6.13).
 *
 * Phase 1: nur Tokens — die Arbitrary-Pixelwerte sind raus, der Titel ist
 * der eine `text-heading` pro Seite (§3), Abstände liegen auf den
 * Spacing-Tokens.
 */

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href: string
}

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: ReactNode
}

export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="mb-loose">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-tight flex items-center gap-tight text-meta text-text-3">
          {breadcrumbs.map((item, i) => (
            <span key={item.href} className="flex items-center gap-tight">
              {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden />}
              {i < breadcrumbs.length - 1 ? (
                <Link href={item.href} className="transition-colors hover:text-text-2">
                  {item.label}
                </Link>
              ) : (
                <span className="text-text-2">{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-center justify-between gap-base">
        <div>
          <h1 className="text-heading font-semibold text-text">{title}</h1>
          {description && <p className="mt-0.5 text-small text-text-3">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-snug">{actions}</div>}
      </div>
    </div>
  )
}
