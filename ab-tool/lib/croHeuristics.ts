// Regelbasierte CRO-Heuristiken: HTML-Analyse ohne AI.
// Scannt 10 Conversion-relevante Dimensionen direkt im HTML.
// Jede Heuristik gibt Score (0–100, höher = besser), Gap und Fix-Vorschlag.
// Vom Agent als Tool (analyzeHeuristics) parallel zu analyzeCRO nutzbar.

export interface HeuristicResult {
  id: string
  label: string
  score: number       // 0–100: wie gut die Seite in dieser Kategorie ist
  gap: string         // Was fehlt oder falsch ist (deutsch)
  suggestion: string  // Konkreter Fix (deutsch)
}

export interface HeuristicsReport {
  results: HeuristicResult[]
  overallScore: number
  topGaps: HeuristicResult[]  // Top 3 Gaps (niedrigste Scores)
}

const BAD_CTA_TEXTS = /submit|send|ok|go|click here|weiter|abschicken|senden/i
const URGENCY_PATTERNS = /nur noch|nur heute|begrenzt|limited|verfügbar|ausverkauft|endet|ablauf|countdown|timer/i

// Extrahiert sichtbaren Text aus HTML (ohne Tags, Script, Style)
function visibleText(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Zählt Elemente im HTML (roh, case-insensitive)
function countTags(html: string, tag: string): number {
  const re = new RegExp(`<${tag}[\\s>]`, 'gi')
  return (html.match(re) ?? []).length
}

// ─── Einzel-Heuristiken ───

// 1. CTA-Position: Button/Link above the fold (erste 2000 Zeichen)
function checkCTAPosition(html: string): HeuristicResult {
  const early = html.slice(0, 2000)
  const hasEarlyCTA = /<(?:a|button)\b[^>]*?(?:cta|primary|hero|action|sign|start|buy|demo|trial|get-started|jetzt|kaufen|anmelden)[^>]*>/i.test(early)
  const hasEarlyButton = /<button\b/i.test(early)
  const hasEarlyActionLink = /<a\b[^>]*?(?:cta|primary|hero|action|sign|start|buy|demo|trial|get-started)/i.test(early)

  if (hasEarlyCTA) return { id: 'cta-position', label: 'CTA Position', score: 90, gap: '', suggestion: '' }
  if (hasEarlyButton || hasEarlyActionLink) return { id: 'cta-position', label: 'CTA Position', score: 60, gap: 'CTA vorhanden aber nicht prominent markiert (keine CTA-Klasse)', suggestion: 'Style den Haupt-Button mit einer auffälligen CTA-Klasse (z.B. bg-primary, große Schrift, Kontrastfarbe).' }
  return { id: 'cta-position', label: 'CTA Position', score: 20, gap: 'Kein CTA-Button oberhalb der Falz gefunden', suggestion: 'Platziere einen prominenten CTA-Button in den ersten 2000 Zeichen des HTML — Besucher scrollen oft nicht weiter.' }
}

// 2. Social Proof
function checkSocialProof(html: string, text: string): HeuristicResult {
  const lower = text.toLowerCase()
  const hasTestimonials = /testimonial|kundenstimme|erfahrungsbericht|bewertung|rezension|review|was.*kunden.*sagen|what.*customers.*say/i.test(lower) || /"[^"]{30,}"/.test(lower)
  const hasNumbers = /[\d,.]+ (customer|kunde|user|nutzer|client|mandant|company|unternehmen|team|people)/i.test(lower) || /trusted by|genutzt von|vertrauen/i.test(lower)
  const hasLogos = /<img[^>]*?(?:logo|client|partner|brand)[^>]*>/i.test(html)

  if (hasTestimonials && hasNumbers) return { id: 'social-proof', label: 'Social Proof', score: 90, gap: '', suggestion: '' }
  if (hasTestimonials || hasLogos) return { id: 'social-proof', label: 'Social Proof', score: 55, gap: 'Social Proof vorhanden aber kein quantitativer Beleg', suggestion: 'Ergänze konkrete Zahlen: "Über 10.000 Kunden", "200+ Unternehmen vertrauen uns".' }
  return { id: 'social-proof', label: 'Social Proof', score: 15, gap: 'Keine Testimonials, Kundenlogos oder Nutzerzahlen gefunden', suggestion: 'Füge Social Proof ein: 1–3 Kundenlogos oder ein kurzes Testimonial mit Foto.' }
}

// 3. Trust Signals
function checkTrustSignals(text: string): HeuristicResult {
  const lower = text.toLowerCase()
  let score = 0
  const missing: string[] = []

  if (/geld.zurück|geld zurück|money.back|rückerstattung|refund|garantie|risikofrei|kostenlos testen|free trial/i.test(lower)) score += 30
  else missing.push('Geld-zurück-Garantie')

  if (/dsgvo|datenschutz|privacy|ssl|verschlüssel|sicher|trust|geprüft|zertifiziert|iso|tüv/i.test(lower)) score += 30
  else missing.push('Sicherheits-/Datenschutz-Signale')

  if (/faq|häufige fragen|support|hilfe|kontakt|contact/i.test(lower)) score += 20
  else missing.push('Support/Kontakt-Links')

  if (/paypal|klarna|rechnung|kreditkarte|visa|mastercard|sichere zahlung/i.test(lower)) score += 20
  else missing.push('Zahlungs-Vertrauenssignale')

  if (score >= 70) return { id: 'trust-signals', label: 'Vertrauen', score, gap: '', suggestion: '' }
  return { id: 'trust-signals', label: 'Vertrauen', score, gap: `Fehlende Vertrauenssignale: ${missing.join(', ')}`, suggestion: `Ergänze: ${missing[0]}.` }
}

// 4. Formular-Komplexität
function checkFormComplexity(html: string): HeuristicResult {
  const inputCount = countTags(html, 'input') + countTags(html, 'textarea') + countTags(html, 'select')
  if (inputCount === 0) return { id: 'form-complexity', label: 'Formular', score: 100, gap: '', suggestion: '' }
  if (inputCount <= 3) return { id: 'form-complexity', label: 'Formular', score: 90, gap: '', suggestion: '' }
  if (inputCount <= 5) return { id: 'form-complexity', label: 'Formular', score: 60, gap: `${inputCount} Formularfelder — könnte Conversion kosten`, suggestion: 'Reduziere auf max. 3 Felder (E-Mail reicht oft für Lead-Gen).' }
  return { id: 'form-complexity', label: 'Formular', score: 25, gap: `${inputCount} Formularfelder sind zu viele`, suggestion: 'Multi-Step-Form oder Reduktion auf E-Mail-only. Jedes zusätzliche Feld senkt die Conversion-Rate.' }
}

// 5. Headline
function checkHeadline(html: string): HeuristicResult {
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (!h1Match) return { id: 'headline', label: 'Überschrift', score: 0, gap: 'Keine H1-Überschrift gefunden', suggestion: 'Jede Landingpage braucht eine H1 mit klarem Nutzenversprechen.' }

  const h1Text = h1Match[1].replace(/<[^>]+>/g, '').trim()
  if (h1Text.length < 10) return { id: 'headline', label: 'Überschrift', score: 20, gap: `H1 zu kurz: "${h1Text}"`, suggestion: 'H1 sollte das Hauptversprechen in 6–12 Wörtern kommunizieren.' }
  if (h1Text.length > 120) return { id: 'headline', label: 'Überschrift', score: 45, gap: `H1 zu lang (${h1Text.length} Zeichen)`, suggestion: 'Kürze die H1 auf ein prägnantes Nutzenversprechen.' }
  if (/willkommen|welcome|home|startseite/i.test(h1Text)) return { id: 'headline', label: 'Überschrift', score: 10, gap: `H1 generisch: "${h1Text}"`, suggestion: 'Ersetze durch konkretes Nutzenversprechen.' }

  return { id: 'headline', label: 'Überschrift', score: 80, gap: '', suggestion: '' }
}

// 6. CTA-Text
function checkCTAText(html: string): HeuristicResult {
  const btns = html.match(/<(?:button|a)\b[^>]*>[\s\S]*?<\/(?:button|a)>/gi) ?? []
  const texts = btns.map(b => b.replace(/<[^>]+>/g, '').trim()).filter(t => t.length > 0 && t.length < 80)
  if (texts.length === 0) return { id: 'cta-text', label: 'CTA-Text', score: 30, gap: 'Keine CTA-Elemente mit Text gefunden', suggestion: 'Jede Landingpage braucht mindestens einen CTA mit handlungsorientiertem Text.' }

  const bad = texts.filter(t => BAD_CTA_TEXTS.test(t))
  if (bad.length > 0) return { id: 'cta-text', label: 'CTA-Text', score: 20, gap: `Generische CTA-Texte: ${bad.map(t => `"${t}"`).join(', ')}`, suggestion: 'Nutze aktive Texte: "Jetzt kostenlos starten", "Demo buchen", "Angebot einholen".' }
  return { id: 'cta-text', label: 'CTA-Text', score: 75, gap: '', suggestion: '' }
}

// 7. Urgency/Scarcity
function checkUrgency(text: string): HeuristicResult {
  if (URGENCY_PATTERNS.test(text.toLowerCase())) return { id: 'urgency', label: 'Dringlichkeit', score: 85, gap: '', suggestion: '' }
  return { id: 'urgency', label: 'Dringlichkeit', score: 40, gap: 'Keine Dringlichkeits- oder Knappheitssignale', suggestion: 'Füge dezente Dringlichkeit hinzu: "Nur noch X Plätze", "Angebot endet am…". Authentisch bleiben.' }
}

// 8. Viewport / Mobile
function checkViewport(html: string): HeuristicResult {
  if (/meta.*viewport/i.test(html)) return { id: 'viewport', label: 'Mobile', score: 90, gap: '', suggestion: '' }
  return { id: 'viewport', label: 'Mobile', score: 10, gap: 'Kein meta viewport-Tag gefunden', suggestion: 'Füge <meta name="viewport" content="width=device-width, initial-scale=1"> im <head> ein.' }
}

// 9. Navigation
function checkNavSimplicity(html: string): HeuristicResult {
  const linkCount = countTags(html, 'a')
  if (linkCount <= 8) return { id: 'nav-simplicity', label: 'Navigation', score: 85, gap: '', suggestion: '' }
  if (linkCount <= 15) return { id: 'nav-simplicity', label: 'Navigation', score: 55, gap: `${linkCount} Links — könnte ablenken`, suggestion: 'Reduziere sichtbare Links auf max. 5–8 in der Hauptnavigation.' }
  return { id: 'nav-simplicity', label: 'Navigation', score: 20, gap: `${linkCount} Links sind zu viele`, suggestion: 'Straffe auf 4–5 Nav-Einträge. Mehr Links = weniger Fokus auf den CTA.' }
}

// 10. Visuelle Hierarchie (H1→H2→H3)
function checkVisualHierarchy(html: string): HeuristicResult {
  const h1 = countTags(html, 'h1')
  const h2 = countTags(html, 'h2')
  const h3 = countTags(html, 'h3')

  if (h1 === 0 && h2 === 0) return { id: 'visual-hierarchy', label: 'Hierarchie', score: 15, gap: 'Keine Überschriften-Struktur', suggestion: 'Strukturiere mit H1 (Hauptversprechen), H2 (Sektionen), H3 (Details).' }
  if (h1 === 0) return { id: 'visual-hierarchy', label: 'Hierarchie', score: 30, gap: 'Keine H1, nur H2/H3', suggestion: 'Füge EINE H1 als Hauptüberschrift ein.' }
  if (h1 > 1) return { id: 'visual-hierarchy', label: 'Hierarchie', score: 40, gap: 'Mehrere H1-Tags — SEO-Problem', suggestion: 'Nur EINE H1 pro Seite verwenden.' }
  if (h1 === 1 && h2 >= 2) return { id: 'visual-hierarchy', label: 'Hierarchie', score: 85, gap: '', suggestion: '' }
  return { id: 'visual-hierarchy', label: 'Hierarchie', score: 55, gap: 'Flache Struktur, kaum Unterüberschriften', suggestion: 'Füge H2-Überschriften für Sektionen hinzu.' }
}

// ─── Hauptfunktion ───

export function analyzeHeuristics(html: string): HeuristicsReport {
  const text = visibleText(html)

  const results: HeuristicResult[] = [
    checkCTAPosition(html),
    checkSocialProof(html, text),
    checkTrustSignals(text),
    checkFormComplexity(html),
    checkHeadline(html),
    checkCTAText(html),
    checkUrgency(text),
    checkViewport(html),
    checkNavSimplicity(html),
    checkVisualHierarchy(html),
  ]

  const overallScore = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
  const topGaps = results
    .filter(r => r.gap)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)

  return { results, overallScore, topGaps }
}
