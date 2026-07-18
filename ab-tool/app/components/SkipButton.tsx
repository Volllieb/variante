'use client'

import Link from 'next/link'

export function SkipButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-xs text-white/40 transition-colors hover:text-white/70"
    >
      {label} →
    </Link>
  )
}
