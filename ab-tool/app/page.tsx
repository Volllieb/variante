import Link from 'next/link'
import type { Metadata } from 'next'
import { Input } from '@/components/ui/input'
import { PandaLogo } from '@/components/PandaLogo'
import {
  ArrowRight,
  Check,
  Sparkles,
  MousePointerClick,
  Rocket,
  Building2,
  Paintbrush,
  Plus,
  Zap,
  BarChart2,
  Globe,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Variante — A/B Testing for AI-Built Sites, No Dev Needed',
  description:
    'Pick an element on your live site, redesign it in Figma, and let AI generate Variant B. One snippet serves and tracks everything — built for WordPress, Shopify, Next.js, and AI-generated sites with no native A/B testing.',
  openGraph: {
    title: 'Variante — A/B Testing for AI-Built Sites',
    description: 'Pick → Generate → Ship. A/B testing without a developer.',
    url: 'https://www.getvariante.com',
    siteName: 'Variante',
  },
}

export const dynamic = 'force-static'

/* ── Data ── */

const stats = [
  { value: '300+', label: 'Designers testing' },
  { value: '< 10 min', label: 'Setup time' },
  { value: '0', label: 'Lines of code needed' },
  { value: '1', label: 'Snippet to deploy' },
]

const steps = [
  {
    icon: MousePointerClick,
    step: '01',
    title: 'Pick any element',
    body: 'Hover over any component on your live site. One click — the picker captures the HTML, CSS and framework context automatically.',
    accent: 'from-violet-500/20 to-violet-500/5',
    iconColor: 'text-violet-300',
    ringColor: 'group-hover:ring-violet-400/40',
  },
  {
    icon: Sparkles,
    step: '02',
    title: 'Generate in Figma',
    body: 'Select your replacement design in Figma. AI reads both sides and writes Variant B — pixel-perfect, responsive, matching your existing styles.',
    accent: 'from-fuchsia-500/20 to-fuchsia-500/5',
    iconColor: 'text-fuchsia-300',
    ringColor: 'group-hover:ring-fuchsia-400/40',
  },
  {
    icon: Rocket,
    step: '03',
    title: 'Ship & track',
    body: 'Paste one snippet into your <head>. It serves the right variant to each visitor and tracks every conversion — no deploy pipeline, no dev.',
    accent: 'from-cyan-500/20 to-cyan-500/5',
    iconColor: 'text-cyan-300',
    ringColor: 'group-hover:ring-cyan-400/40',
  },
]

const features = [
  {
    icon: Zap,
    title: 'Instant setup',
    body: 'From Figma to live test in under 10 minutes. No engineering queue.',
    size: 'sm',
  },
  {
    icon: BarChart2,
    title: 'Built-in statistics',
    body: 'Statistical significance tracked automatically. Know when your variant wins.',
    size: 'sm',
  },
  {
    icon: Globe,
    title: 'Works everywhere',
    body: 'WordPress, Shopify, Next.js, custom HTML, or AI exports from Bolt, v0, and Lovable. If it loads in a browser, Variante can test it.',
    size: 'lg',
  },
]

const useCases = [
  {
    icon: Paintbrush,
    title: 'Designer',
    body: 'You ship client sites with AI tools like Bolt, v0, and Lovable, or hand-coded HTML — and need to A/B test them without pulling a dev into the loop.',
    outcome: 'More conversions on every export',
    gradient: 'from-violet-500/10 via-transparent to-transparent',
    border: 'group-hover:border-violet-400/30',
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-300',
    size: 'lg',
  },
  {
    icon: Building2,
    title: 'Agency',
    body: 'White-label A/B testing across all your client sites without extra cost or extra logins.',
    outcome: 'Coming soon',
    gradient: 'from-fuchsia-500/10 via-transparent to-transparent',
    border: 'group-hover:border-fuchsia-400/30',
    iconBg: 'bg-fuchsia-500/10',
    iconColor: 'text-fuchsia-300',
    size: 'sm',
  },
  {
    icon: Rocket,
    title: 'Solo Founder',
    body: 'No developer on the team — run rigorous A/B tests yourself, in minutes.',
    outcome: 'Ship with confidence',
    gradient: 'from-cyan-500/10 via-transparent to-transparent',
    border: 'group-hover:border-cyan-400/30',
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-300',
    size: 'sm',
  },
]

type Feature = string | { label: string; soon?: boolean }
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
    price: '0 €',
    period: null,
    blurb: 'Kick the tires on a single experiment.',
    features: ['1 active experiment', 'AI variant generation', 'Conversion tracking'],
    cta: { label: 'Install plugin', href: '#notify' },
    featured: false,
  },
  {
    name: 'Pro',
    price: '35 €',
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
    price: '99 €',
    period: '/mo',
    blurb: 'Resell A/B testing as your own product.',
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
    a: 'No. You pick an element visually, describe the change in Figma, and paste a single snippet into your site\'s <head>. Everything else is handled for you.',
  },
  {
    q: 'Which website builders does it work with?',
    a: 'Any site without built-in A/B testing — WordPress, Shopify, Next.js/React, custom HTML, or AI exports from Bolt, v0, and Lovable. Already on Webflow or Framer? They ship solid native A/B tools, so you likely don\'t need us there.',
  },
  {
    q: 'How does the AI generate Variant B?',
    a: 'It reads the original element\'s HTML and CSS plus your Figma selection, then writes a drop-in replacement that respects your existing styling and responsive behavior.',
  },
  {
    q: 'When is the Figma plugin available?',
    a: 'It\'s currently in review with Figma. Leave your email below and we\'ll notify you the moment it goes live.',
  },
]

/* ── Shared style strings (Skill: smooth 150-300ms transitions, 7:1 CTA contrast) ── */
const btnPrimary =
  'group inline-flex cursor-pointer h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600 bg-[length:200%_auto] px-7 text-sm font-bold text-white shadow-[0_8px_32px_-6px_rgba(139,92,246,0.65)] transition-all duration-200 hover:bg-[position:100%_center] hover:shadow-[0_12px_40px_-6px_rgba(217,70,239,0.7)] hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06050f] active:scale-[0.98]'

const btnGlass =
  'inline-flex cursor-pointer h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-7 text-sm font-semibold text-white/90 backdrop-blur-md transition-all duration-200 hover:border-white/30 hover:bg-white/[0.12] hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06050f] active:scale-[0.98]'

/* ── Page ── */

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ waitlist?: string }>
}) {
  const waitlistStatus = (await searchParams).waitlist

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#06050f] font-[family-name:var(--font-sans)] text-white/80 antialiased selection:bg-fuchsia-500/30">

      {/* ── Aurora blobs + grid background ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* dot grid */}
        <div
          className="absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* aurora blobs */}
        <div className="lp-drift absolute -left-64 -top-32 h-[52rem] w-[52rem] rounded-full bg-violet-700/25 blur-[140px]" />
        <div
          className="lp-drift absolute -right-48 top-10 h-[44rem] w-[44rem] rounded-full bg-fuchsia-600/22 blur-[130px]"
          style={{ animationDelay: '-8s' }}
        />
        <div
          className="lp-drift absolute left-1/3 top-[55%] h-[40rem] w-[40rem] rounded-full bg-cyan-500/18 blur-[120px]"
          style={{ animationDelay: '-15s' }}
        />
        {/* grain */}
        <div className="lp-grain absolute inset-0 opacity-[0.15] mix-blend-soft-light" />
        {/* vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,transparent_60%,#06050f_100%)]" />
      </div>

      <div className="relative z-10">
        {/* ── Header ── */}
        <header className="sticky top-0 z-50 px-4 pt-4">
          <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 backdrop-blur-2xl">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-[family-name:var(--font-display)] text-[1.1rem] font-bold tracking-tight text-white transition-opacity duration-200 hover:opacity-80"
            >
              <PandaLogo className="h-7 w-7 rounded-lg p-1 shadow-lg shadow-fuchsia-500/30" />
              variante
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/login"
                className="hidden cursor-pointer text-sm font-medium text-white/55 transition-colors duration-200 hover:text-white sm:block"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="inline-flex cursor-pointer h-9 items-center rounded-full bg-white px-4 text-sm font-bold text-[#06050f] transition-all duration-200 hover:bg-white/90 hover:scale-[1.03] active:scale-[0.98]"
              >
                Sign up — free
              </Link>
            </div>
          </nav>
        </header>

        {/* ── Hero ── */}
        <section className="relative px-6 pb-8 pt-20 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">

            <div className="lp-rise inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/[0.07] px-4 py-1.5 text-xs font-semibold text-fuchsia-200 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered A/B testing from Figma
            </div>

            <h1
              className="lp-rise mt-7 font-[family-name:var(--font-display)] text-[2.8rem] font-extrabold leading-[1.04] tracking-tight text-white sm:text-[4.5rem] sm:leading-[1.03]"
              style={{ animationDelay: '0.07s' }}
            >
              Your AI built the site.
              <br />
              <span className="lp-gradient-text">Now test what wins.</span>
            </h1>

            <p
              className="lp-rise mx-auto mt-6 max-w-lg text-[1.05rem] leading-relaxed text-white/55"
              style={{ animationDelay: '0.14s' }}
            >
              Pick an element on your live site, redesign it in Figma, and let AI
              generate&nbsp;Variant&nbsp;B. One snippet serves and tracks everything —
              no native A/B testing required.
            </p>

            <div
              className="lp-rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
              style={{ animationDelay: '0.21s' }}
            >
              <a href="#notify" className={btnPrimary}>
                Install Figma Plugin
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
              <Link href="/signup" className={btnGlass}>
                Create free account
              </Link>
            </div>

            <p
              className="lp-rise mt-7 flex items-center justify-center gap-2.5 text-sm text-white/45"
              style={{ animationDelay: '0.28s' }}
            >
              <span className="flex -space-x-2">
                {[
                  'from-violet-400 to-fuchsia-400',
                  'from-fuchsia-400 to-rose-400',
                  'from-cyan-400 to-violet-400',
                  'from-emerald-400 to-cyan-400',
                ].map((g, i) => (
                  <span
                    key={i}
                    className={`h-6 w-6 rounded-full border-2 border-[#06050f] bg-gradient-to-br ${g}`}
                  />
                ))}
              </span>
              Joined by <span className="font-bold text-white">300+ designers</span>
            </p>
          </div>

          {/* ── Hero A/B Mockup ── */}
          <div
            className="lp-rise relative mx-auto mt-14 max-w-4xl"
            style={{ animationDelay: '0.35s' }}
          >
            <div
              aria-hidden
              className="lp-spin absolute -inset-px rounded-[30px] opacity-35 blur-sm"
              style={{
                background:
                  'conic-gradient(from 0deg, transparent 0deg, rgba(139,92,246,0.8) 60deg, transparent 120deg, rgba(217,70,239,0.8) 180deg, transparent 240deg, rgba(34,211,238,0.7) 300deg, transparent 360deg)',
              }}
            />
            <div className="relative overflow-hidden rounded-[29px] border border-white/[0.08] bg-[#0c0a1a]/90 p-4 shadow-2xl backdrop-blur-xl">
              {/* title bar */}
              <div className="mb-3 flex items-center gap-2 px-1">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                </div>
                <div className="mx-auto flex h-6 w-48 items-center justify-center rounded-md bg-white/[0.06] text-[10px] text-white/40">
                  getvariante.com
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <MockPanel
                  tag="Control · A"
                  tagClass="text-white/40"
                  ctaClass="bg-white/10 text-white/60"
                  ctaLabel="Get started"
                  border="border-white/[0.08]"
                />
                <MockPanel
                  tag="Variant · B  ✦ Winner"
                  tagClass="text-fuchsia-300"
                  ctaClass="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold"
                  ctaLabel="Start free trial →"
                  border="border-fuchsia-400/25"
                  winner
                />
              </div>
            </div>
            {/* uplift badge */}
            <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-emerald-400/25 bg-[#06050f]/95 px-5 py-2 text-sm font-bold text-emerald-300 shadow-xl backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Variant B: +24% conversion uplift
            </div>
          </div>
        </section>

        {/* ── Trust / Stats bar ── */}
        <section className="mt-14 px-6 pb-16">
          <div className="mx-auto max-w-4xl">
            <div className="grid grid-cols-2 divide-x divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-md sm:grid-cols-4">
              {stats.map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-1 px-6 py-6 text-center">
                  <span className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-white sm:text-3xl">
                    {s.value}
                  </span>
                  <span className="text-xs text-white/45">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works — Bento Grid ── */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <SectionLabel eyebrow="How it works" title="Three steps. No developer. No deploy." />

            {/* Bento: 01 tall-left | 02 top-right, 03 bottom-right */}
            <div className="mt-14 grid gap-4 md:grid-cols-3 md:grid-rows-2">
              {/* Step 01 — tall card */}
              <BentoCard step={steps[0]} className="md:col-span-1 md:row-span-2" tall />
              {/* Step 02 */}
              <BentoCard step={steps[1]} className="md:col-span-2 md:row-span-1" />
              {/* Step 03 */}
              <BentoCard step={steps[2]} className="md:col-span-2 md:row-span-1" />
            </div>

            {/* Extra feature pills */}
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-5 py-4 backdrop-blur-md transition-colors duration-200 hover:border-white/15"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                    <f.icon className="h-4 w-4 text-fuchsia-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{f.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-white/50">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── For Whom — Asymmetric Bento ── */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <SectionLabel eyebrow="Who it's for" title="Built for builders shipping without a dev team" />

            <div className="mt-14 grid gap-4 md:grid-cols-3 md:grid-rows-2">
              {/* Designer — large */}
              <UseCaseCard uc={useCases[0]} className="md:col-span-2 md:row-span-2" large />
              {/* Agency */}
              <UseCaseCard uc={useCases[1]} className="md:col-span-1 md:row-span-1" />
              {/* Solo Founder */}
              <UseCaseCard uc={useCases[2]} className="md:col-span-1 md:row-span-1" />
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <SectionLabel eyebrow="Pricing" title="Start free. Upgrade when you need more." />

            <div className="mt-14 grid items-stretch gap-5 md:grid-cols-3">
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className={
                    tier.featured
                      ? 'relative rounded-3xl p-px shadow-[0_24px_60px_-15px_rgba(217,70,239,0.4)]'
                      : 'relative rounded-3xl border border-white/[0.08]'
                  }
                  style={
                    tier.featured
                      ? {
                          background:
                            'linear-gradient(135deg, rgba(139,92,246,0.8) 0%, rgba(217,70,239,0.7) 50%, rgba(139,92,246,0.6) 100%)',
                        }
                      : undefined
                  }
                >
                  <div
                    className={`flex h-full flex-col rounded-[23px] p-8 ${
                      tier.featured
                        ? 'bg-[#0e0b1e]'
                        : 'bg-white/[0.025] backdrop-blur-md'
                    }`}
                  >
                    {tier.featured && (
                      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg">
                        Most popular
                      </span>
                    )}
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
                      {tier.name}
                    </p>
                    <div className="mt-3 flex items-baseline gap-1.5">
                      <span className="font-[family-name:var(--font-display)] text-5xl font-extrabold text-white">
                        {tier.price}
                      </span>
                      {tier.period && (
                        <span className="text-sm text-white/40">{tier.period}</span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-white/45">{tier.blurb}</p>

                    <ul className="mt-7 flex-1 space-y-3 text-sm">
                      {tier.features.map((f, i) => {
                        const label = typeof f === 'string' ? f : f.label
                        const soon = typeof f !== 'string' && f.soon
                        return (
                          <li key={i} className="flex items-center gap-2.5">
                            <Check className="h-4 w-4 shrink-0 text-fuchsia-400" />
                            <span className="text-white/70">
                              {label}
                              {soon && (
                                <span className="ml-2 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
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
                      className={`mt-8 w-full text-center ${tier.featured ? btnPrimary : btnGlass}`}
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
            <SectionLabel eyebrow="FAQ" title="Frequently asked questions" />

            <div className="mt-12 space-y-3">
              {faqs.map((item) => (
                <details
                  key={item.q}
                  className="group cursor-pointer rounded-2xl border border-white/[0.08] bg-white/[0.025] px-6 backdrop-blur-md transition-all duration-200 open:border-white/15 open:bg-white/[0.04] [&_summary]:list-none"
                >
                  <summary className="flex cursor-pointer select-none items-center justify-between gap-4 py-5 text-left text-sm font-semibold text-white/85">
                    {item.q}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/50 transition-all duration-200 group-open:rotate-45 group-open:border-fuchsia-400/40 group-open:bg-fuchsia-500/10 group-open:text-fuchsia-300">
                      <Plus className="h-4 w-4" />
                    </span>
                  </summary>
                  <p className="pb-5 text-sm leading-relaxed text-white/50">
                    {renderWithCode(item.a)}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Notify / CTA ── */}
        <section id="notify" className="scroll-mt-24 px-6 py-24">
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.015] px-6 py-16 text-center backdrop-blur-2xl shadow-2xl sm:px-14">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-28 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-fuchsia-500/22 blur-[100px]"
            />
            <div className="relative">
              {waitlistStatus === 'thanks' ? (
                <>
                  <PillBadge tone="emerald">You&apos;re on the list</PillBadge>
                  <h2 className="mt-5 font-[family-name:var(--font-display)] text-3xl font-extrabold text-white sm:text-4xl">
                    Thanks for signing up!
                  </h2>
                  <p className="mx-auto mt-4 max-w-md text-white/55">
                    We&apos;ll email you the moment the Figma plugin is live.
                  </p>
                </>
              ) : waitlistStatus === 'error' ? (
                <>
                  <PillBadge tone="rose">Something went wrong</PillBadge>
                  <h2 className="mt-5 font-[family-name:var(--font-display)] text-3xl font-extrabold text-white sm:text-4xl">
                    Could not save your email
                  </h2>
                  <p className="mx-auto mt-4 max-w-md text-white/55">
                    Please try again or email us at{' '}
                    <a
                      href="mailto:hello@getvariante.com"
                      className="cursor-pointer text-fuchsia-300 underline underline-offset-4 transition-colors hover:text-fuchsia-200"
                    >
                      hello@getvariante.com
                    </a>
                    .
                  </p>
                </>
              ) : (
                <>
                  <PillBadge tone="amber">Plugin in review</PillBadge>
                  <h2 className="mt-5 font-[family-name:var(--font-display)] text-3xl font-extrabold text-white sm:text-4xl">
                    The Figma plugin is almost here
                  </h2>
                  <p className="mx-auto mt-4 max-w-md text-white/55">
                    Leave your email and we&apos;ll notify you the moment it&apos;s live.
                    No spam, ever.
                  </p>
                  <form
                    method="POST"
                    action="/api/waitlist"
                    className="mx-auto mt-8 flex max-w-sm flex-col gap-3 sm:flex-row"
                  >
                    <Input
                      type="email"
                      name="email"
                      required
                      placeholder="you@example.com"
                      className="h-12 flex-1 rounded-full border-white/15 bg-white/[0.06] px-5 text-white placeholder:text-white/35 focus-visible:border-fuchsia-400/40 focus-visible:ring-fuchsia-400/30"
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
        <footer className="border-t border-white/[0.07] px-6 py-10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-center text-sm text-white/40 sm:flex-row sm:text-left">
            <p className="flex items-center gap-2">
              <PandaLogo className="h-6 w-6 rounded-md p-0.5" />
              variante — A/B testing from Figma. Made in Bavaria.
            </p>
            <div className="flex items-center gap-5">
              <Link href="/privacy" className="cursor-pointer transition-colors duration-200 hover:text-white">
                Privacy
              </Link>
              <Link href="/imprint" className="cursor-pointer transition-colors duration-200 hover:text-white">
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

/* ── Sub-components ── */

function SectionLabel({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-fuchsia-300/75">
        {eyebrow}
      </span>
      <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-white sm:text-[2.5rem] sm:leading-tight">
        {title}
      </h2>
    </div>
  )
}

function BentoCard({
  step,
  className,
  tall,
}: {
  step: (typeof steps)[number]
  className?: string
  tall?: boolean
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br ${step.accent} p-7 backdrop-blur-md ring-1 ring-transparent transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 ${step.ringColor} ${className ?? ''}`}
    >
      {/* large step number watermark */}
      <div className="absolute right-5 top-4 font-[family-name:var(--font-display)] text-6xl font-black text-white/[0.05] transition-colors duration-200 group-hover:text-white/[0.08] select-none">
        {step.step}
      </div>
      <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] ring-1 ring-white/10 transition-all duration-200 ${step.ringColor}`}>
        <step.icon className={`h-5 w-5 ${step.iconColor}`} />
      </div>
      <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-white">
        {step.title}
      </h3>
      <p className={`mt-2.5 text-sm leading-relaxed text-white/55 ${tall ? 'max-w-xs' : ''}`}>
        {renderWithCode(step.body)}
      </p>
    </div>
  )
}

function UseCaseCard({
  uc,
  className,
  large,
}: {
  uc: (typeof useCases)[number]
  className?: string
  large?: boolean
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br ${uc.gradient} backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 ${uc.border} ${className ?? ''} ${large ? 'p-9' : 'p-7'}`}
    >
      <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${uc.iconBg} ring-1 ring-white/10`}>
        <uc.icon className={`h-5 w-5 ${uc.iconColor}`} />
      </div>
      <h3 className={`font-[family-name:var(--font-display)] font-bold text-white ${large ? 'text-2xl' : 'text-xl'}`}>
        {uc.title}
      </h3>
      <p className={`mt-2.5 leading-relaxed text-white/55 ${large ? 'text-base max-w-sm' : 'text-sm'}`}>
        {uc.body}
      </p>
      <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-fuchsia-300">
        <ArrowRight className="h-3.5 w-3.5" />
        {uc.outcome}
      </div>
    </div>
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
    <div className={`relative overflow-hidden rounded-2xl border ${border} bg-[#0c0a1a]/70 p-5`}>
      {winner && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-fuchsia-500/[0.08] to-violet-500/[0.04]" />
      )}
      <div className="relative">
        <div className={`mb-4 text-right text-[10px] font-bold uppercase tracking-wider ${tagClass}`}>
          {tag}
        </div>
        <div className="space-y-2">
          <div className="h-2.5 w-2/3 rounded-full bg-white/15" />
          <div className="h-2.5 w-full rounded-full bg-white/[0.07]" />
          <div className="h-2.5 w-4/5 rounded-full bg-white/[0.07]" />
          <div className="h-2.5 w-3/5 rounded-full bg-white/[0.07]" />
        </div>
        <div className={`mt-5 flex h-9 items-center justify-center rounded-lg text-xs transition-all duration-200 ${ctaClass}`}>
          {ctaLabel}
        </div>
      </div>
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
  const styles = {
    emerald: 'border-emerald-400/25 bg-emerald-400/8 text-emerald-300',
    rose: 'border-rose-400/25 bg-rose-400/8 text-rose-300',
    amber: 'border-amber-400/25 bg-amber-400/8 text-amber-300',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-4 py-1 text-[11px] font-bold uppercase tracking-widest ${styles[tone]}`}
    >
      {children}
    </span>
  )
}

function renderWithCode(text: string) {
  const parts = text.split(/(<head>)/g)
  return parts.map((part, i) =>
    part === '<head>' ? (
      <code key={i} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-cyan-200">
        &lt;head&gt;
      </code>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}
