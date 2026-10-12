'use client'

import { useState } from 'react'
import { SnippetVerifiedBadge } from './SnippetVerifiedBadge'
import { SnippetBanner, type BannerState } from './SnippetBanner'

/* ── Types ── */

type VerifiedDomain = { url: string; verifiedAt: string | null }

type SnippetStatusBadgeProps = {
  hasVerifiedDomain: boolean
  primaryDomain: string | null
  verifiedAt?: string | null
  allVerifiedDomains?: VerifiedDomain[]
  onDomainVerified: () => void
}
/* ── Main Component ── */

export function SnippetStatusBadge({
  hasVerifiedDomain,
  primaryDomain,
  verifiedAt,
  allVerifiedDomains,
  onDomainVerified,
}: SnippetStatusBadgeProps) {
  const [banner, setBanner] = useState<BannerState>(() => {
    if (hasVerifiedDomain && primaryDomain) return { phase: 'verified', url: primaryDomain }
    return { phase: 'input' }
  })

  const [expandedVerified, setExpandedVerified] = useState(false)

  // ── If domain changed externally, sync ──
  const [syncedDomain, setSyncedDomain] = useState(primaryDomain)
  if (syncedDomain !== primaryDomain) {
    setSyncedDomain(primaryDomain)
    if (hasVerifiedDomain && primaryDomain) {
      setBanner({ phase: 'verified', url: primaryDomain })
    }
  }

  // ── Compact verified badge ──
  if (banner.phase === 'verified') {
    return (
      <SnippetVerifiedBadge
        domain={banner.url}
        verifiedAt={verifiedAt}
        allVerifiedDomains={allVerifiedDomains}
        onRecheck={() => setBanner({ phase: 'input' })}
        expanded={expandedVerified}
        onToggle={() => setExpandedVerified((v) => !v)}
      />
    )
  }

  // ── Full banner (input, checking, not-found) ──
  return (
    <SnippetBanner
      state={banner}
      onChange={setBanner}
      onVerified={(url) => {
        setBanner({ phase: 'verified', url })
        onDomainVerified()
      }}
    />
  )
}
