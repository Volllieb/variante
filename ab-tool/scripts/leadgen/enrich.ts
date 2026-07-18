#!/usr/bin/env node

/**
 * leadgen/enrich.ts — Stufe 2: Kontaktdaten extrahieren + Reachability-Score.
 *
 * Fetchst die Website, extrahiert E-Mail, X-Handle, Founder-Name und scored
 * die Erreichbarkeit (aus PostFox-Erfahrung: aktiver X-Account = hoch, nur
 * support@ = niedrig).
 *
 * Nutzt Cheerio (bereits Dependency), läuft standalone via tsx.
 *
 * Usage (direkt):
 *   npx tsx scripts/leadgen/enrich.ts --url https://getibex.com
 *
 * Usage (aus pipeline.ts):
 *   import { enrichLead } from './enrich'
 */

import * as cheerio from 'cheerio'
import { parseArgs } from 'node:util'

// ── Types ─────────────────────────────────────────────────────────────

export type Reachability = 'high' | 'medium' | 'low' | 'dead'

export interface EnrichedLead {
  url: string
  emails: string[]
  xHandles: string[]
  linkedinUrl: string | null
  founderName: string | null
  title: string | null
  reachability: Reachability
  reachabilityReason: string
}

// ── Main (direct CLI) ─────────────────────────────────────────────────

const { values } = parseArgs({
  options: {
    url: { type: 'string', short: 'u' },
  },
})

if (values.url) {
  enrichLead(values.url)
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => {
      console.error('Enrichment failed:', e)
      process.exit(1)
    })
}

// ── Core ───────────────────────────────────────────────────────────────

export async function enrichLead(url: string): Promise<EnrichedLead> {
  const html = await fetchSite(url)
  const $ = cheerio.load(html)

  const emails = extractEmails($)
  const xHandles = extractXHandles($)
  const linkedinUrl = extractLinkedIn($)
  const founderName = extractFounderName($)
  const title = $('title').first().text().trim() || null

  const { reachability, reason } = scoreReachability(emails, xHandles, linkedinUrl, founderName)

  return { url, emails, xHandles, linkedinUrl, founderName, title, reachability, reachabilityReason: reason }
}

// ── Extraktoren ───────────────────────────────────────────────────────

function extractEmails($: cheerio.CheerioAPI): string[] {
  const found = new Set<string>()

  // mailto:-Links
  $('a[href^="mailto:"]').each((_, el) => {
    const addr = $(el).attr('href')?.replace(/^mailto:/i, '').split('?')[0].trim().toLowerCase()
    if (addr && isValidEmail(addr)) found.add(addr)
  })

  // Text-basierte Suche in Footer, About, Contact-Bereichen
  const textZones = [
    $('footer').text(),
    $('[class*="footer"]').text(),
    $('[class*="contact"]').text(),
    $('[class*="about"]').text(),
  ].join(' ')

  const emailRegex = /[\w.+-]+@[\w-]+\.[\w.-]+/gi
  for (const match of textZones.matchAll(emailRegex)) {
    const addr = match[0].toLowerCase()
    if (isValidEmail(addr) && !isGenericEmail(addr)) found.add(addr)
  }

  return [...found]
}

function extractXHandles($: cheerio.CheerioAPI): string[] {
  const found = new Set<string>()

  // Links zu X/Twitter
  $('a[href*="x.com/"], a[href*="twitter.com/"]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const match = href.match(/(?:x\.com|twitter\.com)\/(\w{1,15})(?:[/?#]|$)/i)
    if (match) {
      const handle = match[1].toLowerCase()
      if (!['i', 'share', 'home', 'explore', 'notifications', 'messages', 'search', 'settings'].includes(handle)) {
        found.add(`@${handle}`)
      }
    }
  })

  // Text-basierte Suche: "@handle" in Footer/About
  const textZones = [$('footer').text(), $('[class*="footer"]').text(), $('[class*="social"]').text()].join(' ')
  for (const match of textZones.matchAll(/@(\w{1,15})\b/g)) {
    if (!['gmail', 'yahoo', 'outlook', 'proton', 'icloud', 'hey'].includes(match[1].toLowerCase())) {
      found.add(`@${match[1]}`)
    }
  }

  return [...found]
}

function extractLinkedIn($: cheerio.CheerioAPI): string | null {
  const link = $('a[href*="linkedin.com/in/"]').first().attr('href')
    || $('a[href*="linkedin.com/company/"]').first().attr('href')
  return link?.split('?')[0] ?? null
}

function extractFounderName($: cheerio.CheerioAPI): string | null {
  // meta author
  const metaAuthor = $('meta[name="author"]').attr('content')?.trim()
  if (metaAuthor && metaAuthor.length < 50) return metaAuthor

  // og:title oder article:author
  const ogAuthor = $('meta[property="article:author"]').attr('content')?.trim()
  if (ogAuthor && ogAuthor.length < 50) return ogAuthor

  // Schema.org Person
  const schemaScript = $('script[type="application/ld+json"]')
    .toArray()
    .map((el) => $(el).html())
    .find((s) => s?.includes('"@type":"Person"') || s?.includes('"@type": "Person"'))

  if (schemaScript) {
    try {
      const parsed = JSON.parse(schemaScript)
      if (parsed.name) return parsed.name
    } catch { /* ignore */ }
  }

  return null
}

// ─── Scoring ──────────────────────────────────────────────────────────

function scoreReachability(
  emails: string[],
  xHandles: string[],
  linkedin: string | null,
  founder: string | null
): { reachability: Reachability; reason: string } {
  const hasGoodEmail = emails.some((e) => !isGenericEmail(e))
  const hasX = xHandles.length > 0
  const hasLinkedIn = Boolean(linkedin)
  const hasName = Boolean(founder)

  if (hasX && hasName) return { reachability: 'high', reason: 'active X account + known founder' }
  if (hasX) return { reachability: 'high', reason: 'X account found' }
  if (hasLinkedIn && hasGoodEmail) return { reachability: 'medium', reason: 'LinkedIn + direct email' }
  if (hasLinkedIn) return { reachability: 'medium', reason: 'LinkedIn found' }
  if (hasGoodEmail) return { reachability: 'low', reason: 'direct email only' }
  if (emails.length > 0) return { reachability: 'low', reason: 'generic email only' }
  return { reachability: 'dead', reason: 'no contact info found' }
}

// ─── Helpers ──────────────────────────────────────────────────────────

async function fetchSite(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'variante-leadgen/1.0', Accept: 'text/html' },
    redirect: 'follow',
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`)
  return res.text()
}

function isValidEmail(email: string): boolean {
  return /^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(email) && email.length < 254
}

function isGenericEmail(email: string): boolean {
  const genericPrefixes = ['info', 'support', 'hello', 'contact', 'admin', 'team', 'sales', 'office', 'mail', 'hi', 'hey']
  const prefix = email.split('@')[0]
  return genericPrefixes.includes(prefix)
}
