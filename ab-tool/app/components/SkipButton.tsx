'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export function SkipButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-text-3 transition-colors hover:text-text-2 hover:bg-white/[0.04]"
    >
      {label}
      <ChevronRight className="h-3 w-3" />
    </Link>
  )
}
