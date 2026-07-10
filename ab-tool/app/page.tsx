import type { Metadata } from 'next'
import { PandaLogo } from '@/components/PandaLogo'
import { Check, MousePointer2, Sparkles, Rocket, Zap } from '@/components/LandingIcons'

export const metadata: Metadata = {
  title: 'A/B Testing for Designers — No Developer Needed | Variante',
  description:
    'Every designer can now run A/B tests. Pick an element, redesign in Figma, AI ships Variant B. No dev, no pipeline. Start free.',
  openGraph: {
    title: 'A/B Testing for Designers — No Developer Needed | Variante',
    description: 'Every designer can now improve conversions with A/B testing. Pick → Generate → Ship. No developer needed.',
    url: 'https://www.getvariante.com',
    siteName: 'Variante',
    images: [
      {
        url: 'https://www.getvariante.com/og',
        width: 1200,
        height: 630,
        alt: 'Variante — A/B Testing from Figma',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'A/B Testing for Designers — No Developer Needed | Variante',
    description: 'Every designer can now improve conversions with A/B testing. No developer needed.',
    images: ['https://www.getvariante.com/og'],
  },
}

/* ── Data ── */

const steps = [
  {
    icon: MousePointer2,
    step: '01',
    title: 'No dev ticket. No briefing.',
    body: 'Open your site, click the element you want to test. The picker captures everything — HTML, CSS, framework context. You stay in control.',
  },
  {
    icon: Sparkles,
    step: '02',
    title: 'Your design, pixel‑perfect.',
    body: 'Redesign the element in Figma — your tools, your workflow. AI reads both sides and writes Variant B matching your existing styles and breakpoints.',
  },
  {
    icon: Rocket,
    step: '03',
    title: 'Live in 60 seconds.',
    body: 'Paste one snippet into your site. It serves the right variant, tracks conversions, reports results — without touching your deploy pipeline.',
  },
]

const freeFeatures = [
  { label: '1 active experiment — test your first idea, free.' },
  { label: 'AI variant generation — pixel-perfect from Figma.' },
  { label: 'Live-page editing in Figma — pull your site, edit, A/B test instead of save.' },
  { label: 'Conversion tracking — built-in, no extra setup.' },
  { label: '"Powered by Variante" badge — your visitors become your referrals.' },
]

const proFeatures = [
  { label: 'Unlimited experiments', pro: true },
  { label: 'AI variant generation', pro: false },
  { label: 'Dynamic content — different pages for YouTube, Google & co. visitors', pro: true },
  { label: 'Price testing — experiment with pricing plans and price points', pro: true },
  { label: 'Statistical significance — know when to stop testing', pro: true },
  { label: 'Auto-winner — best variant ships automatically', pro: true },
  { label: 'No branding on your site', pro: true },
  { label: 'Priority support', pro: true },
]

/* ── Page ── */

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg-0 text-white/80 antialiased">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-bg-0/95">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3">
          <a
            href="/"
            className="flex items-center gap-2.5 text-[1.1rem] font-semibold tracking-tight text-white transition-opacity duration-200 hover:opacity-80"
          >
            <PandaLogo className="h-7 w-7 rounded-lg p-1" />
            variante
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/login"
              className="hidden text-sm text-white/55 transition-colors duration-200 hover:text-white sm:block"
            >
              Log in
            </a>
            <a
              href="/signup"
              className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90"
            >
              Sign up — free
            </a>
          </div>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="px-4 py-16 text-center sm:px-6 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
            Every designer can now
            <br className="hidden sm:block" />
            improve conversions with A/B testing.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/55 sm:text-lg">
            Pick any element on your live site, redesign it in Figma, and AI generates Variant B.
            One snippet. No developer. No deploy pipeline.
          </p>
          <div className="mt-8 sm:mt-9">
            <a
              href="/signup"
              className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90 sm:px-8 sm:py-3.5"
            >
              Start free — no developer needed
            </a>
          </div>
          <p className="mt-4 text-xs text-text-3">
            No credit card · 1 free experiment
          </p>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-xl font-semibold text-white">How it works</h2>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {steps.map((s) => (
              <div
                key={s.step}
                className="rounded-[10px] border border-border bg-bg-1 p-6"
              >
                <s.icon className="mb-4 h-8 w-8 text-white" />
                <p className="mb-2 text-xs font-medium text-white/25">{s.step}</p>
                <h3 className="mb-2 text-sm font-semibold text-white">{s.title}</h3>
                <p className="text-sm text-white/50">{s.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-white/35">
            One snippet. Works with{' '}
            <span className="text-white/55">WordPress</span>,{' '}
            <span className="text-white/55">React</span>,{' '}
            <span className="text-white/55">Next.js</span>,{' '}
            <span className="text-white/55">Shopify</span>,{' '}
            <span className="text-white/55">Custom HTML</span>{' '}
            — anywhere you can paste a script tag.
          </p>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-xl font-semibold text-white">Pricing</h2>
          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-2">
            {/* Free */}
            <div className="flex flex-col rounded-[10px] border border-border bg-bg-1 p-5 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-3">
                Free
              </p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold text-white">0 €</span>
              </div>
              <p className="mt-1 text-xs text-text-3">Forever free. No credit card.</p>
              <ul className="mt-6 mb-10 space-y-2.5 text-sm">
                {freeFeatures.map((f) => (
                  <li key={f.label} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 shrink-0 text-ok" />
                    <span className="text-white/60">{f.label}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/signup"
                className="mt-auto inline-flex w-full justify-center rounded-full border border-border-strong px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:border-white/30"
              >
                Start free
              </a>
            </div>

            {/* Pro */}
            <div className="relative flex flex-col rounded-[10px] border border-pro/30 bg-bg-1 p-5 sm:p-8">
              <span className="absolute -top-3 right-6 rounded-full border border-pro bg-black px-3 py-1 text-[11px] font-semibold text-pro">
                Most popular
              </span>
              <p className="text-xs font-semibold uppercase tracking-wider text-pro">
                Pro
              </p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold text-white">35 €</span>
                <span className="text-sm text-text-3">/mo</span>
              </div>
              <p className="mt-1 text-xs text-text-3">Everything in Free, plus:</p>
              <ul className="mt-6 mb-10 space-y-2.5 text-sm">
                {proFeatures.map((f) => (
                  <li key={f.label} className="flex items-center gap-2.5">
                    {f.pro ? (
                      <Zap className="h-4 w-4 shrink-0 text-pro" />
                    ) : (
                      <Check className="h-4 w-4 shrink-0 text-ok" />
                    )}
                    <span className={f.pro ? 'text-white/80' : 'text-white/60'}>
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>
              <a
                href="/signup?plan=pro"
                className="mt-auto inline-flex w-full justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90"
              >
                Get started
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-xl font-semibold text-white">You might be wondering</h2>
          <dl className="mt-10 space-y-3">
            {[
              {
                q: 'Does the snippet slow down my site?',
                a: 'No. It\'s under 5 KB, loads asynchronously, and never blocks rendering. Your Core Web Vitals stay untouched.',
              },
              {
                q: 'What if the AI generates broken code?',
                a: 'You review every variant before it goes live. Preview, diff, approve — nothing ships without your sign-off.',
              },
              {
                q: 'Does this work with my stack?',
                a: 'If you can paste a &lt;script&gt; tag, it works. WordPress, React, Next.js, Shopify, Webflow, Framer, Squarespace, custom HTML — all supported.',
              },
              {
                q: 'How is this different from Optimizely or VWO?',
                a: 'No developer setup. No tracking plan. No \"enterprise\" sales call. Just pick an element, redesign in Figma, ship.',
              },
            ].map((item) => (
              <details
                key={item.q}
                className="group rounded-[10px] border border-border bg-bg-1 transition-colors duration-150 hover:border-border-strong"
              >
                <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-medium text-white/80 select-none">
                  {item.q}
                  <span className="ml-4 shrink-0 text-white/25 transition-transform duration-200 group-open:rotate-180">
                    ▾
                  </span>
                </summary>
                <p className="px-5 pb-4 text-sm text-white/50">{item.a}</p>
              </details>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Badge Demo ── */}
      <a
        href="/signup"
        className="fixed bottom-3 right-3 z-50 rounded-md bg-bg-2 px-2.5 py-1 text-[10px] font-semibold text-white no-underline opacity-85 transition-opacity hover:opacity-100 sm:bottom-4 sm:right-4 sm:px-3 sm:py-1.5 sm:text-[11px]"
        style={{ borderRadius: '6px' }}
      >
        A/B by Variante
      </a>

      {/* ── Footer ── */}
      <footer className="border-t border-border px-4 py-5 sm:px-6 sm:py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-xs text-text-3">
            © 2026 Variante · Made in Bavaria
          </p>
          <div className="flex items-center gap-4">
            <a
              href="/docs"
              className="text-xs text-text-3 transition-colors duration-200 hover:text-text-2"
            >
              Docs
            </a>
            <a
              href="/privacy"
              className="text-xs text-text-3 transition-colors duration-200 hover:text-text-2"
            >
              Privacy
            </a>
            <a
              href="/imprint"
              className="text-xs text-text-3 transition-colors duration-200 hover:text-text-2"
            >
              Imprint
            </a>
          </div>
        </div>
      </footer>

      {/* JSON-LD SoftwareApplication — Rich Result für Software-Kategorie */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Variante',
            applicationCategory: 'DesignApplication',
            operatingSystem: 'Web',
            url: 'https://www.getvariante.com',
            description:
              'Every designer can now run A/B tests from Figma — no developer, no pipeline.',
            offers: [
              {
                '@type': 'Offer',
                name: 'Free',
                price: '0',
                priceCurrency: 'EUR',
              },
              {
                '@type': 'Offer',
                name: 'Pro',
                price: '35',
                priceCurrency: 'EUR',
                description: 'Unlimited experiments, significance analysis, auto-winner detection',
              },
            ],
          }),
        }}
      />
    </div>
  )
}
