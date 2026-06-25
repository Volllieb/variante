import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Variante — A/B Testing from Figma, No Dev Needed',
  description:
    'Pick an element on your live site, describe the change in Figma, AI generates Variant B. One snippet tracks conversions.',
  openGraph: {
    title: 'Variante — A/B Testing from Figma',
    description: 'Pick → Generate → Ship. A/B testing without a developer.',
    url: 'https://www.getvariante.com',
    siteName: 'Variante',
  },
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ waitlist?: string }>
}) {
  const waitlistStatus = (await searchParams).waitlist

  return (
    <>
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="text-xl font-bold text-violet-600">
            variante
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Sign up – free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-50 to-white" />
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 -translate-x-1/2"
        >
          <div className="h-[500px] w-[500px] rounded-full bg-violet-200/40 blur-3xl sm:h-[700px] sm:w-[700px]" />
        </div>

        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            A/B testing from <span className="text-violet-600">Figma</span> —{' '}
            <br className="hidden sm:inline" />
            no dev needed
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-gray-500">
            Pick an element on your live site, describe the change in Figma, AI
            generates Variant B. One snippet tracks conversions. That&apos;s it.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href="#notify"
              className="group inline-flex items-center rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
            >
              Install Figma Plugin{' '}
              <span className="ml-1.5 inline-block transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </a>
            <Link
              href="/signup"
              className="inline-flex items-center rounded-xl border-2 border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Create free account
            </Link>
          </div>

          <p className="mt-6 text-sm text-gray-400">
            ✦{' '}
            <span className="font-medium text-gray-500">300+</span> designers
            already testing
          </p>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            How it works
          </h2>
          <p className="mt-3 text-center text-gray-500">
            Three steps. No developer. No deploy.
          </p>

          <div className="mt-16 flex flex-col items-center gap-8 md:flex-row md:gap-3">
            {/* Step 1 */}
            <div className="w-full md:flex-1">
              <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-lg font-bold text-violet-600">
                  ①
                </div>
                <h3 className="text-xl font-bold text-gray-900">Pick</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  Choose any element on your live website. Hover, click, done.
                  The picker captures the HTML, CSS, and page framework
                  automatically.
                </p>
                <div className="mt-6 flex aspect-video items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-400">
                  🎥 Demo recording
                </div>
              </div>
            </div>

            {/* Arrow ①→② */}
            <span className="hidden text-2xl text-gray-300 md:block">→</span>

            {/* Step 2 */}
            <div className="w-full md:flex-1">
              <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-lg font-bold text-amber-700">
                  ②
                </div>
                <h3 className="text-xl font-bold text-gray-900">Generate</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  Switch to Figma, select the replacement design. AI analyzes
                  both and writes Variant B — preserving your site&apos;s
                  styling.
                </p>
                <div className="mt-6 flex aspect-video items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-400">
                  🎥 Demo recording
                </div>
              </div>
            </div>

            {/* Arrow ②→③ */}
            <span className="hidden text-2xl text-gray-300 md:block">→</span>

            {/* Step 3 */}
            <div className="w-full md:flex-1">
              <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-lg font-bold text-rose-700">
                  ③
                </div>
                <h3 className="text-xl font-bold text-gray-900">Ship</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  Copy one snippet into{' '}
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono">
                    &lt;head&gt;
                  </code>
                  . It serves the right variant and tracks conversions. No
                  deploy pipeline, no dev.
                </p>
                <div className="mt-6 flex aspect-video items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-400">
                  🎥 Demo recording
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Use Cases ── */}
      <section className="bg-violet-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            For whom is this?
          </h2>
          <p className="mt-3 text-center text-gray-500">
            Built for the workflow of modern designers and builders.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <span className="text-3xl" role="img" aria-hidden="true">
                🎨
              </span>
              <h3 className="mt-4 text-lg font-bold text-gray-900">
                Designer
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Building sites with AI (Bolt, v0, etc.) and need A/B testing
                without a dev.
              </p>
              <p className="mt-3 text-sm font-medium text-violet-600">
                → More conversions on your exports
              </p>
            </div>

            <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <span className="text-3xl" role="img" aria-hidden="true">
                🏢
              </span>
              <h3 className="mt-4 text-lg font-bold text-gray-900">Agency</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Running multiple client sites from AI exports — white-label for
                clients without extra cost.
              </p>
              <p className="mt-3 text-sm font-medium text-amber-700">
                → More client value on every project
              </p>
            </div>

            <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <span className="text-3xl" role="img" aria-hidden="true">
                🚀
              </span>
              <h3 className="mt-4 text-lg font-bold text-gray-900">
                Solo Founder
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                No developer in the team — run A/B tests in 10 minutes yourself.
              </p>
              <p className="mt-3 text-sm font-medium text-rose-700">
                → Ship with confidence
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Pricing
          </h2>
          <p className="mt-3 text-center text-gray-500">
            Simple, transparent. Start free, upgrade when you need more.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-3 md:gap-4 lg:gap-6">
            {/* Free */}
            <div className="flex flex-col rounded-2xl border-2 border-gray-200 bg-white p-8 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900">Free</h3>
              <p className="mt-1 text-3xl font-bold text-gray-900">$0</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-violet-600">✦</span>
                  <span>1 active experiment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-violet-600">✦</span>
                  <span>AI variant generation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-violet-600">✦</span>
                  <span>
                    Badge{' '}
                    <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                      ON
                    </span>
                  </span>
                </li>
              </ul>
              <a
                href="#notify"
                className="mt-8 inline-flex items-center justify-center rounded-xl border-2 border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
              >
                Install plugin
              </a>
            </div>

            {/* Pro — Recommended */}
            <div className="relative flex flex-col rounded-2xl border-2 border-violet-600 bg-white p-8 shadow-md">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-4 py-1 text-xs font-semibold text-white">
                Recommended
              </span>
              <h3 className="text-lg font-bold text-gray-900">Pro</h3>
              <p className="mt-1 text-3xl font-bold text-gray-900">$35</p>
              <p className="text-sm text-gray-500">/month</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-violet-600">✦</span>
                  <span>Unlimited experiments</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-violet-600">✦</span>
                  <span>AI variant generation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-violet-600">✦</span>
                  <span>
                    Badge{' '}
                    <span className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-800">
                      OFF
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-violet-600">✦</span>
                  <span>Full statistics &amp; significance</span>
                </li>
              </ul>
              <Link
                href="/signup"
                className="mt-8 inline-flex items-center justify-center rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
              >
                Start free trial
              </Link>
            </div>

            {/* Agency */}
            <div className="flex flex-col rounded-2xl border-2 border-gray-200 bg-white p-8 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900">Agency</h3>
              <p className="mt-1 text-3xl font-bold text-gray-900">$99</p>
              <p className="text-sm text-gray-500">/month</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-violet-600">✦</span>
                  <span>Everything in Pro</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-violet-600">✦</span>
                  <span>White-label (resell as your own)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-violet-600">✦</span>
                  <span>Multi-site support</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-violet-600">✦</span>
                  <span>Team seats</span>
                </li>
              </ul>
              <a
                href="mailto:hello@getvariante.com"
                className="mt-8 inline-flex items-center justify-center rounded-xl border-2 border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Notify / Coming Soon ── */}
      <section
        id="notify"
        className="scroll-mt-20 bg-violet-50 py-20"
      >
        <div className="mx-auto max-w-xl px-6 text-center">
          {waitlistStatus === 'thanks' ? (
            <>
              <span className="inline-block rounded-full bg-green-100 px-4 py-1 text-sm font-medium text-green-800">
                You&apos;re on the list
              </span>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">
                Thanks for signing up!
              </h2>
              <p className="mt-3 text-gray-500">
                We&apos;ll email you the moment the Figma plugin is live.
              </p>
            </>
          ) : waitlistStatus === 'error' ? (
            <>
              <span className="inline-block rounded-full bg-red-100 px-4 py-1 text-sm font-medium text-red-800">
                Something went wrong
              </span>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">
                Could not save your email
              </h2>
              <p className="mt-3 text-gray-500">
                Please try again or email us directly at{' '}
                <a href="mailto:hello@getvariante.com" className="text-violet-600 underline">
                  hello@getvariante.com
                </a>.
              </p>
            </>
          ) : (
            <>
              <span className="inline-block rounded-full bg-amber-100 px-4 py-1 text-sm font-medium text-amber-800">
                Coming soon
              </span>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">
                The Figma plugin is in review
              </h2>
              <p className="mt-3 text-gray-500">
                Leave your email and we&apos;ll notify you the moment it&apos;s
                live.
              </p>

              <form
                method="POST"
                action="/api/waitlist"
                className="mx-auto mt-8 flex max-w-md gap-3"
              >
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="you@example.com"
                  className="min-w-0 flex-1 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm placeholder-gray-400 focus:border-violet-600 focus:outline-none focus:ring-0"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
                >
                  Notify me
                </button>
              </form>
            </>
          )}

          {/* ponytail: static form — full-page POST to /api/waitlist, redirects back */}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-gray-50 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 text-center text-sm text-gray-500 sm:flex-row">
          <p>
            variante — A/B testing from Figma. Made in Bavaria.
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-gray-700">
              Privacy
            </Link>
            <Link href="/imprint" className="hover:text-gray-700">
              Imprint
            </Link>
            <span>© 2026</span>
          </div>
        </div>
      </footer>
    </>
  )
}
