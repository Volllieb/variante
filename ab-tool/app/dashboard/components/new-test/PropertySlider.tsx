'use client'

/**
 * PropertySlider — Range-Slider mit Label, px-Wert und Min/Max.
 *
 * Wiederverwendbar für: padding, border-radius, font-size, font-weight, border-width.
 */

interface PropertySliderProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  label: string
  unit?: string
}

export function PropertySlider({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  unit = 'px',
}: PropertySliderProps) {
  // Berechne Prozent für den visuellen Füllstand
  const percent = ((value - min) / (max - min)) * 100

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-text-2">{label}</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={value}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)))
            }}
            min={min}
            max={max}
            className="w-14 rounded-[4px] border border-border bg-bg-0 px-2 py-0.5 text-[11px] font-mono text-text text-right outline-none focus:border-border-strong"
          />
          {unit && <span className="text-[11px] text-text-3">{unit}</span>}
        </div>
      </div>
      <div className="relative">
        <input
          type="range"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          min={min}
          max={max}
          step={step}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-bg-2 outline-none
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-fill-invert
            [&::-webkit-slider-thumb]:shadow-sm
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-fill-invert
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:shadow-sm"
          style={{
            background: `linear-gradient(to right, #2563EB 0%, #2563EB ${percent}%, #2a2a2a ${percent}%, #2a2a2a 100%)`,
          }}
        />
      </div>
    </div>
  )
}
