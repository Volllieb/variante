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
    'Pick a headline or button on your site. AI suggests better copy, you approve, traffic splits, and the winner ships. No developer needed.',
  heroCta: 'Show me a better version →',

  sectionWorks: 'Works with your stack',

  impliedUsersText:
    'Built for founders, designers and small teams who want to test without a dev team.',

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
        { label: '1 active test', exclusive: false },
        { label: 'AI-powered page analysis', exclusive: false },
        { label: 'AI copy suggestions for headlines & buttons', exclusive: false },
        { label: 'Visual editor for text, colors and spacing', exclusive: false },
        { label: 'Click tracking on your goal, built in', exclusive: false },
        { label: '“Powered by Variante” badge on your site', exclusive: false },
      ],
    },
    pro: {
      label: 'Pro',
      sub: 'Everything in Free, plus:',
      cta: 'Start Pro',
      features: [
        { label: 'Unlimited tests', exclusive: true },
        { label: 'Statistical significance — know when to stop', exclusive: true },
        { label: 'Auto-winner — the best variant ships itself', exclusive: true },
        { label: 'Up to 5 websites', exclusive: true },
        { label: 'More AI suggestions and the Auto-Optimize agent', exclusive: true },
        { label: 'No badge on your site', exclusive: true },
        { label: 'Priority support', exclusive: false },
      ],
    },
    agency: {
      label: 'Agency',
      sub: 'Everything in Pro, for agencies running tests on client sites. We set it up with you personally.',
      cta: 'Talk to us',
      features: [
        { label: 'Up to 100 websites — one account for all client sites', exclusive: true },
        { label: 'Unlimited AI suggestions', exclusive: true },
        { label: 'Personal onboarding for your first client tests', exclusive: true },
        { label: 'Direct support by email, same business day', exclusive: true },
        { label: 'Your feature requests go first', exclusive: false },
      ],
    },
  },

  sectionFaq: 'Frequently asked questions',
  faqs: [
    {
      q: 'Does the snippet slow down my site?',
      a: 'Barely. The snippet is about 26 KB compressed and loads async. To prevent the original from flashing before the variant appears, your page waits until the test is ready — usually a fraction of a second, never longer than 3 seconds. Pages without a running test are not changed.',
    },
    {
      q: 'Do I need to tell Variante exactly what to do?',
      a: 'No. Pick a headline or button and Variante reads your page, then suggests three variants that each test a different idea. You pick one, edit it, or write your own. No prompt writing needed.',
    },
    {
      q: 'Does this work with my stack?',
      a: 'WordPress, Shopify, Next.js, React and custom HTML work out of the box. Site builders like Webflow, Framer, Wix or Squarespace work if they let you add custom code to the <head> — usually on a paid plan.',
    },
    {
      q: 'How is this different from Optimizely or VWO?',
      a: 'Those tools are built for teams with developers and enterprise budgets. Variante is made for small teams: pick an element, review the variant, start the test. €0 to start, no sales call.',
    },
    {
      q: 'I’m a solo founder — is this worth it?',
      a: 'If your page has traffic, yes. A reliable result needs roughly 1,000 visitors per variant, so start with your busiest page. Variante tells you when a test has enough data — and until then, no decision is made on a hunch.',
    },
    {
      q: 'What happens to my data? Is this GDPR-compliant?',
      a: 'Your visitors get no cookies and no local storage by default: the variant is assigned from a salted hash, and the IP address is never stored. Conversion events are anonymous counts. Your data lives in Frankfurt (Supabase); hosting and AI suggestions run through US providers (Vercel, OpenAI) under EU standard contractual clauses. A data processing agreement (AVV) is available on request.',
    },
    {
      q: 'Can I cancel anytime? What happens to my tests?',
      a: 'Yes — cancel any time in the billing portal, effective at the end of your billing month. No retention calls. Your account goes back to the Free plan, your tests and results stay, and you can export results as CSV.',
    },
  ],

  closingH: 'One snippet. Your first test this week.',
  closingSub: 'Set up in 5 minutes. No credit card.',
  closingCta: 'Start free',

  footerLine: '© 2026 Variante · Made in Bavaria',
  footerDocs: 'Docs',
  footerChangelog: 'Changelog',
  footerTerms: 'Terms',
  footerPrivacy: 'Privacy',
  footerImprint: 'Imprint',

  badgeText: 'A/B by Variante',

  jsonldDescription:
    'AI-powered A/B testing for indie hackers and founders. No developer, no pipeline.',
  jsonldProDescription: 'Unlimited tests, significance analysis, auto-winner detection',

  metaTitle: 'A/B Testing Without a Developer | Variante',
  metaDescription:
    'Pick a headline or button on your site. AI suggests better copy, traffic splits, the winner ships. No developer needed. Works with WordPress, Next.js, Shopify.',
  ogTitle: 'A/B Testing Without a Developer | Variante',
  ogDescription:
    'AI suggests better headlines and buttons for your site. You approve, traffic splits, the winner ships. No developer needed.',
  twitterTitle: 'A/B Testing Without a Developer | Variante',
  twitterDescription: 'AI suggests better headlines and buttons for your site. No developer needed.',
  ogImageAlt: 'Variante — A/B Testing for your site',
}

export { copy }
