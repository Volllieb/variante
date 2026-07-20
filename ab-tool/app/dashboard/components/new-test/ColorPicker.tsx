'use client'

/**
 * ColorPicker — Hex-Input mit Preset-Swatches + nativem Color-Picker.
 *
 * Nutzt <input type="color"> für den nativen Picker (0 KB, volle
 * Sättigungs-/Helligkeits-Steuerung) + 8 CRO-optimierte Presets.
 */

import { useState, useEffect, useRef } from 'react'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label: string
}

const PRESETS = [
  '#2563EB', // Blau (Default CTA)
  '#F97316', // Orange (Urgency)
  '#EF4444', // Rot (Dringlichkeit)
  '#10B981', // Grün (Positive)
  '#8B5CF6', // Violett (Premium)
  '#6B7280', // Grau (Secondary)
  '#1F2937', // Dark (Kontrast)
  '#FFFFFF', // Weiß
]

function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex)
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(value)
  const [showPresets, setShowPresets] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setInputValue(value) }, [value])

  useEffect(() => {
    if (!showPresets) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowPresets(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showPresets])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setInputValue(raw)
    if (isValidHex(raw)) onChange(raw)
  }

  return (
    <div className="relative" ref={ref}>
      <label className="mb-1.5 block text-[11px] font-medium text-text-2">{label}</label>
      <div className="flex items-center gap-2">
        {/* Native Color Input */}
        <input
          type="color"
          value={isValidHex(value) ? value : '#000000'}
          onChange={(e) => { setInputValue(e.target.value); onChange(e.target.value) }}
          className="h-8 w-10 cursor-pointer rounded-[4px] border border-border bg-transparent p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-[3px] [&::-webkit-color-swatch]:border-0"
        />
        {/* Hex Input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setShowPresets(true)}
            placeholder="#000000"
            maxLength={7}
            className="w-full rounded-[6px] border border-border bg-bg-0 py-2 pl-3 pr-2.5 text-[12px] font-mono text-text outline-none focus:border-border-strong focus:ring-2 focus:ring-text/10"
          />
        </div>
      </div>

      {/* Preset Swatches */}
      {showPresets && (
        <div className="absolute left-0 top-full z-10 mt-1.5 w-full rounded-[8px] border border-border bg-bg-1 p-2.5 shadow-lg">
          <div className="grid grid-cols-8 gap-1.5">
            {PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => { setInputValue(color); onChange(color); setShowPresets(false) }}
                className={`h-6 w-6 cursor-pointer rounded-[4px] border transition-transform hover:scale-110 ${
                  value === color ? 'border-text ring-1 ring-text' : 'border-border'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
