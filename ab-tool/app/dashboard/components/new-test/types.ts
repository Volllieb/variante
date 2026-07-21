/**
 * Shared Types für den Button/Text-Editor.
 *
 * Diese Types ergänzen die bestehenden Types aus NewTestDrawer.tsx.
 * Sie werden von StepVariantB, ButtonEditor und TextInputEditor verwendet.
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
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none'
  hoverEnabled?: boolean
  hoverBgColor?: string
  hoverScale?: number
  hoverShadow?: boolean
}

/** Ermittelt den Editor-Typ basierend auf elementType */
export function getEditorCategory(elementType: string): 'button' | 'text' {
  if (elementType === 'button' || elementType === 'link') return 'button'
  if (elementType === 'text' || elementType === 'headline') return 'text'
  return 'button' // fallback: button-editor (vereinfacht)
}
