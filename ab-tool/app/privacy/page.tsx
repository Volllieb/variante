import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy — Variante',
}

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen bg-[#06050f] font-[family-name:var(--font-sans)] text-white/80 antialiased">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-700/15 blur-[110px]" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-fuchsia-600/10 blur-[90px]" />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="relative z-10">
        <nav className="px-6 py-5">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <Link
              href="/"
              className="flex cursor-pointer items-center gap-1.5 text-sm text-white/45 transition-colors duration-200 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <span className="text-white/15">·</span>
            <Link
              href="/"
              className="flex cursor-pointer items-center gap-1.5 font-[family-name:var(--font-display)] text-sm font-bold text-white/50 transition-colors duration-200 hover:text-white"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[0.6rem] font-black text-white">
                v
              </span>
              variante
            </Link>
          </div>
        </nav>

        <main className="mx-auto max-w-2xl px-6 pb-20 pt-2">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-8 backdrop-blur-md sm:p-12">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-white">
              Privacy Policy
            </h1>
            <p className="mt-1.5 text-sm text-white/40">Last updated: June 25, 2026</p>

            <div className="mt-10 space-y-8 text-sm leading-relaxed">

              <LegalSection title="1. What we collect">
                <ul className="space-y-2.5">
                  {[
                    { label: 'Account data', body: 'email address and hashed password (via Supabase Auth) when you sign up. No further profile data is stored.' },
                    { label: 'Experiment data', body: 'HTML/CSS snapshots of elements you pick, variant code, page URL, and conversion events — stored per test. You choose the URL and element. The original page content is not analyzed or read beyond the element you selected.' },
                    { label: 'AI generation (OpenAI)', body: "When you generate a variant, the extracted HTML/CSS context of the original element and the Figma export data are sent to OpenAI's API. The data is used only for generation and is not stored by OpenAI. Do not submit personal data in prompts or designs." },
                    { label: 'Payment data', body: 'Credit card details are processed directly by Stripe. We never have access to full card numbers. Stripe shares only: status, payment method type, and last 4 digits.' },
                    { label: 'Waitlist', body: 'email address if you submit the coming-soon form.' },
                    { label: 'Usage data', body: 'page views, variant assignment, and conversion events collected by the ab.js snippet on your site. No personal visitor data is stored — only anonymized counts.' },
                  ].map(({ label, body }) => (
                    <li key={label} className="flex gap-2.5">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-400/60" />
                      <span><strong className="font-semibold text-white/80">{label}:</strong>{' '}{body}</span>
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
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-400/60" />
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
                <p className="mt-4 font-semibold text-white/75">Retention periods</p>
                <ul className="mt-2 space-y-2">
                  {[
                    ['Account data', 'until account deletion.'],
                    ['Experiment data', '12 months after the last conversion event, then automatically deleted.'],
                    ['Logs (Vercel)', '7 days.'],
                    ['Anonymized statistics', 'retained indefinitely (no personal reference).'],
                  ].map(([label, body]) => (
                    <li key={label} className="flex gap-2.5">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-400/60" />
                      <span><strong className="font-semibold text-white/80">{label}:</strong>{' '}{body}</span>
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
                <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.08]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-white/[0.04]">
                        {['Service', 'Purpose', 'Location', 'Safeguard'].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-semibold text-white/70">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Supabase Inc.', 'Database & Auth', 'Frankfurt, DE', 'DPA + SCCs'],
                        ['Vercel Inc.', 'Hosting', 'us-east, USA', 'DPA + SCCs (EU-US DPF)'],
                        ['Stripe Inc.', 'Payments', 'Global', 'DPF certified'],
                        ['OpenAI', 'AI generation', 'US', 'API only, no storage'],
                      ].map(([service, purpose, location, safeguard], i, arr) => (
                        <tr key={service} className={i < arr.length - 1 ? 'border-b border-white/[0.06]' : ''}>
                          <td className="px-4 py-3 text-white/75">{service}</td>
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
                <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.08]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-white/[0.04]">
                        {['Name', 'Type', 'Purpose', 'Duration'].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-semibold text-white/70">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['sb-*-auth-token', 'Cookie', 'Session auth', '1 year'],
                        ['__ab_visitor_id', 'localStorage', 'Anonymous visitor ID', 'Persistent'],
                        ['__ab_variant', 'localStorage', 'Variant assignment', 'Per experiment'],
                      ].map(([name, type, purpose, duration], i, arr) => (
                        <tr key={name} className={i < arr.length - 1 ? 'border-b border-white/[0.06]' : ''}>
                          <td className="px-4 py-3"><code className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-fuchsia-200">{name}</code></td>
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
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-400/60" />
                      <span><strong className="font-semibold text-white/80">{label}:</strong>{' '}{body}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3">
                  To exercise any of these rights, email{' '}
                  <a href="mailto:hello@getvariante.com" className="cursor-pointer text-fuchsia-300 underline underline-offset-4 transition-colors hover:text-fuchsia-200">
                    hello@getvariante.com
                  </a>{' '}
                  and we&apos;ll respond within 30 days.
                </p>
                <p className="mt-2">
                  If you believe our processing infringes GDPR, you have the right to lodge a
                  complaint with the supervisory authority:{' '}
                  <strong className="text-white/75">
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
                  <a href="mailto:hello@getvariante.com" className="cursor-pointer text-fuchsia-300 underline underline-offset-4 transition-colors hover:text-fuchsia-200">
                    hello@getvariante.com
                  </a>
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
    <section className="border-t border-white/[0.07] pt-8 first:border-t-0 first:pt-0">
      <h2 className="mb-4 font-[family-name:var(--font-display)] text-base font-bold text-white">
        {title}
      </h2>
      <div className="text-white/55">{children}</div>
    </section>
  )
}
