#!/usr/bin/env node

/**
 * leadgen/pipeline.ts — Leadgen-Pipeline Orchestrator.
 *
 * Liest docs/leads-inbox.txt und führt die volle Pipeline pro URL aus:
 *   Stufe 2 — Enrichment (Kontaktdaten + Reachability-Score)
 *   Stufe 3 — Analyse (Dual-Screenshots + GPT-4o CRO-Analyse)
 *   Stufe 4 — Draft (personalisierte DM + E-Mail per GPT-4o-mini)
 *
 * Usage:
 *   npx tsx scripts/leadgen/pipeline.ts                    # Alle URLs in der Inbox
 *   npx tsx scripts/leadgen/pipeline.ts --url https://...   # Einzelne URL
 *   npx tsx scripts/leadgen/pipeline.ts --dry-run            # Nur anzeigen, was passieren würde
 *   npx tsx scripts/leadgen/pipeline.ts --no-draft            # Nur Analyse, kein Draft
 *
 * Prerequisites:
 *   - OPENAI_API_KEY, URLBOX_API_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL
 *     in ab-tool/.env.local gesetzt (oder via vercel env pull)
 *   - tsx installiert (npm install -D tsx)
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { parseArgs } from 'node:util'
import { extractPageCode, type ExtractedPage } from '@/lib/extractPageCode'
import { analyzePreview, buildHighlightCss, type PreviewAnalysis } from '@/lib/previewAnalyze'
import { renderSettledScreenshot } from '@/lib/screenshot'
import { supabase } from '@/lib/supabase'
import { safeError } from '@/lib/safeLog'
import { enrichLead, type EnrichedLead } from './enrich'
import { generateDrafts } from './draft'

// ── CLI args ──────────────────────────────────────────────────────────

const { values } = parseArgs({
  options: {
    url: { type: 'string', short: 'u' },
    'dry-run': { type: 'boolean', default: false },
    'no-draft': { type: 'boolean', default: false },
  },
})

const DRY_RUN = values['dry-run'] ?? false
const SINGLE_URL = values.url
const SKIP_DRAFT = values['no-draft'] ?? false

// ── Pfade ─────────────────────────────────────────────────────────────

const ROOT = path.resolve(import.meta.dirname!, '..', '..')
const INBOX_PATH = path.join(ROOT, '..', 'docs', 'leads-inbox.txt')
const LEADS_DIR = path.join(ROOT, '..', 'docs', 'leads')
const BUCKET = 'previews'

// ── Types ─────────────────────────────────────────────────────────────

interface LeadResult {
  url: string
  slug: string
  ok: boolean
  error?: string
  spa?: boolean
  changes?: number
  summary?: string
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  const urls = SINGLE_URL
    ? [SINGLE_URL]
    : readInbox().filter(Boolean)

  if (urls.length === 0) {
    console.log('📭 Keine URLs in der Inbox. Füge URLs zu docs/leads-inbox.txt hinzu.')
    process.exit(0)
  }

  console.log(`\n🔬 Leadgen Pipeline — ${urls.length} URL(s)\n`)
  if (DRY_RUN) {
    for (const url of urls) console.log(`   ${url}`)
    console.log('\n⚠️  Dry-run — keine Analyse durchgeführt.\n')
    process.exit(0)
  }

  const results: LeadResult[] = []
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    console.log(`[${i + 1}/${urls.length}] ${url}`)
    const result = await processLead(url)
    results.push(result)
    console.log(result.ok ? `   ✅ ${result.changes} changes — ${result.summary}` : `   ❌ ${result.error}`)

    // Nicht die APIs überlasten
    if (i < urls.length - 1) {
      console.log('   ⏳ 2s delay...')
      await sleep(2000)
    }
  }

  // Summary
  const ok = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok).length
  console.log(`\n📊 Fertig: ${ok} ok, ${failed} failed\n`)

  // Inbox aufräumen: verarbeitete URLs entfernen (nur wenn nicht single-URL)
  if (!SINGLE_URL) {
    const processed = new Set(results.filter((r) => r.ok).map((r) => r.url))
    const remaining = readInbox().filter((u) => !processed.has(u))
    fs.writeFileSync(INBOX_PATH, '# Leads-Inbox\n' + remaining.map((u) => `# ${u}\n`).join('') + '\n')
    console.log('🧹 Inbox aufgeräumt — verarbeitete URLs auskommentiert.\n')
  }
}

// ── Lead-Verarbeitung ─────────────────────────────────────────────────

async function processLead(url: string): Promise<LeadResult> {
  const slug = urlToSlug(url)
  const dir = path.join(LEADS_DIR, slug)

  try {
    // 1. Enrichment (Stufe 2)
    console.log('   🔍 Kontaktdaten...')
    const enriched = await enrichLeadSafe(url)

    // 2. Page-Code extrahieren
    console.log('   📡 Extrahiere Page-Code...')
    const page = await extractPageCodeSafe(url)

    if (page?.isSpa) {
      console.log('   ⚠️  SPA erkannt — screenshot-only Analyse.')
    }

    // 3. Original-Screenshot
    console.log('   📸 Original-Screenshot...')
    const { png: originalPng, blank } = await renderSettledScreenshot(url)
    if (blank) return { url, slug, ok: false, error: 'Screenshot blank (leere Seite?)' }

    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'original.png'), originalPng)

    // 3. Screenshot für GPT-4o hochladen (braucht public URL)
    const screenshotUrl = await uploadTempShot(slug, 'original', originalPng)

    // 4. AI-Analyse
    console.log('   🤖 GPT-4o analysiert...')
    const analysis = page && !page.isSpa
      ? await analyzePreview(url, screenshotUrl, page)
      : await analyzePreview(url, screenshotUrl, null)

    // 5. Variant-Screenshot mit CSS-Injection
    console.log('   📸 Variant-Screenshot...')
    const highlightCss = buildHighlightCss(analysis.changes)
    const variantCss = [analysis.injectedCss, highlightCss].filter(Boolean).join('\n')
    const { png: variantPng } = await renderSettledScreenshot(url, { css: variantCss })
    fs.writeFileSync(path.join(dir, 'variant.png'), variantPng)

    // 7. Output schreiben
    writeOutput(dir, url, page, analysis, enriched)

    // 8. Draft generieren (Stufe 4)
    if (!SKIP_DRAFT) {
      console.log('   ✍️  Generiere Drafts...')
      const changesJson = JSON.parse(fs.readFileSync(path.join(dir, 'changes.json'), 'utf-8'))
      const { dm, email } = await generateDrafts(changesJson, enriched)
      fs.writeFileSync(path.join(dir, 'draft-dm.txt'), dm)
      fs.writeFileSync(path.join(dir, 'draft-email.txt'), email)
    }

    // 9. Temp-Screenshots aus Supabase löschen
    await cleanupTempShots(slug)

    return {
      url,
      slug,
      ok: true,
      spa: page?.isSpa ?? false,
      changes: analysis.changes.length,
      summary: analysis.summary.slice(0, 100),
    }
  } catch (err) {
    safeError('leadgen-pipeline', err)
    return { url, slug, ok: false, error: String(err) }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

function urlToSlug(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return host.replace(/\./g, '-').slice(0, 50)
  } catch {
    return url.replace(/[^a-z0-9-]/gi, '-').slice(0, 50)
  }
}

async function enrichLeadSafe(url: string): Promise<EnrichedLead | null> {
  try {
    return await enrichLead(url)
  } catch (err) {
    safeError('leadgen-enrich', err)
    return null
  }
}

async function extractPageCodeSafe(url: string): Promise<ExtractedPage | null> {
  try {
    return await extractPageCode(url)
  } catch (err) {
    safeError('leadgen-extract', err)
    return null
  }
}

/** Lädt PNG temporär in den Supabase-Bucket für GPT-4o image_url. */
async function uploadTempShot(slug: string, name: string, png: Buffer): Promise<string> {
  const path = `leadgen/${slug}/${name}.png`
  const { error } = await supabase.storage.from(BUCKET).upload(path, png, {
    contentType: 'image/png',
    upsert: true,
  })
  if (error) throw new Error(`Supabase upload failed: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) throw new Error('Supabase public URL generation failed')
  return data.publicUrl
}

/** Löscht die temporären Screenshots aus dem Bucket. */
async function cleanupTempShots(slug: string): Promise<void> {
  const prefix = `leadgen/${slug}/`
  const { data: files } = await supabase.storage.from(BUCKET).list('leadgen', {
    search: slug,
  })
  if (!files?.length) return
  await supabase.storage.from(BUCKET).remove(files.map((f) => `${prefix}${f.name}`))
}

function readInbox(): string[] {
  if (!fs.existsSync(INBOX_PATH)) return []
  const raw = fs.readFileSync(INBOX_PATH, 'utf-8')
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.startsWith('http'))
}

function writeOutput(
  dir: string,
  url: string,
  page: ExtractedPage | null,
  analysis: PreviewAnalysis,
  enriched: EnrichedLead | null
): void {
  // enriched.json — Kontaktdaten für Draft
  if (enriched) {
    fs.writeFileSync(path.join(dir, 'enriched.json'), JSON.stringify(enriched, null, 2))
  }

  // changes.json — strukturierte Daten für Draft-Generierung
  const changesJson = {
    url,
    title: page?.title ?? null,
    isSpa: page?.isSpa ?? false,
    changes: analysis.changes.map((c) => ({
      selector: c.selector,
      css: c.css,
      rationale: c.rationale,
    })),
    injectedCss: analysis.injectedCss,
    summary: analysis.summary,
  }
  fs.writeFileSync(path.join(dir, 'changes.json'), JSON.stringify(changesJson, null, 2))

  // dossier.md — menschenlesbare Übersicht
  const mdParts = [
    `# ${new URL(url).hostname}`,
    '',
    `**URL:** ${url}`,
    `**Titel:** ${page?.title ?? 'unbekannt'}`,
    `**SPA:** ${page?.isSpa ? 'ja' : 'nein'}`,
  ]

  if (enriched) {
    mdParts.push('')
    mdParts.push('## Kontakt')
    mdParts.push('')
    if (enriched.founderName) mdParts.push(`- **Founder:** ${enriched.founderName}`)
    if (enriched.emails.length > 0) mdParts.push(`- **E-Mail:** ${enriched.emails.join(', ')}`)
    if (enriched.xHandles.length > 0) mdParts.push(`- **X:** ${enriched.xHandles.join(', ')}`)
    if (enriched.linkedinUrl) mdParts.push(`- **LinkedIn:** ${enriched.linkedinUrl}`)
    mdParts.push(`- **Reachability:** ${enriched.reachability} (${enriched.reachabilityReason})`)
  }

  mdParts.push(
    '',
    '## Analyse',
    '',
    analysis.summary,
    '',
    '## Changes',
    '',
    ...analysis.changes.map(
      (c) => `- **\`${c.selector}\`** → \`${c.css}\`\n  ${c.rationale}`
    ),
    '',
    '## Screenshots',
    '',
    '![Original](original.png)',
    '![Variant](variant.png)',
    '',
  )
  fs.writeFileSync(path.join(dir, 'dossier.md'), mdParts.join('\n'))
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

// ── Run ───────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('❌ Pipeline failed:', err)
  process.exit(1)
})
