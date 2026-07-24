// Landingpage-Copy — English only (since July 2026).
// ICP: Designers, indie hackers, founders (solopreneurs & small teams).
// A/B testing made simple — AI-powered under the hood, no dev needed.

export type PlanId = 'free' | 'pro' | 'agency'

export interface PlanStructure {
  id: PlanId
  price: string
  perMonth: boolean
  href: string
  featured: boolean
}

export const PLANS: readonly PlanStructure[] = [
  { id: 'free', price: '0 €', perMonth: false, href: '/signup', featured: false },
  { id: 'pro', price: '35 €', perMonth: true, href: '/signup?plan=pro', featured: true },
  { id: 'agency', price: '99 €', perMonth: true, href: '/signup?plan=agency', featured: false },
]

type Tuple7<T> = readonly [T, T, T, T, T, T, T]

export interface PlanFeature {
  label: string
  /** Plan-definierend (Zap-Icon statt Check) — z. B. „nur mit Pro". */
  exclusive: boolean
}

export interface PlanCopy {
  label: string
  sub: string
  cta: string
  features: readonly PlanFeature[]
}

export interface LandingCopy {
  // Header
  navLogin: string
  navSignup: string

  // Hero
  heroPill: string
  heroH1: string
  heroSub: string
  heroCta: string

  // Works-with logos
  sectionWorks: string

  // How it works
  impliedUsersText: string

  // Pricing
  sectionPricing: string
  pricingSub: string
  /** „/mo" — nur für Pläne mit `perMonth: true`. */
  period: string
  proBadge: string
  plans: Record<PlanId, PlanCopy>

  // FAQ
  sectionFaq: string
  faqs: Tuple7<{ q: string; a: string }>

  // Closing CTA
  closingH: string
  closingSub: string
  closingCta: string

  // Footer
  footerLine: string
  footerDocs: string
  footerChangelog: string
  footerTerms: string
  footerPrivacy: string
  footerImprint: string

  // Badge
  badgeText: string

  // JSON-LD
  jsonldDescription: string
  jsonldProDescription: string

  // SEO metadata
  metaTitle: string
  metaDescription: string
  ogTitle: string
  ogDescription: string
  twitterTitle: string
  twitterDescription: string
  ogImageAlt: string
}

const copy: LandingCopy = {
  navLogin: 'Log in',
  navSignup: 'Start free',

  heroPill: 'No dev. No pipeline. Just results.',
  heroH1: 'Your site can convert better. Today.',
  heroSub:
    'Pick any element on your site. Variante generates a better version. You approve. Traffic splits. The winner ships. No developer needed.',
  heroCta: 'Show me a better version →',

  sectionWorks: 'Works with your stack',

  impliedUsersText:
    'Join designers, indie hackers, and founders who ship AND test — without a dev team.',

  sectionPricing: 'Pricing',
  pricingSub: 'Start free. Upgrade once your first test has paid for itself.',
  period: '/mo',
  proBadge: 'Most popular',
  plans: {
    free: {
      label: 'Free',
      sub: 'Forever free. No credit card.',
      cta: 'Start free',
      features: [
        { label: '1 active experiment', exclusive: false },
        { label: 'AI-powered page analysis', exclusive: false },
        { label: 'Automated variant generation', exclusive: false },
        { label: 'Test full sections — hero, pricing, CTAs', exclusive: false },
        { label: 'Conversion tracking, built in', exclusive: false },
        { label: '“Powered by Variante” badge on your site', exclusive: false },
      ],
    },
    pro: {
      label: 'Pro',
      sub: 'Everything in Free, plus:',
      cta: 'Start Pro',
      features: [
        { label: 'Unlimited experiments', exclusive: true },
        { label: 'Statistical significance — know when to stop', exclusive: true },
        { label: 'Auto-winner — the best variant ships itself', exclusive: true },
        { label: 'Dynamic content — tailored copy per traffic source', exclusive: true },
        { label: 'Price testing — experiment with plans and price points', exclusive: true },
        { label: 'No badge on your site', exclusive: true },
        { label: 'Priority support', exclusive: false },
      ],
    },
    agency: {
      label: 'Agency',
      sub: 'Everything in Pro, plus white-label, client reports & team access. We\'ll set you up personally.',
      cta: 'Contact sales',
      features: [
        { label: 'Up to 100 domains — manage every client site', exclusive: true },
        { label: 'White-label — no Variante mention anywhere', exclusive: true },
        { label: 'Client reports — branded PDFs', exclusive: true },
        { label: 'Team access — share tests across your agency', exclusive: true },
        { label: 'Dedicated support — direct line, not tickets', exclusive: true },
        { label: 'Priority feature requests', exclusive: false },
        { label: 'Early access to new features', exclusive: false },
      ],
    },
  },

  sectionFaq: 'Frequently asked questions',
  faqs: [
    {
      q: 'Does the snippet slow down my site?',
      a: 'No. Under 5 KB, loads async, never blocks rendering. Your Core Web Vitals stay untouched.',
    },
    {
      q: 'Do I need to tell Variante exactly what to do?',
      a: 'Just roughly. "Optimize my pricing page" is enough. Variante analyzes independently, writes variants, you review — done. No prompt engineering needed.',
    },
    {
      q: 'Does this work with my stack?',
      a: 'WordPress, Webflow, Shopify, Framer, Squarespace, React, Next.js, custom HTML — if you can paste a <script> tag, it works.',
    },
    {
      q: 'How is this different from Optimizely or VWO?',
      a: 'You needed a developer and a €1,000+/mo budget for those. Variante: pick an element, review the variant, ship. €0 to start. No enterprise sales call.',
    },
    {
      q: 'I’m a solo founder — is this worth it?',
      a: 'It’s built for you. While you sleep, Variante tests whether “Get Started” or “Try Free” converts better. One test can double your signups. You do the math.',
    },
    {
      q: 'What happens to my data? Is this GDPR-compliant?',
      a: 'Your site data never leaves EU servers. We don’t store your visitors’ personal data — conversion events are anonymous by design. No third-party trackers, no data resale. Full GDPR compliance. Data processing agreement available on request.',
    },
    {
      q: 'Can I cancel anytime? What happens to my tests?',
      a: 'Cancel with one click — no dark patterns, no retention calls. Your snippet keeps working, tests just stop varying. All your data, variants, and reports remain exportable for 30 days. Annual plans: pro-rata refund within 14 days.',
    },
  ],

  closingH: 'One snippet. Tomorrow your site converts better.',
  closingSub: '5 KB. 5 minutes. No credit card.',
  closingCta: 'Start free',

  footerLine: '© 2026 Variante · Made in Bavaria',
  footerDocs: 'Docs',
  footerChangelog: 'Changelog',
  footerTerms: 'Terms',
  footerPrivacy: 'Privacy',
  footerImprint: 'Imprint',

  badgeText: 'A/B by Variante',

  jsonldDescription:
    'A/B testing for designers, indie hackers & founders. No developer, no pipeline.',
  jsonldProDescription: 'Unlimited experiments, significance analysis, auto-winner detection',

  metaTitle: 'A/B Testing for Designers, Indie Hackers & Founders | Variante',
  metaDescription:
    'A/B testing made simple. Analyze your page, generate variants, track conversions — no developer needed. Works with WordPress, Next.js, Shopify.',
  ogTitle: 'A/B Testing for Designers, Indie Hackers & Founders | Variante',
  ogDescription:
    'A/B testing made simple. Generate variants, run tests, ship winners — no dev needed.',
  twitterTitle: 'A/B Testing for Designers, Indie Hackers & Founders | Variante',
  twitterDescription: 'A/B testing made simple. No developer needed.',
  ogImageAlt: 'Variante — A/B Testing for your site',
}

export { copy }
