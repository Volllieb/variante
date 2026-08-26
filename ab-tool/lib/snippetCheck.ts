// Serverseitige Prüfung, ob das variante-Snippet auf einer Seite installiert ist.
//
// Plan SEC-03: Die Logik lag vorher ausschließlich in /api/snippet-check, und
// ob ihr Ergebnis zur anschließenden /api/domains/verify-Anfrage passte, entschied
// allein der Client. Beide Endpunkte nutzen diese Funktion jetzt gemeinsam, und
// /api/domains/verify ruft sie selbst auf, statt dem Client zu glauben.

import { isBlockedHost } from '@/lib/ssrf'

const FETCH_TIMEOUT_MS = 8_000
const MAX_BYTES = 200_000 // Das Snippet steht im <head>.

// Obergrenzen fuer die Mehrseiten-Pruefung. Jede gepruefte Seite ist ein Fetch
// von unserer IP auf eine fremde Domain — das bleibt eng begrenzt, damit der
// Endpunkt kein Traffic-Amplifier wird (derselbe Grund, aus dem er ueberhaupt
// Auth verlangt, siehe Plan SEC-08 in der Route).
const MAX_PAGES = 10
const PAGE_CONCURRENCY = 4

export type SnippetCheckResult = {
  detected: boolean
  checkedUrl: string
  reason?: string
  /**
   * Snippet ist da, traegt aber noch das alte `integrity`-Attribut. Der Hash
   * wurde einmal in den <head> kopiert und passt nach jedem ab.js-Release nicht
   * mehr — der Browser blockiert das Script dann komplett und still. Seit dem
   * Wegfall von SRI (siehe lib/snippetCode.ts) ist JEDES integrity am ab.js-Tag
   * eine Altinstallation, die neu eingefuegt werden muss.
   */
  outdated?: boolean
}

// <script ... src=".../ab.js" ...> — Attributreihenfolge ist beliebig, deshalb
// erst das Tag greifen und dann darin nach integrity suchen.
const AB_SCRIPT_TAG_RE = /<script\b[^>]*\bsrc=["'][^"']*\/ab\.js[^"']*["'][^>]*>/i

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

    const present =
      /ab\.js/.test(html) || /__ab_hide/.test(html) || /__ab_pending/.test(html)

    // Ein integrity-Attribut am ab.js-Tag heisst: der Browser laedt das Script
    // gar nicht erst. `detected` beschreibt eine FUNKTIONIERENDE Installation —
    // sonst wuerde /api/domains/verify eine tote Seite als verifiziert buchen.
    const tag = html.match(AB_SCRIPT_TAG_RE)?.[0] ?? ''
    const outdated = present && /\bintegrity=/i.test(tag)

    return {
      detected: present && !outdated,
      checkedUrl: url,
      ...(outdated ? { outdated: true } : {}),
      reason: outdated
        ? 'Outdated snippet: the integrity hash blocks ab.js. Paste the current snippet again.'
        : present
          ? undefined
          : 'Snippet not found in the first 200 KB of the page.',
    }
  } catch {
    return { detected: false, checkedUrl: url, reason: 'Site unreachable or timed out' }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Prueft mehrere Seiten derselben Site auf das Snippet.
 *
 * WARUM: Das Snippet muss im <head> JEDER Seite stehen — ab.js wird pro
 * Pageview geladen und fragt dort /api/resolve. Die Einzelpruefung sieht aber
 * nur die eine URL, die ihr uebergeben wird (in der Praxis die Wurzel). Ein
 * Test auf /pricing meldet deshalb heute "installed", misst aber nichts,
 * wenn genau dort das Snippet fehlt: kein Fehler, kein Log, nur ein Test, der
 * ewig bei null Visitors steht.
 *
 * Reihenfolge und Anzahl der Ergebnisse folgen der deduplizierten Eingabe;
 * ueberzaehlige URLs werden verworfen (MAX_PAGES).
 */
export async function checkSnippetPages(urls: string[]): Promise<SnippetCheckResult[]> {
  // Nach Normalisierung deduplizieren: '/pricing' und 'https://x.com/pricing'
  // sind dieselbe Seite und duerfen nicht zweimal gefetcht werden.
  const seen = new Set<string>()
  const targets: string[] = []
  for (const raw of urls) {
    if (!raw || typeof raw !== 'string') continue
    const normalized = normalizeUrl(raw)
    if (seen.has(normalized)) continue
    seen.add(normalized)
    targets.push(normalized)
    if (targets.length >= MAX_PAGES) break
  }

  const results: SnippetCheckResult[] = new Array(targets.length)
  let next = 0

  // Kleiner Worker-Pool statt Promise.all ueber alles: bei 10 Seiten waeren das
  // 10 gleichzeitige Verbindungen auf EINE fremde Domain — das sieht von deren
  // Seite aus wie ein Lastspitzchen und kann in ein Rate-Limit laufen.
  async function worker() {
    while (true) {
      const i = next++
      if (i >= targets.length) return
      results[i] = await checkSnippet(targets[i]!)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(PAGE_CONCURRENCY, targets.length) }, worker)
  )

  return results
}
