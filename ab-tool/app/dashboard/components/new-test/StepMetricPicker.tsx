'use client'

/**
 * StepMetricPicker — Step 3: Conversion-Metrik wählen.
 *
 * AI-Vorauswahl: Wenn Element aus Step 1 ein Button ist → "Klicks auf Button" vorausgewählt.
 * Sonst: Quick-Select aus vordefinierten Typen oder Picker auf Live-Site.
 */

import { useState, useEffect } from 'react'
import {
  MousePointerClick, FileText, ShoppingCart, Gauge,
  PlusCircle, ExternalLink, Check, Loader2,
} from 'lucide-react'
import type { GoalSelection } from '../NewTestDrawer'

interface StepMetricPickerProps {
  elementType: string
  elementName: string
  url: string
  selectedGoal: GoalSelection | null
  onGoalSelected: (goal: GoalSelection) => void
  onConfirm: () => void
}

const GOAL_TYPES: Array<{ type: GoalSelection['type']; icon: typeof MousePointerClick; label: string; desc: string }> = [
  { type: 'click', icon: MousePointerClick, label: 'Click', desc: 'Track clicks on a specific element' },
  { type: 'form_submit', icon: FileText, label: 'Form Submit', desc: 'Track form submissions' },
  { type: 'page_view', icon: Gauge, label: 'Page View', desc: 'Track visits to a specific page' },
  { type: 'purchase', icon: ShoppingCart, label: 'Purchase', desc: 'Track completed purchases' },
]

export function StepMetricPicker({
  elementType, elementName, url, selectedGoal, onGoalSelected, onConfirm,
}: StepMetricPickerProps) {
  const [waitingForPicker, setWaitingForPicker] = useState(false)

  // Auto-select: if element is a button, pre-select click goal
  useEffect(() => {
    if (!selectedGoal && elementType === 'button') {
      onGoalSelected({
        type: 'click',
        label: `Clicks on "${elementName}"`,
      })
    }
  }, [elementType, elementName, selectedGoal, onGoalSelected])

  // Listen for postMessage from ab.js goal picker
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!e.data || e.data.type !== 'ab-goal') return
      const { selector, text } = e.data
      if (!selector) return
      onGoalSelected({
        type: 'click',
        selector,
        label: text ? `Clicks on "${text}"` : `Clicks on ${selector}`,
      })
      setWaitingForPicker(false)
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onGoalSelected])

  function openGoalPicker() {
    if (!url) return
    const finalUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`
    const pickerUrl = `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}ab_pick=goal`
    window.open(pickerUrl, 'ab-goal-picker', 'width=1200,height=800')
    setWaitingForPicker(true)
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] leading-relaxed text-text-2">
          What should be measured as a conversion?
        </p>
        {elementType === 'button' && (
          <p className="mt-1 text-[12px] text-accent">
            Clicks on your button are pre-selected. You can change this.
          </p>
        )}
      </div>

      {/* Quick-select goal types */}
      <div className="grid grid-cols-2 gap-2">
        {GOAL_TYPES.map((g) => {
          const isSelected = selectedGoal?.type === g.type
          const Icon = g.icon
          return (
            <button
              key={g.type}
              onClick={() => onGoalSelected({
                type: g.type,
                selector: g.type === 'click' ? selectedGoal?.selector : undefined,
                label: g.type === 'click' && elementType === 'button'
                  ? `Clicks on "${elementName}"`
                  : g.label,
              })}
              className={`flex cursor-pointer items-start gap-2.5 rounded-[8px] px-3 py-3 text-left transition-colors ${
                isSelected
                  ? 'border border-accent/30 bg-accent/5'
                  : 'border border-border bg-bg-1 hover:border-border-strong'
              }`}
            >
              <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                isSelected ? 'border-accent bg-accent' : 'border-border'
              }`}>
                {isSelected && <Check className="h-3 w-3 text-black" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-text-2" />
                  <p className="text-[12px] font-medium text-text">{g.label}</p>
                </div>
                <p className="mt-0.5 text-[10px] text-text-3">{g.desc}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Custom selector (for click-type goals) */}
      {selectedGoal?.type === 'click' && (
        <div className="rounded-[8px] border border-border bg-bg-1 p-3">
          <p className="text-[11px] text-text-3 mb-2">
            Click target: pick the element users should click to convert.
          </p>
          <div className="flex gap-2">
            <button
              onClick={openGoalPicker}
              className="flex items-center gap-1.5 rounded-[6px] border border-border px-3 py-1.5 text-[11px] text-text-2 transition-colors hover:border-border-strong hover:text-text cursor-pointer"
            >
              <ExternalLink className="h-3 w-3" />
              Pick on site
            </button>
            {selectedGoal.selector && (
              <code className="flex items-center rounded-[6px] bg-bg-0 px-3 py-1.5 text-[11px] text-text-3 font-mono">
                {selectedGoal.selector}
              </code>
            )}
          </div>
          {waitingForPicker && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-accent">
              <Loader2 className="h-3 w-3 animate-spin" />
              Waiting for element selection…
            </div>
          )}
        </div>
      )}

      {/* Confirm button */}
      {selectedGoal && (
        <button
          onClick={onConfirm}
          className="flex w-full items-center justify-center gap-2 rounded-[7px] bg-fill-invert py-2.5 text-[13px] font-semibold text-text-on-invert transition-opacity hover:opacity-90 cursor-pointer"
        >
          <Check className="h-4 w-4" />
          Confirm {selectedGoal.label}
        </button>
      )}
    </div>
  )
}
