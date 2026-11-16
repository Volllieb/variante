// Hebel-Bibliothek für die Copy-Generierung (Runde 5).
//
// Bewusst KEINE Liste fertiger „High-Converting“-Texte: Modelle kopieren
// Beispiele, das Ergebnis wäre „Get Started Free“ auf jeder Seite, und die
// meisten solcher Listen beruhen auf Einzelfall-Studien. Stattdessen:
// benannte Hebel (welches Prinzip eine Variante testet), Grundsätze,
// Negativbeispiele und Vorher/Nachher-Beispiele MIT Begründung aus Branchen,
// die nicht im Testset vorkommen. Die Hebel-ID wird mit jeder Variante
// gespeichert, damit sich später auswerten lässt, welche Hebel gewinnen.

export const HEADLINE_LEVERS = {
  h_outcome: 'Concrete result the visitor wants, instead of naming the product category',
  h_problem: 'Names the problem the visitor has right now, in their own words',
  h_contrast: 'Contrast with the usual way or the enemy ("without X", "instead of Y", "not X but Y")',
  h_specific: 'Specificity: a real number, time, place or detail from the brief makes the promise believable',
  h_audience: 'Calls out who it is for, so the right visitor feels meant',
  h_mechanism: 'How it works differently (the unique mechanism behind the promise)',
  h_objection: 'Answers the biggest doubt before the visitor raises it',
  h_story: 'Evokes the story, feeling or identity (fits personal, brand and lifestyle pages)',
} as const

export const CTA_LEVERS = {
  c_value: 'Verb + what the visitor gets ("Get my report" instead of "Submit")',
  c_first_person: 'First person, the visitor speaks ("Start my trial", "Ich will dabei sein")',
  c_risk: 'Takes the risk away in or next to the label (only if the page states it: free, no card, cancel anytime)',
  c_low_commit: 'Asks for a smaller step than the original ("See plans" instead of "Buy now")',
  c_outcome: 'Puts the result into the button ("Start saving time")',
  c_specific_step: 'Concrete next step with a detail from the page ("Book a 20-min call")',
  c_urgency: 'Real deadline or limited offer, ONLY if the page states it',
} as const

export const LEVER_IDS = [...Object.keys(HEADLINE_LEVERS), ...Object.keys(CTA_LEVERS)]

export type LeverId = keyof typeof HEADLINE_LEVERS | keyof typeof CTA_LEVERS

/** Kurzname des Hebels für die UI (Englisch, wie alle UI-Texte). */
export const LEVER_LABELS: Record<LeverId, string> = {
  h_outcome: 'Concrete result',
  h_problem: 'Names the problem',
  h_contrast: 'Contrast',
  h_specific: 'Specific detail',
  h_audience: 'Calls out the audience',
  h_mechanism: 'How it works',
  h_objection: 'Answers a doubt',
  h_story: 'Story & feeling',
  c_value: 'Verb + value',
  c_first_person: 'First person',
  c_risk: 'Removes risk',
  c_low_commit: 'Smaller step',
  c_outcome: 'Result in the button',
  c_specific_step: 'Concrete next step',
  c_urgency: 'Real deadline',
}

const list = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `- ${k}: ${v}`).join('\n')

export const LEVER_BLOCK = `CONVERSION PRINCIPLES
- Clarity beats cleverness. A visitor who doesn't get it in 3 seconds leaves.
- Specific beats generic. Use the page's own concrete facts and words, not category buzzwords.
- One idea per variant. A variant that tests three things at once teaches nothing.
- Speak the visitor's language (their problem, their goal), not company jargon.
- Bold over safe, but never deceptive: urgency, scarcity, social proof and guarantees only if the page states them.

LEVERS — each variant tests exactly ONE lever. First decide which 3 levers fit THIS page best (a personal travel blog needs different levers than B2B software), then write one variant per lever. Never use the same lever twice.
Headline levers:
${list(HEADLINE_LEVERS)}
CTA levers:
${list(CTA_LEVERS)}

AVOID (weak, generic or untrustworthy):
- Empty hype words: "Unlock", "Revolutionize", "Seamless", "Next-level", "Supercharge", "Elevate", "Game-changing"
- Superlatives without proof: "best", "#1", "ultimate", "the only"
- Bare "Get started" / "Learn more" / "Mehr erfahren" when a more specific action fits
- Questions as headlines (unless the original is one), stacked buzzwords, puns that hide the meaning

EXAMPLES of the thinking (other industries; the facts named are from those pages):
1. Invoicing software, headline "Smart invoicing for small businesses"
   → h_outcome: "Get paid in 7 days, not 30" — the page says invoices get paid in 7 days on average; a result beats a category.
2. Organic bakery shop, CTA "Submit"
   → c_value: "Order my bread box" — names what the visitor gets instead of a form action.
3. Yoga studio, headline "Welcome to Studio Flow"
   → h_audience: "Yoga for desk workers with stiff backs" — the page targets office workers; "welcome" says nothing.
4. Web agency, CTA "Contact us"
   → c_specific_step: "Book a 20-min site review" — the page offers free reviews; a concrete, small step lowers the barrier.
5. Solo sailing blog, headline "Into the Blue"
   → h_story: "Sailing solo around the world on a 9 m boat" — keeps the adventure feeling, adds what it actually is.
6. Steuerberatung, CTA "Kontakt"
   → c_low_commit: "Kostenloses Erstgespräch buchen" — die Seite bietet es an; kleiner, klarer Schritt statt allgemeinem Kontakt.
`
