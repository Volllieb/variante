import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * Klassen-Merge für die UI-Primitives.
 *
 * Vorher hängten Button und Card ihre Klassen per Template-Literal aneinander
 * (`${variantClasses[variant]} ${className}`). Tailwind entscheidet bei
 * Konflikten aber nicht nach Reihenfolge im String, sondern nach Position im
 * generierten Stylesheet — `<Button className="px-8">` konnte das `px-4` der
 * Size-Variante also je nach Build gewinnen oder verlieren. twMerge löst den
 * Konflikt deterministisch zugunsten der zuletzt übergebenen Klasse.
 *
 * ── Warum extendTailwindMerge und nicht das nackte twMerge ──
 * Unsere Schriftgrößen heißen `text-meta … text-display-lg` (§3), unsere
 * Textfarben `text-text`, `text-ok`, `text-err` … (§2). twMerge kennt keine
 * davon und erkennt eine Größe sonst an der T-Shirt-Form (`text-sm`); „meta"
 * und „ok" sehen beide nach einem Farbnamen aus, also landeten sie in
 * derselben Konfliktgruppe und die letzte Klasse gewann:
 *
 *   twMerge('text-meta', 'text-ok')                       → 'text-ok'
 *   twMerge('text-text-on-invert', 'text-small')          → 'text-small'
 *
 * Die zweite Zeile ist der Primär-Button: Fläche weiß, Textfarbe weg. Die
 * beiden classGroups unten trennen Größe und Farbe wieder, damit
 * `text-meta text-ok` zusammen überleben und ein `className="text-body"`
 * weiterhin nur die Größe überschreibt.
 */

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        { text: ['meta', 'small', 'body', 'title', 'heading', 'display', 'display-lg'] },
      ],
      'text-color': [
        { text: ['text', 'text-2', 'text-3', 'text-on-invert', 'ok', 'pro', 'err'] },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
