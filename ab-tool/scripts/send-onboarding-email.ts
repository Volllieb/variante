import { Resend } from 'resend'

async function main() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY not set')

  const resend = new Resend(apiKey)

  const { data, error } = await resend.emails.send({
    from: 'Valli <hallo@getvariante.com>',
    to: 'css.edu.apps@gmail.com',
    subject: 'variante — quick question',
    html: `<p>Hi unnoorain,</p>
<p>saw you signed up for variante yesterday. Honestly made my day. You're the first person who found it on their own.</p>
<p>Quick question: what were you looking for when you landed on the site? A/B testing for a client project, your own site, something Figma-related?</p>
<p>If you're actually trying to test something, happy to hop on a quick call and walk you through setup. Takes ~10 minutes and I'll upgrade you to Pro for free. Least I can do for user #1.</p>
<p>No pressure either way.</p>
<p>Valli</p>`,
  })

  if (error) {
    console.error('❌', error)
    process.exit(1)
  }
  console.log('✅ Sent:', data?.id)
}

main()
