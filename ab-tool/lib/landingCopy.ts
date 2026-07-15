// Landingpage-Copy DE/EN — ICP: Designer, Indie Hacker, Gründer (solopreneurs & small teams)
// Kernprodukt: klassisches A/B-Testing (Variante selbst bauen, Traffic splitten,
// Conversions messen) — das einzige KI-Feature aktuell ist automatische Übersetzung
// der Varianten. Autonome Agent-Funktionen (Analyse, Varianten-Generierung,
// Auto-Rollout-Loop) sind bewusst kein Teil der aktuellen Positionierung — kommen später.
// Deutsch = Default (DACH-ICP), Englisch = Fallback für internationale Reach
//
// STRUKTUR-REGEL: Es gibt genau *eine* Landingpage. DE und EN unterscheiden sich
// ausschließlich im Text — nie in Aufbau, Reihenfolge oder Anzahl der Elemente.
// Alles Nicht-Sprachliche (Preise, Links, welcher Plan hervorgehoben ist, wie viele
// Features/Steps/FAQs es gibt) steht deshalb *außerhalb* der Sprachobjekte in
// `PLANS` bzw. wird über die Typen erzwungen (Tupel fester Länge).
// Wer hier ein Feld nur in einer Sprache ändert, bekommt einen Type-Error.

import { techLogoNames } from '@/components/TechLogos'

export type Lang = 'de' | 'en'

/* ── Struktur: sprachunabhängig, für beide Sprachen identisch ── */

export type PlanId = 'free' | 'pro' | 'agency'

export const CURRENCY = 'EUR'

export interface PlanStructure {
  id: PlanId
  /** Betrag ohne Währung — zugleich Anzeigewert und JSON-LD `price`. */
  amount: string
  /** Zeigt den „pro Monat"-Suffix (`plans.period`). Free ist dauerhaft. */
  perMonth: boolean
  href: string
  /** Genau ein Plan pro Seite ist hervorgehoben (brandguidelines §2.2). */
  featured: boolean
}

export const PLANS: readonly PlanStructure[] = [
  { id: 'free', amount: '0', perMonth: false, href: '/signup', featured: false },
  { id: 'pro', amount: '35', perMonth: true, href: '/signup?plan=pro', featured: true },
  { id: 'agency', amount: '99', perMonth: true, href: '/signup?plan=agency', featured: false },
]

/** Display price. Suffixed „€" in both languages — the digits never differ. */
export function planPrice(plan: PlanStructure): string {
  return `${plan.amount} €`
}

/* ── Typen: erzwingen gleiche Element-Anzahl in DE und EN ── */

/** Fixed-length tuple — DE und EN müssen dieselbe Anzahl Einträge liefern. */
type Tuple4<T> = readonly [T, T, T, T]
type Tuple3<T> = readonly [T, T, T]
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
  heroH1: string
  heroSub: string
  heroCta: string
  heroFootnote: string

  // Micro-Trust
  trustItems: Tuple4<{ label: string; text: string }>

  // Works-with logos
  sectionWorks: string
  worksLabel: string

  // Figma Community / Agent social proof
  figmaCommunityTitle: string
  figmaCommunityText: string
  figmaCommunityLinkText: string

  // AI Translation
  sectionTranslate: string
  translateH: string
  translateSub: string
  translateItems: Tuple3<{ title: string; body: string }>
  translateNote: string

  // Solo-dev transparency + implied usage
  soloDevTitle: string
  soloDevBody: string
  impliedUsersText: string

  // How it works
  sectionHow: string
  steps: Tuple3<{ title: string; body: string }>
  step1Title: string
  step1Body: string
  step2Title: string
  step2Body: string
  step3Title: string
  step3Body: string
  /** Comma-separated platform names for inline prose display. */
  platformItems: string
  /** `{platforms}` wird durch die Namen aus TechLogos ersetzt. */
  platformNote: string

  // Pricing
  sectionPricing: string
  pricingSub: string
  /** „/mo" — nur für Pläne mit `perMonth: true`. */
  period: string
  proBadge: string
  plans: Record<PlanId, PlanCopy>
  // Flat pricing properties (for the current page template)
  freeLabel: string
  freePrice: string
  freeSub: string
  freeFeatures: readonly string[]
  freeCta: string
  proLabel: string
  proPrice: string
  proSub: string
  proFeatures: readonly string[]
  proFeatureExclusive: readonly boolean[]
  proCta: string
  agencyLabel: string
  agencyPrice: string
  agencySub: string
  agencyFeatures: readonly string[]
  agencyFeatureExclusive: readonly boolean[]
  agencyCta: string

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

const de: LandingCopy = {
  navDemo: 'Demo',
  navPricing: 'Preise',
  navLogin: 'Login',
  navSignup: 'Kostenlos testen',

  heroH1: 'A/B-Tests, die jeder versteht — automatisch übersetzt mit KI.',
  heroSub:
    'Baue eine Variante und teste sie gegen dein Original. Variante splittet den Traffic, trackt Conversions — und übersetzt deine Texte automatisch für Besucher in jeder Sprache. Kein Copy-Paste, kein Zusatzaufwand.',
  heroCta: 'Kostenlos starten',
  heroFootnote: 'Keine Kreditkarte · 1 kostenloses Experiment · In 5 Minuten live',

  trustItems: [
    { label: 'Keine Kreditkarte', text: 'Jederzeit kündbar. Kein Lock-in.' },
    { label: '5 KB Snippet', text: 'Lädt asynchron. Null Performance-Impact.' },
    { label: 'DSGVO-konform', text: 'EU-Hosting. Keine Drittstaaten-Daten.' },
    { label: 'KI-Übersetzung', text: 'Automatisch in jede Sprache — ohne Mehraufwand.' },
  ],

  sectionWorks: 'Funktioniert mit deinem Stack',
  worksLabel: 'Ein Snippet — überall wo du ein Script-Tag einfügen kannst',

  figmaCommunityTitle: 'Variante + Figma Plugin',
  figmaCommunityText:
    'Designer wählen ein Element aus, bauen die Variante in Figma, und der AI-Agent deployed sie automatisch. Kein Dev, kein Deployment — direkt aus deinem Design-Tool.',
  figmaCommunityLinkText: 'So funktioniert\'s →',

  sectionTranslate: 'KI-Übersetzung',
  translateH: 'Eine Variante schreiben. In jeder Sprache live.',
  translateSub:
    'Du baust deine Variante einmal — Text, CTA, Pricing, was auch immer du testest. Variante übersetzt sie automatisch für jeden Besucher, ohne dass du selbst eine Zeile übersetzt.',
  translateItems: [
    {
      title: 'Sprache automatisch erkannt',
      body: 'Variante erkennt die Sprache deines Besuchers und zeigt die passende Übersetzung — ganz ohne Konfiguration.',
    },
    {
      title: 'KI-Übersetzung in Echtzeit',
      body: 'Ton, Kontext und Absicht bleiben erhalten. Keine wörtliche Maschinenübersetzung, sondern Text, der sich richtig anfühlt.',
    },
    {
      title: 'Bleibt synchron',
      body: 'Änderst du deine Variante, aktualisiert sich die Übersetzung automatisch mit. Kein manuelles Nachpflegen.',
    },
  ],
  translateNote: 'Einmal schreiben, weltweit testen.',

  soloDevTitle: 'Gebaut für Builder. Designer, Indie Hacker, Gründer.',
  soloDevBody:
    'Kein VC, kein 20-Personen-Team. Ein Solo-Dev aus Bayern, der selbst Produkte launched und die „soll ich das testen oder shippen?"-Frage kennt. Jede Zeile Code ist dokumentiert, jedes Update öffentlich im Changelog.',
  impliedUsersText:
    'Schließ dich Designern, Indie Hackern und Gründern an, die shippen UND testen — ohne Dev-Team.',

  sectionHow: 'So funktioniert’s',
  steps: [
    {
      title: 'Wähle, was du testen willst.',
      body: 'Hero, Pricing, CTA-Text — du entscheidest, welchen Bereich deiner Seite du verbessern willst. Funktioniert mit WordPress, Next.js, Shopify oder jedem anderen Stack.',
    },
    {
      title: 'Baue deine Variante.',
      body: 'Schreib deine Variante im Editor — neuer Text, neue Hierarchie, neuer CTA. Variante übersetzt sie automatisch für Besucher in anderen Sprachen.',
    },
    {
      title: 'Daten statt Bauchgefühl. In Tagen, nicht Wochen.',
      body: 'Ein Snippet in deine Seite — fertig. Traffic wird gesplittet, Conversions getrackt, Signifikanz berechnet. Du entscheidest, wann der Sieger ausgerollt wird.',
    },
  ],
  platformNote: 'Ein Snippet. Funktioniert mit {platforms} — überall wo du ein Script-Tag einfügen kannst.',
  platformItems: techLogoNames.join(', '),

  step1Title: 'Wähle, was du testen willst.',
  step1Body: 'Hero, Pricing, CTA-Text — du entscheidest, welchen Bereich deiner Seite du verbessern willst. Funktioniert mit WordPress, Next.js, Shopify oder jedem anderen Stack.',
  step2Title: 'Baue deine Variante.',
  step2Body: 'Schreib deine Variante im Editor — neuer Text, neue Hierarchie, neuer CTA. Variante übersetzt sie automatisch für Besucher in anderen Sprachen.',
  step3Title: 'Daten statt Bauchgefühl. In Tagen, nicht Wochen.',
  step3Body: 'Ein Snippet in deine Seite — fertig. Traffic wird gesplittet, Conversions getrackt, Signifikanz berechnet. Du entscheidest, wann der Sieger ausgerollt wird.',

  sectionPricing: 'Preise',
  pricingSub: 'Starte kostenlos. Upgrade, wenn der erste Test sich bezahlt gemacht hat.',
  period: '/Mon.',
  proBadge: 'Am beliebtesten',
  plans: {
    free: {
      label: 'Free',
      sub: 'Dauerhaft kostenlos. Keine Kreditkarte.',
      cta: 'Kostenlos starten',
      features: [
        { label: '1 aktives Experiment', exclusive: false },
        { label: 'Variante selbst erstellen — im Editor, ganz ohne Code', exclusive: false },
        { label: 'Automatische KI-Übersetzung in jede Sprache', exclusive: false },
        { label: 'Ganze Sektionen testen — Hero, Pricing, CTAs', exclusive: false },
        { label: 'Conversion-Tracking, eingebaut', exclusive: false },
        { label: '„Powered by Variante"-Badge auf deiner Seite', exclusive: false },
      ],
    },
    pro: {
      label: 'Pro',
      sub: 'Alles aus Free, plus:',
      cta: 'Pro starten',
      features: [
        { label: 'Unbegrenzt Experimente', exclusive: true },
        { label: 'Statistische Signifikanz — weiß, wann du aufhören kannst', exclusive: true },
        { label: 'Auto-Winner — beste Variante geht automatisch live', exclusive: true },
        { label: 'Dynamic Content — eigene Inhalte je Traffic-Quelle', exclusive: true },
        { label: 'Preis-Testing — Pläne und Preispunkte experimentell', exclusive: true },
        { label: 'Kein Badge auf deiner Seite', exclusive: true },
        { label: 'Priority-Support', exclusive: false },
      ],
    },
    agency: {
      label: 'Agency',
      sub: 'Alles aus Pro, plus:',
      cta: 'Agency starten',
      features: [
        { label: 'Bis zu 100 Domains — alle Kunden-Sites managen', exclusive: true },
        { label: 'White-Label — keine Variante-Erwähnung', exclusive: true },
        { label: 'Kunden-Reports — gebrandete PDFs', exclusive: true },
        { label: 'Team-Zugang — Tests agenturweit teilen', exclusive: true },
        { label: 'Dedizierter Support — Direktkontakt, kein Ticket', exclusive: true },
        { label: 'Priority-Feature-Requests', exclusive: false },
        { label: 'Frühzugang zu neuen Features', exclusive: false },
      ],
    },
  },

  freeLabel: 'Free',
  freePrice: '0 €',
  freeSub: 'Dauerhaft kostenlos. Keine Kreditkarte.',
  freeFeatures: [
    '1 aktives Experiment',
    'Variante selbst erstellen — im Editor, ganz ohne Code',
    'Automatische KI-Übersetzung in jede Sprache',
    'Ganze Sektionen testen — Hero, Pricing, CTAs',
    'Conversion-Tracking, eingebaut',
    '„Powered by Variante"-Badge auf deiner Seite',
  ],
  freeCta: 'Kostenlos starten',

  proLabel: 'Pro',
  proPrice: '35 €',
  proSub: 'Alles aus Free, plus:',
  proFeatures: [
    'Unbegrenzt Experimente',
    'Statistische Signifikanz — weiß, wann du aufhören kannst',
    'Auto-Winner — beste Variante geht automatisch live',
    'Dynamic Content — eigene Inhalte je Traffic-Quelle',
    'Preis-Testing — Pläne und Preispunkte experimentell',
    'Kein Badge auf deiner Seite',
    'Priority-Support',
  ],
  proFeatureExclusive: [true, true, true, true, true, true, false],
  proCta: 'Pro starten',

  agencyLabel: 'Agency',
  agencyPrice: '99 €',
  agencySub: 'Alles aus Pro, plus:',
  agencyFeatures: [
    'Bis zu 100 Domains — alle Kunden-Sites managen',
    'White-Label — keine Variante-Erwähnung',
    'Kunden-Reports — gebrandete PDFs',
    'Team-Zugang — Tests agenturweit teilen',
    'Dedizierter Support — Direktkontakt, kein Ticket',
    'Priority-Feature-Requests',
    'Frühzugang zu neuen Features',
  ],
  agencyFeatureExclusive: [true, true, true, true, true, false, false],
  agencyCta: 'Agency starten',

  sectionFaq: 'Häufige Fragen',
  faqs: [
    {
      q: 'Bremst das Snippet meine Seite aus?',
      a: 'Nein. Unter 5 KB, lädt asynchron, blockiert nie das Rendering. Deine Core Web Vitals bleiben unberührt.',
    },
    {
      q: 'Muss ich für jede Sprache eine eigene Variante schreiben?',
      a: 'Nein. Du schreibst deine Variante einmal, Variante übersetzt sie automatisch für jeden Besucher — Ton und Kontext bleiben erhalten.',
    },
    {
      q: 'Funktioniert das mit meinem Stack?',
      a: 'WordPress, Webflow, Shopify, Framer, Squarespace, React, Next.js, Custom HTML — wenn du ein <script>-Tag einfügen kannst, funktioniert es.',
    },
    {
      q: 'Wieso nicht einfach Optimizely oder VWO?',
      a: 'Weil die für große Teams mit Entwickler und Tracking-Plan gebaut sind. Variante: Snippet einbauen, Variante im Editor bauen, Ergebnis abwarten. Ohne Dev. Ohne Enterprise-Sales-Call.',
    },
    {
      q: 'Ich bin Solo-Founder — lohnt sich das?',
      a: 'Gerade dann. Ein Snippet, ein Experiment — und die automatische Übersetzung erspart dir, jede Variante manuell in mehrere Sprachen zu übertragen.',
    },
  ],

  closingH: 'Deine Seite kann ab heute besser werden.',
  closingSub: 'Ein Snippet, ein Experiment, kein Entwickler nötig.',
  closingCta: 'Kostenlos starten',

  footerLine: '© 2026 Variante · Made in Bavaria',
  footerDocs: 'Docs',
  footerPrivacy: 'Datenschutz',
  footerImprint: 'Impressum',

  badgeText: 'A/B by Variante',

  jsonldDescription:
    'A/B-Testing für Designer, Indie Hacker & Gründer. Kein Entwickler, automatische KI-Übersetzung.',
  jsonldProDescription: 'Unbegrenzt Experimente, Signifikanz-Analyse, Auto-Winner',

  metaTitle: 'A/B-Testing für Designer, Indie Hacker & Gründer | Variante',
  metaDescription:
    'A/B-Tests ohne Entwickler — Variante bauen, Traffic splitten, Conversions messen. Deine Varianten werden automatisch mit KI in jede Sprache übersetzt. Für WordPress, Next.js, Shopify.',
  ogTitle: 'A/B-Testing für Designer, Indie Hacker & Gründer | Variante',
  ogDescription:
    'Baue deine Variante, Variante testet sie gegen dein Original — und übersetzt sie automatisch in jede Sprache.',
  twitterTitle: 'A/B-Testing für Designer, Indie Hacker & Gründer | Variante',
  twitterDescription: 'A/B-Testing ohne Entwickler. Automatisch übersetzt mit KI.',
  ogImageAlt: 'Variante — A/B-Testing mit automatischer KI-Übersetzung',
}

const en: LandingCopy = {
  navDemo: 'Demo',
  navPricing: 'Pricing',
  navLogin: 'Log in',
  navSignup: 'Start free',

  heroH1: 'A/B testing anyone can run — automatically translated with AI.',
  heroSub:
    'Build a variant and test it against your original. Variante splits traffic, tracks conversions — and automatically translates your copy for visitors in any language. No copy-pasting, no extra work.',
  heroCta: 'Start free',
  heroFootnote: 'No credit card · 1 free experiment · Live in 5 minutes',

  trustItems: [
    { label: 'No credit card', text: 'Cancel anytime. No lock-in.' },
    { label: '5 KB snippet', text: 'Loads async. Zero performance impact.' },
    { label: 'GDPR-compliant', text: 'EU hosting. No third-country data.' },
    { label: 'AI translation', text: 'Automatic, in every language — no extra work.' },
  ],

  sectionWorks: 'Works with your stack',
  worksLabel: 'One snippet — anywhere you can paste a script tag',

  figmaCommunityTitle: 'Variante + Figma Plugin',
  figmaCommunityText:
    'Designers pick an element, build the variant in Figma, and the AI agent deploys it automatically. No dev, no deployment — straight from your design tool.',
  figmaCommunityLinkText: 'How it works →',

  sectionTranslate: 'AI translation',
  translateH: 'Write one variant. It goes live in every language.',
  translateSub:
    "You build your variant once — copy, CTA, pricing, whatever you're testing. Variante translates it automatically for every visitor, without you translating a single word.",
  translateItems: [
    {
      title: 'Language detected automatically',
      body: "Variante detects your visitor's language and shows the right translation — zero configuration.",
    },
    {
      title: 'Real-time AI translation',
      body: 'Tone, context, and intent stay intact. Not literal machine translation — copy that actually reads right.',
    },
    {
      title: 'Always in sync',
      body: 'Edit your variant and the translation updates automatically. Nothing to maintain by hand.',
    },
  ],
  translateNote: 'Write once, test everywhere.',

  soloDevTitle: 'Built for builders. Designers, indie hackers, founders.',
  soloDevBody:
    'No VC, no 20-person team. A solo dev from Bavaria who launches products himself and knows the “should I test this or just ship it?” dilemma. Every line of code is documented, every update public in the changelog.',
  impliedUsersText:
    'Join designers, indie hackers, and founders who ship AND test — without a dev team.',

  sectionHow: 'How it works',
  steps: [
    {
      title: 'Pick what to test.',
      body: "Hero, pricing, CTA copy — you decide what to improve. Works with WordPress, Next.js, Shopify, or any other stack.",
    },
    {
      title: 'Build your variant.',
      body: 'Write your variant in the editor — new copy, new hierarchy, new CTA. Variante automatically translates it for visitors in other languages.',
    },
    {
      title: 'Data over gut feel. Days, not weeks.',
      body: 'One snippet on your site — done. Traffic gets split, conversions tracked, significance computed. You decide when to ship the winner.',
    },
  ],
  platformNote: 'One snippet. Works with {platforms} — anywhere you can paste a script tag.',
  platformItems: techLogoNames.join(', '),

  step1Title: 'Pick what to test.',
  step1Body: "Hero, pricing, CTA copy — you decide what to improve. Works with WordPress, Next.js, Shopify, or any other stack.",
  step2Title: 'Build your variant.',
  step2Body: 'Write your variant in the editor — new copy, new hierarchy, new CTA. Variante automatically translates it for visitors in other languages.',
  step3Title: 'Data over gut feel. Days, not weeks.',
  step3Body: 'One snippet on your site — done. Traffic gets split, conversions tracked, significance computed. You decide when to ship the winner.',

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
        { label: 'Build variants yourself — no-code editor', exclusive: false },
        { label: 'Automatic AI translation into every language', exclusive: false },
        { label: 'Test full sections — hero, pricing, CTAs', exclusive: false },
        { label: 'Conversion tracking, built in', exclusive: false },
        { label: '“Powered by Variante” badge on your site', exclusive: false },
      ],
    },
    pro: {
      label: 'Pro',
      sub: 'Everything in Free, plus:',
      cta: 'Get Pro',
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
      cta: 'Get Agency',
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

  freeLabel: 'Free',
  freePrice: '0 €',
  freeSub: 'Forever free. No credit card.',
  freeFeatures: [
    '1 active experiment',
    'Build variants yourself — no-code editor',
    'Automatic AI translation into every language',
    'Test full sections — hero, pricing, CTAs',
    'Conversion tracking, built in',
    '“Powered by Variante” badge on your site',
  ],
  freeCta: 'Start free',

  proLabel: 'Pro',
  proPrice: '35 €',
  proSub: 'Everything in Free, plus:',
  proFeatures: [
    'Unlimited experiments',
    'Statistical significance — know when to stop',
    'Auto-winner — the best variant ships itself',
    'Dynamic content — tailored copy per traffic source',
    'Price testing — experiment with plans and price points',
    'No badge on your site',
    'Priority support',
  ],
  proFeatureExclusive: [true, true, true, true, true, true, false],
  proCta: 'Get Pro',

  agencyLabel: 'Agency',
  agencyPrice: '99 €',
  agencySub: 'Everything in Pro, plus:',
  agencyFeatures: [
    'Up to 100 domains — manage every client site',
    'White-label — no Variante mention anywhere',
    'Client reports — branded PDFs',
    'Team access — share tests across your agency',
    'Dedicated support — direct line, not tickets',
    'Priority feature requests',
    'Early access to new features',
  ],
  agencyFeatureExclusive: [true, true, true, true, true, false, false],
  agencyCta: 'Get Agency',

  sectionFaq: 'Frequently asked questions',
  faqs: [
    {
      q: 'Does the snippet slow down my site?',
      a: 'No. Under 5 KB, loads async, never blocks rendering. Your Core Web Vitals stay untouched.',
    },
    {
      q: 'Do I need to write a separate variant for every language?',
      a: 'No. Write your variant once, Variante translates it automatically for every visitor — tone and context stay intact.',
    },
    {
      q: 'Does this work with my stack?',
      a: 'WordPress, Webflow, Shopify, Framer, Squarespace, React, Next.js, custom HTML — if you can paste a <script> tag, it works.',
    },
    {
      q: 'How is this different from Optimizely or VWO?',
      a: 'Those are built for teams with a developer and a tracking plan. Variante: paste a snippet, build your variant in the editor, wait for results. No dev. No enterprise sales call.',
    },
    {
      q: 'I’m a solo founder — is this worth it?',
      a: 'Especially then. One snippet, one experiment — and automatic translation saves you the time of rewriting every variant by hand in multiple languages.',
    },
  ],

  closingH: 'Your site can start getting better today.',
  closingSub: 'One snippet, one experiment, no developer needed.',
  closingCta: 'Start free',

  footerLine: '© 2026 Variante · Made in Bavaria',
  footerDocs: 'Docs',
  footerPrivacy: 'Privacy',
  footerImprint: 'Imprint',

  badgeText: 'A/B by Variante',

  jsonldDescription:
    'A/B testing for designers, indie hackers & founders. No developer, automatic AI translation.',
  jsonldProDescription: 'Unlimited experiments, significance analysis, auto-winner detection',

  metaTitle: 'A/B Testing for Designers, Indie Hackers & Founders | Variante',
  metaDescription:
    'A/B testing without a developer — build a variant, split traffic, track conversions. Your variants get automatically translated into every language with AI. Works with WordPress, Next.js, Shopify.',
  ogTitle: 'A/B Testing for Designers, Indie Hackers & Founders | Variante',
  ogDescription:
    'Build your variant, Variante tests it against your original — and translates it automatically into every language.',
  twitterTitle: 'A/B Testing for Designers, Indie Hackers & Founders | Variante',
  twitterDescription: 'A/B testing without a developer. Automatically translated with AI.',
  ogImageAlt: 'Variante — A/B testing with automatic AI translation',
}

/** Helper: detect language from request headers. */
export function getLang(acceptLanguage: string | null, cookieLang: string | null): Lang {
  if (cookieLang === 'de' || cookieLang === 'en') return cookieLang
  if (acceptLanguage?.toLowerCase().startsWith('de')) return 'de'
  return 'en'
}

export function getCopy(lang: Lang): LandingCopy {
  return lang === 'de' ? de : en
}

/** `platformNote` with `{platforms}` filled from the TechLogos source of truth. */
export function platformSentence(copy: LandingCopy): string {
  return copy.platformNote.replace('{platforms}', techLogoNames.join(', '))
}

export { de as deCopy, en as enCopy }
