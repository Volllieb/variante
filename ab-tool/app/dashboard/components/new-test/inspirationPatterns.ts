/**
 * inspirationPatterns — CRO-Pattern-Config für die Inspiration Gallery.
 *
 * Single Source of Truth für alle Patterns.
 * Jedes Pattern hat ein Prompt-Template, das mit Element-Info befüllt wird.
 *
 * Patterns sind statisch (Config-Array), keine DB — sie ändern sich selten.
 * Bei >10 Patterns: via API/Server-Props laden.
 */

import type { InspirationPattern } from './types'

export const PATTERNS: InspirationPattern[] = [
  {
    id: 'urgency',
    name: 'Urgency',
    icon: '⚡',
    description: 'Fügt Dringlichkeit hinzu — "Jetzt Angebot sichern" statt "Mehr erfahren"',
    promptTemplate: `Erstelle eine CRO-Variante mit Dringlichkeit für dieses Element.

Element: {element}
Original: "{original}"
Element-Typ: {elementType}
CSS-Selector: {selector}

Regeln:
- Button: Füge zeitliche Dringlichkeit hinzu ("Jetzt", "Sofort", "Nur heute", "Limited")
- Headline: Betone Knappheit oder Zeitlimit ("Nur noch X Plätze", "Angebot endet bald")
- Farbe: Orange/Rot-Töne für CTA-Hintergrund
- Erklärung: Kurz erklären warum Dringlichkeit die Conversion steigert

Gib NUR gültiges JSON zurück: {"variant": "...", "variant_html": "...", "variant_css": "...", "explanation": "..."}`,
    applicableTypes: ['button', 'headline', 'text', 'element'],
  },
  {
    id: 'social-proof',
    name: 'Social Proof',
    icon: '👥',
    description: '"Tritt 10.000+ zufriedenen Kunden bei" statt Standard-Text',
    promptTemplate: `Erstelle eine CRO-Variante mit Social Proof für dieses Element.

Element: {element}
Original: "{original}"
Element-Typ: {elementType}
CSS-Selector: {selector}

Regeln:
- Button/Text: Füge konkrete Zahlen hinzu ("10.000+", "5-Sterne", "von Tausenden empfohlen")
- Headline: Betone Beliebtheit oder Empfehlung ("Warum sich X für uns entscheiden")
- Farbe: Grün/Blau-Töne für Vertrauen
- Erklärung: Kurz erklären warum Social Proof die Conversion steigert

Gib NUR gültiges JSON zurück: {"variant": "...", "variant_html": "...", "variant_css": "...", "explanation": "..."}`,
    applicableTypes: ['button', 'headline', 'text'],
  },
  {
    id: 'risk-reversal',
    name: 'Risk Reversal',
    icon: '🛡️',
    description: '"14 Tage kostenlos testen" oder "Geld-zurück-Garantie"',
    promptTemplate: `Erstelle eine CRO-Variante mit Risikoumkehr für dieses Element.

Element: {element}
Original: "{original}"
Element-Typ: {elementType}
CSS-Selector: {selector}

Regeln:
- Button/Text: Füge risikofreie Elemente hinzu ("Kostenlos testen", "Geld-zurück-Garantie", "Keine Kreditkarte")
- Headline: Betone fehlendes Risiko ("Risikofrei starten", "Ohne Verpflichtung")
- Farbe: Grün-Töne für Sicherheit
- Erklärung: Kurz erklären warum Risikoumkehr die Conversion steigert

Gib NUR gültiges JSON zurück: {"variant": "...", "variant_html": "...", "variant_css": "...", "explanation": "..."}`,
    applicableTypes: ['button', 'headline', 'text'],
  },
  {
    id: 'clarity',
    name: 'Clarity',
    icon: '🎯',
    description: 'Konkreter Nutzen — "Spare 50%" statt "Spare Geld"',
    promptTemplate: `Erstelle eine CRO-Variante mit mehr Klarheit und Konkretion für dieses Element.

Element: {element}
Original: "{original}"
Element-Typ: {elementType}
CSS-Selector: {selector}

Regeln:
- Ersetze vage Versprechen durch konkrete Zahlen ("Spare 50%" statt "Spare Geld")
- Button: Nutzen-orientiert ("Steigere deine Conversion um 30%" statt "Mehr erfahren")
- Headline: Spezifisch und messbar
- Farbe: Hoher Kontrast für Lesbarkeit
- Erklärung: Kurz erklären warum Klarheit die Conversion steigert

Gib NUR gültiges JSON zurück: {"variant": "...", "variant_html": "...", "variant_css": "...", "explanation": "..."}`,
    applicableTypes: ['button', 'headline', 'text', 'element'],
  },
  {
    id: 'direction',
    name: 'Direction',
    icon: '🚀',
    description: 'CTA prominenter — primary Farbe, größer, zentriert',
    promptTemplate: `Erstelle eine CRO-Variante mit stärkerer visueller Richtung für dieses Element.

Element: {element}
Original: "{original}"
Element-Typ: {elementType}
CSS-Selector: {selector}

Regeln:
- Button: Primäre CTA-Farbe (hoher Kontrast), größer (padding: 14px 32px, font-size: 16px+)
- Button: Zentriert ausrichten, falls im Container
- Button: Border-radius 8px für moderne Optik
- Headline: Fetter, größer, zentriert
- Erklärung: Kurz erklären warum visuelle Richtung die Conversion steigert

Gib NUR gültiges JSON zurück: {"variant": "...", "variant_html": "...", "variant_css": "...", "explanation": "..."}`,
    applicableTypes: ['button', 'element'],
  },
]

/** Filtert Patterns, die für einen bestimmten Element-Typ verfügbar sind */
export function getPatternsForElementType(elementType: string): InspirationPattern[] {
  return PATTERNS.filter((p) => p.applicableTypes.includes(elementType as never))
}
