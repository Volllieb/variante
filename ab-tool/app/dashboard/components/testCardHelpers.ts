// Reine Anzeige-Helfer der TestCard (Domain, Laufzeit, Vorschau-Links, Health-Labels).

export function extractDomain(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.hostname
  } catch {
    return null
  }
}

export function formatDuration(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const secs = Math.floor(ms / 1000)
  const mins = Math.floor(secs / 60)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)

  if (days >= 1) return `${days}d`
  if (hours >= 1) return `${hours}h`
  if (mins >= 1) return `${mins}m`
  return `${secs}s`
}

/**
 * Live-URL, die eine bestimmte Variante erzwingt (ab.js: ?ab_variant=a|b).
 *
 * Ohne diesen Link ist die eigene Variante A fuer den Betreiber unsichtbar:
 * ab.js bucketet deterministisch aus IP-Hash + User-Agent, derselbe Browser
 * landet also dauerhaft im selben Arm. Der Preview-Aufruf zaehlt weder Besucher
 * noch Conversion und laesst die laufende Zuweisung unberuehrt.
 */
export function previewUrl(siteUrl: string | null, variant: 'a' | 'b'): string | null {
  if (!siteUrl) return null
  try {
    const u = new URL(siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`)
    u.searchParams.set('ab_variant', variant)
    return u.toString()
  } catch {
    return null
  }
}

export function issueLabel(code: string): string {
  const labels: Record<string, string> = {
    missing_name: 'No name',
    missing_site_url: 'No website',
    missing_selector: 'No element selected',
    missing_variant: 'No variant design',
    missing_goal: 'No conversion goal',
    empty_variant: 'Variant is identical to the original',
  }
  return labels[code] ?? code
}
