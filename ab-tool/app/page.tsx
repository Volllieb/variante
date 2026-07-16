import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { cookies } from 'next/headers'
import { PandaLogo } from '@/components/PandaLogo'
import { Check, Rocket, Zap, Gauge, Globe, Palette } from '@/components/LandingIcons'
import { techLogos, techLogoNames, TechLogoMark } from '@/components/TechLogos'
import LangToggle from './components/LangToggle'
import AIWorkflowAnimation from './components/AIWorkflowAnimation'
import { getLang, getCopy, PLANS } from '@/lib/landingCopy'
import type { Lang, PlanId } from '@/lib/landingCopy'

/* ── Language detection (server-side) ── */

async function detectLang(): Promise<Lang> {
  const headersList = await headers()
  const cookieStore = await cookies()
  const acceptLang = headersList.get('accept-language')
  const cookieLang = cookieStore.get('lang')?.value ?? null
  return getLang(acceptLang, cookieLang)
}

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
      <header className="sticky top-0 z-50 border-b border-border bg-bg-0/95">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[1.1rem] font-semibold tracking-tight text-white transition-opacity duration-200 hover:opacity-80"
          >
            <PandaLogo className="h-7 w-7 rounded-lg p-1" />
            variante
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <LangToggle current={lang} />
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
      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center">
          {/* Left: Text */}
          <div>
            <span className="inline-block rounded-full border border-border-strong bg-bg-2 px-3.5 py-1 text-[11px] font-medium text-pro mb-4">
              {cp.heroPill}
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl text-left">
              {cp.heroH1.split('. ')[0]}.<br />{cp.heroH1.split('. ').slice(1).join('. ')}
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/55 sm:text-lg text-left">
              {cp.heroSub}
            </p>
            <div className="mt-8 sm:mt-9">
              <Link
                href={signupUrl("/signup")}
                className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90 sm:px-8 sm:py-3.5"
              >
                {cp.heroCta}
              </Link>
            </div>
          </div>

          {/* Right: Hero Animation */}
          <div id="demo" className="w-full">
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: '900/560' }} aria-hidden="true">
              <iframe
                src="/ab-test-hero-animation.html"
                className="absolute inset-0 w-full h-full border-0"
                title="A/B Test Demo"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Micro-Trust Bar ── */}
      <section className="px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Rocket, ...cp.trustItems[0] },
              { icon: Gauge, ...cp.trustItems[1] },
              { icon: Globe, ...cp.trustItems[2] },
              { icon: Palette, ...cp.trustItems[3] },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-bg-1 px-3 py-4 text-center"
              >
                <item.icon className="mb-0.5 h-5 w-5 text-white/50" />
                <span className="text-xs font-semibold text-white/70">{item.label}</span>
                <span className="text-[11px] text-text-3 leading-snug">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Works-With Logo Bar ── */}
      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-3">
            {cp.sectionWorks}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
            {techLogos.map((logo) => (
              <div key={logo.name} className="flex flex-col items-center gap-2">
                <TechLogoMark logo={logo} className="h-7 w-7 text-white/25" />
                <span className="text-[10px] text-text-3">{logo.name}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-text-3">
            {cp.worksLabel}
          </p>
        </div>
      </section>

      {/* ── AI Agent Automation ── */}
      <section className="px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-text-3">
            {cp.sectionAgent}
          </p>
          <h2 className="mt-2 text-center text-xl font-semibold text-white sm:text-2xl">
            {cp.agentH}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-white/55">
            {cp.agentSub}
          </p>

          <div className="mx-auto mt-8 max-w-5xl">
            <AIWorkflowAnimation />
          </div>
          <p className="mt-6 text-center text-xs text-text-3 italic">{cp.agentLoopNote}</p>
        </div>
      </section>

      {/* ── Solo Dev Transparency ── */}
      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-2xl rounded-[10px] border border-border bg-bg-1 p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-white">{cp.soloDevTitle}</h3>
          <p className="mt-2 text-sm text-white/50 leading-relaxed">
            {cp.soloDevBody}
          </p>
          <p className="mt-4 text-xs text-text-3 italic">
            {cp.impliedUsersText}
          </p>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-xl font-semibold text-white">{cp.sectionPricing}</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-white/50">{cp.pricingSub}</p>
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
            {/* Free */}
            <div className="flex flex-col rounded-[10px] border border-border bg-bg-1 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-3">
                {cp.plans.free.label}
              </p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold text-white">{plan('free').price}</span>
              </div>
              <p className="mt-1 text-xs text-text-3">{cp.plans.free.sub}</p>
              <ul className="mt-6 mb-10 space-y-2.5 text-sm">
                {cp.plans.free.features.map((f) => (
                  <li key={f.label} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 shrink-0 text-ok" />
                    <span className="text-white/60">{f.label}</span>
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
            <div className="relative flex flex-col rounded-[10px] border border-pro/30 bg-bg-1 p-5 sm:p-6">
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
                  <li key={f.label} className="flex items-center gap-2.5">
                    {f.exclusive ? (
                      <Zap className="h-4 w-4 shrink-0 text-pro" />
                    ) : (
                      <Check className="h-4 w-4 shrink-0 text-ok" />
                    )}
                    <span className={f.exclusive ? 'text-white/80' : 'text-white/60'}>
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
            <div className="flex flex-col rounded-[10px] border border-border bg-bg-1 p-5 sm:p-6">
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
                  <li key={f.label} className="flex items-center gap-2.5">
                    {f.exclusive ? (
                      <Zap className="h-4 w-4 shrink-0 text-pro" />
                    ) : (
                      <Check className="h-4 w-4 shrink-0 text-ok" />
                    )}
                    <span className={f.exclusive ? 'text-white/80' : 'text-white/60'}>
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
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-xl font-semibold text-white">{cp.sectionFaq}</h2>
          <dl className="mt-10 space-y-3">
            {cp.faqs.map((item) => (
              <details
                key={item.q}
                className="group rounded-[10px] border border-border bg-bg-1 transition-colors duration-150 hover:border-border-strong"
              >
                <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-medium text-white/80 select-none">
                  {item.q}
                  <span className="ml-4 shrink-0 text-white/40 transition-transform duration-200 group-open:rotate-180">
                    ▾
                  </span>
                </summary>
                <p className="px-5 pb-4 text-sm text-white/50">{item.a}</p>
              </details>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">{cp.closingH}</h2>
          <p className="mt-4 text-base text-white/55 sm:text-lg">{cp.closingSub}</p>
          <div className="mt-8">
            <Link
              href={signupUrl("/signup")}
              className="inline-flex rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90"
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
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 sm:flex-row sm:justify-between">
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
