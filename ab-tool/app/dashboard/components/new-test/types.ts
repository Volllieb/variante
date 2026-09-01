/**
 * Shared Types für den Button/Text-Editor und die Änderungsliste.
 *
 * Diese Types ergänzen die bestehenden Types aus NewTestDrawer.tsx.
 * Sie werden von StepChange, ChangeList, ButtonEditor und TextInputEditor verwendet.
 */

// ─── User Edits ───

/**
 * Vom User manuell editierbare Properties.
 * Alle Felder sind optional — nicht gesetzte Felder werden ignoriert.
 */
export interface UserEdits {
  text?: string
  bgColor?: string
  textColor?: string
  fontSize?: number
  fontWeight?: number
  borderRadius?: number
  paddingX?: number
  paddingY?: number
  borderWidth?: number
  borderColor?: string
  /**
   * Beliebiges border-style-Keyword: die gemessene Baseline kann ridge,
   * double, outset, … sein, auch wenn die UI nur vier Optionen anbietet.
   * Die UI-Optionen bleiben die Auswahl; die Baseline darf trotzdem
   * weitergereicht werden.
   */
  borderStyle?: string
  hoverEnabled?: boolean
  hoverBgColor?: string
  hoverScale?: number
  hoverShadow?: boolean
}

// ─── Delta-Modell ───

/**
 * Gemessene Style-Werte des Originals (Variante A) — die Baseline des Deltas.
 *
 * `inherit`-Modus: das Delta enthält nur Properties, die von der Baseline
 * abweichen. "Reset to original" setzt auf die Baseline zurück und erzeugt
 * damit ein leeres Delta.
 */
export interface StyleBaseline {
  bgColor?: string
  textColor?: string
  fontSize?: number
  fontWeight?: number
  borderRadius?: number
  paddingX?: number
  paddingY?: number
  borderWidth?: number
  borderColor?: string
  borderStyle?: string
}

/** `inherit`: B erbt Markup/Klassen von A, nur Änderungen werden emittiert. `scratch`: kompletter Neubau. */
export type EditorMode = 'inherit' | 'scratch'

// ─── Änderungsliste (Change List) ───

/**
 * Properties, die als eigene Zeile editierbar sind. Mapping auf UserEdits + 'text'.
 * `other` ist die Sammelzeile für KI-CSS, das sich nicht auf einen Regler
 * abbilden lässt (letter-spacing, box-shadow-Formate, …) — sie trägt das
 * Roh-CSS und ist nicht editierbar.
 */
export type ChangeProperty =
  | 'text' | 'bgColor' | 'textColor' | 'fontSize' | 'fontWeight'
  | 'borderRadius' | 'paddingX' | 'paddingY' | 'borderWidth'
  | 'borderColor' | 'borderStyle'
  | 'hoverBgColor' | 'hoverScale' | 'hoverShadow'
  | 'other'

export interface ChangeEntry {
  id: string
  property: ChangeProperty
  /** Anzeige-Wert von A. '' wenn keine Baseline messbar war. */
  before: string
  /** Anzeige-Wert von B. Zahlen ohne Einheit (Einheit hängt am Property). */
  after: string
  source: 'manual' | 'ai' | 'figma'
  status: 'applied' | 'suggested'
  explanation?: string
  /** Nur für property==='other': das rohe CSS, das nicht als Regler abbildbar ist. */
  rawCss?: string
}

/**
 * Die Änderungsliste als Quelle der Wahrheit für Variante B.
 * `variant_b_html`/`variant_b_css` werden daraus komponiert (delta.ts).
 */
export interface VariantChangeSet {
  mode: EditorMode
  entries: ChangeEntry[]
  /** Gemessene Werte von A, mitpersistiert — die Liste bleibt selbsterklärend. */
  baseline: StyleBaseline | null
}

/** Ermittelt den Editor-Typ basierend auf elementType */
export function getEditorCategory(elementType: string): 'button' | 'text' {
  if (elementType === 'button' || elementType === 'link') return 'button'
  if (elementType === 'text' || elementType === 'headline') return 'text'
  return 'button' // fallback: button-editor (vereinfacht)
}
