import { Resend } from 'resend'
import { safeError } from './safeLog'

let _resend: Resend | null = null

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

const FROM = process.env.RESEND_FROM || 'variante <notifications@getvariante.com>'

interface SendOptions {
  to: string
  subject: string
  html: string
  replyTo?: string
}

/** Sendet eine transaktionale E-Mail. Failt nicht — loggt nur. */
export async function sendEmail(opts: SendOptions): Promise<boolean> {
  const resend = getResend()
  if (!resend) {
    safeError('email:no-key', { message: 'RESEND_API_KEY not set, skipping email' })
    return false
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    })

    if (error) {
      safeError('email:send-failed', error)
      return false
    }

    return true
  } catch (e) {
    safeError('email:send-failed', { message: String(e) })
    return false
  }
}
