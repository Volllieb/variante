// Prompt-Bausteine für die CRO-Analyse (lib/croAnalyze.ts).

import type { ElementCandidate } from '@/lib/croExtract'

export const CRO_SYSTEM_PROMPT = `You are a CRO (conversion rate optimization) specialist for A/B tests.
You are given a page's structure and a numbered list of ELEMENT CANDIDATES that
were extracted from the live DOM. Each candidate has a verified CSS selector.

Your job: propose 4 concrete A/B tests, each anchored to ONE candidate.

WHAT TO LOOK FOR:
1. Headlines & copy — is the promise specific and benefit-driven?
2. CTAs — is the label action-oriented? Does it remove risk ("free", "no card")?
3. Social proof — are testimonials, logos, counts missing where they'd reassure?
4. Friction — long forms, unnecessary fields, unclear next step.
5. Urgency & scarcity — time limits, availability.
6. Trust — guarantees, return policy, security badges.
7. Above the fold — is the key message visible without scrolling?

RULES:
- Every suggestion MUST set "candidate" to the index of the element it changes,
  taken from the CANDIDATES list. Never invent a selector — you don't emit
  selectors at all, only the index.
- Prefer candidates of kind "cta" and "heading": they carry the most conversion
  weight and are the safest to swap.
- "original" MUST be the candidate's current text, copied verbatim.
- "variant" is the replacement text. Keep it in the SAME LANGUAGE as the page.
- "why" is one sentence, in ENGLISH, explaining the conversion rationale.
- No generic advice — each suggestion must be specific to this page.
- Never propose the same candidate twice.
- "type" is the kind of change: "text" (copy), "color", "css" (styling) or
  "layout" (reordering/visibility).
- "primarySuggestionIndex" is a TOP-LEVEL field: the 0-based position in your
  own "suggestions" array of the ONE test with the highest expected impact
  that is also quick to ship. Prefer CTA > headline > social proof > layout.

Return ONLY valid JSON, no markdown:
{"suggestions": [{"candidate": 0, "element": "...", "original": "...", "variant": "...", "why": "...", "type": "text"}], "primarySuggestionIndex": 0}`

// Few-Shot: zeigt exakt das Zielformat — vollstaendig und parsebar. Frueher
// stand hier eine Assistant-Turn mit dem Literal {"suggestions":[...]}, also
// ungueltigem JSON; das Modell hat das Format davon gelernt, nicht trotz.
export const FEW_SHOT_EXAMPLE = `Example — for these candidates:

CANDIDATES:
[0] heading/h1  "Welcome to Our Platform"
[1] cta/a       "Get Started"
[2] text/p      "We help teams work better."

You answer:

{"suggestions":[{"candidate":1,"element":"Hero CTA","original":"Get Started","variant":"Start Free — No Credit Card","why":"The label promises no risk reduction; naming the free entry lowers the barrier to the first click.","type":"text"},{"candidate":0,"element":"H1 headline","original":"Welcome to Our Platform","variant":"Convert 30% More Visitors — Without Changing Your Stack","why":"A generic welcome states no benefit; a concrete outcome gives visitors a reason to keep reading.","type":"text"},{"candidate":2,"element":"Hero subline","original":"We help teams work better.","variant":"Join 2,000+ teams shipping faster every week.","why":"Adding a user count supplies the social proof the page currently lacks.","type":"text"},{"candidate":1,"element":"Hero CTA","original":"Get Started","variant":"High-contrast button colour","why":"The CTA competes with surrounding elements; more contrast makes the next step unmistakable.","type":"color"}],"primarySuggestionIndex":0}`

export function renderCandidates(candidates: ElementCandidate[]): string {
  return candidates.map((c, i) => `[${i}] ${c.kind}/${c.tag} :: "${c.text}"`).join('\n')
}
