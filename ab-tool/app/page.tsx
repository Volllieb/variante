import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { cookies } from 'next/headers'
import { PandaLogo } from '@/components/PandaLogo'
import { Check, MousePointer2, Sparkles, Rocket, Zap, Shield, Gauge, Globe, Palette, Figma } from '@/components/LandingIcons'
import { techLogos } from '@/components/TechLogos'
import LangToggle from './components/LangToggle'
import { getLang, getCopy } from '@/lib/landingCopy'
import type { Lang } from '@/lib/landingCopy'

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

export default async function HomePage() {
  const lang = await detectLang()
  const cp = getCopy(lang)

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
            <Link
              href="/playground"
              className="hidden rounded-full border border-border bg-bg-2 px-3.5 py-1.5 text-sm font-medium text-text-2 transition-all duration-200 hover:border-border-strong hover:bg-bg-1 hover:text-text sm:mr-2 sm:block"
            >
              {cp.navPlayground}
            </Link>
            <LangToggle current={lang} />
            <Link
              href="/login"
              className="hidden text-sm text-white/55 transition-colors duration-200 hover:text-white sm:block"
            >
              {cp.navLogin}
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90"
            >
              {cp.navSignup}
            </Link>
          </div>
        </nav>
      </header>

      <main>

      {/* ── Hero ── */}
      <section className="px-4 py-16 text-center sm:px-6 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
            {cp.heroH1}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/55 sm:text-lg">
            {cp.heroSub}
          </p>
          <div className="mt-8 sm:mt-9">
            <Link
              href="/signup"
              className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90 sm:px-8 sm:py-3.5"
            >
              {cp.heroCta}
            </Link>
          </div>
          <p className="mt-4 text-xs text-text-3">
            {cp.heroFootnote}
          </p>
        </div>
      </section>

      {/* ── Micro-Trust Bar ── */}
      <section className="px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Shield, ...cp.trustItems[0] },
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
            {techLogos.map(({ name, Logo }) => (
              <div key={name} className="flex flex-col items-center gap-2">
                <Logo className="h-7 w-7 text-white/25" />
                <span className="text-[10px] text-text-3">{name}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-text-3">
            {cp.worksLabel}
          </p>
        </div>
      </section>

      {/* ── Social Proof: Figma Community + Solo Dev ── */}
      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Figma Community */}
            <div className="rounded-[10px] border border-border bg-bg-1 p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <Figma className="h-5 w-5 text-white/70" />
                <h3 className="text-sm font-semibold text-white">{cp.figmaCommunityTitle}</h3>
              </div>
              <p className="text-sm text-white/50 leading-relaxed">
                {cp.figmaCommunityText}
              </p>
              <a
                href="https://www.figma.com/community/plugin/1653734891132085565"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-white/60 transition-colors hover:text-white/80"
              >
                {cp.figmaCommunityLinkText}
              </a>
            </div>

            {/* Solo Dev Transparency */}
            <div className="rounded-[10px] border border-border bg-bg-1 p-5 sm:p-6">
              <h3 className="text-sm font-semibold text-white">{cp.soloDevTitle}</h3>
              <p className="mt-2 text-sm text-white/50 leading-relaxed">
                {cp.soloDevBody}
              </p>
              <p className="mt-4 text-xs text-text-3 italic">
                {cp.impliedUsersText}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-xl font-semibold text-white">{cp.sectionHow}</h2>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { icon: MousePointer2, step: '01', title: cp.step1Title, body: cp.step1Body },
              { icon: Sparkles, step: '02', title: cp.step2Title, body: cp.step2Body },
              { icon: Rocket, step: '03', title: cp.step3Title, body: cp.step3Body },
            ].map((s) => (
              <div
                key={s.step}
                className="rounded-[10px] border border-border bg-bg-1 p-6"
              >
                <s.icon className="mb-4 h-8 w-8 text-white" />
                <p className="mb-2 text-xs font-medium text-white/50">{s.step}</p>
                <h3 className="mb-2 text-sm font-semibold text-white">{s.title}</h3>
                <p className="text-sm text-white/50">{s.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-white/50">
            {cp.platformNote}{' '}
            {cp.platformItems.split(', ').map((item, i) => (
              <span key={item}>
                <span className="text-white/55">{item}</span>
                {i < cp.platformItems.split(', ').length - 1 ? ', ' : ''}
              </span>
            ))}{' '}
            — {lang === 'de' ? 'überall wo du ein Script-Tag einfügen kannst.' : 'anywhere you can paste a script tag.'}
          </p>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-xl font-semibold text-white">{cp.sectionPricing}</h2>
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
            {/* Free */}
            <div className="flex flex-col rounded-[10px] border border-border bg-bg-1 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-3">
                {cp.freeLabel}
              </p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold text-white">{cp.freePrice}</span>
              </div>
              <p className="mt-1 text-xs text-text-3">{cp.freeSub}</p>
              <ul className="mt-6 mb-10 space-y-2.5 text-sm">
                {cp.freeFeatures.map((label) => (
                  <li key={label} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 shrink-0 text-ok" />
                    <span className="text-white/60">{label}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-auto inline-flex w-full justify-center rounded-full border border-border-strong px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:border-white/30"
              >
                {cp.freeCta}
              </Link>
            </div>

            {/* Pro */}
            <div className="relative flex flex-col rounded-[10px] border border-pro/30 bg-bg-1 p-5 sm:p-6">
              <span className="absolute -top-3 right-6 rounded-full border border-pro bg-black px-3 py-1 text-[11px] font-semibold text-pro">
                {cp.proBadge}
              </span>
              <p className="text-xs font-semibold uppercase tracking-wider text-pro">
                {cp.proLabel}
              </p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold text-white">{cp.proPrice}</span>
                <span className="text-sm text-text-3">/mo</span>
              </div>
              <p className="mt-1 text-xs text-text-3">{cp.proSub}</p>
              <ul className="mt-6 mb-10 space-y-2.5 text-sm">
                {cp.proFeatures.map((label, i) => (
                  <li key={label} className="flex items-center gap-2.5">
                    {cp.proFeatureExclusive[i] ? (
                      <Zap className="h-4 w-4 shrink-0 text-pro" />
                    ) : (
                      <Check className="h-4 w-4 shrink-0 text-ok" />
                    )}
                    <span className={cp.proFeatureExclusive[i] ? 'text-white/80' : 'text-white/60'}>
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup?plan=pro"
                className="mt-auto inline-flex w-full justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-white/90"
              >
                {cp.proCta}
              </Link>
            </div>

            {/* Agency */}
            <div className="flex flex-col rounded-[10px] border border-border bg-bg-1 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-3">
                {cp.agencyLabel}
              </p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold text-white">{cp.agencyPrice}</span>
                <span className="text-sm text-text-3">/mo</span>
              </div>
              <p className="mt-1 text-xs text-text-3">{cp.agencySub}</p>
              <ul className="mt-6 mb-10 space-y-2.5 text-sm">
                {cp.agencyFeatures.map((label, i) => (
                  <li key={label} className="flex items-center gap-2.5">
                    {cp.agencyFeatureExclusive[i] ? (
                      <Zap className="h-4 w-4 shrink-0 text-pro" />
                    ) : (
                      <Check className="h-4 w-4 shrink-0 text-ok" />
                    )}
                    <span className={cp.agencyFeatureExclusive[i] ? 'text-white/80' : 'text-white/60'}>
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup?plan=agency"
                className="mt-auto inline-flex w-full justify-center rounded-full border border-border-strong px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:border-white/30"
              >
                {cp.agencyCta}
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

      </main>

      {/* ── Badge Demo ── */}
      <Link
        href="/signup"
        className="fixed bottom-3 right-3 z-50 rounded-md bg-bg-2 px-2.5 py-1 text-[10px] font-semibold text-white no-underline opacity-85 transition-opacity hover:opacity-100 sm:bottom-4 sm:right-4 sm:px-3 sm:py-1.5 sm:text-[11px]"
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
                name: cp.freeLabel,
                price: '0',
                priceCurrency: 'EUR',
              },
              {
                '@type': 'Offer',
                name: cp.proLabel,
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
