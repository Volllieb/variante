// Kontakt-Extraktion für das interne Outreach-Tool.
//
// Ziel: aus der Lead-Seite (und ersatzweise deren Impressum/Kontakt-Seite) eine
// brauchbare Kontakt-E-Mail ziehen. Deutscher Vorteil: Impressumspflicht (§5 DDG)
// → fast jede DE-Seite hat eine erreichbare E-Mail.
//
// Ausgehende Requests NUR über lib/safeFetch (SSRF-Schutz, Konvention CLAUDE.md).

import { safeFetch } from '@/lib/safeFetch'
import { safeError } from '@/lib/safeLog'

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

// Lokalteile/Domains, die keine echten Kontaktadressen sind.
const JUNK = [
  'noreply', 'no-reply', 'donotreply', 'example.', 'sentry', 'wixpress',
  'cloudflare', 'godaddy', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  'your-email', 'name@', 'email@domain', 'u003e', 'u003c',
]
// Bevorzugte Lokalteile (echte Postfächer).
const PREFERRED = ['info', 'kontakt', 'hallo', 'hello', 'contact', 'office', 'mail', 'support', 'service']

function isJunk(email: string): boolean {
  const e = email.toLowerCase()
  return JUNK.some((j) => e.includes(j))
}

/** Registrierbare Domain (grob): die letzten zwei Labels. */
function registrableDomain(host: string): string {
  const parts = host.toLowerCase().replace(/^www\./, '').split('.')
  return parts.slice(-2).join('.')
}

/** Alle plausiblen E-Mails aus HTML, dedupliziert, Junk gefiltert. mailto: zuerst. */
function emailsFromHtml(html: string): string[] {
  const found = new Set<string>()

  // mailto:-Links zuerst — die sind am verlässlichsten.
  const mailtoRe = /mailto:([^"'?>\s]+)/gi
  let m: RegExpExecArray | null
  while ((m = mailtoRe.exec(html)) !== null) {
    const e = decodeURIComponent(m[1]).trim().toLowerCase()
    if (EMAIL_RE.test(e) && !isJunk(e)) found.add(e)
    EMAIL_RE.lastIndex = 0
  }

  // Freitext-E-Mails als Ergänzung.
  const text = html.replace(/<[^>]+>/g, ' ')
  const matches = text.match(EMAIL_RE) ?? []
  for (const raw of matches) {
    const e = raw.trim().toLowerCase()
    if (!isJunk(e)) found.add(e)
  }

  return [...found]
}

/** Wählt die beste Kontaktadresse: Domain-Match + bevorzugter Lokalteil gewinnen. */
function pickBest(emails: string[], siteHost: string): string | null {
  if (emails.length === 0) return null
  const siteDomain = registrableDomain(siteHost)

  const score = (email: string): number => {
    const [local, domain] = email.split('@')
    let s = 0
    if (domain && registrableDomain(domain) === siteDomain) s += 10
    if (PREFERRED.includes(local)) s += 5
    if (PREFERRED.some((p) => local.startsWith(p))) s += 2
    return s
  }

  return [...emails].sort((a, b) => score(b) - score(a))[0]
}

/** Findet den ersten Impressum-/Kontakt-Link im HTML und löst ihn gegen baseUrl auf. */
function findImprintUrl(html: string, baseUrl: string): string | null {
  const anchorRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = anchorRe.exec(html)) !== null) {
    const href = m[1]
    const label = (m[2] || '').replace(/<[^>]+>/g, ' ')
    const hay = `${href} ${label}`.toLowerCase()
    if (/impressum|imprint|kontakt|contact|legal/.test(hay)) {
      try {
        return new URL(href, baseUrl).href
      } catch {
        /* ungültiger href → weiter */
      }
    }
  }
  return null
}

/**
 * Beste Kontakt-E-Mail für einen Lead.
 * 1. aus der bereits geladenen Landingpage,
 * 2. sonst von der Impressum-/Kontakt-Seite (ein zusätzlicher safeFetch).
 * Gibt null zurück, wenn nichts Brauchbares gefunden wird.
 */
export async function extractContactEmail(
  landingHtml: string,
  finalUrl: string,
): Promise<string | null> {
  let host = ''
  try {
    host = new URL(finalUrl).hostname
  } catch {
    return null
  }

  // 1. Landingpage selbst
  const onPage = pickBest(emailsFromHtml(landingHtml), host)
  if (onPage) return onPage

  // 2. Impressum/Kontakt-Seite
  const imprintUrl = findImprintUrl(landingHtml, finalUrl)
  if (!imprintUrl) return null

  try {
    const res = await safeFetch(imprintUrl, { maxSize: 2_000_000, timeoutMs: 15_000, maxRedirects: 5 })
    if (!res.ok || !res.text) return null
    return pickBest(emailsFromHtml(res.text), host)
  } catch (err) {
    safeError('outreach-contact-imprint', { message: err instanceof Error ? err.message : String(err) })
    return null
  }
}
