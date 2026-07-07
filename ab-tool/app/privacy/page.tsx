import type { Metadata } from 'next'
import Link from 'next/link'
import { PandaLogo } from '@/components/PandaLogo'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy — Variante',
}

export default function PrivacyPage() {
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
              <PandaLogo className="h-5 w-5 rounded-md p-0.5" />
              variante
            </Link>
          </div>
        </nav>

        <main className="mx-auto max-w-2xl px-6 pb-20 pt-2">
          <div className="rounded-[10px] border border-border bg-bg-1 p-8 sm:p-12">
            <h1 className="text-3xl font-semibold text-text">
              Privacy Policy
            </h1>
            <p className="mt-1.5 text-sm text-text-3">Last updated: July 6, 2026</p>

            <div className="mt-10 space-y-8 text-sm leading-relaxed">

              <LegalSection title="1. What we collect">
                <ul className="space-y-2.5">
                  {[
                    { label: 'Account data', body: 'email address and hashed password (via Supabase Auth) when you sign up. No further profile data is stored.' },
                    { label: 'Experiment data', body: 'HTML/CSS snapshots of elements you pick, variant code, page URL, and conversion events — stored per test. You choose the URL and element. The original page content is not analyzed or read beyond the element you selected.' },
                    { label: 'AI generation (OpenAI)', body: "When you generate a variant, the extracted HTML/CSS context of the original element and the Figma export data are sent to OpenAI's API. The data is used only for generation and is not stored by OpenAI. Do not submit personal data in prompts or designs." },
                    { label: 'Payment data', body: 'Credit card details are processed directly by Stripe. We never have access to full card numbers. Stripe shares only: status, payment method type, and last 4 digits.' },
                    { label: 'Waitlist', body: 'email address if you submit the coming-soon form.' },
                    { label: 'Usage data', body: 'the ab.js snippet sends only the domain name (host) to our servers to check for active tests — never the full page path. Variant assignment and conversion events are collected as anonymized counters only. No personal visitor data or browsing history is stored.' },
                  ].map(({ label, body }) => (
                    <li key={label} className="flex gap-2.5">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-text-2/40" />
                      <span><strong className="font-semibold text-text">{label}:</strong>{' '}{body}</span>
                    </li>
                  ))}
                </ul>
              </LegalSection>

              <LegalSection title="2. How we use it">
                <ul className="space-y-2">
                  {[
                    'To provide and operate the A/B testing service.',
                    'To display experiment results in your dashboard.',
                    'To communicate product updates (only if you opt in).',
                    'To improve the product based on aggregated usage patterns.',
                  ].map(item => (
                    <li key={item} className="flex gap-2.5">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-text-2/40" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </LegalSection>

              <LegalSection title="3. Data storage & processing">
                <p>
                  Data is stored on Supabase (Postgres, hosted in Frankfurt, Germany) and on
                  Vercel (us-east, USA).
                </p>
                <p className="mt-4 font-semibold text-text">Retention periods</p>
                <ul className="mt-2 space-y-2">
                  {[
                    ['Account data', 'until account deletion.'],
                    ['Experiment data', '12 months after the last conversion event, then automatically deleted.'],
                    ['Event log', 'deleted automatically when the associated test is deleted (cascade).'],
                    ['Waitlist entries', '12 months after submission, then automatically deleted.'],
                    ['Logs (Vercel)', '7 days.'],
                    ['Anonymized statistics', 'retained indefinitely (no personal reference).'],
                  ].map(([label, body]) => (
                    <li key={label} className="flex gap-2.5">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-text-2/40" />
                      <span><strong className="font-semibold text-text">{label}:</strong>{' '}{body}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3">Account deletion removes all associated personal data within 30 days.</p>
              </LegalSection>

              <LegalSection title="4. Third-party services & international transfers">
                <p>
                  We use the following sub-processors. Data processing agreements (Art. 28 GDPR)
                  are in place with all of them.
                </p>
                <div className="mt-4 overflow-x-auto rounded-[6px] border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-bg-2">
                        {['Service', 'Purpose', 'Location', 'Safeguard'].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-medium text-text-2">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Supabase Inc.', 'Database, Auth & Google OAuth', 'Frankfurt, DE', 'DPA + SCCs'],
                        ['Vercel Inc.', 'Hosting', 'us-east, USA', 'DPA + SCCs (EU-US DPF)'],
                        ['Stripe Inc.', 'Payments', 'Global', 'DPF certified'],
                        ['OpenAI', 'AI generation', 'US', 'API only, no storage'],
                        ['Resend Inc.', 'Email notifications', 'US (us-east)', 'DPA + SCCs'],
                        ['Upstash Inc.', 'Rate limiting (IP addresses)', 'Global', 'DPA + SCCs'],
                      ].map(([service, purpose, location, safeguard], i, arr) => (
                        <tr key={service} className={i < arr.length - 1 ? 'border-b border-border' : ''}>
                          <td className="px-4 py-3 text-text">{service}</td>
                          <td className="px-4 py-3">{purpose}</td>
                          <td className="px-4 py-3">{location}</td>
                          <td className="px-4 py-3">{safeguard}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </LegalSection>

              <LegalSection title="5. Cookies & local storage">
                <p>
                  We do not use tracking or advertising cookies. The following storage mechanisms
                  are used strictly for functionality:
                </p>
                <div className="mt-4 overflow-x-auto rounded-[6px] border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-bg-2">
                        {['Name', 'Type', 'Purpose', 'Duration'].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-medium text-text-2">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['sb-*-auth-token', 'Cookie', 'Session auth', '1 year'],
                        ['__ab_visitor_id', 'localStorage', 'Anonymous visitor ID', 'Persistent'],
                        ['ab_<test_id>', 'localStorage', 'Variant assignment (sticky)', 'Per experiment'],
                        ['ab_conv_<test_id>', 'sessionStorage', 'Conversion deduplication', 'Session'],
                      ].map(([name, type, purpose, duration], i, arr) => (
                        <tr key={name} className={i < arr.length - 1 ? 'border-b border-border' : ''}>
                          <td className="px-4 py-3"><code className="rounded bg-bg-2 px-1.5 py-0.5 font-mono text-xs text-text">{name}</code></td>
                          <td className="px-4 py-3">{type}</td>
                          <td className="px-4 py-3">{purpose}</td>
                          <td className="px-4 py-3">{duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </LegalSection>

              <LegalSection title="6. Your rights (GDPR)">
                <p>If you are in the EU/EEA, you have the following rights under Articles 15–22 GDPR:</p>
                <ul className="mt-3 space-y-2">
                  {[
                    ['Access (Art. 15)', 'request a copy of your data.'],
                    ['Rectification (Art. 16)', 'correct inaccurate data.'],
                    ['Erasure (Art. 17)', 'delete your account and all associated data.'],
                    ['Restriction (Art. 18)', 'limit processing.'],
                    ['Data portability (Art. 20)', 'export your data in a machine-readable format.'],
                    ['Objection (Art. 21)', 'object to processing.'],
                  ].map(([label, body]) => (
                    <li key={label} className="flex gap-2.5">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-text-2/40" />
                      <span><strong className="font-semibold text-text">{label}:</strong>{' '}{body}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3">
                  To exercise any of these rights, email{' '}
                  <a href="mailto:hello@getvariante.com" className="cursor-pointer text-text underline underline-offset-4 transition-colors hover:text-text/70">
                    hello@getvariante.com
                  </a>{' '}
                  and we&apos;ll respond within 30 days.
                </p>
                <p className="mt-2">
                  If you believe our processing infringes GDPR, you have the right to lodge a
                  complaint with the supervisory authority:{' '}
                  <strong className="text-text">
                    Bayerisches Landesamt für Datenschutzaufsicht (BayLDA), Promenade 27,
                    91522 Ansbach, Germany
                  </strong>.
                </p>
              </LegalSection>

              <LegalSection title="7. Contact">
                <p>
                  Valentin Wilhelm<br />
                  Judenbühlweg 23<br />
                  97082 Würzburg<br />
                  Germany
                </p>
                <p className="mt-3">
                  Email:{' '}
                  <a href="mailto:hello@getvariante.com" className="cursor-pointer text-text underline underline-offset-4 transition-colors hover:text-text/70">
                    hello@getvariante.com
                  </a>
                </p>
              </LegalSection>

            </div>
          </div>
        </main>
      </div>

      {/* JSON-LD BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Variante', item: 'https://www.getvariante.com' },
              { '@type': 'ListItem', position: 2, name: 'Privacy Policy', item: 'https://www.getvariante.com/privacy' },
            ],
          }),
        }}
      />
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
