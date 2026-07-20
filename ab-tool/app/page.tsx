import type { Metadata } from 'next'
import Link from 'next/link'
import { PandaLogo } from '@/components/PandaLogo'
import { Check, Zap, Rocket, Gauge, Shield, Sparkles, ChevronDown, ArrowUpRight } from '@/components/LandingIcons'
import { techLogos, techLogoNames, TechLogoMark } from '@/components/TechLogos'
import { copy, PLANS } from '@/lib/landingCopy'
import type { PlanId } from '@/lib/landingCopy'
import { HybridDemo } from '@/app/components/HybridDemo'

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
            <PandaLogo size="md" />
            variante
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden text-sm text-white/55 transition-colors duration-200 hover:text-white sm:block"
            >
              {copy.navLogin}
            </Link>
            <Link
              href={signupUrl("/onboarding")}
              className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90"
            >
              {copy.navSignup}
            </Link>
          </div>
        </nav>
      </header>

      <main>

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
                href="#demo-hybrid"
                className="inline-flex rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] sm:px-8 sm:py-3.5"
              >
                {copy.heroCta}
              </a>
              <Link
                href={signupUrl("/onboarding")}
                className="inline-flex rounded-full border border-border-strong px-5 py-3 text-sm font-medium text-white/65 transition-all duration-200 hover:border-white/40 hover:text-white/85 active:scale-[0.98] sm:px-6 sm:py-3.5"
              >
                {copy.navSignup} <ArrowUpRight className="ml-1.5 h-3.5 w-3.5 opacity-60" />
              </Link>
            </div>
          </div>

          {/* Right: Hero Animation — first on mobile */}
          <div id="demo" className="order-1 lg:order-2 px-0">
            <div className="relative w-full overflow-hidden rounded-xl border border-border" style={{ aspectRatio: '820/480' }} aria-hidden="true">
              <iframe
                src="/ab-test-hero-animation.html"
                className="absolute inset-0 w-full h-full border-0"
                title="A/B Test Demo"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        {/* Trust Bar */}
        <div className="container-wide mt-8 sm:mt-10">
          <div className="stat-bar rounded-xl border border-border bg-bg-1/50 px-6 py-5">
            {[
              { icon: Rocket, label: copy.trustItems[0].label, text: copy.trustItems[0].text },
              { icon: Gauge, label: copy.trustItems[1].label, text: copy.trustItems[1].text },
              { icon: Shield, label: copy.trustItems[2].label, text: copy.trustItems[2].text },
              { icon: Sparkles, label: copy.trustItems[3].label, text: copy.trustItems[3].text },
            ].map((item) => (
              <div key={item.label} className="stat-item">
                <item.icon className="mb-0.5 h-4 w-4 text-white/25" />
                <span className="stat-label">{item.label}</span>
                <span className="stat-text">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo: HybridDemo-Component direkt auf der Landingpage ── */}
      <HybridDemo cp={copy} source={source} />

      {/* ── Works-With Logo Bar ── */}
      <section className="!py-10 sm:!py-12">
        <div className="container-wide text-center">
          <span className="section-label">{copy.sectionWorks}</span>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
            {techLogos.map((logo) => (
              <div key={logo.name} className="flex flex-col items-center gap-2">
                <TechLogoMark logo={logo} className="h-8 w-8 text-white/25" />
                <span className="text-[11px] text-text-3">{logo.name}</span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-text-3">
            {copy.platformNote.replace('{platforms}', techLogoNames.join(', '))}
          </p>
        </div>
      </section>

      <div className="section-divider" />

      {/* ── How it works ── */}
      <section className="section">
        <div className="container">
          <span className="section-label">{copy.sectionHow}</span>
          <h2 className="section-heading mt-1">{copy.sectionHow}</h2>
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
            {copy.steps.map((s, i) => (
              <div key={s.title} className="step-card rounded-xl border border-border bg-bg-1 p-5 sm:p-6">
                <span className="step-number">{i + 1}</span>
                <h3 className="mt-4 text-sm font-semibold text-white/85">{s.title}</h3>
                <p className="mt-2 text-sm text-white/45 font-normal leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ── AI Agent Automation ── */}
      <section className="section">
        <div className="container">
          <span className="section-label">{copy.sectionAgent}</span>
          <h2 className="section-heading mt-1">{copy.agentH}</h2>
          <p className="section-sub">{copy.agentSub}</p>

          <div className="mx-auto mt-8 max-w-full">
            <div className="relative w-full overflow-hidden rounded-xl border border-border" style={{ aspectRatio: '960/540' }} aria-hidden="true">
              <iframe
                src="/ai-workflow-animation.html"
                className="absolute inset-0 w-full h-full border-0"
                title="AI Workflow Demo"
              />
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-text-3 italic">{copy.agentLoopNote}</p>

          {/* Agent Loop Cards */}
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {copy.agentLoop.map((item, i) => (
              <div key={item.title} className="agent-loop-card rounded-xl border border-border bg-bg-1 p-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-bg-2 text-[11px] font-semibold text-text-3">
                  {i + 1}
                </span>
                <h4 className="mt-3 text-sm font-semibold text-white/80">{item.title}</h4>
                <p className="mt-1.5 text-xs text-white/45 font-normal leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ── Figma Community ── */}
      <section className="section">
        <div className="container-narrow text-center">
          <span className="section-label">Figma</span>
          <h2 className="section-heading mt-1">{copy.figmaCommunityTitle}</h2>
          <p className="section-sub">{copy.figmaCommunityText}</p>
          <div className="mt-8">
            <a
              href="https://www.figma.com/community/plugin/1653734891132085565"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full border border-border-strong px-5 py-2.5 text-sm font-medium text-white/65 transition-all duration-200 hover:border-white/40 hover:text-white/85"
            >
              {copy.figmaCommunityLinkText}
              <ArrowUpRight className="ml-1.5 h-3.5 w-3.5 opacity-60" />
            </a>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ── Pricing ── */}
      <section className="section">
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
              <Link
                href={signupUrl(plan('agency').href)}
                className="mt-auto inline-flex w-full justify-center rounded-full border border-border-strong px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:border-white/30"
              >
                {copy.plans.agency.cta}
              </Link>
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
              href={signupUrl("/onboarding")}
              className="inline-flex rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98]"
            >
              {copy.closingCta}
            </Link>
          </div>
          <p className="cta-urgency">{copy.heroFootnote || copy.pricingSub}</p>
        </div>
      </section>

      </main>

      {/* ── Badge Demo ── */}
      <Link
        href={signupUrl("/onboarding")}
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
    </div>
  )
}
