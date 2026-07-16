// Landingpage-Copy DE/EN — ICP: Designer, Indie Hacker, Gründer (solopreneurs & small teams)
// Agent-first: autonomer KI-Agent analysiert, generiert Varianten, misst & rolled aus
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

export interface PlanStructure {
  id: PlanId
  /** Preis inkl. Währung — Ziffern sind in beiden Sprachen gleich. */
  price: string
  /** Zeigt den „pro Monat"-Suffix (`plans.period`). Free ist einmalig/dauerhaft. */
  perMonth: boolean
  href: string
  /** Genau ein Plan pro Seite ist hervorgehoben (brandguidelines §2.2). */
  featured: boolean
}

export const PLANS: readonly PlanStructure[] = [
  { id: 'free', price: '0 €', perMonth: false, href: '/signup', featured: false },
  { id: 'pro', price: '35 €', perMonth: true, href: '/signup?plan=pro', featured: true },
  { id: 'agency', price: '99 €', perMonth: true, href: '/signup?plan=agency', featured: false },
]

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
  heroPill: string
  heroH1: string
  heroSub: string
  heroCta: string
  heroFootnote: string

  // Micro-Trust
  trustItems: Tuple4<{ label: string; text: string }>

  // Works-with logos
  sectionWorks: string
  worksLabel: string

  // AI Agent Automation (+ Demo-Animation)
  sectionAgent: string
  agentH: string
  agentSub: string
  /** Kicker-Zeile über der Animation, z. B. "Total Control. Minimum Effort." */
  agentMotto: string
  /** Tagline direkt darunter, z. B. "Pick the one you want. AI does the rest." */
  agentMottoSub: string
  /** Pill-Text auf jeder der 4 Schritt-Karten — signalisiert manuell ODER automatisch. */
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

const de: LandingCopy = {
  navDemo: 'Demo',
  navPricing: 'Preise',
  navLogin: 'Login',
  navSignup: 'Kostenlos testen',

  heroPill: 'KI-Agenten verbessern deine Conversion autonom',
  heroH1: 'CRO-Best-Practice. In 5 Minuten.',
  heroSub:
    'Volle Kontrolle, minimaler Aufwand. Du bestimmst, was optimiert wird — Hero, Pricing, CTAs. Deine KI analysiert, schreibt Varianten, misst Conversions und schlägt den Winner vor. Du entscheidest, was live geht.',
  heroCta: 'Kostenlos starten',
  heroFootnote: '',

  trustItems: [
    { label: 'In 5 Minuten live', text: 'Snippet einbauen, Agent startet. Kein Setup, kein Dev.' },
    { label: '5 KB Snippet', text: 'Lädt asynchron. Null Performance-Impact.' },
    { label: 'DSGVO-konform', text: 'EU-Hosting. Keine Drittstaaten-Daten.' },
    { label: 'KI-Agent', text: 'Autonom. Kein Briefing. Kein Dev-Ticket.' },
  ],

  sectionWorks: 'Funktioniert mit deinem Stack',
  worksLabel: 'Ein Snippet — überall wo du ein Script-Tag einfügen kannst',

  sectionAgent: 'KI-Agent-Automatisierung',
  agentH: 'Volle Kontrolle. Minimaler Aufwand.',
  agentSub:
    'Klassische A/B-Tools geben dir ein Ergebnis und warten auf deinen nächsten Einfall. Der Variante-Agent läuft im Kreis: analysieren, testen, ausrollen, wieder von vorn. Du gibst das Ziel vor, er macht die Runden.',
  agentMotto: 'Volle Kontrolle. Minimaler Aufwand.',
  agentMottoSub: 'Wähl aus, was du willst — den Rest erledigt die KI.',
  agentModePill: 'Du oder KI',
  agentLoop: [
    {
      title: 'Seite analysieren',
      body: 'Der Agent liest deine Seite, findet die schwächsten Conversion-Punkte und priorisiert nach erwartetem Impact.',
    },
    {
      title: 'Hypothese erstellen',
      body: 'Er leitet eine Variante ab und schreibt sie selbst — Text, Hierarchie, CTAs. Du reviewst nur noch, was live gehen soll.',
    },
    {
      title: 'Testen',
      body: 'Traffic wird sauber gesplittet, Conversions getrackt, Signifikanz berechnet. Kein Tracking-Plan nötig.',
    },
    {
      title: 'Gewinner wählen',
      body: 'Der Sieger geht automatisch live. Der Agent nimmt sich sofort die nächste Hypothese vor.',
    },
  ],
  agentLoopNote: 'Jede Runde verbessert die Conversion deiner Seite.',

  figmaCommunityTitle: 'Figma Community Plugin',
  figmaCommunityText:
    'Teste und optimiere direkt aus Figma heraus — ohne den Browser zu wechseln. Wähle ein Element, generiere eine Variante, pushe sie live.',
  figmaCommunityLinkText: 'Plugin in der Community ansehen →',

  soloDevTitle: 'Gebaut für Builder. Designer, Indie Hacker, Gründer.',
  soloDevBody:
    'Gebaut von jemandem, der die „soll ich das testen oder shippen?"-Frage selbst kennt. Jede Zeile Code ist dokumentiert, jedes Update öffentlich im Changelog.',
  impliedUsersText:
    'Schließ dich Designern, Indie Hackern und Gründern an, die shippen UND testen — ohne Dev-Team.',

  sectionHow: 'So funktioniert’s',
  steps: [
    {
      title: 'Deine Seite. Deine Regeln. Dein Agent.',
      body: 'Sag dem Agenten, welche Seite er optimieren soll. Er analysiert automatisch den Aufbau, die Conversion-Pfade und die UX — völlig egal ob WordPress, Next.js, Shopify oder Custom.',
    },
    {
      title: 'Varianten entstehen von allein.',
      body: 'Der Agent generiert Varianten basierend auf dem, was er gelernt hat — bessere CTAs, klarere Hierarchie, optimierte Texte. Du reviewst, was live gehen soll. Der Rest passiert automatisch.',
    },
    {
      title: 'Daten statt Bauchgefühl. In Tagen, nicht Wochen.',
      body: 'Ein Snippet in deine Seite — fertig. Der Agent serviert Varianten, trackt Conversions, errechnet Signifikanz und rollt den Winner aus. Ohne dass du eine Pipeline anfassen musst.',
    },
  ],
  platformNote: 'Ein Snippet. Funktioniert mit {platforms} — überall wo du ein Script-Tag einfügen kannst.',

  sectionPricing: 'Preise',
  pricingSub: 'Starte kostenlos. Upgrade, wenn der erste Test sich bezahlt gemacht hat.',
  period: '/Mon.',
  proBadge: 'Empfohlen',
  plans: {
    free: {
      label: 'Free',
      sub: 'Dauerhaft kostenlos. Keine Kreditkarte.',
      cta: 'Kostenlos starten',
      features: [
        { label: '1 aktives Experiment', exclusive: false },
        { label: 'KI-Agent analysiert deine Seite', exclusive: false },
        { label: 'Autonome Variantengenerierung', exclusive: false },
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

  sectionFaq: 'Häufige Fragen',
  faqs: [
    {
      q: 'Bremst das Snippet meine Seite aus?',
      a: 'Nein. Unter 5 KB, lädt asynchron, blockiert nie das Rendering. Deine Core Web Vitals bleiben unberührt.',
    },
    {
      q: 'Muss ich dem Agenten genau sagen, was er tun soll?',
      a: 'Nur grob. „Optimier meine Pricing-Page" reicht. Der Agent analysiert eigenständig, schreibt Varianten, du reviewst — fertig. Kein Prompt-Engineering nötig.',
    },
    {
      q: 'Funktioniert das mit meinem Stack?',
      a: 'WordPress, Webflow, Shopify, Framer, Squarespace, React, Next.js, Custom HTML — wenn du ein <script>-Tag einfügen kannst, funktioniert es.',
    },
    {
      q: 'Wieso nicht einfach Optimizely oder VWO?',
      a: 'Weil du dafür einen Entwickler und einen Tracking-Plan brauchst. Variante: Agent anschalten, Varianten reviewen, Winner ausrollen. Ohne Dev. Ohne Enterprise-Sales-Call.',
    },
    {
      q: 'Ich bin Solo-Founder — lohnt sich das?',
      a: 'Gerade dann. Deine Zeit ist zu wertvoll für manuelles A/B-Testing. Der Agent arbeitet, während du baust, verkaufst oder schläfst. Ein Experiment kann dir sagen, ob deine Pricing-Page 20 % mehr converted — das ist der ROI eines Nachmittags.',
    },
  ],

  closingH: 'Deine Seite kann ab heute besser werden.',
  closingSub: 'Ein Snippet, ein Experiment, kein Entwickler. Den Rest übernimmt der Agent.',
  closingCta: 'Kostenlos starten',

  footerLine: '© 2026 Variante · Made in Bavaria',
  footerDocs: 'Docs',
  footerPrivacy: 'Datenschutz',
  footerImprint: 'Impressum',

  badgeText: 'A/B by Variante',

  jsonldDescription:
    'A/B-Tests per KI-Agent — für Designer, Indie Hacker & Gründer. Kein Entwickler, kein Deployment.',
  jsonldProDescription: 'Unbegrenzt Experimente, Signifikanz-Analyse, Auto-Winner',

  metaTitle: 'A/B-Tests per KI-Agent — Für Designer, Indie Hacker & Gründer | Variante',
  metaDescription:
    'Autonomer KI-Agent für A/B-Tests. Seite analysieren, Varianten generieren, Conversions messen — kein Entwickler nötig. Für WordPress, Next.js, Shopify.',
  ogTitle: 'A/B-Tests per KI-Agent — Für Designer, Indie Hacker & Gründer | Variante',
  ogDescription:
    'Dein KI-Agent optimiert deine Seite. Varianten generieren, testen, Winner ausrollen — autonom.',
  twitterTitle: 'A/B-Tests per KI-Agent — Für Designer, Indie Hacker & Gründer | Variante',
  twitterDescription: 'Autonomer KI-Agent für A/B-Tests. Kein Entwickler nötig.',
  ogImageAlt: 'Variante — A/B-Testing per KI-Agent',
}

const en: LandingCopy = {
  navDemo: 'Demo',
  navPricing: 'Pricing',
  navLogin: 'Log in',
  navSignup: 'Start free',

  heroPill: 'AI Agents improve your conversion autonomously',
  heroH1: 'CRO best practice. In 5 minutes.',
  heroSub:
    'Total control, minimum effort. You decide what to optimize — hero, pricing, CTAs. Your AI analyzes, writes variants, measures conversions, and suggests the winner. You choose what goes live.',
  heroCta: 'Start free',
  heroFootnote: '',

  trustItems: [
    { label: 'Live in 5 minutes', text: 'Paste the snippet, the agent starts. No setup, no dev.' },
    { label: '5 KB snippet', text: 'Loads async. Zero performance impact.' },
    { label: 'GDPR-compliant', text: 'EU hosting. No third-country data.' },
    { label: 'AI agent', text: 'Autonomous. No briefing. No dev ticket.' },
  ],

  sectionWorks: 'Works with your stack',
  worksLabel: 'One snippet — anywhere you can paste a script tag',

  sectionAgent: 'AI agent automation',
  agentH: 'Total control. Minimum effort.',
  agentSub:
    'Classic A/B tools hand you a result and wait for your next idea. The Variante agent runs a loop: analyze, test, ship, start over. You set the goal, it does the laps.',
  agentMotto: 'Total control. Minimum effort.',
  agentMottoSub: 'Pick the one you want — AI does the rest.',
  agentModePill: 'You or AI',
  agentLoop: [
    {
      title: 'Analyze the page',
      body: 'The agent reads your page, finds the weakest conversion points, and ranks them by expected impact.',
    },
    {
      title: 'Create a hypothesis',
      body: 'It drafts a variant and writes it itself — copy, hierarchy, CTAs. All you do is review what ships.',
    },
    {
      title: 'Test it',
      body: 'Traffic gets split cleanly, conversions tracked, significance computed. No tracking plan required.',
    },
    {
      title: 'Choose the winner',
      body: 'The winner goes live automatically. The agent moves straight on to the next hypothesis.',
    },
  ],
  agentLoopNote: 'Every loop improves your site\'s conversion.',

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
      title: 'Your site. Your rules. Your agent.',
      body: 'Tell the agent which page to optimize. It automatically analyzes structure, conversion paths, and UX — WordPress, Next.js, Shopify, custom, doesn’t matter.',
    },
    {
      title: 'Variants generate themselves.',
      body: 'The agent writes variants based on what it learned — better CTAs, clearer hierarchy, optimized copy. You review what ships. Everything else is automatic.',
    },
    {
      title: 'Data over gut feel. Days, not weeks.',
      body: 'One snippet into your site — done. The agent serves variants, tracks conversions, computes significance, and rolls out the winner. Without touching a pipeline.',
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
        { label: 'AI agent analyzes your site', exclusive: false },
        { label: 'Autonomous variant generation', exclusive: false },
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

  sectionFaq: 'Frequently asked questions',
  faqs: [
    {
      q: 'Does the snippet slow down my site?',
      a: 'No. Under 5 KB, loads async, never blocks rendering. Your Core Web Vitals stay untouched.',
    },
    {
      q: 'Do I need to tell the agent exactly what to do?',
      a: 'Just roughly. “Optimize my pricing page” is enough. The agent analyzes independently, writes variants, you review — done. No prompt engineering needed.',
    },
    {
      q: 'Does this work with my stack?',
      a: 'WordPress, Webflow, Shopify, Framer, Squarespace, React, Next.js, custom HTML — if you can paste a <script> tag, it works.',
    },
    {
      q: 'How is this different from Optimizely or VWO?',
      a: 'You’d need a developer and a tracking plan for those. Variante: turn on the agent, review variants, ship the winner. No dev. No enterprise sales call.',
    },
    {
      q: 'I’m a solo founder — is this worth it?',
      a: 'Especially then. Your time is too valuable for manual A/B testing. The agent works while you build, sell, or sleep. One experiment can tell you if your pricing page converts 20% better — that’s an afternoon’s ROI.',
    },
  ],

  closingH: 'Your site can start improving today.',
  closingSub: 'One snippet, one experiment, no developer. The agent takes it from there.',
  closingCta: 'Start free',

  footerLine: '© 2026 Variante · Made in Bavaria',
  footerDocs: 'Docs',
  footerPrivacy: 'Privacy',
  footerImprint: 'Imprint',

  badgeText: 'A/B by Variante',

  jsonldDescription:
    'AI agent for A/B testing — for designers, indie hackers & founders. No developer, no pipeline.',
  jsonldProDescription: 'Unlimited experiments, significance analysis, auto-winner detection',

  metaTitle: 'AI Agent for A/B Testing — For Designers, Indie Hackers & Founders | Variante',
  metaDescription:
    'Autonomous AI agent for A/B testing. Analyze your site, generate variants, track conversions — no developer needed. Works with WordPress, Next.js, Shopify.',
  ogTitle: 'AI Agent for A/B Testing — For Designers, Indie Hackers & Founders | Variante',
  ogDescription:
    'Your AI agent optimizes your site. Generate variants, run tests, ship winners — autonomously.',
  twitterTitle: 'AI Agent for A/B Testing — For Designers, Indie Hackers & Founders | Variante',
  twitterDescription: 'Autonomous AI agent for A/B testing. No developer needed.',
  ogImageAlt: 'Variante — AI Agent for A/B Testing',
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
