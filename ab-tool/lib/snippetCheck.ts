// Serverseitige Prüfung, ob das variante-Snippet auf einer Seite installiert ist.
//
// Plan SEC-03: Die Logik lag vorher ausschließlich in /api/snippet-check, und
// ob ihr Ergebnis zur anschließenden /api/domains/verify-Anfrage passte, entschied
// allein der Client. Beide Endpunkte nutzen diese Funktion jetzt gemeinsam, und
// /api/domains/verify ruft sie selbst auf, statt dem Client zu glauben.

import { isBlockedHost } from '@/lib/ssrf'

const FETCH_TIMEOUT_MS = 8_000
const MAX_BYTES = 200_000 // Das Snippet steht im <head>.

export type SnippetCheckResult = {
  detected: boolean
  checkedUrl: string
  reason?: string
}

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export async function checkSnippet(siteUrl: string): Promise<SnippetCheckResult> {
  const url = normalizeUrl(siteUrl)

  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    return { detected: false, checkedUrl: url, reason: 'Invalid URL' }
  }

  if (isBlockedHost(hostname)) {
    return { detected: false, checkedUrl: url, reason: 'Blocked host' }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'variante-snippet-check/1.0', Accept: 'text/html' },
      redirect: 'follow',
    })

    // redirect:'follow' kann auf interne Hosts umleiten (public URL → 302 →
    // 169.254.169.254). res.url ist das finale Ziel.
    if (res.url && isBlockedHost(new URL(res.url).hostname)) {
      return { detected: false, checkedUrl: url, reason: 'Blocked host' }
    }

    let html = ''
    const reader = res.body?.getReader()
    if (reader) {
      const decoder = new TextDecoder()
      while (html.length < MAX_BYTES) {
        const { done, value } = await reader.read()
        if (done) break
        html += decoder.decode(value, { stream: true })
      }
      reader.cancel().catch(() => {})
    }

    const detected =
      /ab\.js/.test(html) || /__ab_hide/.test(html) || /__ab_pending/.test(html)

    return {
      detected,
      checkedUrl: url,
      reason: detected ? undefined : 'Snippet not found in the first 200 KB of the page.',
    }
  } catch {
    return { detected: false, checkedUrl: url, reason: 'Site unreachable or timed out' }
  } finally {
    clearTimeout(timeout)
  }
}
