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
  { id: 'agency', price: '99 €', perMonth: true, href: 'mailto:valentin@variante.dev?subject=Agency%20Plan', featured: false },
]

type Tuple4<T> = readonly [T, T, T, T]
type Tuple3<T> = readonly [T, T, T]
type Tuple2<T> = readonly [T, T]
type Tuple5<T> = readonly [T, T, T, T, T]

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
  navDemo: string
  navPricing: string
  navLogin: string
  navSignup: string

  // Hero
  heroPill: string
  heroH1: string
  heroSub: string
  heroCta: string
  heroFootnote: string

  // Hybrid-Demo (URL rein → echte Variante der eigenen Seite raus)
  demo: {
    /** Überschrift der Demo-Sektion direkt unter dem Hero. */
    heading: string
    sub: string
    inputPlaceholder: string
    submit: string
    /** Zwei Schritte der Loading-Animation — Code-Extraktion + KI-Analyse (~3s). */
    loadingSteps: Tuple2<string>
    tabOriginal: string
    tabVariant: string
    changesHeading: string
    refineToggle: string
    refinePlaceholder: string
    refineSubmit: string
    refining: string
    goLive: string
    goLiveHint: string
    tryAnother: string
    /** SPA erkannt → Snippet-first-Fallback (Plan §0b). */
    spaHeading: string
    spaBody: string
    spaCta: string
    errGeneric: string
    errUrl: string
    /** Text wenn Screenshot-Polling fehlschlägt (Code-First: Changes sind da, Bilder nicht). */
    screenshotFailed: string
  }

  // Micro-Trust
  trustItems: Tuple4<{ label: string; text: string }>

  // Works-with logos
  sectionWorks: string
  worksLabel: string

  // How A/B Testing Works (section)
  sectionAgent: string
  agentH: string
  agentSub: string
  agentMotto: string
  agentMottoSub: string
  agentModePill: string
  agentLoop: Tuple4<{ title: string; body: string }>
  agentLoopNote: string

  // Figma Community Plugin
  figmaCommunityTitle: string
  figmaCommunityText: string
  figmaCommunityLinkText: string

  // Solo-dev transparency + implied usage
  soloDevTitle: string
  soloDevBody: string
  impliedUsersText: string

  // How it works
  sectionHow: string
  steps: Tuple3<{ title: string; body: string }>
  /** `{platforms}` wird durch die Namen aus TechLogos ersetzt. */
  platformNote: string

  // Pricing
  sectionPricing: string
  pricingSub: string
  /** „/mo" — nur für Pläne mit `perMonth: true`. */
  period: string
  proBadge: string
  plans: Record<PlanId, PlanCopy>

  // FAQ
  sectionFaq: string
  faqs: Tuple5<{ q: string; a: string }>

  // Closing CTA
  closingH: string
  closingSub: string
  closingCta: string

  // Footer
  footerLine: string
  footerDocs: string
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
  navDemo: 'Demo',
  navPricing: 'Pricing',
  navLogin: 'Log in',
  navSignup: 'Start free',

  heroPill: 'A/B testing — without the dev ticket',
  heroH1: 'CRO best practice. In 5 minutes.',
  heroSub:
    'Total control, minimum effort. You decide what to optimize — hero, pricing, CTAs. Variante analyzes your page, generates variants, measures conversions, and suggests the winner. You choose what goes live.',
  heroCta: 'See your site transformed',
  heroFootnote: '',

  demo: {
    heading: 'See what AI does to your site',
    sub: 'Enter a URL, wait a moment. See your real site and the AI variant side by side.',
    inputPlaceholder: 'your-website.com',
    submit: 'Analyze page',
    loadingSteps: [
      'Reading your code …',
      'Writing variant …',
    ],
    tabOriginal: 'Original',
    tabVariant: 'AI Variant',
    changesHeading: 'What the AI changed',
    refineToggle: 'Refine',
    refinePlaceholder: 'e.g. "Rounder button, tighter copy"',
    refineSubmit: 'Apply',
    refining: 'Refining …',
    goLive: 'Start free',
    goLiveHint: 'Create an account — your variant is saved.',
    tryAnother: 'Try another page',
    spaHeading: 'Your site renders in the browser',
    spaBody:
      "Your content is built in the browser, so from the outside we only see an empty shell. The snippet lets us read the real elements — then we'll show you your variant. The detour is really a shortcut: after sign-up your test is live immediately.",
    spaCta: 'Get the snippet',
    errGeneric: "That didn't work. Try again, or try a different page.",
    errUrl: "That URL doesn't look right. Give it another look.",
    screenshotFailed: "Screenshots couldn't load — but the analysis is ready. You'll see the variant in your dashboard after signing up.",
  },

  trustItems: [
    { label: 'Live in 5 minutes', text: 'Paste the snippet, the agent starts. No setup, no dev.' },
    { label: '5 KB snippet', text: 'Loads async. Zero performance impact.' },
    { label: 'GDPR-compliant', text: 'EU hosting. No third-country data.' },
    { label: 'A/B testing', text: 'No dev ticket. No tracking plan.' },
  ],

  sectionWorks: 'Works with your stack',
  worksLabel: 'One snippet — anywhere you can paste a script tag',

  sectionAgent: 'How A/B testing works',
  agentH: 'Total control. Minimum effort.',
  agentSub:
    'Classic A/B tools hand you a result and wait for your next idea. Variante runs a continuous loop: analyze, test, ship, start over. You set the goal, it does the laps.',
  agentMotto: 'Total control. Minimum effort.',
  agentMottoSub: 'Pick the variant you want — ship it.',
  agentModePill: 'Automated',
  agentLoop: [
    {
      title: 'Analyze the page',
      body: 'Variante reads your page, finds the weakest conversion points, and ranks them by expected impact.',
    },
    {
      title: 'Create a hypothesis',
      body: 'It drafts a variant — copy, hierarchy, CTAs. All you do is review what ships.',
    },
    {
      title: 'Test it',
      body: 'Traffic gets split cleanly, conversions tracked, significance computed. No tracking plan required.',
    },
    {
      title: 'Choose the winner',
      body: 'The winner goes live automatically. Variante moves straight on to the next hypothesis.',
    },
  ],
  agentLoopNote: 'Every test improves your site\'s conversion.',

  figmaCommunityTitle: 'Figma Community Plugin',
  figmaCommunityText:
    'Test and optimize right from Figma — no browser switch needed. Pick an element, generate a variant, push it live.',
  figmaCommunityLinkText: 'View plugin in the Community →',

  soloDevTitle: 'Built for builders. Designers, indie hackers, founders.',
  soloDevBody:
    'Built by someone who knows the “should I test this or just ship it?” dilemma firsthand. Every line of code is documented, every update public in the changelog.',
  impliedUsersText:
    'Join designers, indie hackers, and founders who ship AND test — without a dev team.',

  sectionHow: 'How it works',
  steps: [
    {
      title: 'Your site. Your rules.',
      body: 'Tell Variante which page to optimize. It automatically analyzes structure, conversion paths, and UX — WordPress, Next.js, Shopify, custom, doesn\'t matter.',
    },
    {
      title: 'Variants generate themselves.',
      body: 'Variante writes variants based on what it learned — better CTAs, clearer hierarchy, optimized copy. You review what ships. Everything else is automatic.',
    },
    {
      title: 'Data over gut feel. Days, not weeks.',
      body: 'One snippet into your site — done. Variante serves variants, tracks conversions, computes significance, and rolls out the winner. Without touching a pipeline.',
    },
  ],
  platformNote: 'One snippet. Works with {platforms} — anywhere you can paste a script tag.',

  sectionPricing: 'Pricing',
  pricingSub: 'Start free. Upgrade once your first test has paid for itself.',
  period: '/mo',
  proBadge: 'Recommended',
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
      sub: 'Everything in Pro, plus:',
      cta: 'Get a Quote',
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
      a: 'You\'d need a developer and a tracking plan for those. Variante: pick an element, review variants, ship the winner. No dev. No enterprise sales call.',
    },
    {
      q: 'I’m a solo founder — is this worth it?',
      a: 'Especially then. Your time is too valuable for manual A/B testing. Variante works while you build, sell, or sleep. One experiment can tell you if your pricing page converts 20% better — that\'s an afternoon\'s ROI.',
    },
  ],

  closingH: 'Your site can start improving today.',
  closingSub: 'One snippet, one experiment, no developer. Variante takes it from there.',
  closingCta: 'Start free',

  footerLine: '© 2026 Variante · Made in Bavaria',
  footerDocs: 'Docs',
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
