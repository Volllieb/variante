'use client'

/**
 * StepGoal — Step 2: Conversion-Ziel wählen.
 *
 * Redesign mit klarer Hierarchie:
 * - Primäre Goals (Click, Page View) als Radio-Cards
 * - Advanced Goals (Form Submit, Purchase, Custom) im Accordion
 * - Preselect "Click on element" bei Button-Elementen
 * - Vorschau nach Element-Pick
 */

import { useState, useEffect, useRef } from 'react'
import {
  MousePointerClick, FileText, ShoppingCart, Gauge,
  PlusCircle, ExternalLink, Check, Loader2, ChevronDown,
} from 'lucide-react'
import type { GoalSelection } from '../NewTestDrawer'

interface StepGoalProps {
  elementType: string
  elementName: string
  url: string
  selectedGoal: GoalSelection | null
  onGoalSelected: (goal: GoalSelection) => void
  onConfirm: () => void
}

type GoalType = GoalSelection['type']

interface GoalOption {
  type: GoalType
  icon: typeof MousePointerClick
  label: string
  desc: string
  emoji: string
}

const PRIMARY_GOALS: GoalOption[] = [
  { type: 'click', icon: MousePointerClick, label: 'Click on element', desc: 'Pick the element users click to convert', emoji: '🎯' },
  { type: 'page_view', icon: Gauge, label: 'Visit a page', desc: 'Users reach a specific URL after converting', emoji: '📄' },
]

const ADVANCED_GOALS: GoalOption[] = [
  { type: 'form_submit', icon: FileText, label: 'Form Submit', desc: 'Track form submissions', emoji: '📝' },
  { type: 'purchase', icon: ShoppingCart, label: 'Purchase / Checkout', desc: 'Track completed purchases', emoji: '🛒' },
  { type: 'custom', icon: PlusCircle, label: 'Custom event', desc: 'Define your own conversion goal', emoji: '✚' },
]

export function StepGoal({
  elementType, elementName, url, selectedGoal, onGoalSelected, onConfirm,
}: StepGoalProps) {
  const [waitingForPicker, setWaitingForPicker] = useState(false)
  const [pickerBlocked, setPickerBlocked] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [pickedElement, setPickedElement] = useState<{ selector: string; text: string } | null>(null)
  const [targetUrl, setTargetUrl] = useState('')
  const [customLabel, setCustomLabel] = useState('')
  const autoSelected = useRef(false)
  const autoOpenedPicker = useRef(false)
  const pickerTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const selectedType = selectedGoal?.type ?? null

  // Auto-select: if element is a button, pre-select click goal (only once)
  useEffect(() => {
    if (!selectedGoal && elementType === 'button' && !autoSelected.current) {
      autoSelected.current = true
      onGoalSelected({
        type: 'click',
        label: `Clicks on "${elementName}"`,
      })
    }
  }, [elementType, elementName, selectedGoal, onGoalSelected])

  // Auto-open picker when click is pre-selected (only once)
  useEffect(() => {
    if (selectedType === 'click' && !pickedElement && !autoOpenedPicker.current && !waitingForPicker) {
      autoOpenedPicker.current = true
      openGoalPicker()
    }
  }, [selectedType])

  // Cleanup picker timeout on unmount
  useEffect(() => {
    return () => {
      if (pickerTimeoutRef.current) clearTimeout(pickerTimeoutRef.current)
    }
  }, [])

  // Listen for postMessage from ab.js goal picker
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      const userSiteOrigin = (() => {
        try { return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).origin } catch { return null }
      })()
      const ourOrigin = window.location.origin
      const isTrusted = (!userSiteOrigin) || e.origin === userSiteOrigin || e.origin === ourOrigin
      if (!isTrusted) return

      if (!e.data || e.data.type !== 'ab-goal') return
      const { selector, text } = e.data
      if (!selector) return
      setPickedElement({ selector, text: text || '' })
      onGoalSelected({
        type: 'click',
        selector,
        label: text ? `Clicks on "${text}"` : `Clicks on ${selector}`,
      })
      setWaitingForPicker(false)
      setPickerBlocked(false)
      if (pickerTimeoutRef.current) clearTimeout(pickerTimeoutRef.current)
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [url, onGoalSelected])

  function openGoalPicker() {
    if (!url) return
    const finalUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`
    const bridgeUrl = `/api/picker-bridge?url=${encodeURIComponent(finalUrl)}&mode=goal`
    const popup = window.open(bridgeUrl, 'ab-goal-picker', 'width=1200,height=800')
    if (!popup || popup.closed) {
      // Popup was blocked — show fallback hint
      setPickerBlocked(true)
      setWaitingForPicker(false)
      return
    }
    setPickerBlocked(false)
    setWaitingForPicker(true)
    // Timeout: reset waiting state after 30s in case picker is lost
    if (pickerTimeoutRef.current) clearTimeout(pickerTimeoutRef.current)
    pickerTimeoutRef.current = setTimeout(() => {
      setWaitingForPicker(false)
    }, 30000)
  }

  function handleTypeSelect(type: GoalType) {
    if (type === 'click') {
      onGoalSelected({
        type: 'click',
        label: elementType === 'button' ? `Clicks on "${elementName}"` : 'Clicks on element',
      })
    } else if (type === 'page_view') {
      onGoalSelected({
        type: 'page_view',
        label: targetUrl ? `Visits ${targetUrl}` : 'Page view',
        targetUrl: targetUrl || undefined,
      })
    } else if (type === 'custom') {
      onGoalSelected({
        type: 'custom',
        label: customLabel || 'Custom conversion',
      })
    } else {
      onGoalSelected({
        type,
        label: ADVANCED_GOALS.find(g => g.type === type)?.label ?? type,
      })
    }
  }

  function handleTargetUrlChange(val: string) {
    // Strip protocol/domain if user pastes an absolute URL
    let cleaned = val.trim()
    if (/^https?:\/\//i.test(cleaned)) {
      try {
        const parsed = new URL(cleaned)
        cleaned = parsed.pathname + parsed.search + parsed.hash
      } catch { /* keep as-is */ }
    }
    // Ensure it starts with /
    if (cleaned && !cleaned.startsWith('/')) {
      cleaned = '/' + cleaned
    }
    setTargetUrl(cleaned)
    if (selectedType === 'page_view') {
      onGoalSelected({
        type: 'page_view',
        label: cleaned ? `Visits ${cleaned}` : 'Page view',
        targetUrl: cleaned || undefined,
      })
    }
  }

  function handleCustomLabelChange(val: string) {
    setCustomLabel(val)
    if (selectedType === 'custom') {
      onGoalSelected({
        type: 'custom',
        label: val || 'Custom conversion',
      })
    }
  }

  function handleChangePicker() {
    autoOpenedPicker.current = false
    setPickedElement(null)
    openGoalPicker()
  }

  const isConfirmDisabled = (() => {
    if (!selectedType) return true
    if (selectedType === 'custom' && (!customLabel || customLabel === 'Custom conversion')) return true
    if (selectedType === 'click' && !pickedElement && !selectedGoal?.selector) return true
    return false
  })()

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] leading-relaxed text-text-2">
          What's your conversion goal?
        </p>
      </div>

      {/* Primary Goals */}
      <div className="space-y-2">
        {PRIMARY_GOALS.map((g) => {
          const isSelected = selectedType === g.type
          const Icon = g.icon
          return (
            <div key={g.type}>
              <button
                onClick={() => handleTypeSelect(g.type)}
                className={`flex w-full cursor-pointer items-start gap-3 rounded-[10px] px-4 py-3.5 text-left transition-all ${
                  isSelected
                    ? 'border border-accent/30 bg-accent/5 ring-1 ring-accent/20'
                    : 'border border-border bg-bg-1 hover:border-border-strong'
                }`}
              >
                <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  isSelected ? 'border-accent bg-accent' : 'border-border'
                }`}>
                  {isSelected && <Check className="h-3 w-3 text-black" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px]">{g.emoji}</span>
                    <p className="text-[13px] font-medium text-text">{g.label}</p>
                    {g.type === 'click' && elementType === 'button' && (
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-medium text-accent">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-text-3">{g.desc}</p>
                </div>
              </button>

              {/* Click: Picker section */}
              {isSelected && g.type === 'click' && (
                <div className="mt-2 ml-8 rounded-[8px] border border-border bg-bg-0 p-3">
                  {pickedElement || selectedGoal?.selector ? (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1.5 rounded-full bg-ok/15 px-2.5 py-1">
                          <Check className="h-3 w-3 text-ok" />
                          <span className="text-[10px] font-medium text-ok">Element selected</span>
                        </div>
                      </div>
                      <div className="rounded-[6px] bg-bg-1 p-2.5 font-mono text-[11px] text-text-2 break-all">
                        <span className="text-text-3">Selector: </span>{pickedElement?.selector ?? selectedGoal?.selector}
                        {pickedElement?.text && (
                          <><br /><span className="text-text-3">Text: </span>"{pickedElement.text}"</>
                        )}
                      </div>
                      <button
                        onClick={handleChangePicker}
                        className="mt-2 text-[11px] text-accent hover:text-accent/80 transition-colors cursor-pointer"
                      >
                        Change element
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[11px] text-text-3 mb-2">
                        Pick the element users click to convert.
                      </p>
                      <button
                        onClick={openGoalPicker}
                        className="flex items-center gap-1.5 rounded-[6px] border border-border px-3 py-1.5 text-[11px] text-text-2 transition-colors hover:border-border-strong hover:text-text cursor-pointer"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Pick on site
                      </button>
                      {waitingForPicker && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-accent">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Waiting for element selection…
                        </div>
                      )}
                      {pickerBlocked && (
                        <div className="mt-2 rounded-[6px] border border-err/20 bg-err/5 px-3 py-2 text-[10px] text-err/80">
                          Popup was blocked. Please allow popups for this site and try again.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Page View: URL input */}
              {isSelected && g.type === 'page_view' && (
                <div className="mt-2 ml-8 rounded-[8px] border border-border bg-bg-0 p-3">
                  <label className="mb-1.5 block text-[11px] font-medium text-text-2">
                    Target URL
                  </label>
                  <input
                    type="text"
                    value={targetUrl || selectedGoal?.targetUrl || ''}
                    onChange={(e) => handleTargetUrlChange(e.target.value)}
                    placeholder="/thank-you"
                    className="w-full rounded-[6px] border border-border bg-bg-1 px-3 py-2 text-[12px] text-text placeholder:text-text-3 outline-none focus:border-border-strong focus:ring-2 focus:ring-text/10"
                  />
                  <p className="mt-1 text-[10px] text-text-3">
                    Relative to your site, e.g. /thank-you
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Advanced Accordion */}
      <div className="rounded-[10px] border border-border overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition-colors hover:bg-bg-1"
        >
          <span className="text-[12px] font-medium text-text-2">Advanced</span>
          <ChevronDown className={`h-4 w-4 text-text-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="border-t border-border px-4 py-3 space-y-2">
            {ADVANCED_GOALS.map((g) => {
              const isSelected = selectedType === g.type
              const Icon = g.icon
              return (
                <div key={g.type}>
                  <button
                    onClick={() => handleTypeSelect(g.type)}
                    className={`flex w-full cursor-pointer items-start gap-3 rounded-[8px] px-3 py-2.5 text-left transition-all ${
                      isSelected
                        ? 'border border-accent/30 bg-accent/5 ring-1 ring-accent/20'
                        : 'border border-transparent hover:bg-bg-1'
                    }`}
                  >
                    <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      isSelected ? 'border-accent bg-accent' : 'border-border'
                    }`}>
                      {isSelected && <Check className="h-2.5 w-2.5 text-black" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px]">{g.emoji}</span>
                        <p className="text-[12px] font-medium text-text">{g.label}</p>
                      </div>
                      <p className="mt-0.5 text-[10px] text-text-3">{g.desc}</p>
                    </div>
                  </button>

                  {/* Custom: text input */}
                  {isSelected && g.type === 'custom' && (
                    <div className="mt-2 ml-7">
                      <input
                        type="text"
                        value={customLabel || (selectedGoal?.label && selectedGoal.label !== 'Custom event' ? selectedGoal.label : '')}
                        onChange={(e) => handleCustomLabelChange(e.target.value)}
                        placeholder="Describe your goal..."
                        className="w-full rounded-[6px] border border-border bg-bg-1 px-3 py-2 text-[12px] text-text placeholder:text-text-3 outline-none focus:border-border-strong focus:ring-2 focus:ring-text/10"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Confirm button */}
      {selectedType && (
        <button
          onClick={onConfirm}
          disabled={isConfirmDisabled}
          className="flex w-full items-center justify-center gap-2 rounded-[7px] bg-fill-invert py-2.5 text-[13px] font-semibold text-text-on-invert transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <Check className="h-4 w-4" />
          Confirm conversion goal
        </button>
      )}
    </div>
  )
}
