'use client'

/**
 * PropertyControls — Rendert dynamische Controls abhängig vom Element-Typ.
 *
 * Zeigt nur die Control-Gruppen an, die für den jeweiligen Element-Typ
 * relevant sind (button → alle, headline → text+color+typography, etc.).
 */

import { ColorPicker } from './ColorPicker'
import { PropertySlider } from './PropertySlider'
import { SLIDER_CONFIGS, ELEMENT_CONTROLS } from './types'
import type { UserEdits } from './types'

interface PropertyControlsProps {
  elementType: string
  edits: UserEdits
  onChange: (edits: Partial<UserEdits>) => void
}

export function PropertyControls({ elementType, edits, onChange }: PropertyControlsProps) {
  const groups = ELEMENT_CONTROLS[elementType] ?? ELEMENT_CONTROLS.element

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <ControlGroupSection key={group} group={group} edits={edits} onChange={onChange} />
      ))}
    </div>
  )
}

function ControlGroupSection({
  group,
  edits,
  onChange,
}: {
  group: string
  edits: UserEdits
  onChange: (edits: Partial<UserEdits>) => void
}) {
  switch (group) {
    case 'text':
      return (
        <div>
          <label className="mb-1.5 block text-[11px] font-medium text-text-2">Text</label>
          <input
            type="text"
            value={edits.text ?? ''}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Button text or headline"
            maxLength={120}
            className="w-full rounded-[6px] border border-border bg-bg-0 px-3 py-2 text-[13px] text-text placeholder:text-text-3 outline-none focus:border-border-strong focus:ring-2 focus:ring-text/10"
          />
        </div>
      )

    case 'color':
      return (
        <div className="space-y-3">
          <p className="text-[11px] font-medium text-text-2">Colors</p>
          <ColorPicker
            label="Background"
            value={edits.bgColor ?? '#2563EB'}
            onChange={(color) => onChange({ bgColor: color })}
          />
          <ColorPicker
            label="Text Color"
            value={edits.textColor ?? '#FFFFFF'}
            onChange={(color) => onChange({ textColor: color })}
          />
          <ColorPicker
            label="Border Color"
            value={edits.borderColor ?? 'transparent'}
            onChange={(color) => onChange({ borderColor: color })}
          />
        </div>
      )

    case 'spacing':
      return (
        <div className="space-y-3">
          <p className="text-[11px] font-medium text-text-2">Spacing</p>
          <PropertySlider
            {...SLIDER_CONFIGS.paddingX}
            value={edits.paddingX ?? SLIDER_CONFIGS.paddingX.defaultValue}
            onChange={(v) => onChange({ paddingX: v })}
          />
          <PropertySlider
            {...SLIDER_CONFIGS.paddingY}
            value={edits.paddingY ?? SLIDER_CONFIGS.paddingY.defaultValue}
            onChange={(v) => onChange({ paddingY: v })}
          />
          <PropertySlider
            {...SLIDER_CONFIGS.borderRadius}
            value={edits.borderRadius ?? SLIDER_CONFIGS.borderRadius.defaultValue}
            onChange={(v) => onChange({ borderRadius: v })}
          />
          <PropertySlider
            {...SLIDER_CONFIGS.borderWidth}
            value={edits.borderWidth ?? SLIDER_CONFIGS.borderWidth.defaultValue}
            onChange={(v) => onChange({ borderWidth: v })}
          />
        </div>
      )

    case 'typography':
      return (
        <div className="space-y-3">
          <p className="text-[11px] font-medium text-text-2">Typography</p>
          <PropertySlider
            {...SLIDER_CONFIGS.fontSize}
            value={edits.fontSize ?? SLIDER_CONFIGS.fontSize.defaultValue}
            onChange={(v) => onChange({ fontSize: v })}
          />
          <PropertySlider
            {...SLIDER_CONFIGS.fontWeight}
            value={edits.fontWeight ?? SLIDER_CONFIGS.fontWeight.defaultValue}
            onChange={(v) => onChange({ fontWeight: v })}
            unit=""
          />
        </div>
      )

    default:
      return null
  }
}
