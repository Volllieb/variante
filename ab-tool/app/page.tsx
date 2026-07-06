import Link from 'next/link'
import type { Metadata } from 'next'
import { PandaLogo } from '@/components/PandaLogo'
import { Check, MousePointerClick, Sparkles, Rocket } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Variante — A/B Testing from Figma',
  description:
    'Pick an element on your live site, redesign it in Figma, and let AI generate Variant B. One snippet serves and tracks everything.',
  openGraph: {
    title: 'Variante — A/B Testing from Figma',
    description: 'Pick → Generate → Ship. A/B testing without a developer.',
    url: 'https://www.getvariante.com',
    siteName: 'Variante',
  },
}

export const dynamic = 'force-static'

/* ── Data ── */

const steps = [
  {
    icon: MousePointerClick,
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
  '1 active experiment',
  'AI variant generation',
  'Conversion tracking',
]

const proFeatures = [
  'Unlimited experiments',
  'AI variant generation',
  'Full statistics & significance',
  'Priority support',
]

/* ── Page ── */

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg-0 text-white/80 antialiased">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-bg-0/95">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[1.1rem] font-semibold tracking-tight text-white transition-opacity duration-200 hover:opacity-80"
          >
            <PandaLogo className="h-7 w-7 rounded-lg p-1" />
            variante
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden text-sm text-white/55 transition-colors duration-200 hover:text-white sm:block"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90"
            >
              Sign up — free
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="px-6 py-24 text-center sm:py-32">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            A/B Testing for AI-built sites.
            <br />
            From Figma. No dev needed.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/55">
            Pick an element on your live site, redesign it in Figma, and let AI generate Variant B.
            One snippet serves and tracks everything.
          </p>
          <div className="mt-9">
            <Link
              href="/signup"
              className="inline-flex rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90"
            >
              Start free — install Figma plugin
            </Link>
          </div>
          <p className="mt-4 text-xs text-text-3">
            No credit card · 1 free experiment
          </p>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="px-6 py-20">
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
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-xl font-semibold text-white">Pricing</h2>
          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-2">
            {/* Free */}
            <div className="rounded-[10px] border border-border bg-bg-1 p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-3">
                Free
              </p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold text-white">0 €</span>
              </div>
              <ul className="mt-6 space-y-2.5 text-sm">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 shrink-0 text-ok" />
                    <span className="text-white/70">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-8 inline-flex w-full justify-center rounded-full border border-border-strong px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:border-white/30"
              >
                Install plugin
              </Link>
            </div>

            {/* Pro */}
            <div className="relative rounded-[10px] border border-border-strong bg-bg-1 p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-pro">
                Most popular
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-text-3">
                Pro
              </p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold text-white">35 €</span>
                <span className="text-sm text-text-3">/mo</span>
              </div>
              <ul className="mt-6 space-y-2.5 text-sm">
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 shrink-0 text-ok" />
                    <span className="text-white/70">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-8 inline-flex w-full justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90"
              >
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-white/40">
        <p>
          variante — A/B testing from Figma. Made in Bavaria.
          {' · '}
          <Link href="/privacy" className="transition-colors duration-200 hover:text-white">
            Privacy
          </Link>
          {' · '}
          <Link href="/imprint" className="transition-colors duration-200 hover:text-white">
            Imprint
          </Link>
          {' · '}
          <span>© 2026</span>
        </p>
      </footer>
    </div>
  )
}
