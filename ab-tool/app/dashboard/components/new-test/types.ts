/**
 * Shared Types für den Variant-Editor (Web-UI Controls + Inspiration Gallery).
 *
 * Diese Types ergänzen die bestehenden Types aus NewTestDrawer.tsx.
 * Sie werden von StepVariantB, VariantEditor, PropertyControls und
 * InspirationGallery verwendet.
 */

// ─── Variant Tab ───

/** Welcher Tab im Variant-Step aktiv ist */
export type VariantTab = 'ai' | 'edit' | 'inspiration'

// ─── User Edits ───

/**
 * Vom User manuell editierbare Properties.
 * Jedes Feld ist optional — nicht gesetzte Felder bleiben vom KI-Vorschlag.
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
}

// ─── Inspiration Pattern ───

export interface InspirationPattern {
  id: string
  name: string
  icon: string
  description: string
  /** Prompt-Template mit Platzhaltern: {element}, {original}, {selector}, {elementType} */
  promptTemplate: string
  /** Für welche Element-Typen dieses Pattern verfügbar ist */
  applicableTypes: Array<'button' | 'headline' | 'text' | 'element'>
}

// ─── Control Groups ───

export type ControlGroup = 'text' | 'color' | 'spacing' | 'typography'

/**
 * Welche Control-Gruppen für welchen Element-Typ angezeigt werden.
 * Fallback für unbekannte Typen: text + color.
 */
export const ELEMENT_CONTROLS: Record<string, ControlGroup[]> = {
  button: ['text', 'color', 'spacing', 'typography'],
  headline: ['text', 'color', 'typography'],
  text: ['text', 'color', 'typography'],
  element: ['text', 'color'],
}

// ─── Default-Werte für Slider ───

export interface SliderConfig {
  min: number
  max: number
  step: number
  defaultValue: number
  label: string
  unit: string
}

export const SLIDER_CONFIGS: Record<string, SliderConfig> = {
  fontSize: { min: 10, max: 48, step: 1, defaultValue: 16, label: 'Font Size', unit: 'px' },
  fontWeight: { min: 100, max: 900, step: 100, defaultValue: 600, label: 'Font Weight', unit: '' },
  borderRadius: { min: 0, max: 32, step: 1, defaultValue: 8, label: 'Border Radius', unit: 'px' },
  paddingX: { min: 0, max: 64, step: 2, defaultValue: 24, label: 'Padding X', unit: 'px' },
  paddingY: { min: 0, max: 48, step: 2, defaultValue: 12, label: 'Padding Y', unit: 'px' },
  borderWidth: { min: 0, max: 8, step: 1, defaultValue: 1, label: 'Border Width', unit: 'px' },
}
