import { supabase } from '@/lib/supabase'
import { safeError } from '@/lib/safeLog'

// =============================================================================
// Cold-Outreach Email Agent
// Klassifiziert eingehende Emails via OpenAI und antwortet automatisch
// mit dem Reverse-Pitch: "Ihr verkauft bessere Conversions — messt ihr die auch?"
//
// Architektur:
//   hello@ → Resend Inbound → /api/email/inbound → classifyEmail()
//     → isOutreach? → generateResponse() → Resend send
//     → sonst: ignore (kein Auto-Reply)
// =============================================================================

export type EmailCategory = 'redesign' | 'seo' | 'marketing' | 'agency' | 'unknown_outreach' | 'not_outreach'

export interface ClassificationResult {
  isOutreach: boolean
  category: EmailCategory
  reasoning: string
}

// Template für die Reverse-Pitch-Antwort. {fromName} und {subject} werden ersetzt.
const RESPONSE_TEMPLATES: Record<string, string> = {
  redesign: `Hey {fromName},

thanks for reaching out about redesigning our landing page.

One question: when you redesign a client's site, how do you measure
the impact? Do you run A/B tests to prove the new design actually
converts better?

We built exactly that: variante — A/B testing directly from Figma,
no dev needed. Designers pick two variants, our snippet tracks
conversions, significance, and picks a winner automatically.

If you want to prove your redesigns with hard numbers for your next
client: I'll give you a free Pro account as an early partner.
No pitch — genuine offer.

Cheers,
Valentin`,

  seo: `Hey {fromName},

thanks for the SEO offer.

Quick question: when you optimize a site, how do you prove the impact?
Traffic alone doesn't pay bills — do you A/B test the conversion
changes (CTAs, layouts, copy) that come with the SEO work?

We built variante: A/B testing from Figma for designers and marketers.
Two clicks to set up, automatic winner detection, no dev needed.

If you want to add "and we prove it with A/B testing" to your SEO
packages: free Pro account for early partners. Let me know.

Cheers,
Valentin`,

  marketing: `Hey {fromName},

thanks for reaching out.

Honest question: when you promise better conversions or growth, how
do you measure that for your clients? Is it A/B tested, or is it
"trust us, it's better now"?

We built variante — A/B testing from Figma. Designers create variants,
our snippet handles the rest (tracking, significance, winner detection).
The thing your clients actually need to prove your work.

Free Pro account if you want to test-drive it on your next project.
No strings.

Cheers,
Valentin`,

  agency: `Hey {fromName},

thanks for reaching out. Since you're an agency selling better
conversions, one thing I'm curious about:

Do you A/B test your work for clients? Or is it more of a "trust me,
this converts better" situation?

We built variante — A/B testing directly from Figma. Built for
designers and agencies who want to prove their impact with numbers
instead of gut feelings. No dev, no setup, just two variants and
automatic winner detection.

If you want to add measurable proof to your agency's pitch deck:
I'll give you a free Pro account to test on your next client project.

Cheers,
Valentin`,

  unknown_outreach: `Hey {fromName},

thanks for your message.

Quick question, since you're in the business of improving websites:
how do you measure the impact of your work? Do you run A/B tests?

We built variante: A/B testing directly from Figma, no dev needed.
Designers create two variants, our snippet tracks conversions and
picks the winner automatically.

If that's useful for your work: happy to give you a free Pro account
as an early partner. Let me know.

Cheers,
Valentin`,
}

// =============================================================================
// Klassifikation via OpenAI (gpt-4o-mini, ~$0.0001/Call)
// =============================================================================

const CLASSIFY_SYSTEM_PROMPT = `You are an email classifier for "variante", an A/B testing SaaS from Figma.
Analyze the email and determine if it's cold outreach from someone selling services.

COLD_OUTREACH — the sender is offering:
- Website redesign or UI/UX overhaul
- SEO optimization or search engine marketing
- CEO/executive marketing or personal branding
- Lead generation or growth hacking
- Digital marketing, social media management, or paid ads
- "We can improve your website/conversions/traffic"
- Generic "are you interested in our services" from agencies

NOT_OUTREACH — everything else:
- Customer support, feature requests, bug reports
- Partnership inquiries from complementary tools
- Personal or social emails
- Billing or account questions
- Newsletter or automated emails (not 1:1 pitches)
- Job applications or collaboration offers

Return JSON only, no markdown:
{"isOutreach":true,"category":"redesign","reasoning":"Offers website redesign services for landing page"}

Categories: "redesign" | "seo" | "marketing" | "agency" | "unknown_outreach" | "not_outreach"
Use "agency" for multi-service agencies, "unknown_outreach" if clearly outreach but category unclear.`

export async function classifyEmail(subject: string, bodyText: string): Promise<ClassificationResult> {
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) return { isOutreach: false, category: 'not_outreach', reasoning: 'no api key' }

  // Nur erste ~1000 Zeichen analysieren (reicht für Klassifikation, spart Tokens)
  const truncated = bodyText.slice(0, 1200)
  const userMessage = `Subject: ${subject}\n\nBody: ${truncated}`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: CLASSIFY_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0,
        max_tokens: 150,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      safeError('emailAgent:classify', new Error(`OpenAI ${res.status}`))
      return { isOutreach: false, category: 'not_outreach', reasoning: 'api error' }
    }

    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content
    const parsed = JSON.parse(raw)

    return {
      isOutreach: parsed.isOutreach === true,
      category: parsed.category || 'not_outreach',
      reasoning: parsed.reasoning || '',
    }
  } catch (err) {
    safeError('emailAgent:classify', err)
    return { isOutreach: false, category: 'not_outreach', reasoning: 'exception' }
  }
}

// =============================================================================
// Rate-Limiting: Prüft ob Sender in den letzten 90 Tagen schon Antwort bekam
// =============================================================================

export async function alreadyReplied(fromEmail: string): Promise<boolean> {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { count, error } = await supabase
      .from('email_auto_responses')
      .select('id', { count: 'exact', head: true })
      .eq('from_email', fromEmail.toLowerCase().trim())
      .gte('created_at', ninetyDaysAgo)

    if (error) {
      safeError('emailAgent:alreadyReplied', error)
      return false // im Zweifel antworten
    }
    return (count ?? 0) > 0
  } catch (err) {
    safeError('emailAgent:alreadyReplied', err)
    return false
  }
}

// =============================================================================
// Antwort loggen (für Rate-Limiting)
// =============================================================================

async function logResponse(fromEmail: string, fromName: string, category: string, subject: string): Promise<void> {
  try {
    await supabase.from('email_auto_responses').insert({
      from_email: fromEmail.toLowerCase().trim(),
      from_name: fromName || null,
      category,
      raw_subject: subject?.slice(0, 200) || null,
    })
  } catch (err) {
    safeError('emailAgent:logResponse', err)
  }
}

// =============================================================================
// Antwort generieren & senden
// =============================================================================

export interface AutoResponseResult {
  sent: boolean
  category: EmailCategory
  reason: string
}

export async function tryAutoResponse(
  fromEmail: string,
  fromName: string,
  subject: string,
  bodyText: string,
): Promise<AutoResponseResult> {
  const resendKey = process.env.RESEND_API_KEY
  const fromAddr = process.env.RESEND_FROM || 'hello@getvariante.com'

  if (!resendKey) {
    return { sent: false, category: 'not_outreach', reason: 'no resend key' }
  }

  // 1. Klassifizieren
  const classification = await classifyEmail(subject, bodyText)
  if (!classification.isOutreach) {
    return { sent: false, category: classification.category, reason: classification.reasoning }
  }

  // 2. Rate-Limit prüfen
  const replied = await alreadyReplied(fromEmail)
  if (replied) {
    return { sent: false, category: classification.category, reason: 'already replied (90d)' }
  }

  // 3. Template wählen
  const template = RESPONSE_TEMPLATES[classification.category] || RESPONSE_TEMPLATES.unknown_outreach
  const htmlBody = template
    .replace(/\{fromName\}/g, fromName || 'there')
    .replace(/\{subject\}/g, subject || 'your message')
    .replace(/\n/g, '<br>')

  // 4. Senden via Resend
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Valentin @ variante <${fromAddr}>`,
        to: fromEmail,
        subject: `Re: ${subject || 'your message'}`,
        html: `<div style="font-family:system-ui,sans-serif;color:#ededed;max-width:560px">${htmlBody}</div>`,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      safeError('emailAgent:send', new Error(`Resend ${res.status}: ${errText}`))
      return { sent: false, category: classification.category, reason: `resend error ${res.status}` }
    }

    // 5. Antwort loggen
    await logResponse(fromEmail, fromName, classification.category, subject)

    return { sent: true, category: classification.category, reason: classification.reasoning }
  } catch (err) {
    safeError('emailAgent:send', err)
    return { sent: false, category: classification.category, reason: 'send exception' }
  }
}
