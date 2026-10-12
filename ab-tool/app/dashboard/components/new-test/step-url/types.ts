// Typen von Step 0 (StepUrlAndElement und step-url/*).

export type DomainConnectState = 'idle' | 'saving' | 'not-found' | 'verified'

export type PickerMode = 'picker' | 'manual'

export interface ScanSuggestion {
  selector: string | null
  element: string
  rationale: string
  elementType: string
}

export type ScanState = 'idle' | 'loading' | 'success' | 'error'

export interface ScanResult {
  suggestions: ScanSuggestion[]
  primarySuggestion: ScanSuggestion | null
}
