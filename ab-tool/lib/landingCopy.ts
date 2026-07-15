// Landingpage-Copy DE/EN — ICP: Designer ohne Dev-Zugriff (WordPress, Next.js, Shopify)
// Deutsch = Default (DACH-ICP), Englisch = Fallback für internationale Reach

export type Lang = 'de' | 'en'

export interface LandingCopy {
  // Header
  navPlayground: string
  navLogin: string
  navSignup: string

  // Hero
  heroH1: string
  heroSub: string
  heroCta: string
  heroFootnote: string

  // How it works
  sectionHow: string
  step1Title: string
  step1Body: string
  step2Title: string
  step2Body: string
  step3Title: string
  step3Body: string
  platformNote: string
  platformItems: string

  // Pricing
  sectionPricing: string
  freeLabel: string
  freePrice: string
  freeSub: string
  freeCta: string
  proLabel: string
  proPrice: string
  proSub: string
  proCta: string
  proBadge: string

  // Features
  freeFeatures: string[]
  proFeatures: string[]
  proFeatureExclusive: boolean[]

  // Agency
  agencyLabel: string
  agencyPrice: string
  agencySub: string
  agencyCta: string
  agencyFeatures: string[]
  agencyFeatureExclusive: boolean[]

  // Micro-Trust
  sectionTrust: string
  trustItems: { label: string; text: string }[]

  // Works-with logos
  sectionWorks: string
  worksLabel: string

  // Figma Community
  figmaCommunityTitle: string
  figmaCommunityText: string
  figmaCommunityLinkText: string

  // Solo-dev transparency + implied usage
  soloDevTitle: string
  soloDevBody: string
  impliedUsersText: string

  // FAQ
  sectionFaq: string
  faqs: { q: string; a: string }[]

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
  navPlayground: '🏖️ Playground',
  navLogin: 'Login',
  navSignup: 'Kostenlos testen',

  heroH1: 'A/B-Tests für Designer, die keinen Entwickler haben.',
  heroSub:
    'Klick auf ein Element deiner Live-Seite. Redesign in Figma. Die KI baut Variante B — pixelgenau, mit deinen Breakpoints. Funktioniert mit WordPress, Next.js, Shopify — überall, wo du ein Script-Tag einfügen kannst.',
  heroCta: 'Kostenlos starten — kein Entwickler nötig',
  heroFootnote: 'Keine Kreditkarte · 1 kostenloses Experiment',

  sectionHow: 'So funktioniert\'s',
  step1Title: 'Kein Dev. Kein FTP. Kein Briefing.',
  step1Body:
    'Dein Kunde hat dir nur WordPress-Admin gegeben? Oder den Shopify-Login? Kein Problem. Klick das Element an, das du testen willst — der Picker erfasst HTML, CSS und den Framework-Kontext. Du entscheidest, was getestet wird.',
  step2Title: 'Dein Design, pixelgenau.',
  step2Body:
    'Redesign in Figma — deine Tools, dein Workflow. Die KI liest Original und Redesign, schreibt Variante B passend zu deinen bestehenden Styles und Breakpoints. Kein Dev, der „geht nicht" sagt.',
  step3Title: 'Live in 60 Sekunden.',
  step3Body:
    'Ein Snippet in die Seite einfügen — fertig. Variante serviert die richtige Version, trackt Conversions, liefert Ergebnisse. Ohne Deployment-Pipeline. Ohne dass der Kunde was merkt.',
  platformNote:
    'Ein Snippet. Funktioniert mit',
  platformItems: 'WordPress, React, Next.js, Shopify, Custom HTML',

  sectionPricing: 'Preise',
  freeLabel: 'Free',
  freePrice: '0 €',
  freeSub: 'Dauerhaft kostenlos. Keine Kreditkarte.',
  freeCta: 'Kostenlos starten',
  proLabel: 'Pro',
  proPrice: '35 €',
  proSub: 'Alles aus Free, plus:',
  proCta: 'Jetzt starten',
  proBadge: 'Am beliebtesten',

  freeFeatures: [
    '1 aktives Experiment — test your first idea, free.',
    'KI-Variantengenerierung — pixelgenau aus Figma.',
    'Live-Page-Editing in Figma — Seite pullen, editieren, A/B-testen statt speichern.',
    'Ganze Sektionen testen — Hero, Pricing, CTAs. Nicht nur einzelne Elemente.',
    'Conversion-Tracking — eingebaut, kein Extra-Setup.',
    '"Powered by Variante"-Badge — deine Besucher werden deine Empfehlungen.',
  ],
  proFeatures: [
    'Unbegrenzt Experimente',
    'KI-Variantengenerierung',
    'Dynamic Content — verschiedene Inhalte für YouTube-, Google- & Co.-Besucher',
    'Preis-Testing — experimentiere mit Preisplänen und Preispunkten',
    'Statistische Signifikanz — weiß, wann du aufhören kannst zu testen',
    'Auto-Winner — beste Variante wird automatisch ausgerollt',
    'Kein Branding auf deiner Seite',
    'Priority-Support',
  ],
  proFeatureExclusive: [true, false, true, true, true, true, true, true],

  agencyLabel: 'Agency',
  agencyPrice: '99 €',
  agencySub: 'Alles aus Pro, für Agenturen:',
  agencyCta: 'Agentur starten',
  agencyFeatures: [
    'Alles aus Pro',
    'Bis zu 100 Domains — alle Kunden-Sites managen',
    'White-Label — keine Variante-Erwähnung auf Kunden-Sites',
    'Dedizierter Support — Direktkontakt, kein Ticket-System',
    'Team-Zugang — Tests agenturweit teilen',
    'Kunden-Reports — gebrandete PDFs für deine Kunden',
    'Priority-Feature-Requests — gestalte die Roadmap mit',
    'Frühzugang zu neuen Features',
  ],
  agencyFeatureExclusive: [true, true, true, true, false, false, false, false],

  // Micro-Trust
  sectionTrust: '',
  trustItems: [
    { label: 'Keine Kreditkarte', text: 'Jederzeit kündbar. Kein Lock-in.' },
    { label: '5 KB Snippet', text: 'Lädt asynchron. Null Performance-Impact.' },
    { label: 'DSGVO-konform', text: 'EU-Hosting. Keine Drittstaaten-Daten.' },
    { label: 'Figma-nativ', text: 'Kein Dev-Ticket. Dein Workflow, deine Tools.' },
  ],

  // Works-with logos
  sectionWorks: 'Funktioniert mit deinem Stack',
  worksLabel: 'Ein Snippet — überall wo du ein Script-Tag einfügen kannst',

  // Figma Community
  figmaCommunityTitle: 'Live in der Figma Community',
  figmaCommunityText: 'Das Plugin ist live in der Figma Community — direkt aus deinem Editor installierbar. Designer testen bereits ohne auf Entwickler zu warten.',
  figmaCommunityLinkText: 'Plugin in Figma öffnen →',

  // Solo-dev transparency + implied usage
  soloDevTitle: 'Gebaut von einem Designer, für Designer.',
  soloDevBody: 'Kein VC, kein 20-Personen-Team. Ein Solo-Dev aus Bayern, der die "kannst du das mal eben testen?"-Frage satt hatte. Jede Zeile Code ist dokumentiert, jedes Update öffentlich im Changelog.',
  impliedUsersText: 'Schließ dich Designern an, die testen ohne auf Dev-Tickets zu warten.',

  sectionFaq: 'Häufige Fragen',
  faqs: [
    {
      q: 'Bremst das Snippet meine Seite aus?',
      a: 'Nein. Unter 5 KB, lädt asynchron, blockiert nie das Rendering. Deine Core Web Vitals bleiben unberührt.',
    },
    {
      q: 'Was, wenn die KI fehlerhaften Code generiert?',
      a: 'Du prüfst jede Variante, bevor sie live geht. Vorschau, Diff, Freigabe — nichts geht ohne dein OK raus.',
    },
    {
      q: 'Funktioniert das mit meinem Stack?',
      a: 'Wenn du ein &lt;script&gt;-Tag einfügen kannst, funktioniert es. WordPress, React, Next.js, Shopify, Webflow, Framer, Squarespace, Custom HTML — alles supported.',
    },
    {
      q: 'Wieso nicht einfach Optimizely oder VWO?',
      a: 'Kein Entwickler-Setup. Kein Tracking-Plan. Kein „Enterprise"-Sales-Call. Klick auf ein Element, redesign in Figma, live.',
    },
  ],

  footerLine: '© 2026 Variante · Made in Bavaria',
  footerDocs: 'Docs',
  footerPrivacy: 'Datenschutz',
  footerImprint: 'Impressum',

  badgeText: 'A/B by Variante',

  jsonldDescription:
    'A/B-Tests für Designer ohne Dev-Zugriff — aus Figma, kein Entwickler, kein Deployment.',
  jsonldProDescription: 'Unbegrenzt Experimente, Signifikanz-Analyse, Auto-Winner',

  metaTitle: 'A/B-Tests für Designer — Kein Entwickler nötig | Variante',
  metaDescription:
    'A/B-Tests für Designer ohne Dev-Zugriff. Element anklicken, in Figma redesignen, KI generiert Variante B. Kein Entwickler, kein Deployment.',
  ogTitle: 'A/B-Tests für Designer — Kein Entwickler nötig | Variante',
  ogDescription:
    'A/B-Tests für Designer ohne Dev-Zugriff. Klick → Redesign → Live. Kein Entwickler nötig.',
  twitterTitle: 'A/B-Tests für Designer — Kein Entwickler nötig | Variante',
  twitterDescription:
    'A/B-Tests für Designer ohne Dev-Zugriff. Kein Entwickler nötig.',
  ogImageAlt: 'Variante — A/B-Testing aus Figma',
}

const en: LandingCopy = {
  navPlayground: '🏖️ Playground',
  navLogin: 'Log in',
  navSignup: 'Sign up — free',

  heroH1: 'A/B testing for designers who don\'t have a developer.',
  heroSub:
    'Click any element on your live site. Redesign in Figma. AI builds Variant B — pixel-perfect, with your breakpoints. Works with WordPress, Next.js, Shopify — anywhere you can paste a script tag.',
  heroCta: 'Start free — no developer needed',
  heroFootnote: 'No credit card · 1 free experiment',

  sectionHow: 'How it works',
  step1Title: 'No dev. No FTP. No briefing.',
  step1Body:
    'Client only gave you WordPress admin? Or the Shopify login? No problem. Click the element you want to test — the picker captures HTML, CSS, and framework context. You decide what gets tested.',
  step2Title: 'Your design, pixel‑perfect.',
  step2Body:
    'Redesign in Figma — your tools, your workflow. AI reads both sides and writes Variant B matching your existing styles and breakpoints. No developer telling you "can\'t be done."',
  step3Title: 'Live in 60 seconds.',
  step3Body:
    'Paste one snippet into the site — done. It serves the right variant, tracks conversions, reports results. No deploy pipeline. Your client won\'t even notice.',
  platformNote:
    'One snippet. Works with',
  platformItems: 'WordPress, React, Next.js, Shopify, Custom HTML',

  sectionPricing: 'Pricing',
  freeLabel: 'Free',
  freePrice: '0 €',
  freeSub: 'Forever free. No credit card.',
  freeCta: 'Start free',
  proLabel: 'Pro',
  proPrice: '35 €',
  proSub: 'Everything in Free, plus:',
  proCta: 'Get started',
  proBadge: 'Most popular',

  freeFeatures: [
    '1 active experiment — test your first idea, free.',
    'AI variant generation — pixel-perfect from Figma.',
    'Live-page editing in Figma — pull your site, edit, A/B test instead of save.',
    'Test full sections — hero, pricing, CTAs. Not just single elements.',
    'Conversion tracking — built-in, no extra setup.',
    '"Powered by Variante" badge — your visitors become your referrals.',
  ],
  proFeatures: [
    'Unlimited experiments',
    'AI variant generation',
    'Dynamic content — different pages for YouTube, Google & co. visitors',
    'Price testing — experiment with pricing plans and price points',
    'Statistical significance — know when to stop testing',
    'Auto-winner — best variant ships automatically',
    'No branding on your site',
    'Priority support',
  ],
  proFeatureExclusive: [true, false, true, true, true, true, true, true],

  agencyLabel: 'Agency',
  agencyPrice: '99 €',
  agencySub: 'Everything in Pro, for agencies:',
  agencyCta: 'Start agency',
  agencyFeatures: [
    'Everything in Pro',
    'Up to 100 domains — manage all client sites',
    'White-label — no Variante mention on client sites',
    'Dedicated support — direct line, not tickets',
    'Team access — share tests across your agency',
    'Client reports — branded PDFs for your customers',
    'Priority feature requests — shape the roadmap',
    'Early access to new features',
  ],
  agencyFeatureExclusive: [true, true, true, true, false, false, false, false],

  // Micro-Trust
  sectionTrust: '',
  trustItems: [
    { label: 'No credit card', text: 'Cancel anytime. No lock-in.' },
    { label: '5 KB snippet', text: 'Loads async. Zero performance impact.' },
    { label: 'GDPR-compliant', text: 'EU hosting. No third-country data.' },
    { label: 'Figma-native', text: 'No dev ticket. Your workflow, your tools.' },
  ],

  // Works-with logos
  sectionWorks: 'Works with your stack',
  worksLabel: 'One snippet — anywhere you can paste a script tag',

  // Figma Community
  figmaCommunityTitle: 'Live on Figma Community',
  figmaCommunityText: 'The plugin is live on the Figma Community — install it right from your editor. Designers are already testing without waiting on developers.',
  figmaCommunityLinkText: 'Open plugin in Figma →',

  // Solo-dev transparency + implied usage
  soloDevTitle: 'Built by a designer, for designers.',
  soloDevBody: 'No VC, no 20-person team. A solo dev from Bavaria who got tired of the "can you just quickly test this?" question. Every line of code is documented, every update public in the changelog.',
  impliedUsersText: 'Join designers who test without waiting on dev tickets.',

  sectionFaq: 'You might be wondering',
  faqs: [
    {
      q: 'Does the snippet slow down my site?',
      a: 'No. It\'s under 5 KB, loads asynchronously, and never blocks rendering. Your Core Web Vitals stay untouched.',
    },
    {
      q: 'What if the AI generates broken code?',
      a: 'You review every variant before it goes live. Preview, diff, approve — nothing ships without your sign-off.',
    },
    {
      q: 'Does this work with my stack?',
      a: 'If you can paste a &lt;script&gt; tag, it works. WordPress, React, Next.js, Shopify, Webflow, Framer, Squarespace, custom HTML — all supported.',
    },
    {
      q: 'How is this different from Optimizely or VWO?',
      a: 'No developer setup. No tracking plan. No "enterprise" sales call. Just pick an element, redesign in Figma, ship.',
    },
  ],

  footerLine: '© 2026 Variante · Made in Bavaria',
  footerDocs: 'Docs',
  footerPrivacy: 'Privacy',
  footerImprint: 'Imprint',

  badgeText: 'A/B by Variante',

  jsonldDescription:
    'A/B testing for designers without dev access — from Figma, no developer, no pipeline.',
  jsonldProDescription: 'Unlimited experiments, significance analysis, auto-winner detection',

  metaTitle: 'A/B Testing for Designers — No Developer Needed | Variante',
  metaDescription:
    'A/B testing for designers without dev access. Click any element, redesign in Figma, AI ships Variant B. No developer, no pipeline.',
  ogTitle: 'A/B Testing for Designers — No Developer Needed | Variante',
  ogDescription:
    'A/B testing for designers without dev access. Click → Redesign → Ship. No developer needed.',
  twitterTitle: 'A/B Testing for Designers — No Developer Needed | Variante',
  twitterDescription:
    'A/B testing for designers without dev access. No developer needed.',
  ogImageAlt: 'Variante — A/B Testing from Figma',
}

// Helper: detect language from request headers
export function getLang(acceptLanguage: string | null, cookieLang: string | null): Lang {
  if (cookieLang === 'de' || cookieLang === 'en') return cookieLang
  if (acceptLanguage?.toLowerCase().startsWith('de')) return 'de'
  return 'en'
}

export function getCopy(lang: Lang): LandingCopy {
  return lang === 'de' ? de : en
}

export { de as deCopy, en as enCopy }
