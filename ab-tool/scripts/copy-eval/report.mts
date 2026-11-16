// Baut aus dem Eval-JSON eine Bewertungsseite (Blindtest: Arme gemischt und
// verdeckt). Aufruf: npx tsx scripts/copy-eval/report.mts <eval.json> <out.html>
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

type V = { text: string; angle?: string; why?: string; flags?: string[] }
type Arm = { variants: V[]; error?: string; retried?: boolean }
type El = { original?: string; missing?: boolean; limits?: { maxChars: number; maxWords?: number }; arms?: Record<string, Arm> }
type R = {
  url: string; segment: string; language?: string; fetchError?: string; subline?: string
  brief?: { offer?: string; audience?: string; form_of_address?: string }
  elements?: Record<string, El>
}

const [, , inFile, outFile] = process.argv
if (!inFile || !outFile) throw new Error('npx tsx scripts/copy-eval/report.mts <eval.json> <out.html>')
const run = JSON.parse(readFileSync(inFile, 'utf8')) as { ranAt: string; version?: number; models: Record<string, string>; results: R[] }
const runId = `v${run.version ?? 1}`

// Deterministisch mischen (gleiche Reihenfolge bei jedem Neubau)
function seeded(seed: string) {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296
}

const pages = run.results.map((r, pi) => ({
  url: r.url,
  segment: r.segment,
  language: r.language ?? '',
  offer: r.brief?.offer ?? '',
  audience: r.brief?.audience ?? '',
  address: r.brief?.form_of_address ?? '',
  subline: r.subline ?? '',
  error: r.fetchError ?? null,
  elements: (['headline', 'cta'] as const).map((kind) => {
    const el = r.elements?.[kind]
    if (!el || el.missing || !el.arms) return { kind, missing: true, original: '', maxChars: 0, variants: [] as unknown[], armErrors: {} }
    const variants: { id: string; arm: string; text: string; angle: string; why: string; flags: string[] }[] = []
    const armErrors: Record<string, string> = {}
    for (const [arm, a] of Object.entries(el.arms)) {
      if (a.error) armErrors[arm] = a.error
      a.variants.forEach((v, vi) => variants.push({
        id: `${runId}-p${pi}-${kind[0]}-${arm}-${vi}`, arm, text: v.text, angle: v.angle ?? '', why: v.why ?? '', flags: v.flags ?? [],
      }))
    }
    const rnd = seeded(`${r.url}|${kind}`)
    for (let i = variants.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [variants[i], variants[j]] = [variants[j], variants[i]]
    }
    return { kind, missing: false, original: el.original ?? '', maxChars: el.limits?.maxChars ?? 0, variants, armErrors }
  }),
}))

const tpl = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'report.template.html'), 'utf8')
const data = JSON.stringify({ runId, ranAt: run.ranAt, models: run.models, pages }).replace(/</g, '\\u003c')
writeFileSync(outFile, tpl.replace('"__DATA__"', data))
console.log(`Geschrieben: ${outFile}`)
