import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Variante',
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: June 25, 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            1. What we collect
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Account data:</strong> email address and hashed password
              (via Supabase Auth) when you sign up. No further profile data is
              stored.
            </li>
            <li>
              <strong>Experiment data:</strong> HTML/CSS snapshots of elements
              you pick, variant code, page URL, and conversion events — stored
              per test. You choose the URL and element. The original page
              content is not analyzed or read beyond the element you selected.
            </li>
            <li>
              <strong>AI generation (DeepSeek):</strong> When you generate a
              variant, the extracted HTML/CSS context of the original element
              and the Figma export data are sent to DeepSeek&apos;s API. The
              data is used only for generation and is not stored by DeepSeek.
              Do not submit personal data in prompts or designs.
            </li>
            <li>
              <strong>Payment data:</strong> Credit card details are processed
              directly by Stripe. We never have access to full card numbers.
              Stripe shares only: status, payment method type, and last 4
              digits.
            </li>
            <li>
              <strong>Waitlist:</strong> email address if you submit the
              coming-soon form.
            </li>
            <li>
              <strong>Usage data:</strong> page views, variant assignment, and
              conversion events collected by the ab.js snippet on your site.
              No personal visitor data is stored — only anonymized counts.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            2. How we use it
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>To provide and operate the A/B testing service.</li>
            <li>To display experiment results in your dashboard.</li>
            <li>To communicate product updates (only if you opt in).</li>
            <li>To improve the product based on aggregated usage patterns.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            3. Data storage &amp; processing
          </h2>
          <p className="mt-2">
            Data is stored on Supabase (Postgres, hosted in Frankfurt, Germany)
            and on Vercel (us-east, USA).
          </p>
          <h3 className="mt-4 font-semibold">Retention periods</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              <strong>Account data:</strong> until account deletion.
            </li>
            <li>
              <strong>Experiment data:</strong> 12 months after the last
              conversion event, then automatically deleted.
            </li>
            <li>
              <strong>Logs (Vercel):</strong> 7 days.
            </li>
            <li>
              <strong>Anonymized statistics:</strong> retained indefinitely
              (no personal reference).
            </li>
          </ul>
          <p className="mt-2">
            Account deletion removes all associated personal data within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            4. Third-party services &amp; international transfers
          </h2>
          <p className="mt-2">
            We use the following sub-processors. Data processing agreements
            (Art. 28 GDPR) are in place with all of them.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-1 pr-3 text-left font-semibold">Service</th>
                  <th className="py-1 pr-3 text-left font-semibold">Purpose</th>
                  <th className="py-1 pr-3 text-left font-semibold">Location</th>
                  <th className="py-1 text-left font-semibold">Safeguard</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-3 align-top">Supabase Inc.</td>
                  <td className="py-2 pr-3 align-top">Database &amp; Auth</td>
                  <td className="py-2 pr-3 align-top">Frankfurt, DE</td>
                  <td className="py-2 align-top">DPA + SCCs</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-3 align-top">Vercel Inc.</td>
                  <td className="py-2 pr-3 align-top">Hosting</td>
                  <td className="py-2 pr-3 align-top">us-east, USA</td>
                  <td className="py-2 align-top">DPA + SCCs (EU-US DPF)</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-3 align-top">Stripe Inc.</td>
                  <td className="py-2 pr-3 align-top">Payments</td>
                  <td className="py-2 pr-3 align-top">Global</td>
                  <td className="py-2 align-top">DPF certified</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3 align-top">DeepSeek</td>
                  <td className="py-2 pr-3 align-top">AI generation</td>
                  <td className="py-2 pr-3 align-top">China / DE</td>
                  <td className="py-2 align-top">API only, no storage</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            5. Cookies &amp; local storage
          </h2>
          <p className="mt-2">
            We do not use tracking or advertising cookies. The following
            storage mechanisms are used strictly for functionality:
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-1 pr-3 text-left font-semibold">Name</th>
                  <th className="py-1 pr-3 text-left font-semibold">Type</th>
                  <th className="py-1 pr-3 text-left font-semibold">Purpose</th>
                  <th className="py-1 text-left font-semibold">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-3 align-top"><code>sb-*-auth-token</code></td>
                  <td className="py-2 pr-3 align-top">Cookie</td>
                  <td className="py-2 pr-3 align-top">Session auth</td>
                  <td className="py-2 align-top">1 year</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-3 align-top"><code>__ab_visitor_id</code></td>
                  <td className="py-2 pr-3 align-top">localStorage</td>
                  <td className="py-2 pr-3 align-top">Anonymous visitor ID</td>
                  <td className="py-2 align-top">Persistent</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3 align-top"><code>__ab_variant</code></td>
                  <td className="py-2 pr-3 align-top">localStorage</td>
                  <td className="py-2 pr-3 align-top">Variant assignment</td>
                  <td className="py-2 align-top">Per experiment</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            6. Your rights (GDPR)
          </h2>
          <p className="mt-2">
            If you are in the EU/EEA, you have the following rights under
            Articles 15–22 GDPR:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Access (Art. 15):</strong> request a copy of your data.
            </li>
            <li>
              <strong>Rectification (Art. 16):</strong> correct inaccurate data.
            </li>
            <li>
              <strong>Erasure (Art. 17):</strong> delete your account and all
              associated data.
            </li>
            <li>
              <strong>Restriction (Art. 18):</strong> limit processing.
            </li>
            <li>
              <strong>Data portability (Art. 20):</strong> export your data in a
              machine-readable format.
            </li>
            <li>
              <strong>Objection (Art. 21):</strong> object to processing.
            </li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, email{' '}
            <a
              href="mailto:hello@getvariante.com"
              className="text-violet-600 underline"
            >
              hello@getvariante.com
            </a>{' '}
            and we&apos;ll respond within 30 days.
          </p>
          <p className="mt-2">
            If you believe our processing infringes GDPR, you have the right
            to lodge a complaint with the supervisory authority:{' '}
            <strong>
              Bayerisches Landesamt für Datenschutzaufsicht (BayLDA),
              Promenade 27, 91522 Ansbach, Germany
            </strong>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            7. Contact
          </h2>
          <p className="mt-2">
            Valentin Wilhelm
            <br />
            Judenbühlweg 23
            <br />
            97082 Würzburg
            <br />
            Germany
          </p>
          <p className="mt-2">
            Email:{' '}
            <a
              href="mailto:hello@getvariante.com"
              className="text-violet-600 underline"
            >
              hello@getvariante.com
            </a>
          </p>
        </section>
      </div>
    </main>
  )
}
