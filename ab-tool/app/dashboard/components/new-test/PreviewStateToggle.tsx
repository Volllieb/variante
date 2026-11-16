'use client'

/**
 * PreviewStateToggle — Normal ⇄ Hover für alle Vorschauen des Wizards.
 *
 * Der Picker misst beide Zustände getrennt (ab.js: restingValues/hoverDelta).
 * Default ist der Ruhezustand: die Vorschau soll zeigen, was ein Besucher
 * sieht, bevor er die Maus bewegt. Der Hover-Zustand ist eine bewusste
 * Ansicht — statisch, damit er sich auch bearbeiten lässt, ohne dass der User
 * die Maus stillhalten muss.
 *
 * Reine Ansicht: der Toggle verändert weder die Änderungsliste noch das
 * erzeugte CSS.
 */

export type PreviewState = 'normal' | 'hover'

const OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'hover', label: 'Hover' },
] as const

interface PreviewStateToggleProps {
  value: PreviewState
  onChange: (value: PreviewState) => void
  /**
   * false: es gibt keinen Hover-Zustand zu zeigen — das Element hat keinen,
   * oder der Pick stammt aus einer ab.js vor der Hover-Trennung. Der Toggle
   * bleibt sichtbar (sonst springt das Layout), aber inaktiv.
   */
  hoverAvailable: boolean
}

export function PreviewStateToggle({ value, onChange, hoverAvailable }: PreviewStateToggleProps) {
  return (
    <div className="flex rounded-md border border-border bg-bg-0 p-0.5" role="group" aria-label="Preview state">
      {OPTIONS.map((o) => {
        const disabled = o.value === 'hover' && !hoverAvailable
        return (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-sm px-2.5 py-1 text-meta font-medium transition-colors ${
              disabled
                ? 'cursor-not-allowed text-text-3 opacity-50'
                : value === o.value
                  ? 'cursor-pointer bg-fill-invert text-text-on-invert'
                  : 'cursor-pointer text-text-2 hover:text-text'
            }`}
            title={
              disabled
                ? 'No hover state captured for this element — pick it again to capture one'
                : o.value === 'hover'
                  ? 'Show the hover state as a static view'
                  : 'Show the resting state, like a visitor sees it first'
            }
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
