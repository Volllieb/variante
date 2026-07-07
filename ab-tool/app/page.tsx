import type { Metadata } from 'next'
import { PandaLogo } from '@/components/PandaLogo'
import { Check, MousePointer2, Sparkles, Rocket, Zap } from '@/components/LandingIcons'

export const metadata: Metadata = {
  title: 'A/B Testing from Figma — No Dev Needed | Variante',
  description:
    'Pick any element, redesign in Figma, AI generates Variant B. One snippet tracks everything. Start free.',
  openGraph: {
    title: 'A/B Testing from Figma — No Dev Needed | Variante',
    description: 'Pick → Generate → Ship. A/B testing without a developer.',
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
    title: 'A/B Testing from Figma — No Dev Needed | Variante',
    description: 'Pick → Generate → Ship. A/B testing without a developer.',
    images: ['https://www.getvariante.com/og'],
  },
}

/* ── Data ── */

const steps = [
  {
    icon: MousePointer2,
    step: '01',
    title: 'Pick any element',
    body: 'Hover over any component on your live site. One click — the picker captures the HTML, CSS and framework context automatically.',
  },
  {
    icon: Sparkles,
    step: '02',
    title: 'Generate in Figma',
    body: 'Select your replacement design in Figma. AI reads both sides and writes Variant B — pixel-perfect, responsive, matching your existing styles.',
  },
  {
    icon: Rocket,
    step: '03',
    title: 'Ship & track',
    body: 'Paste one snippet into your site. It serves the right variant to each visitor and tracks every conversion — no deploy pipeline, no dev.',
  },
]

const freeFeatures = [
  { label: '1 active experiment', pro: false },
  { label: 'AI variant generation', pro: false },
  { label: 'Conversion tracking', pro: false },
  { label: '"Powered by Variante" badge', pro: false },
]

const proFeatures = [
  { label: 'Unlimited experiments', pro: true },
  { label: 'AI variant generation', pro: false },
  { label: 'Statistical significance analysis', pro: true },
  { label: 'Auto-winner detection', pro: true },
  { label: 'No branding on site', pro: true },
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
            A/B Testing for AI-built sites.
            <br className="hidden sm:block" />
            From Figma. No dev needed.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/55 sm:text-lg">
            Pick an element on your live site, redesign it in Figma, and let AI generate Variant B.
            One snippet serves and tracks everything.
          </p>
          <div className="mt-8 sm:mt-9">
            <a
              href="/signup"
              className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90 sm:px-8 sm:py-3.5"
            >
              Start free — install Figma plugin
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
                <s.icon className="mb-4 h-8 w-8 text-white/60" />
                <p className="mb-2 text-xs font-medium text-white/25">{s.step}</p>
                <h3 className="mb-2 text-sm font-semibold text-white">{s.title}</h3>
                <p className="text-sm text-white/50">{s.body}</p>
              </div>
            ))}
          </div>
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
              <ul className="mt-6 space-y-2.5 text-sm">
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
              <ul className="mt-6 space-y-2.5 text-sm">
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
                href="/signup"
                className="mt-auto inline-flex w-full justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90"
              >
                Start free trial
              </a>
            </div>
          </div>
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
              'A/B Testing from Figma — pick, generate, ship without a developer.',
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
