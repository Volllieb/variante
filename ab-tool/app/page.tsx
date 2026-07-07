import type { Metadata } from 'next'
import { PandaLogo } from '@/components/PandaLogo'

// Inline SVG icons — zero client JS (vs lucide-react which bundles ~60KB).
// Pure Server Components, rendered to static HTML on the landing page.
function IconCheck({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
}
function IconMousePointer({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="m13 13 6 6"/></svg>
}
function IconSparkles({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.814a2 2 0 0 1-1.275 1.274L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.274-1.275L21 12l-5.814-1.912a2 2 0 0 1-1.274-1.275L12 3Z"/></svg>
}
function IconRocket({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
}
function IconZap({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
}

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
        url: 'https://www.getvariante.com/icon.svg',
        width: 128,
        height: 128,
        alt: 'Variante Panda Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'A/B Testing from Figma — No Dev Needed | Variante',
    description: 'Pick → Generate → Ship. A/B testing without a developer.',
    images: ['https://www.getvariante.com/icon.svg'],
  },
}

/* ── Data ── */

const steps = [
  {
    icon: IconMousePointer,
    step: '01',
    title: 'Pick any element',
    body: 'Hover over any component on your live site. One click — the picker captures the HTML, CSS and framework context automatically.',
  },
  {
    icon: IconSparkles,
    step: '02',
    title: 'Generate in Figma',
    body: 'Select your replacement design in Figma. AI reads both sides and writes Variant B — pixel-perfect, responsive, matching your existing styles.',
  },
  {
    icon: IconRocket,
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
                <s.icon className="mb-4 h-8 w-8 text-text-3" />
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
                    <IconCheck className="h-4 w-4 shrink-0 text-ok" />
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
              <span className="absolute -top-3 right-6 rounded-full border border-pro bg-pro px-3 py-1 text-[11px] font-semibold text-black">
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
                      <IconZap className="h-4 w-4 shrink-0 text-pro" />
                    ) : (
                      <IconCheck className="h-4 w-4 shrink-0 text-ok" />
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
    </div>
  )
}
