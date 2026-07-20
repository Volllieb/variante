// Screenshot-Rendering für Code-First-Previews (Plan §3.1, Code-First-Refactor).
//
// GET /api/preview/screenshots?previewId=xxx&testId=yyy
//
// Wird vom Client gepollt, nachdem POST /api/preview die Changes ohne
// Screenshots zurückgegeben hat (screenshotsPending: true). Idempotent:
// sind die URLs schon da, wird kein zweiter Render angestoßen.

import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { safeError } from '@/lib/safeLog'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { buildHighlightCss, type PreviewChange } from '@/lib/previewAnalyze'
import { renderSettledScreenshot, uploadShot, SHOT_WIDTH, SHOT_HEIGHT } from '@/lib/screenshot'

export const maxDuration = 90

const HOUR_MS = 3_600_000

interface PreviewData {
  previewId?: string
  previewedUrl?: string
  changes?: PreviewChange[]
  injectedCss?: string
  summary?: string
  selectorSource?: string
}

export async function OPTIONS() {
  return preflight('GET, OPTIONS')
}

export async function GET(req: Request) {
  const ip = getClientIp(req)
  if (!(await checkRateLimit(`preview-screenshots:${ip}`, 5, 60_000))) {
    return json({ error: 'too many requests' }, 429)
  }

  const { searchParams } = new URL(req.url)
  const previewId = searchParams.get('previewId')
  const testId = searchParams.get('testId')
  if (!previewId || !testId) return json({ error: 'previewId and testId required' }, 400)

  // Enumeration-Schutz
  if (!(await checkRateLimit(`preview-screenshots:pid:${previewId}`, 10, HOUR_MS))) {
    return json({ error: 'too many requests' }, 429)
  }

  // Config-Check
  if (!process.env.URLBOX_API_KEY) {
    safeError('preview-config', 'URLBOX_API_KEY missing in screenshots endpoint')
    return json({ error: 'config_missing' }, 500)
  }

  // Test laden
  const { data: test, error } = await supabase
    .from('tests')
    .select('id, site_url, status, preview_original_screenshot_url, preview_variant_screenshot_url, preview_data')
    .eq('id', testId)
    .maybeSingle()

  if (error) {
    safeError('preview-screenshots-load', error)
    return json({ error: 'db error' }, 500)
  }
  if (!test || test.status !== 'preview') return json({ error: 'not found' }, 404)

  // previewId verifizieren (der Client kennt beides)
  const previewData = (test.preview_data ?? {}) as PreviewData
  if (previewData.previewId !== previewId) return json({ error: 'not found' }, 404)

  // Idempotent: wenn schon da, sofort return
  if (test.preview_original_screenshot_url && test.preview_variant_screenshot_url) {
    return json({
      originalUrl: test.preview_original_screenshot_url,
      variantUrl: test.preview_variant_screenshot_url,
      width: SHOT_WIDTH,
      height: SHOT_HEIGHT,
    })
  }

  const url = previewData.previewedUrl || test.site_url
  const changes = previewData.changes ?? []
  if (!url) return json({ error: 'preview has no URL' }, 422)

  // Original-Screenshot
  let originalUrl: string
  try {
    const { png, blank } = await renderSettledScreenshot(url)
    if (blank) throw new Error('original render blank')
    originalUrl = await uploadShot(`${previewId}/original.png`, png)
  } catch (err) {
    safeError('preview-screenshots-original', err)
    return json({ error: 'screenshot_failed' }, 502)
  }

  // Variant-Screenshot (mit Highlights falls Changes vorhanden)
  let variantUrl: string
  try {
    const css = changes.length > 0 ? buildHighlightCss(changes) : undefined
    const { png, blank } = await renderSettledScreenshot(url, { css })
    if (blank) throw new Error('variant render blank')
    variantUrl = await uploadShot(`${previewId}/variant.png`, png)
  } catch (err) {
    safeError('preview-screenshots-variant', err)
    return json({ error: 'variant_screenshot_failed' }, 502)
  }

  // DB updaten
  const { error: updateError } = await supabase
    .from('tests')
    .update({
      preview_original_screenshot_url: originalUrl,
      preview_variant_screenshot_url: variantUrl,
    })
    .eq('id', testId)

  if (updateError) {
    safeError('preview-screenshots-update', updateError)
    // Nicht fatal — der Client kann die URLs trotzdem nutzen, beim nächsten
    // Poll ist es dann drin.
  }

  return json({ originalUrl, variantUrl, width: SHOT_WIDTH, height: SHOT_HEIGHT })
}

function json(payload: unknown, status = 200): Response {
  return Response.json(payload, { status, headers: corsHeaders('GET, OPTIONS') })
}
