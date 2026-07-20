#!/usr/bin/env node

/**
 * leadgen/draft.ts — Stufe 4: Personalisierte Outreach-Drafts per GPT.
 *
 * Liest changes.json + enriched.json aus docs/leads/<slug>/, generiert
 * DM-Entwurf (X-DM, 4 Sätze max) und E-Mail-Entwurf (Fallback).
 *
 * Stilvorlage: Loom-DM-Template aus gotomarket.md + Posting-Stil aus User-Memory.
 *
 * Usage (direkt):
 *   npx tsx scripts/leadgen/draft.ts --slug getibex-com
 *
 * Usage (aus pipeline.ts):
 *   import { generateDrafts } from './draft'
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { parseArgs } from 'node:util'
import type { EnrichedLead } from './enrich'

// ── Types ─────────────────────────────────────────────────────────────

interface ChangesJson {
  url: string
  title: string | null
  summary: string
  changes: Array<{
    selector: string
    css: string
    rationale: string
  }>
}

export interface DraftResult {
  dm: string
  email: string
}

// ── Stilvorlagen ──────────────────────────────────────────────────────

const STYLE_PROMPT = `You are a solo dev who'd rather build than sell. Casual, dry, self-deprecating.
Short sentences. No corporate speak, no exclamation marks, no "excited to announce"
energy. Lead with the pain, not the product. Humor is understated. Never polish —
this is a cold DM, not a pitch deck.`

const DM_TEMPLATE_REF = `Template reference (from the project's gotomarket.md):
"Hey [Name], 30 sec Loom attached — I ran your landing page through our
A/B tool (designers test straight from Figma, no dev). [One specific observation
about their site.] I'd be happy to set up your first experiment for free.
Takes 5 minutes, you get the data either way. Worth a shot?"

IMPORTANT: Instead of "Loom attached", use "I ran your site through my A/B tool".
Reference the actual screenshots as "your page next to what I'd test".`

const HARD_RULES = `HARD RULES:
- MAX 4 sentences total.
- Include exactly ONE specific observation from the changes list.
  Example: "your CTA switches between 'Get Started' and 'Sign Up' inconsistently"
  Example: "your hero button is a ghost button on a gradient — easy contrast win"
- Do NOT mention "AI", "GPT", or "generated". Say "my A/B tool" or "I ran your site through".
- Tone must match: casual, solo dev, slightly self-deprecating.
- If founder name is known, use first name. If not, omit greeting.
- End with a soft question — not a pitch. "Worth a shot?" or "Would that be useful?"`

// ── Main (direct CLI) ─────────────────────────────────────────────────

const { values } = parseArgs({
  options: {
    slug: { type: 'string', short: 's' },
  },
})

if (values.slug) {
  const ROOT = path.resolve(import.meta.dirname!, '..', '..')
  const LEADS_DIR = path.join(ROOT, '..', 'docs', 'leads')

  const slug = values.slug
  const dir = path.join(LEADS_DIR, slug)

  const changes: ChangesJson = JSON.parse(fs.readFileSync(path.join(dir, 'changes.json'), 'utf-8'))
  const enriched: EnrichedLead | null = readJsonSafe(path.join(dir, 'enriched.json'))

  generateDrafts(changes, enriched)
    .then((result) => {
      fs.writeFileSync(path.join(dir, 'draft-dm.txt'), result.dm)
      fs.writeFileSync(path.join(dir, 'draft-email.txt'), result.email)
      console.log('✅ Drafts written:')
      console.log(`   DM: ${path.join(dir, 'draft-dm.txt')}`)
      console.log(`   Email: ${path.join(dir, 'draft-email.txt')}`)
      console.log(`\n${result.dm}`)
    })
    .catch((e) => {
      console.error('Draft generation failed:', e)
      process.exit(1)
    })
}

// ── Core ───────────────────────────────────────────────────────────────

export async function generateDrafts(
  changes: ChangesJson,
  enriched: EnrichedLead | null
): Promise<DraftResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY missing')

  const dossier = buildDossier(changes, enriched)

  const [dm, email] = await Promise.all([
    generateDm(apiKey, dossier),
    generateEmail(apiKey, dossier),
  ])

  return { dm, email }
}

async function generateDm(apiKey: string, dossier: string): Promise<string> {
  return callGPT(apiKey, [
    { role: 'system', content: STYLE_PROMPT },
    {
      role: 'user',
      content: [
        DM_TEMPLATE_REF,
        '',
        HARD_RULES,
        '',
        'Write a cold DM for X/Twitter:',
        dossier,
      ].join('\n'),
    },
  ])
}

async function generateEmail(apiKey: string, dossier: string): Promise<string> {
  return callGPT(apiKey, [
    { role: 'system', content: STYLE_PROMPT },
    {
      role: 'user',
      content: [
        'Write a cold outreach EMAIL (not DM).',
        'Subject line first, then body.',
        'Slightly more formal than the DM but still casual and personal.',
        'No marketing speak. No "dear sir/madam".',
        '',
        'Same tone rules: max 5 sentences, one specific observation, soft question at end.',
        '',
        dossier,
      ].join('\n'),
    },
  ])
}

// ── Helpers ───────────────────────────────────────────────────────────

function buildDossier(changes: ChangesJson, enriched: EnrichedLead | null): string {
  const parts: string[] = []

  parts.push(`URL: ${changes.url}`)
  if (changes.title) parts.push(`Site title: ${changes.title}`)

  if (enriched) {
    if (enriched.founderName) parts.push(`Founder: ${enriched.founderName}`)
    if (enriched.xHandles.length > 0) parts.push(`X/Twitter: ${enriched.xHandles.join(', ')}`)
    if (enriched.emails.length > 0) parts.push(`Email: ${enriched.emails.join(', ')}`)
    parts.push(`Reachability: ${enriched.reachability} (${enriched.reachabilityReason})`)
  }

  parts.push('')
  parts.push('Analysis summary: ' + changes.summary)
  parts.push('')
  parts.push('Specific changes found:')
  for (const c of changes.changes) {
    parts.push(`- ${c.selector}: ${c.rationale}`)
  }

  return parts.join('\n')
}

async function callGPT(
  apiKey: string,
  messages: Array<{ role: 'system' | 'user'; content: string }>
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 300,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`OpenAI error (${res.status}): ${errText.slice(0, 200)}`)
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = json.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('Empty AI response')
  return content
}

function readJsonSafe<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}
