// SEC-08: Zentraler ausgehender Fetch-Pfad mit SSRF-Schutz.
//
// Diese Funktion ist die EINZIGE Stelle, die ausgehende HTTP-Requests macht.
// Sie kombiniert DNS-Auflösung + private-IP-Prüfung, Größen- und Zeitlimits,
// und Redirect-Manual-Mode mit Revalidierung pro Hop.
//
// Vorher gab es sechs unabhängige fetch()-Aufrufe mit unterschiedlichem
// SSRF-Schutz-Level (von "keiner" in picker-bridge bis "Hostname-Blocklist"
// in snippet-check). Eine Hostname-Blocklist ist strukturell unsicher:
// dezimale IPs (http://2130706433/ = 127.0.0.1), oktale Notation, Kurzform
// 127.1, und DNS-Namen auf private IPs (*.nip.io) passieren alle.

import { isBlockedHost } from '@/lib/ssrf'

// Reservierte IP-Bereiche (IPv4). Keine ausgehende Requests in diese Netze.
const PRIVATE_RANGES = [
  { start: 0x0A000000, end: 0x0AFFFFFF },       // 10.0.0.0/8
  { start: 0x7F000000, end: 0x7FFFFFFF },       // 127.0.0.0/8
  { start: 0xA9FE0000, end: 0xA9FEFFFF },       // 169.254.0.0/16
  { start: 0xAC100000, end: 0xAC1FFFFF },       // 172.16.0.0/12
  { start: 0xC0A80000, end: 0xC0A8FFFF },       // 192.168.0.0/16
]

function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.')
  if (parts.length !== 4) return true // defensiv: kein gültiges IPv4 → block
  const num =
    ((+parts[0] & 0xff) << 24) |
    ((+parts[1] & 0xff) << 16) |
    ((+parts[2] & 0xff) << 8) |
    (+parts[3] & 0xff)
  if (Number.isNaN(num)) return true
  return PRIVATE_RANGES.some((r) => num >= r.start && num <= r.end)
}

export interface SafeFetchOptions {
  method?: 'GET' | 'POST'
  headers?: Record<string, string>
  body?: string
  /** Max response size in bytes (default 1 MB, hardened gegen Memory-Exhaustion). */
  maxSize?: number
  /** Timeout in ms (default 10 s). */
  timeoutMs?: number
  /** Max redirects to follow (default 5). Jeder Hop wird erneut SSRF-geprüft. */
  maxRedirects?: number
}

export interface SafeFetchResult {
  ok: boolean
  status: number
  text: string
  finalUrl: string
  error?: string
}

const DEFAULT_MAX_SIZE = 1_000_000  // 1 MB
const DEFAULT_TIMEOUT_MS = 10_000   // 10 s
const DEFAULT_MAX_REDIRECTS = 5

/**
 * Einziger ausgehender Fetch-Pfad.
 *
 * Prüft vor dem Request: Protokoll (nur http/https), Hostname (via isBlockedHost),
 * und — wo verfügbar — die aufgelöste IP (gegen private/reservierte Bereiche).
 * Keine Request-Methode für SSRF-kritische Operations wie POST auf interne Hosts.
 * Redirects werden manuell verfolgt und jeder Hop erneut geprüft.
 *
 * Spezielle Hostnames (*.nip.io, localtest.me, etc.) werden von isBlockedHost
 * nicht erfasst, aber die DNS-Auflösung fängt sie über die IP-Prüfung.
 */
export async function safeFetch(
  url: string,
  opts: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
  const {
    method = 'GET',
    headers,
    body,
    maxSize = DEFAULT_MAX_SIZE,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRedirects = DEFAULT_MAX_REDIRECTS,
  } = opts

  // 1. Protokoll-Allowlist
  const parsed = URL.parse(url)
  if (!parsed || !['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false, status: 0, text: '', finalUrl: url, error: 'invalid protocol' }
  }

  let currentUrl = url
  let redirects = 0

  while (true) {
    const current = URL.parse(currentUrl)
    if (!current) return { ok: false, status: 0, text: '', finalUrl: currentUrl, error: 'invalid url' }

    // 2. Hostname-Blocklist (schnell, erste Linie)
    if (isBlockedHost(current.hostname)) {
      return { ok: false, status: 0, text: '', finalUrl: currentUrl, error: 'blocked host' }
    }

    // 3. DNS-Auflösung + private-IP-Prüfung
    //    In Vercel Functions ist DNS verfügbar. Falls nicht (Edge-Runtime),
    //    fällt dieser Check aus — die Hostname-Blocklist ist die Baseline.
    try {
      const dns = await import('node:dns')
      const addresses = await dns.promises.resolve4(current.hostname)
      for (const addr of addresses) {
        if (isPrivateIP(addr)) {
          return { ok: false, status: 0, text: '', finalUrl: currentUrl, error: `private IP: ${addr}` }
        }
      }
    } catch {
      // DNS-Auflösung fehlgeschlagen → Hostname-Blocklist hat bereits geprüft.
      // nip.io/localtest.me lösen auf private IPs auf und scheitern hier.
      return { ok: false, status: 0, text: '', finalUrl: currentUrl, error: 'DNS resolution failed' }
    }

    // 4. Ausgehender Request mit Timeout-Controller
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    let res: Response
    try {
      res = await fetch(currentUrl, {
        method,
        headers,
        body,
        redirect: 'manual',
        signal: controller.signal,
      })
    } catch (err) {
      clearTimeout(timer)
      return {
        ok: false,
        status: 0,
        text: '',
        finalUrl: currentUrl,
        error: err instanceof Error ? err.message : 'fetch failed',
      }
    }
    clearTimeout(timer)

    // 5. Redirect-Verfolgung mit erneuter SSRF-Prüfung pro Hop
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get('location')
      if (!location || redirects >= maxRedirects) {
        return { ok: false, status: res.status, text: '', finalUrl: currentUrl, error: 'too many redirects' }
      }
      currentUrl = new URL(location, currentUrl).href
      redirects++
      continue
    }

    // 6. Größenlimit
    const contentLength = parseInt(res.headers.get('content-length') || '0', 10)
    if (contentLength > maxSize) {
      return { ok: false, status: res.status, text: '', finalUrl: currentUrl, error: 'response too large' }
    }

    let text: string
    try {
      const buf = await res.arrayBuffer()
      if (buf.byteLength > maxSize) {
        return { ok: false, status: res.status, text: '', finalUrl: currentUrl, error: 'response too large' }
      }
      text = new TextDecoder().decode(buf)
    } catch (err) {
      return {
        ok: false,
        status: res.status,
        text: '',
        finalUrl: currentUrl,
        error: err instanceof Error ? err.message : 'read failed',
      }
    }

    return { ok: res.ok, status: res.status, text, finalUrl: currentUrl }
  }
}
