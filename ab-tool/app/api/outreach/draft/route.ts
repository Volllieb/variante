/**
 * POST /api/outreach/draft
 *
 * Internes Marketing-Tool: Lead-URL → Cold-Email-Entwurf.
 * Wiederverwendung der CRO-Engine (lib/croAnalyze) via lib/outreachDraft.
 *
 * Auth: Shared-Secret-Header `x-outreach-secret` === process.env.OUTREACH_SECRET.
 * Bewusst KEIN Plan-/Budget-Gate — interne Nutzung, nicht kundenseitig.
 * Rate-Limit: 10/min pro Secret, schützt vor versehentlichen Loops.
 */

import { corsHeaders, preflight } from '@/lib/cors'
import { safeError } from '@/lib/safeLog'
import { checkRateLimit } from '@/lib/rateLimit'
import { generateOutreachDraft } from '@/lib/outreachDraft'

export const maxDuration = 60

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

export async function POST(req: Request) {
  const headers = corsHeaders('POST, OPTIONS')

  // ─── Secret-Gate ───
  const secret = process.env.OUTREACH_SECRET
  if (!secret) {
    return Response.json(
      { error: 'not configured', message: 'OUTREACH_SECRET is not set on the server.' },
      { status: 503, headers },
    )
  }
  if (req.headers.get('x-outreach-secret') !== secret) {
    return Response.json({ error: 'unauthorized' }, { status: 401, headers })
  }

  // ─── Rate-Limit ───
  if (!(await checkRateLimit('outreach-draft', 10, 60_000))) {
    return Response.json({ error: 'rate limit', message: 'Max 10 drafts per minute.' }, { status: 429, headers })
  }

  // ─── Body ───
  let body: { url?: string; adContext?: string; senderName?: string; lang?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers })
  }
  if (!body.url || typeof body.url !== 'string') {
    return Response.json({ error: 'url is required' }, { status: 400, headers })
  }

  try {
    const draft = await generateOutreachDraft({
      url: body.url,
      adContext: typeof body.adContext === 'string' ? body.adContext : undefined,
      senderName: typeof body.senderName === 'string' ? body.senderName : undefined,
      lang: typeof body.lang === 'string' ? body.lang : undefined,
    })
    return Response.json({ draft }, { headers })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Erwartbare Eingabefehler → 4xx, Rest → 502.
    const isInput = ['url required', 'invalid URL', 'only http/https allowed', 'URL not allowed'].includes(msg)
    if (isInput) {
      return Response.json({ error: 'bad request', message: msg }, { status: 400, headers })
    }
    safeError('outreach-draft-failed', { url: body.url, error: msg })
    return Response.json({ error: 'draft failed', message: msg.slice(0, 300) }, { status: 502, headers })
  }
}
