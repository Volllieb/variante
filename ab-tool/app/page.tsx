import type { Metadata } from 'next'
import Link from 'next/link'
import { PandaLogo } from '@/components/PandaLogo'
import { Check, Zap } from '@/components/LandingIcons'
import { techLogos, TechLogoMark } from '@/components/TechLogos'
import { HybridDemo } from '@/app/components/HybridDemo'
import { detectLang } from '@/lib/detectLang'
import { getCopy, PLANS } from '@/lib/landingCopy'
import type { PlanId } from '@/lib/landingCopy'

/* ── Metadata (dynamic by language) ── */

export async function generateMetadata(): Promise<Metadata> {
  const lang = await detectLang()
  const cp = getCopy(lang)
  return {
    title: cp.metaTitle,
    description: cp.metaDescription,
    openGraph: {
      title: cp.ogTitle,
      description: cp.ogDescription,
      url: 'https://www.getvariante.com',
      siteName: 'Variante',
      images: [
        {
          url: 'https://www.getvariante.com/og',
          width: 1200,
          height: 630,
          alt: cp.ogImageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: cp.twitterTitle,
      description: cp.twitterDescription,
      images: ['https://www.getvariante.com/og'],
    },
  }
}

/* ── Page ── */

export default async function HomePage({ searchParams }: { searchParams?: Promise<{ source?: string }> }) {
  const { source } = (await searchParams) ?? {}
  const lang = await detectLang()
  const cp = getCopy(lang)
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
              {cp.navLogin}
            </Link>
            <Link
              href={signupUrl("/signup")}
              className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90"
            >
              {cp.navSignup}
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
              {cp.heroPill}
            </span>
            <h1 className="hero-headline">
              {cp.heroH1}
            </h1>
            <p className="hero-sub mt-5 text-base sm:text-lg">
              {cp.heroSub}
            </p>
            <div className="mt-8 sm:mt-9">
              <a
                href="#demo-hybrid"
                className="inline-flex rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] sm:px-8 sm:py-3.5"
              >
                {cp.heroCta}
              </a>
            </div>
          </div>

          {/* Right: Hero Animation — first on mobile */}
          <div id="demo" className="order-1 lg:order-2 px-0">
            <div className="relative w-full overflow-hidden rounded-xl border border-border" style={{ aspectRatio: '820/480' }} aria-hidden="true">
              <iframe
                src="/ab-test-hero-animation.html"
                className="absolute inset-0 w-full h-full border-0"
                title="A/B Test Demo"
              />
            </div>
          </div>
        </div>

        {/* Trust Bar */}
        <div className="container-wide mt-8 sm:mt-10">
          <div className="stat-bar rounded-xl border border-border bg-bg-1/50 px-6 py-5">
            {[
              { label: cp.trustItems[0].label, text: cp.trustItems[0].text },
              { label: cp.trustItems[1].label, text: cp.trustItems[1].text },
              { label: cp.trustItems[2].label, text: cp.trustItems[2].text },
              { label: cp.trustItems[3].label, text: cp.trustItems[3].text },
            ].map((item) => (
              <div key={item.label} className="stat-item">
                <span className="stat-label">{item.label}</span>
                <span className="stat-text">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hybrid-Demo: URL rein → echte Variante der eigenen Seite ── */}
      <HybridDemo cp={cp} source={source} />

      {/* ── Works-With Logo Bar ── */}
      <section className="!py-10 sm:!py-12">
        <div className="container-wide text-center">
          <span className="section-label">{cp.sectionWorks}</span>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
            {techLogos.map((logo) => (
              <div key={logo.name} className="flex flex-col items-center gap-2">
                <TechLogoMark logo={logo} className="h-8 w-8 text-white/25" />
                <span className="text-[11px] text-text-3">{logo.name}</span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-text-3">
            {cp.worksLabel}
          </p>
        </div>
      </section>

      <div className="section-divider" />

      {/* ── AI Agent Automation ── */}
      <section className="section">
        <div className="container">
          <span className="section-label">{cp.sectionAgent}</span>
          <h2 className="section-heading mt-1">{cp.agentH}</h2>
          <p className="section-sub">{cp.agentSub}</p>

          <div className="mx-auto mt-8 max-w-full">
            <div className="relative w-full overflow-hidden rounded-xl border border-border" style={{ aspectRatio: '960/540' }} aria-hidden="true">
              <iframe
                src="/ai-workflow-animation.html"
                className="absolute inset-0 w-full h-full border-0"
                title="AI Workflow Demo"
              />
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-text-3 italic">{cp.agentLoopNote}</p>
        </div>
      </section>

      <div className="section-divider" />

      {/* ── Pricing ── */}
      <section className="section">
        <div className="container">
          <span className="section-label">{cp.sectionPricing}</span>
          <h2 className="section-heading mt-1">{cp.sectionPricing}</h2>
          <p className="section-sub">{cp.pricingSub}</p>
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
            {/* Free */}
            <div className="card-lift flex flex-col rounded-xl border border-border bg-bg-1 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-3">
                {cp.plans.free.label}
              </p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold text-white">{plan('free').price}</span>
              </div>
              <p className="mt-1 text-xs text-text-3">{cp.plans.free.sub}</p>
              <ul className="mt-6 mb-10 space-y-2.5 text-sm">
                {cp.plans.free.features.map((f) => (
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
                {cp.plans.free.cta}
              </Link>
            </div>

            {/* Pro */}
            <div className="card-lift relative flex flex-col rounded-xl border border-pro/25 bg-bg-1 p-5 sm:p-6">
              <span className="absolute -top-3 right-6 rounded-full border border-pro bg-black px-3 py-1 text-[11px] font-semibold text-pro">
                {cp.proBadge}
              </span>
              <p className="text-xs font-semibold uppercase tracking-wider text-pro">
                {cp.plans.pro.label}
              </p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold text-white">{plan('pro').price}</span>
                <span className="text-sm text-text-3">{cp.period}</span>
              </div>
              <p className="mt-1 text-xs text-text-3">{cp.plans.pro.sub}</p>
              <ul className="mt-6 mb-10 space-y-2.5 text-sm">
                {cp.plans.pro.features.map((f) => (
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
                {cp.plans.pro.cta}
              </Link>
            </div>

            {/* Agency */}
            <div className="card-lift flex flex-col rounded-xl border border-border bg-bg-1 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-3">
                {cp.plans.agency.label}
              </p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold text-white">{plan('agency').price}</span>
                <span className="text-sm text-text-3">{cp.period}</span>
              </div>
              <p className="mt-1 text-xs text-text-3">{cp.plans.agency.sub}</p>
              <ul className="mt-6 mb-10 space-y-2.5 text-sm">
                {cp.plans.agency.features.map((f) => (
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
                {cp.plans.agency.cta}
              </Link>
            </div>
          </div>
          <p className="section-text">{cp.impliedUsersText}</p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section">
        <div className="container-narrow">
          <span className="section-label">{cp.sectionFaq}</span>
          <h2 className="section-heading mt-1">{cp.sectionFaq}</h2>
          <dl className="mt-10 space-y-3">
            {cp.faqs.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border bg-bg-1 transition-colors duration-150 hover:border-border-strong"
              >
                <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-medium text-white/75 select-none">
                  {item.q}
                  <span className="ml-4 shrink-0 text-white/30 transition-transform duration-200 group-open:rotate-180">
                    ▾
                  </span>
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
          <h2 className="section-heading">{cp.closingH}</h2>
          <p className="section-sub">{cp.closingSub}</p>
          <div className="mt-8">
            <Link
              href={signupUrl("/signup")}
              className="inline-flex rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98]"
            >
              {cp.closingCta}
            </Link>
          </div>
        </div>
      </section>

      </main>

      {/* ── Badge Demo ── */}
      <Link
        href={signupUrl("/signup")}
        className="fixed bottom-3 right-3 z-50 badge-desktop-only rounded-md bg-bg-2 px-2.5 py-1 text-[10px] font-semibold text-white no-underline opacity-85 transition-opacity hover:opacity-100 sm:bottom-4 sm:right-4 sm:px-3 sm:py-1.5 sm:text-[11px]"
        style={{ borderRadius: '6px' }}
      >
        {cp.badgeText}
      </Link>

      {/* ── Footer ── */}
      <footer className="border-t border-border px-4 py-5 sm:px-6 sm:py-6">
        <div className="container flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-xs text-text-3">
            {cp.footerLine}
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/docs"
              className="text-xs text-text-3 transition-colors duration-200 hover:text-text-2"
            >
              {cp.footerDocs}
            </Link>
            <Link
              href="/privacy"
              className="text-xs text-text-3 transition-colors duration-200 hover:text-text-2"
            >
              {cp.footerPrivacy}
            </Link>
            <Link
              href="/imprint"
              className="text-xs text-text-3 transition-colors duration-200 hover:text-text-2"
            >
              {cp.footerImprint}
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
            description: cp.jsonldDescription,
            offers: [
              {
                '@type': 'Offer',
                name: cp.plans.free.label,
                price: '0',
                priceCurrency: 'EUR',
              },
              {
                '@type': 'Offer',
                name: cp.plans.pro.label,
                price: '35',
                priceCurrency: 'EUR',
                description: cp.jsonldProDescription,
              },
            ],
          }),
        }}
      />
    </div>
  )
}
