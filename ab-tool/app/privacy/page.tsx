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
              (via Supabase Auth) when you sign up.
            </li>
            <li>
              <strong>Experiment data:</strong> HTML/CSS snapshots of elements
              you pick, variant code, page URL, and conversion events — stored
              per test.
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
            and on Vercel (us-east). We retain experiment data for the duration
            of your account. Account deletion removes all associated data within
            30 days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            4. Third-party services
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Supabase</strong> — authentication and database.
            </li>
            <li>
              <strong>Vercel</strong> — hosting and serverless functions.
            </li>
            <li>
              <strong>Stripe</strong> — payment processing (no card data touches
              our servers).
            </li>
            <li>
              <strong>DeepSeek</strong> — AI variant generation (anonymized
              HTML/CSS context only).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            5. Cookies
          </h2>
          <p className="mt-2">
            We use a session cookie for authentication and a variant assignment
            cookie (localStorage) on pages where the ab.js snippet runs. No
            tracking or advertising cookies are used.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            6. Your rights (GDPR)
          </h2>
          <p className="mt-2">
            If you are in the EU, you have the right to access, rectify,
            export, and delete your data. Email{' '}
            <a
              href="mailto:hello@getvariante.com"
              className="text-violet-600 underline"
            >
              hello@getvariante.com
            </a>{' '}
            and we&apos;ll respond within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            7. Contact
          </h2>
          <p className="mt-2">
            Valentin —{' '}
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
