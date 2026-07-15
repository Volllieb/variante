import { type ReactNode } from 'react'
import { Inbox } from 'lucide-react'

type EmptyStateProps = {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  children?: ReactNode
}

/**
 * Reusable empty state with icon, title, description, and action slot.
 * Used when lists have no items, search returns no results, etc.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-white/[0.12] px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
        <Icon className="h-6 w-6 text-[#ededed]/25" />
      </div>
      <p className="mt-4 text-[13px] font-semibold text-[#ededed]">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-[12px] leading-relaxed text-[#ededed]/50">
          {description}
        </p>
      )}
      {children && <div className="mt-5">{children}</div>}
    </div>
  )
}
