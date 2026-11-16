import type { Metadata } from 'next'
import Link from 'next/link'
import { PandaLogo } from '@/components/PandaLogo'
import { ArrowLeft } from 'lucide-react'

// AGB (Terms of Service). Signup verlangt die Zustimmung zu /terms — die Seite
// fehlte bis 16.11.2026 (404, Product Audit P0). Aufbau wie /privacy.
// Entwurf: vor dem ersten zahlenden Kunden rechtlich prüfen lassen.

export const metadata: Metadata = {
  // Layout hängt „| Variante“ selbst an
  title: 'Terms of Service',
}

const SECTIONS: { title: string; paragraphs: string[] }[] = [
  {
    title: '1. Provider and scope',
    paragraphs: [
      'These terms apply to all use of Variante (www.getvariante.com, the ab.js snippet, the dashboard, the API and the Figma plugin). Provider: Valentin Wilhelm, Judenbühlweg 23, 97082 Würzburg, Germany, hello@getvariante.com.',
      'Variante is offered to businesses and self-employed people (entrepreneurs within the meaning of § 14 BGB), not to consumers. By signing up you confirm that you use Variante for your business or profession.',
      'Conflicting terms of the customer do not apply unless we agree to them in writing.',
    ],
  },
  {
    title: '2. The service',
    paragraphs: [
      'Variante lets you run A/B tests on websites you control: you install the ab.js snippet, choose an element, create a variant (yourself or with AI suggestions), and Variante splits traffic between original and variant and counts clicks on the goal you define.',
      'We may develop the service further, as long as the core functions of your plan remain available. Free features may be changed or limited at any time.',
    ],
  },
  {
    title: '3. Account',
    paragraphs: [
      'You need an account to use the dashboard. Keep your login and API token confidential; you are responsible for activity under your account. Tell us at once if you suspect misuse.',
      'Only add websites you own or are authorised to change. We verify the snippet on each connected domain before tests can run there.',
    ],
  },
  {
    title: '4. Plans, prices and payment',
    paragraphs: [
      'Free: €0, one active test, AI features within monthly limits, a small "A/B by Variante" badge on your site. Pro: €35 per month. Agency: €99 per month. The current scope of each plan is shown on the pricing page and in your dashboard.',
      'Prices are final prices. As a small business under § 19 UStG we do not charge or show VAT.',
      'Paid plans are billed monthly in advance through Stripe and renew automatically each month. If a payment fails, we may move your account back to the Free plan after a reminder.',
      'We may change prices for the future. We will tell you by email at least 30 days in advance; you can cancel before the change takes effect.',
    ],
  },
  {
    title: '5. Cancellation and end of contract',
    paragraphs: [
      'You can cancel a paid plan at any time in the billing portal. The cancellation takes effect at the end of the current billing month; there are no refunds for partial months. Your account then continues on the Free plan.',
      'You can delete your account at any time in the dashboard. We can terminate with 30 days notice, or immediately for good cause, in particular for a serious breach of section 6.',
      'After account deletion we delete your data as described in the privacy policy. Export your results beforehand (CSV export in the dashboard).',
    ],
  },
  {
    title: '6. Your responsibilities',
    paragraphs: [
      'You are responsible for the content of your variants and for your website, including what AI suggestions you choose to publish. Do not use Variante for unlawful, misleading or harmful content, to impersonate others, or to test on websites you are not allowed to change.',
      'You are the controller for the personal data of your website visitors. You decide whether your consent banner or privacy notice needs to mention Variante, and you set window.varianteConsent if you want consent-based storage. We provide a data processing agreement (Art. 28 GDPR) on request.',
      'Do not overload, reverse engineer or bypass the technical limits of the service.',
    ],
  },
  {
    title: '7. AI suggestions',
    paragraphs: [
      'AI suggestions are generated automatically from the text on your page. They can be wrong, incomplete or unsuitable. Review every suggestion before you publish it; publishing is your decision.',
      'You may use the variants you create with Variante freely. We do not claim rights to them.',
    ],
  },
  {
    title: '8. Availability',
    paragraphs: [
      'We aim for high availability but do not guarantee uninterrupted operation. Maintenance, disruptions at our providers or the internet can interrupt the service.',
      'If ab.js cannot reach our servers, your website shows its original version after at most 3 seconds. Test results may then be incomplete.',
      'Variante measures and reports statistical results. We do not promise a specific increase in conversions or revenue.',
    ],
  },
  {
    title: '9. Liability',
    paragraphs: [
      'We are liable without limitation for intent and gross negligence, for injury to life, body or health, and under the German Product Liability Act.',
      'For slight negligence we are liable only for breach of essential contractual obligations (obligations whose fulfilment makes proper performance of the contract possible and on which you may regularly rely), limited to the typical, foreseeable damage. Otherwise liability for slight negligence is excluded.',
      'For the Free plan we are liable only for intent and gross negligence, except in the cases of the first paragraph.',
    ],
  },
  {
    title: '10. Data protection',
    paragraphs: [
      'How we process personal data is described in our privacy policy. Where we process your website visitors’ data on your behalf, the data processing agreement applies.',
    ],
  },
  {
    title: '11. Changes to these terms',
    paragraphs: [
      'We may change these terms for the future if there is a valid reason (for example new features or legal changes). We will email you the changes at least 30 days before they take effect. If you do not object within this period, the new terms apply; we will point this out in the email. If you object, either party may terminate the contract.',
    ],
  },
  {
    title: '12. Final provisions',
    paragraphs: [
      'German law applies, excluding the UN Convention on Contracts for the International Sale of Goods. If you are a merchant, a legal entity under public law or have no general place of jurisdiction in Germany, the place of jurisdiction is Würzburg.',
      'If a provision of these terms is invalid, the remaining provisions stay effective.',
    ],
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg-0 text-text antialiased">
      <div className="relative z-10">
        <nav className="px-6 py-5">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <Link
              href="/"
              className="flex cursor-pointer items-center gap-1.5 text-sm text-text-3 transition-colors duration-200 hover:text-text"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <span className="text-text-3/30">·</span>
            <Link
              href="/"
              className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-text-2 transition-colors duration-200 hover:text-text"
            >
              <PandaLogo size="sm" />
              variante
            </Link>
          </div>
        </nav>

        <main className="mx-auto max-w-2xl px-6 pb-20 pt-2">
          <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-8 sm:p-12">
            <h1 className="text-3xl font-semibold text-text">
              Terms of Service
            </h1>
            <p className="mt-1.5 text-sm text-text-3">Last updated: November 16, 2026</p>

            <div className="mt-10 space-y-8 text-sm leading-relaxed">
              {SECTIONS.map((s) => (
                <LegalSection key={s.title} title={s.title}>
                  <div className="space-y-3">
                    {s.paragraphs.map((p) => <p key={p}>{p}</p>)}
                  </div>
                </LegalSection>
              ))}

              <LegalSection title="Contact">
                <p>
                  Questions about these terms:{' '}
                  <a href="mailto:hello@getvariante.com" className="cursor-pointer text-text underline underline-offset-4 transition-colors hover:text-text/70">
                    hello@getvariante.com
                  </a>
                  . See also our{' '}
                  <Link href="/privacy" className="cursor-pointer text-text underline underline-offset-4 transition-colors hover:text-text/70">
                    privacy policy
                  </Link>{' '}
                  and{' '}
                  <Link href="/imprint" className="cursor-pointer text-text underline underline-offset-4 transition-colors hover:text-text/70">
                    imprint
                  </Link>
                  .
                </p>
              </LegalSection>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-8 first:border-t-0 first:pt-0">
      <h2 className="mb-4 text-base font-semibold text-text">
        {title}
      </h2>
      <div className="text-text-2">{children}</div>
    </section>
  )
}
