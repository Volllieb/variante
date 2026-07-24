import type { Metadata } from 'next'
import Link from 'next/link'
import { PandaLogo } from '@/components/PandaLogo'
import { Check, Zap, ChevronDown, ArrowUpRight, Code2, MousePointer2, FlaskConical } from '@/components/LandingIcons'
import { techLogos, TechLogoMark } from '@/components/TechLogos'
import { copy, PLANS } from '@/lib/landingCopy'
import { LandingDemo } from './LandingDemo'
import { LandingTrySite } from './LandingTrySite'
import type { PlanId } from '@/lib/landingCopy'

/* ── Metadata (dynamic by language) ── */

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    openGraph: {
      title: copy.ogTitle,
      description: copy.ogDescription,
      url: 'https://www.getvariante.com',
      siteName: 'Variante',
      images: [
        {
          url: 'https://www.getvariante.com/og',
          width: 1200,
          height: 630,
          alt: copy.ogImageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.twitterTitle,
      description: copy.twitterDescription,
      images: ['https://www.getvariante.com/og'],
    },
  }
}

/* ── Page ── */

export default async function HomePage({ searchParams }: { searchParams?: Promise<{ source?: string }> }) {
  const { source } = (await searchParams) ?? {}
  const signupUrl = (base: string) => source ? `${base}${base.includes('?') ? '&' : '?'}source=${encodeURIComponent(source)}` : base
  const plan = (id: PlanId) => PLANS.find((p) => p.id === id)!

  return (
    <div className="min-h-screen bg-bg-0 text-white/80 antialiased">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-bg-0/95 px-4 sm:px-6">
        <nav className="container flex items-center justify-between py-2.5 sm:py-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[1.1rem] font-semibold tracking-tight text-white transition-opacity duration-200 hover:opacity-80"
          >
            <PandaLogo size="md" alt="Variante" />
            variante
          </Link>
          <div className="flex items-center gap-3 sm:gap-5">
            <a
              href="#how-it-works"
              className="text-sm text-white/55 transition-colors duration-200 hover:text-white hidden sm:inline"
            >
              How it works
            </a>
            <a
              href="#pricing"
              className="text-sm text-white/55 transition-colors duration-200 hover:text-white hidden sm:inline"
            >
              Pricing
            </a>
            <span className="hidden sm:block w-px h-4 bg-border mx-1" aria-hidden="true" />
            <Link
              href="/login"
              className="text-sm text-white/55 transition-colors duration-200 hover:text-white"
            >
              {copy.navLogin}
            </Link>
            <Link
              href={signupUrl("/signup")}
              className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90"
            >
              {copy.navSignup}
            </Link>
          </div>
        </nav>
      </header>

      <main id="main">

      {/* ── Hero ── */}
      <section className="px-0 pt-8 pb-6 sm:pt-10 sm:pb-8">
        <div className="container grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-center">
          {/* Left: Text — second on mobile */}
          <div className="order-2 lg:order-1 text-center sm:text-left">
            <span className="inline-block rounded-full border border-border bg-bg-2 px-3 py-1 text-[11px] font-medium text-text-3 mb-5 tracking-wide">
              {copy.heroPill}
            </span>
            <h1 className="hero-headline">
              {copy.heroH1}
            </h1>
            <p className="hero-sub mt-5 text-base sm:text-lg">
              {copy.heroSub}
            </p>
            <div className="mt-8 sm:mt-9 flex flex-wrap items-center gap-3 justify-center sm:justify-start">
              <a
                href="#try-site"
                className="inline-flex rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] sm:px-8 sm:py-3.5"
              >
                {copy.heroCta}
              </a>
              <Link
                href={signupUrl("/signup")}
                className="inline-flex rounded-full border border-border-strong px-5 py-3 text-sm font-medium text-white/65 transition-all duration-200 hover:border-white/40 hover:text-white/85 active:scale-[0.98] sm:px-6 sm:py-3.5"
              >
                {copy.navSignup} <ArrowUpRight className="ml-1.5 h-3.5 w-3.5 opacity-60" />
              </Link>
            </div>
          </div>

          {/* Right: Hero Demo — first on mobile */}
          <div id="demo" className="order-1 lg:order-2 px-0">
            <LandingDemo />
          </div>
        </div>

        {/* Works-with logos — Social-Proof-Ersatz im Hero */}
        <div className="container-wide mt-8 sm:mt-10">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-bg-1/50 px-6 py-5">
            <span className="text-[11px] font-medium text-text-3 tracking-wide uppercase">
              {copy.sectionWorks}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {techLogos.map((logo) => (
                <div
                  key={logo.name}
                  className="flex items-center gap-2.5 group transition-all duration-200"
                >
                  <TechLogoMark logo={logo} className="h-5 w-5 text-white/30 transition-colors duration-200 group-hover:text-white/60" />
                  <span className="text-xs text-white/45 transition-colors duration-200 group-hover:text-white/65">{logo.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works (statische Feature-Showcase) ── */}
      <section id="how-it-works" className="section">
        <div className="container">
          <span className="section-label">How it works</span>
          <h2 className="section-heading mt-1">Three steps to your first test</h2>
          <p className="section-sub">No dev ticket. No setup. Start in 5 minutes.</p>

          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                icon: Code2,
                title: 'Install the snippet',
                body: 'Paste one script tag into your site. It loads async at 5 KB — zero impact on performance.',
              },
              {
                icon: MousePointer2,
                title: 'Pick an element',
                body: 'Click any element on your page — a headline, a button, a pricing card. The picker highlights what you selected.',
              },
              {
                icon: FlaskConical,
                title: 'Create a variant & test',
                body: 'Write the new version — or let the AI draft one. Variante splits traffic and measures conversions.',
              },
            ].map((step, i) => (
              <div key={step.title} className="step-card relative rounded-xl border border-border bg-bg-1 p-5 sm:p-6">
                {/* Connection arrows between steps (hidden on mobile) */}
                {i < 2 && (
                  <div className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-white/15 pointer-events-none">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M18 7l5 5-5 5" />
                    </svg>
                  </div>
                )}
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 mb-4">
                  <step.icon className="h-5 w-5" />
                </span>
                <h3 className="text-sm font-semibold text-white/85">{step.title}</h3>
                <p className="mt-2 text-sm text-white/45 font-normal leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98]"
            >
              Create your first test — free
              <ArrowUpRight className="ml-1 h-3.5 w-3.5 opacity-60" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Try your site (demo → signup flow) ── */}
      <section id="try-site">
        <LandingTrySite />
      </section>


      <div className="section-divider" />

      {/* ── Pricing ── */}
      <section id="pricing" className="section">
        <div className="container">
          <span className="section-label">{copy.sectionPricing}</span>
          <h2 className="section-heading mt-1">{copy.sectionPricing}</h2>
          <p className="section-sub">{copy.pricingSub}</p>
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
            {/* Free */}
            <div className="card-lift flex flex-col rounded-xl border border-border bg-bg-1 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-3">
                {copy.plans.free.label}
              </p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold text-white">{plan('free').price}</span>
              </div>
              <p className="mt-1 text-xs text-text-3">{copy.plans.free.sub}</p>
              <ul className="mt-6 mb-10 space-y-2.5 text-sm">
                {copy.plans.free.features.map((f) => (
                  <li key={f.label} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
                    <span className="text-white/55 font-normal leading-relaxed break-words">{f.label}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={signupUrl(plan('free').href)}
                className="mt-auto inline-flex w-full justify-center rounded-full border border-border-strong px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:border-white/30"
              >
                {copy.plans.free.cta}
              </Link>
            </div>

            {/* Pro */}
            <div className="card-lift relative flex flex-col rounded-xl border border-pro/25 bg-bg-1 p-5 sm:p-6">
              <span className="absolute -top-3 right-6 rounded-full border border-pro bg-black px-3 py-1 text-[11px] font-semibold text-pro">
                {copy.proBadge}
              </span>
              <p className="text-xs font-semibold uppercase tracking-wider text-pro">
                {copy.plans.pro.label}
              </p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold text-white">{plan('pro').price}</span>
                <span className="text-sm text-text-3">{copy.period}</span>
              </div>
              <p className="mt-1 text-xs text-text-3">{copy.plans.pro.sub}</p>
              <ul className="mt-6 mb-10 space-y-2.5 text-sm">
                {copy.plans.pro.features.map((f) => (
                  <li key={f.label} className="flex items-start gap-2.5">
                    {f.exclusive ? (
                      <Zap className="mt-0.5 h-4 w-4 shrink-0 text-pro" />
                    ) : (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
                    )}
                    <span className={f.exclusive ? 'text-white/75 font-normal leading-relaxed break-words' : 'text-white/55 font-normal leading-relaxed break-words'}>
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href={signupUrl(plan('pro').href)}
                className="mt-auto inline-flex w-full justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90"
              >
                {copy.plans.pro.cta}
              </Link>
            </div>

            {/* Agency */}
            <div className="card-lift flex flex-col rounded-xl border border-border bg-bg-1 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-3">
                {copy.plans.agency.label}
              </p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold text-white">{plan('agency').price}</span>
                <span className="text-sm text-text-3">{copy.period}</span>
              </div>
              <p className="mt-1 text-xs text-text-3">{copy.plans.agency.sub}</p>
              <ul className="mt-6 mb-10 space-y-2.5 text-sm">
                {copy.plans.agency.features.map((f) => (
                  <li key={f.label} className="flex items-start gap-2.5">
                    {f.exclusive ? (
                      <Zap className="mt-0.5 h-4 w-4 shrink-0 text-pro" />
                    ) : (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
                    )}
                    <span className={f.exclusive ? 'text-white/75 font-normal leading-relaxed break-words' : 'text-white/55 font-normal leading-relaxed break-words'}>
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>
              <a
                href={plan('agency').href}
                className="mt-auto inline-flex w-full justify-center rounded-full border border-border-strong px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:border-white/30"
              >
                {copy.plans.agency.cta}
              </a>
            </div>
          </div>
          <p className="section-text">{copy.impliedUsersText}</p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section">
        <div className="container-narrow">
          <span className="section-label">{copy.sectionFaq}</span>
          <h2 className="section-heading mt-1">{copy.sectionFaq}</h2>
          <dl className="mt-10 space-y-3">
            {copy.faqs.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border bg-bg-1 transition-colors duration-150 hover:border-border-strong"
              >
                <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-medium text-white/75 select-none">
                  {item.q}
                  <ChevronDown className="ml-4 h-4 w-4 shrink-0 text-white/30 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-4 text-sm text-white/45 font-normal leading-relaxed">{item.a}</p>
              </details>
            ))}
          </dl>
        </div>
      </section>

      <div className="section-divider" />

      {/* ── Closing CTA ── */}
      <section className="section !pb-16 sm:!pb-20">
        <div className="container-narrow text-center">
          <h2 className="section-heading">{copy.closingH}</h2>
          <p className="section-sub">{copy.closingSub}</p>
          <div className="mt-8">
            <Link
              href={signupUrl("/signup")}
              className="inline-flex rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98]"
            >
              {copy.closingCta}
            </Link>
          </div>
          <p className="cta-urgency">No credit card. No setup. 5 minutes to your first test.</p>
        </div>
      </section>

      </main>

      {/* ── Badge Demo ── */}
      <Link
        href={signupUrl("/signup")}
        className="fixed bottom-3 right-3 z-50 badge-desktop-only rounded-md bg-bg-2 px-2.5 py-1 text-[10px] font-semibold text-white no-underline opacity-85 transition-opacity hover:opacity-100 sm:bottom-4 sm:right-4 sm:px-3 sm:py-1.5 sm:text-[11px]"
        style={{ borderRadius: '6px' }}
      >
        {copy.badgeText}
      </Link>

      {/* ── Footer ── */}
      <footer className="border-t border-border px-4 py-5 sm:px-6 sm:py-6">
        <div className="container flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-xs text-text-3">
            {copy.footerLine}
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/docs"
              className="text-xs text-text-3 transition-colors duration-200 hover:text-text-2"
            >
              {copy.footerDocs}
            </Link>
            <a
              href="https://github.com/valentin/ab-tool/blob/main/CHANGELOG.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-text-3 transition-colors duration-200 hover:text-text-2"
            >
              {copy.footerChangelog}
            </a>
            <Link
              href="/terms"
              className="text-xs text-text-3 transition-colors duration-200 hover:text-text-2"
            >
              {copy.footerTerms}
            </Link>
            <Link
              href="/privacy"
              className="text-xs text-text-3 transition-colors duration-200 hover:text-text-2"
            >
              {copy.footerPrivacy}
            </Link>
            <Link
              href="/imprint"
              className="text-xs text-text-3 transition-colors duration-200 hover:text-text-2"
            >
              {copy.footerImprint}
            </Link>
          </div>
        </div>
      </footer>

      {/* JSON-LD SoftwareApplication */}
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
            description: copy.jsonldDescription,
            offers: [
              {
                '@type': 'Offer',
                name: copy.plans.free.label,
                price: '0',
                priceCurrency: 'EUR',
              },
              {
                '@type': 'Offer',
                name: copy.plans.pro.label,
                price: '35',
                priceCurrency: 'EUR',
                description: copy.jsonldProDescription,
              },
            ],
          }),
        }}
      />
      {/* JSON-LD FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: copy.faqs.map((item) => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: item.a,
              },
            })),
          }),
        }}
      />
    </div>
  )
}
