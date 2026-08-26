import { corsHeaders, preflight } from '@/lib/cors'
import { checkRateLimit } from '@/lib/rateLimit'
import { checkSnippet, checkSnippetPages, normalizeUrl } from '@/lib/snippetCheck'
import type { SnippetCheckResult } from '@/lib/snippetCheck'
import { getApiUser, unauthorized } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'
import { parseBody } from '@/lib/apiHelpers'
import { snippetCheckBody } from '@/lib/validation'
import { hostOf } from '@/lib/domainGate'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/snippet-check
 *
 * Reiner DIAGNOSE-Endpunkt: prüft, ob das variante-Snippet auf einer Seite
 * installiert ist, und gibt das Ergebnis zurück. Er persistiert nichts.
 *
 * Die Verifikation einer Domain läuft ausschließlich über /api/domains/verify —
 * dort prüft der Server selbst und schreibt selbst. Vorher entschied der Client
 * anhand DIESER Antwort, ob er verify aufruft (Plan SEC-03).
 *
 * ponytail: Der Endpunkt war unauthentifiziert. Damit konnte jeder Anonyme
 * unsere Server beliebige fremde URLs fetchen lassen — ein Traffic-Amplifier
 * auf unsere Rechnung und unsere IP-Reputation (Plan SEC-08).
 *
 * Mit `include_pages` prueft er zusaetzlich die Seiten, auf denen der User
 * tatsaechlich Tests laufen hat. Das Snippet muss im <head> JEDER Seite stehen;
 * fehlt es auf /pricing, meldet die Wurzelpruefung trotzdem "installed" und der
 * Test dort steht still bei null Visitors — ohne Fehler, ohne Log. Geprueft
 * werden nur eigene Test-URLs, keine gecrawlten: der Server folgt damit keinen
 * Links, die er auf einer fremden Seite findet.
 */

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

export async function POST(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('POST, OPTIONS')

  if (!(await checkRateLimit(`snippet-check:${user.userId}`, 10, 60_000))) {
    return Response.json(
      { error: 'Too many requests' },
      { status: 429, headers: corsHeaders('POST, OPTIONS') }
    )
  }

  const parsed = await parseBody(req, snippetCheckBody, 'POST, OPTIONS')
  if (!parsed.ok) return parsed.response

  const { site_url, include_pages } = parsed.data

  // Ein Seiten-Lauf kostet bis zu MAX_PAGES zusaetzliche Fetches auf eine fremde
  // Domain. Deshalb ein eigenes, deutlich engeres Limit ZUSAETZLICH zum Basis-
  // Limit oben — sonst waeren ueber denselben Endpunkt 10x so viele Requests
  // gegen ein fremdes Ziel moeglich wie vorgesehen.
  if (include_pages && !(await checkRateLimit(`snippet-check-pages:${user.userId}`, 3, 60_000))) {
    return Response.json(
      { error: 'Too many requests' },
      { status: 429, headers: corsHeaders('POST, OPTIONS') }
    )
  }

  try {
    const result = await checkSnippet(site_url)

    const pages = include_pages ? await checkTestPages(user.userId, site_url, result) : undefined

    return Response.json(
      {
        detected: result.detected,
        checked_url: result.checkedUrl,
        ...(result.outdated ? { outdated: true } : {}),
        ...(result.reason ? { reason: result.reason } : {}),
        ...(pages ? { pages, pages_missing: pages.filter((p) => !p.detected).length } : {}),
      },
      { headers: corsHeaders('POST, OPTIONS') }
    )
  } catch (err) {
    safeError('snippet-check', err)
    return Response.json(
      { error: 'check failed' },
      { status: 500, headers: corsHeaders('POST, OPTIONS') }
    )
  }
}

type PageReport = {
  url: string
  detected: boolean
  outdated?: boolean
  reason?: string
  /** Namen der Tests, die auf genau dieser Seite laufen. */
  tests: string[]
}

/** Vergleicht zwei normalisierte URLs als "dieselbe Seite" (trailing slash egal). */
function samePage(a: string, b: string): boolean {
  return a.replace(/\/+$/, '') === b.replace(/\/+$/, '')
}

/**
 * Sammelt die Seiten, auf denen der User Tests fuer diese Domain laufen hat,
 * und prueft dort das Snippet.
 *
 * Die Wurzel wird MITGELISTET, aber nicht erneut gefetcht: seit der Wizard
 * jeden Test auf genau eine Seite legt, ist die Startseite eine ganz normale
 * Test-Seite ('https://domain/'). Sie zu ueberspringen haette ausgerechnet den
 * haeufigsten Fall aus der Liste fallen lassen. Das Ergebnis der ohnehin schon
 * gelaufenen Wurzelpruefung wird stattdessen wiederverwendet.
 */
async function checkTestPages(
  userId: string,
  siteUrl: string,
  rootResult: SnippetCheckResult
): Promise<PageReport[]> {
  const host = hostOf(siteUrl)
  const rootUrl = normalizeUrl(host)

  const { data, error } = await supabase
    .from('tests')
    .select('name, site_url, status')
    .eq('user_id', userId)
    .eq('site_host', host)
    .neq('status', 'done')
    .limit(100)

  if (error) {
    safeError('snippet-check:pages', error)
    return []
  }

  // Nach Seite gruppieren: mehrere Tests koennen auf derselben URL liegen, und
  // die soll trotzdem nur einmal gefetcht werden. Der Vergleich laeuft ueber den
  // normalisierten String, damit 'x.com' und 'https://x.com' als dieselbe Seite
  // zaehlen.
  const byUrl = new Map<string, string[]>()
  for (const t of data ?? []) {
    if (!t.site_url) continue
    const normalized = normalizeUrl(t.site_url)
    const names = byUrl.get(normalized) ?? []
    names.push(t.name)
    byUrl.set(normalized, names)
  }

  const urls = [...byUrl.keys()]
  if (urls.length === 0) return []

  // Alles ausser der Wurzel fetchen; fuer die Wurzel steht das Ergebnis schon fest.
  const toFetch = urls.filter((u) => !samePage(u, rootUrl))
  const fetched = await checkSnippetPages(toFetch)

  const byResult = new Map<string, SnippetCheckResult>()
  toFetch.forEach((u, i) => {
    const r = fetched[i]
    if (r) byResult.set(u, r)
  })

  return urls.map((u) => {
    const r = samePage(u, rootUrl) ? rootResult : byResult.get(u)
    return {
      url: r?.checkedUrl ?? u,
      // Ohne Ergebnis (ueber MAX_PAGES hinaus abgeschnitten) nichts behaupten:
      // ungeprueft ist nicht dasselbe wie "kein Snippet gefunden".
      detected: r?.detected ?? true,
      ...(r?.outdated ? { outdated: true } : {}),
      ...(r ? (r.reason ? { reason: r.reason } : {}) : { reason: 'Not checked (page limit reached)' }),
      tests: byUrl.get(u) ?? [],
    }
  })
}
