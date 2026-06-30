import Link from 'next/link'
import type { Metadata } from 'next'
import { Input } from '@/components/ui/input'
import {
  ArrowRight,
  Check,
  Sparkles,
  MousePointerClick,
  Rocket,
  Building2,
  Paintbrush,
  Plus,
} from 'lucide-react'

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

export const dynamic = 'force-static'

const steps = [
  {
    icon: MousePointerClick,
    title: 'Pick',
    body: 'Choose any element on your live website. Hover, click, done. The picker captures the HTML, CSS and page framework automatically.',
  },
  {
    icon: Sparkles,
    title: 'Generate',
    body: 'Switch to Figma, select the replacement design. AI analyzes both and writes Variant B — preserving your site’s styling.',
  },
  {
    icon: Rocket,
    title: 'Ship',
    body: 'Copy one snippet into your <head>. It serves the right variant and tracks conversions. No deploy pipeline, no dev.',
  },
]

const useCases = [
  {
    icon: Paintbrush,
    title: 'Designer',
    body: 'Building sites with AI (Bolt, v0, etc.) and need A/B testing without a dev.',
    outcome: 'More conversions on your exports',
  },
  {
    icon: Building2,
    title: 'Agency',
    body: 'Running multiple client sites from AI exports — white-label for clients without extra cost.',
    outcome: 'Coming soon',
  },
  {
    icon: Rocket,
    title: 'Solo Founder',
    body: 'No developer in the team — run A/B tests in 10 minutes yourself.',
    outcome: 'Ship with confidence',
  },
]

type Feature = string | { label: string; soon?: boolean; off?: boolean }

const tiers: {
  name: string
  price: string
  period: string | null
  blurb: string
  features: Feature[]
  cta: { label: string; href: string }
  featured: boolean
}[] = [
  {
    name: 'Free',
    price: '0 €',
    period: null,
    blurb: 'Kick the tires on a single experiment.',
    features: ['1 active experiment', 'AI variant generation', 'Conversion tracking'],
    cta: { label: 'Install plugin', href: '#notify' },
    featured: false,
  },
  {
    name: 'Pro',
    price: '35 €',
    period: '/mo',
    blurb: 'For builders shipping tests every week.',
    features: [
      'Unlimited experiments',
      'AI variant generation',
      'Full statistics & significance',
      'Priority support',
    ],
    cta: { label: 'Start free trial', href: '/signup' },
    featured: true,
  },
  {
    name: 'Agency',
    price: '99 €',
    period: '/mo',
    blurb: 'Resell testing as your own.',
    features: [
      'Everything in Pro',
      { label: 'White-label', soon: true },
      { label: 'Multi-site support', soon: true },
      { label: 'Team seats', soon: true },
    ],
    cta: { label: 'Get notified', href: '/signup' },
    featured: false,
  },
]

const faqs = [
  {
    q: 'Do I need to write any code?',
    a: 'No. You pick an element visually, describe the change in Figma, and paste a single snippet into your site’s <head>. Everything else is handled for you.',
  },
  {
    q: 'Which website builders does it work with?',
    a: 'Anything that outputs HTML — Webflow, Framer, AI exports from Bolt or v0, hand-written sites. If it loads in a browser, Variante can test it.',
  },
  {
    q: 'How does the AI generate Variant B?',
    a: 'It reads the original element’s HTML and CSS plus your Figma selection, then writes a drop-in replacement that respects your existing styling and responsive behavior.',
  },
  {
    q: 'When is the Figma plugin available?',
    a: 'It’s currently in review. Leave your email below and we’ll notify you the moment it goes live.',
  },
]

const btnPrimary =
  'group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 bg-[length:200%_auto] px-7 text-sm font-semibold text-white shadow-[0_8px_30px_-6px_rgba(168,85,247,0.6)] transition-[background-position,transform,box-shadow] duration-500 hover:bg-[position:100%_center] hover:shadow-[0_10px_40px_-6px_rgba(217,70,239,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60'

const btnGlass =
  'inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 text-sm font-semibold text-white/90 backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ waitlist?: string }>
}) {
  const waitlistStatus = (await searchParams).waitlist

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080711] font-[family-name:var(--font-sans)] text-white/80 antialiased selection:bg-fuchsia-500/30">
      {/* ── Aurora background ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="lp-drift absolute -left-40 -top-40 h-[42rem] w-[42rem] rounded-full bg-violet-600/30 blur-[120px]" />
        <div
          className="lp-drift absolute -right-32 top-20 h-[38rem] w-[38rem] rounded-full bg-fuchsia-500/25 blur-[120px]"
          style={{ animationDelay: '-7s' }}
        />
        <div
          className="lp-drift absolute left-1/3 top-[60%] h-[34rem] w-[34rem] rounded-full bg-cyan-500/20 blur-[120px]"
          style={{ animationDelay: '-13s' }}
        />
        <div className="lp-grain absolute inset-0 opacity-[0.18] mix-blend-soft-light" />
      </div>

      <div className="relative z-10">
        {/* ── Header ── */}
        <header className="sticky top-0 z-50 px-4 pt-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 backdrop-blur-xl sm:px-6">
            <Link
              href="/"
              className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-white"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm shadow-lg shadow-fuchsia-500/30">
                v
              </span>
              variante
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                href="/login"
                className="hidden text-sm font-medium text-white/60 transition-colors hover:text-white sm:block"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-9 items-center rounded-full bg-white px-4 text-sm font-semibold text-[#080711] transition-transform hover:scale-[1.03]"
              >
                Sign up — free
              </Link>
            </div>
          </div>
        </header>

        {/* ── Hero ── */}
        <section className="relative px-6 pb-12 pt-20 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="lp-rise inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-white/70 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" />
              A/B testing, reimagined for designers
            </div>

            <h1
              className="lp-rise mt-7 font-[family-name:var(--font-display)] text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-7xl"
              style={{ animationDelay: '0.08s' }}
            >
              A/B testing from{' '}
              <span className="lp-gradient-text">Figma</span>
              <br />
              no dev needed
            </h1>

            <p
              className="lp-rise mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/60"
              style={{ animationDelay: '0.16s' }}
            >
              Pick an element on your live site, describe the change in Figma, and
              let AI generate Variant&nbsp;B. One snippet tracks every conversion.
              That&apos;s it.
            </p>

            <div
              className="lp-rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
              style={{ animationDelay: '0.24s' }}
            >
              <a href="#notify" className={btnPrimary}>
                Install Figma Plugin
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <Link href="/signup" className={btnGlass}>
                Create free account
              </Link>
            </div>

            <p
              className="lp-rise mt-7 flex items-center justify-center gap-2 text-sm text-white/50"
              style={{ animationDelay: '0.32s' }}
            >
              <span className="flex -space-x-2">
                {['from-violet-400 to-fuchsia-400', 'from-fuchsia-400 to-rose-400', 'from-cyan-400 to-violet-400'].map(
                  (g, i) => (
                    <span
                      key={i}
                      className={`h-6 w-6 rounded-full border-2 border-[#080711] bg-gradient-to-br ${g}`}
                    />
                  ),
                )}
              </span>
              <span className="font-semibold text-white">300+</span> designers already testing
            </p>
          </div>

          {/* ── Hero product mockup: A vs B ── */}
          <div
            className="lp-rise relative mx-auto mt-16 max-w-4xl"
            style={{ animationDelay: '0.4s' }}
          >
            {/* rotating conic halo */}
            <div
              aria-hidden
              className="lp-spin absolute -inset-px rounded-[28px] opacity-40 blur-md"
              style={{
                background:
                  'conic-gradient(from 0deg, transparent, rgba(168,85,247,0.7), transparent 30%, rgba(217,70,239,0.7), transparent 60%, rgba(34,211,238,0.6), transparent)',
              }}
            />
            <div className="relative rounded-[27px] border border-white/10 bg-white/[0.03] p-3 backdrop-blur-2xl shadow-2xl">
              <div className="grid gap-3 sm:grid-cols-2">
                <MockPanel
                  tag="Control · A"
                  tagClass="text-white/50"
                  ctaClass="bg-white/10 text-white/70"
                  ctaLabel="Get started"
                  border="border-white/10"
                />
                <MockPanel
                  tag="Variant · B"
                  tagClass="text-fuchsia-300"
                  ctaClass="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white"
                  ctaLabel="Start free trial →"
                  border="border-fuchsia-400/30"
                  winner
                />
              </div>
            </div>
            {/* uplift badge */}
            <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-emerald-400/30 bg-[#0c1118]/90 px-4 py-2 text-sm font-semibold text-emerald-300 backdrop-blur-md shadow-lg">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              +24% conversions on Variant B
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="px-6 py-28">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="How it works"
              title="Three steps. No developer. No deploy."
            />
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {steps.map((s, i) => (
                <div
                  key={s.title}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]"
                >
                  <div className="absolute right-6 top-6 font-[family-name:var(--font-display)] text-5xl font-bold text-white/[0.06] transition-colors group-hover:text-white/10">
                    0{i + 1}
                  </div>
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 ring-1 ring-white/10">
                    <s.icon className="h-5 w-5 text-fuchsia-300" />
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">
                    {s.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/55">
                    {renderWithCode(s.body)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Use cases ── */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="Who it's for"
              title="Built for modern designers & builders"
            />
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {useCases.map((uc) => (
                <div
                  key={uc.title}
                  className="group rounded-3xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-fuchsia-400/30"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10 transition-colors group-hover:bg-fuchsia-500/10">
                    <uc.icon className="h-5 w-5 text-violet-300" />
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-white">
                    {uc.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">{uc.body}</p>
                  <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-fuchsia-300">
                    <ArrowRight className="h-3.5 w-3.5" />
                    {uc.outcome}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="Pricing"
              title="Start free. Upgrade when you need more."
            />
            <div className="mt-14 grid items-start gap-5 md:grid-cols-3">
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className={
                    tier.featured
                      ? 'relative rounded-3xl bg-gradient-to-b from-fuchsia-500/60 to-violet-600/40 p-px shadow-[0_20px_60px_-15px_rgba(217,70,239,0.45)]'
                      : 'relative rounded-3xl border border-white/10'
                  }
                >
                  <div
                    className={`flex h-full flex-col rounded-[23px] p-8 ${
                      tier.featured ? 'bg-[#0d0a17]' : 'bg-white/[0.03] backdrop-blur-md'
                    }`}
                  >
                    {tier.featured && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-1 text-xs font-bold text-white shadow-lg">
                        Most popular
                      </span>
                    )}
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-white/60">
                      {tier.name}
                    </h3>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="font-[family-name:var(--font-display)] text-5xl font-bold text-white">
                        {tier.price}
                      </span>
                      {tier.period && (
                        <span className="text-sm text-white/50">{tier.period}</span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-white/50">{tier.blurb}</p>

                    <ul className="mt-7 flex-1 space-y-3.5 text-sm">
                      {tier.features.map((f, i) => {
                        const label = typeof f === 'string' ? f : f.label
                        const soon = typeof f !== 'string' && f.soon
                        return (
                          <li key={i} className="flex items-start gap-2.5">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-400" />
                            <span className="text-white/75">
                              {label}
                              {soon && (
                                <span className="ml-2 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                                  Soon
                                </span>
                              )}
                            </span>
                          </li>
                        )
                      })}
                    </ul>

                    <Link
                      href={tier.cta.href}
                      className={
                        tier.featured
                          ? `mt-8 ${btnPrimary} w-full`
                          : `mt-8 ${btnGlass} w-full`
                      }
                    >
                      {tier.cta.label}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
            <div className="mt-12 space-y-3">
              {faqs.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-white/10 bg-white/[0.03] px-6 backdrop-blur-md transition-colors open:border-white/20 open:bg-white/[0.05] [&_summary]:list-none"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 py-5 text-left font-medium text-white">
                    {item.q}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/60 transition-transform duration-300 group-open:rotate-45 group-open:border-fuchsia-400/40 group-open:text-fuchsia-300">
                      <Plus className="h-4 w-4" />
                    </span>
                  </summary>
                  <p className="pb-5 text-sm leading-relaxed text-white/55">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Notify / CTA ── */}
        <section id="notify" className="scroll-mt-24 px-6 py-24">
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] px-6 py-14 text-center backdrop-blur-xl sm:px-12">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-fuchsia-500/25 blur-[90px]"
            />
            <div className="relative">
              {waitlistStatus === 'thanks' ? (
                <>
                  <PillBadge tone="emerald">You&apos;re on the list</PillBadge>
                  <h2 className="mt-5 font-[family-name:var(--font-display)] text-3xl font-bold text-white sm:text-4xl">
                    Thanks for signing up!
                  </h2>
                  <p className="mx-auto mt-4 max-w-md text-white/60">
                    We&apos;ll email you the moment the Figma plugin is live.
                  </p>
                </>
              ) : waitlistStatus === 'error' ? (
                <>
                  <PillBadge tone="rose">Something went wrong</PillBadge>
                  <h2 className="mt-5 font-[family-name:var(--font-display)] text-3xl font-bold text-white sm:text-4xl">
                    Could not save your email
                  </h2>
                  <p className="mx-auto mt-4 max-w-md text-white/60">
                    Please try again or email us directly at{' '}
                    <a
                      href="mailto:hello@getvariante.com"
                      className="text-fuchsia-300 underline underline-offset-4"
                    >
                      hello@getvariante.com
                    </a>
                    .
                  </p>
                </>
              ) : (
                <>
                  <PillBadge tone="amber">Coming soon</PillBadge>
                  <h2 className="mt-5 font-[family-name:var(--font-display)] text-3xl font-bold text-white sm:text-4xl">
                    The Figma plugin is in review
                  </h2>
                  <p className="mx-auto mt-4 max-w-md text-white/60">
                    Leave your email and we&apos;ll notify you the moment it&apos;s live.
                  </p>
                  <form
                    method="POST"
                    action="/api/waitlist"
                    className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
                  >
                    <Input
                      type="email"
                      name="email"
                      required
                      placeholder="you@example.com"
                      className="h-12 flex-1 rounded-full border-white/15 bg-white/5 px-5 text-white placeholder:text-white/40 focus-visible:ring-fuchsia-400/50"
                    />
                    <button type="submit" className={btnPrimary}>
                      Notify me
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-white/10 px-6 py-10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-center text-sm text-white/45 sm:flex-row sm:text-left">
            <p className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold text-white">
                v
              </span>
              variante — A/B testing from Figma. Made in Bavaria.
            </p>
            <div className="flex items-center gap-5">
              <Link href="/privacy" className="transition-colors hover:text-white">
                Privacy
              </Link>
              <Link href="/imprint" className="transition-colors hover:text-white">
                Imprint
              </Link>
              <span>© 2026</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

/* ── Helpers ── */

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300/80">
        {eyebrow}
      </span>
      <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {title}
      </h2>
    </div>
  )
}

function PillBadge({
  tone,
  children,
}: {
  tone: 'emerald' | 'rose' | 'amber'
  children: React.ReactNode
}) {
  const tones = {
    emerald: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    rose: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
    amber: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

function MockPanel({
  tag,
  tagClass,
  ctaClass,
  ctaLabel,
  border,
  winner,
}: {
  tag: string
  tagClass: string
  ctaClass: string
  ctaLabel: string
  border: string
  winner?: boolean
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${border} bg-[#0c0a14]/80 p-5`}
    >
      {winner && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 to-transparent" />
      )}
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          </div>
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${tagClass}`}>
            {tag}
          </span>
        </div>
        <div className="space-y-2.5">
          <div className="h-2.5 w-2/3 rounded-full bg-white/15" />
          <div className="h-2.5 w-full rounded-full bg-white/[0.08]" />
          <div className="h-2.5 w-4/5 rounded-full bg-white/[0.08]" />
        </div>
        <div className={`mt-5 flex h-9 items-center justify-center rounded-lg text-xs font-semibold ${ctaClass}`}>
          {ctaLabel}
        </div>
      </div>
    </div>
  )
}

/** Renders a body string, turning a literal <head>/<code> hint into styled inline code. */
function renderWithCode(text: string) {
  const parts = text.split(/(<head>)/g)
  return parts.map((part, i) =>
    part === '<head>' ? (
      <code
        key={i}
        className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-fuchsia-200"
      >
        &lt;head&gt;
      </code>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}
