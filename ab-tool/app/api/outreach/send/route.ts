/**
 * POST /api/outreach/send
 *
 * Sendet EINEN freigegebenen Outreach-Entwurf. Interner Marketing-Einsatz.
 * Kein Auto-Send: wird nur durch einen expliziten Klick in der /outreach-UI
 * ausgelöst, ein Request = eine Mail.
 *
 * Auth: Shared-Secret `x-outreach-secret` === process.env.OUTREACH_SECRET.
 * Opt-out-Footer wird serverseitig erzwungen (nie weglassbar).
 */

import { corsHeaders, preflight } from '@/lib/cors'
import { safeError } from '@/lib/safeLog'
import { checkRateLimit } from '@/lib/rateLimit'
import { sendEmail } from '@/lib/email'

export const maxDuration = 30

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Plaintext-Body → schlichtes HTML + erzwungener Opt-out-Footer. */
function toHtml(body: string, senderName: string): string {
  const paragraphs = escapeHtml(body.trim()).split(/\n/).join('<br>')
  const imprint = process.env.OUTREACH_IMPRINT ? `<br>${escapeHtml(process.env.OUTREACH_IMPRINT)}` : ''
  const footer = [
    '<hr style="border:none;border-top:1px solid #ddd;margin:20px 0">',
    `<p style="font-size:12px;color:#888;line-height:1.5">`,
    'Du bekommst diese einmalige Nachricht, weil deine Seite öffentlich beworben wird. ',
    'Kein Interesse? Antworte kurz mit „Stop" und ich melde mich nicht wieder.',
    senderName ? `<br>— ${escapeHtml(senderName)}` : '',
    imprint,
    '</p>',
  ].join('')
  return `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;color:#111">${paragraphs}${footer}</div>`
}

export async function POST(req: Request) {
  const headers = corsHeaders('POST, OPTIONS')

  const secret = process.env.OUTREACH_SECRET
  if (!secret) {
    return Response.json({ error: 'not configured', message: 'OUTREACH_SECRET is not set.' }, { status: 503, headers })
  }
  if (req.headers.get('x-outreach-secret') !== secret) {
    return Response.json({ error: 'unauthorized' }, { status: 401, headers })
  }

  // Konservatives Limit: Cold-Outreach bewusst niedrig-volumig halten.
  if (!(await checkRateLimit('outreach-send', 20, 60_000))) {
    return Response.json({ error: 'rate limit', message: 'Max 20 sends per minute.' }, { status: 429, headers })
  }

  let body: { to?: string; subject?: string; body?: string; replyTo?: string; senderName?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers })
  }

  const to = (body.to ?? '').trim()
  const subject = (body.subject ?? '').trim()
  const text = (body.body ?? '').trim()
  const replyTo = (body.replyTo ?? '').trim()
  const senderName = (body.senderName ?? '').trim()

  if (!EMAIL_RE.test(to)) {
    return Response.json({ error: 'bad request', message: 'Gültige Empfänger-E-Mail fehlt.' }, { status: 400, headers })
  }
  if (!subject || !text) {
    return Response.json({ error: 'bad request', message: 'Betreff und Text sind Pflicht.' }, { status: 400, headers })
  }
  if (replyTo && !EMAIL_RE.test(replyTo)) {
    return Response.json({ error: 'bad request', message: 'Reply-To ist keine gültige E-Mail.' }, { status: 400, headers })
  }

  const ok = await sendEmail({
    to,
    subject,
    html: toHtml(text, senderName),
    ...(replyTo ? { replyTo } : {}),
  })

  if (!ok) {
    safeError('outreach-send-failed', { to })
    return Response.json(
      { error: 'send failed', message: 'Versand fehlgeschlagen (RESEND_API_KEY gesetzt? Domain verifiziert?).' },
      { status: 502, headers },
    )
  }

  return Response.json({ sent: true, to }, { headers })
}
