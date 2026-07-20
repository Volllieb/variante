import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

type Crumb = {
  label: string
  href?: string
}

/**
 * Breadcrumb navigation. Pass array of { label, href? }.
 * Last item is rendered as plain text (current page).
 *
 * Usage:
 *   <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Test Results' }]} />
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px]">
      <Link
        href="/dashboard"
        className="text-[#ededed]/40 transition-colors hover:text-[#ededed]/70"
        aria-label="Dashboard"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3 text-[#ededed]/25" />
            {isLast || !item.href ? (
              <span className="text-[#ededed]/60 truncate max-w-[200px]">{item.label}</span>
            ) : (
              <Link
                href={item.href}
                className="text-[#ededed]/40 transition-colors hover:text-[#ededed]/70 truncate max-w-[200px]"
              >
                {item.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
