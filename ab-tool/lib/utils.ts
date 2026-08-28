import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Klassen-Merge für die UI-Primitives.
 *
 * Vorher hängten Button und Card ihre Klassen per Template-Literal aneinander
 * (`${variantClasses[variant]} ${className}`). Tailwind entscheidet bei
 * Konflikten aber nicht nach Reihenfolge im String, sondern nach Position im
 * generierten Stylesheet — `<Button className="px-8">` konnte das `px-4` der
 * Size-Variante also je nach Build gewinnen oder verlieren. twMerge löst den
 * Konflikt deterministisch zugunsten der zuletzt übergebenen Klasse.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
