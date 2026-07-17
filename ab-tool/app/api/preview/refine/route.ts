// Refine-Schleife für die Hybrid-Preview (Plan §3.2).
//
// "Make the button more rounded" → gpt-4o-mini tweakt das CSS der bestehenden
// Changes → neuer Variant-Screenshot. Die Selektoren sind eingefroren: Refine
// darf Styles ändern, aber keine neuen Elemente erfinden — sonst wäre die
// DOM-Verifikation aus der Analyse (Option A) wieder wertlos.

import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { safeError } from '@/lib/safeLog'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { refinePreview, buildHighlightCss, type PreviewChange } from '@/lib/previewAnalyze'
import { renderScreenshot, uploadShot } from '@/lib/screenshot'

// Ein Render (bis 40s Timeout + Settle-Delay) + gpt-4o-mini.
export const maxDuration = 90

// Refine ist billiger als Preview (~$0.007: 1 Render + mini-Call), aber ebenso
// unauthentifiziert — gleiche Deckel-Logik, großzügigere Werte.
const DAILY_IP_LIMIT = Number(process.env.REFINE_DAILY_IP_LIMIT) || 30
const DAILY_GLOBAL_LIMIT = Number(process.env.REFINE_DAILY_GLOBAL_LIMIT) || 600
const DAY_MS = 86_400_000

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

interface PreviewData {
  previewId?: string
  previewedUrl?: string
  changes?: PreviewChange[]
  injectedCss?: string
  summary?: string
  selectorSource?: string
}

export async function POST(req: Request) {
  const ip = getClientIp(req)
  if (!(await checkRateLimit(`preview-refine:${ip}`, 10, 60_000))) {
    return json({ error: 'too many requests', message: 'Give it a minute — 10 refinements per minute.' }, 429)
  }
  if (!(await checkRateLimit(`preview-refine:day:${ip}`, DAILY_IP_LIMIT, DAY_MS))) {
    return json({
      error: 'daily limit',
      message: `That's ${DAILY_IP_LIMIT} refinements today — sign up to keep going.`,
      signup_url: '/signup?source=demo-limit',
    }, 429)
  }
  if (!(await checkRateLimit('preview-refine:day:global', DAILY_GLOBAL_LIMIT, DAY_MS))) {
    return json({ error: 'too many requests', message: 'The demo is very busy right now. Try again later.' }, 429)
  }

  let body: { previewId?: string; testId?: string; feedback?: string; changeId?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const feedback = (body.feedback ?? '').trim()
  if (!feedback) return json({ error: 'feedback required' }, 400)
  if (!body.testId || !body.previewId) return json({ error: 'testId and previewId required' }, 400)

  // previewId ist das Geheimnis: eine UUID die nur der Ersteller aus der
  // /api/preview-Response kennt. Ohne sie kann niemand fremde Previews
  // umschreiben, obwohl testId in der Signup-URL steht.
  const { data: test, error } = await supabase
    .from('tests')
    .select('id, site_url, status, preview_data')
    .eq('id', body.testId)
    .maybeSingle()

  if (error) {
    safeError('preview-refine-load', error)
    return json({ error: 'db error' }, 500)
  }
  if (!test || test.status !== 'preview') return json({ error: 'preview not found' }, 404)

  const previewData = (test.preview_data ?? {}) as PreviewData
  if (!previewData.previewId || previewData.previewId !== body.previewId) {
    return json({ error: 'preview not found' }, 404)
  }

  const changes = previewData.changes ?? []
  const url = previewData.previewedUrl || test.site_url
  if (!changes.length || !url) return json({ error: 'preview has no changes to refine' }, 422)

  let refined
  try {
    refined = await refinePreview(changes, feedback, body.changeId)
  } catch (err) {
    safeError('preview-refine-analyze', err)
    return json({ error: 'refine_failed', message: "That didn't work — try describing the change differently." }, 502)
  }

  // Neuer Variant-Screenshot. upsert auf denselben Pfad überschreibt den alten,
  // damit sammeln sich bei mehreren Refines keine Leichen im Bucket an
  // (Plan §3.2 Schritt 5).
  let variantShot: string
  try {
    const png = await renderScreenshot(url, { css: buildHighlightCss(refined.changes) })
    variantShot = await uploadShot(`${previewData.previewId}/variant.png`, png)
  } catch (err) {
    safeError('preview-refine-screenshot', err)
    return json({ error: 'screenshot_failed', message: "We couldn't render the refined variant. Try again." }, 502)
  }

  const { error: updateError } = await supabase
    .from('tests')
    .update({
      preview_variant_screenshot_url: variantShot,
      preview_data: {
        ...previewData,
        changes: refined.changes,
        injectedCss: refined.injectedCss,
        summary: refined.summary,
      },
    })
    .eq('id', test.id)

  if (updateError) {
    safeError('preview-refine-update', updateError)
    return json({ error: 'db error' }, 500)
  }

  return json({
    changes: refined.changes,
    variantScreenshotUrl: variantShot,
    injectedCss: refined.injectedCss,
    summary: refined.summary,
  })
}

function json(payload: unknown, status = 200): Response {
  return Response.json(payload, { status, headers: corsHeaders('POST, OPTIONS') })
}
