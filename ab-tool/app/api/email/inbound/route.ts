import { tryAutoResponse } from '@/lib/emailAgent'
import { safeError } from '@/lib/safeLog'
import crypto from 'crypto'

// =============================================================================
// POST /api/email/inbound — Resend Inbound Webhook
//
// Empfängt eingehende Emails an hello@getvariante.com via Resend Inbound.
// Klassifiziert via OpenAI und antwortet automatisch auf Cold-Outreach
// (Redesign/SEO/Marketing-Pitches) mit dem Reverse-Pitch.
//
// Sicherheit:
//   - Webhook-Signatur-Verifikation via RESEND_INBOUND_SECRET
//   - Rate-Limiting: nur 1 Antwort pro Sender alle 90 Tage
//
// Resend Inbound Docs: https://resend.com/docs/dashboard/emails/inbound
// =============================================================================

export async function POST(req: Request) {
  // --- Webhook-Verifikation (Svix-Standard, von Resend verwendet) ---
  const svixId = req.headers.get('svix-id')
  const svixTimestamp = req.headers.get('svix-timestamp')
  const svixSignature = req.headers.get('svix-signature')
  const secret = process.env.RESEND_INBOUND_SECRET

  if (!secret) {
    safeError('email/inbound', new Error('RESEND_INBOUND_SECRET not configured'))
    return Response.json({ error: 'not configured' }, { status: 501 })
  }

  // Raw Body für Signatur-Verifikation sichern
  const rawBody = await req.text()

  if (svixId && svixTimestamp && svixSignature) {
    const isValid = verifySvixSignature(rawBody, svixId, svixTimestamp, svixSignature, secret)
    if (!isValid) {
      return Response.json({ error: 'invalid signature' }, { status: 401 })
    }
  } else {
    // Fallback: einfacher Secret-Header (für Tests / alternative Setups)
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${secret}`) {
      return Response.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  // --- Email parsen ---
  let email: { from?: string; to?: string; subject?: string; text?: string; html?: string; headers?: Record<string, string> }
  try {
    email = JSON.parse(rawBody)
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 })
  }

  const fromEmail = email.from?.match(/<([^>]+)>/)?.[1] || email.from || ''
  const fromName = email.from?.match(/^"?([^"<]+)"?\s*</)?.[1]?.trim() || ''
  const subject = email.subject || ''
  const bodyText = email.text || email.html?.replace(/<[^>]*>/g, '') || ''

  if (!fromEmail) {
    return Response.json({ error: 'missing from address' }, { status: 400 })
  }

  // --- Auto-Response versuchen ---
  const result = await tryAutoResponse(fromEmail, fromName, subject, bodyText)

  console.log(`[email/inbound] from=${fromEmail} category=${result.category} sent=${result.sent} reason=${result.reason}`)

  return Response.json({
    processed: true,
    outreach: result.category !== 'not_outreach',
    autoReplied: result.sent,
    category: result.category,
  })
}

// =============================================================================
// Svix-Webhook-Verifikation
// Standard: https://docs.svix.com/receiving/verifying-payloads/how
// =============================================================================

function verifySvixSignature(
  payload: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string,
): boolean {
  try {
    // Secret ist im Format "whsec_<base64>"
    const secretKey = secret.startsWith('whsec_') ? secret.slice(6) : secret

    // Signed content: "{svix-id}.{svix-timestamp}.{body}"
    const signedContent = `${svixId}.${svixTimestamp}.${payload}`

    // Secret decodieren (base64)
    const secretBytes = base64Decode(secretKey)

    // HMAC-SHA256
    const encoder = new TextEncoder()
    const key = crypto.subtle ? null : null // Node.js crypto module

    // Use Node crypto for HMAC
    const computed = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64')

    // svix-signature hat das Format "v1,<base64-signature>"
    const parts = svixSignature.split(',')
    if (parts.length < 2) return false

    const sigVersion = parts[0].trim()
    const sigValue = parts.slice(1).join(',').trim()

    if (sigVersion !== 'v1') return false

    // Timing-safe comparison
    return timingSafeEqual(computed, sigValue)
  } catch (err) {
    safeError('email/inbound:verify', err)
    return false
  }
}

function base64Decode(str: string): Buffer {
  // Padding normalisieren
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4)
  return Buffer.from(padded, 'base64')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
