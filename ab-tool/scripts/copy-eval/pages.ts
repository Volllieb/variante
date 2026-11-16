// Testset für die Copy-Eval (Plan „KI-Varianten zurückholen“, Schritt 1).
// Mischung aus Zielgruppen (SaaS-Landing, Shop, Tool, eigene Seiten) und
// Sprachen (DE/EN). Nur öffentliche Startseiten; sie gehen als Kontext an OpenAI.
export const PAGES: { url: string; segment: string }[] = [
  { url: 'https://vallisride.com', segment: 'eigene Seite' },
  { url: 'https://www.getvariante.com/test-page/', segment: 'eigene Test-Page' },
  { url: 'https://www.getvariante.com', segment: 'eigene Landing' },
  { url: 'https://plausible.io', segment: 'SaaS EN' },
  { url: 'https://simpleanalytics.com', segment: 'SaaS EN' },
  { url: 'https://tally.so', segment: 'SaaS EN' },
  { url: 'https://buttondown.com', segment: 'SaaS EN' },
  { url: 'https://www.lemonsqueezy.com', segment: 'SaaS EN' },
  { url: 'https://usefathom.com', segment: 'SaaS EN' },
  { url: 'https://www.sevdesk.de', segment: 'SaaS DE' },
  { url: 'https://www.lexware.de', segment: 'SaaS DE' },
  { url: 'https://snocks.com', segment: 'Shop DE' },
  { url: 'https://www.allbirds.com', segment: 'Shop EN' },
  { url: 'https://www.manomama.de', segment: 'Shop DE' },
  { url: 'https://www.moin.ai', segment: 'SaaS DE' },
]
