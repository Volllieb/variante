'use client'

/**
 * StepGoal — Step 2: Conversion-Ziel wählen.
 *
 * Click-only: User pickt das Element auf der Live-Site, das für
 * die Conversion geklickt werden muss. Keine alternativen Goal-Typen mehr.
 */

import { useState, useEffect, useRef } from 'react'
import {
  MousePointerClick, ExternalLink, Check, Loader2,
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
]

export function StepGoal({
  elementType, elementName, url, selectedGoal, onGoalSelected, onConfirm,
}: StepGoalProps) {
  const [waitingForPicker, setWaitingForPicker] = useState(false)
  const [pickerBlocked, setPickerBlocked] = useState(false)
  const [pickedElement, setPickedElement] = useState<{ selector: string; text: string } | null>(null)
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
      // SECURITY: Nur Nachrichten von der Seite des Users akzeptieren.
      // ponytail: Vorher galt `(!userSiteOrigin) || … || e.origin === ourOrigin`.
      // Der erste Zweig vertraute JEDER Origin, sobald die eingegebene URL nicht
      // parsebar war; der letzte war nur für den entfernten picker-bridge-Proxy
      // nötig (Plan SEC-02). Jetzt: exakter Origin-Match, sonst verwerfen.
      let userSiteOrigin: string | null = null
      try {
        userSiteOrigin = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).origin
      } catch {
        userSiteOrigin = null
      }
      if (!userSiteOrigin || e.origin !== userSiteOrigin) return

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
    // ponytail: kein /api/picker-bridge mehr (Plan SEC-02) — direkt auf die
    // Kundenseite, ab.js erkennt ?ab_goal= und startet den Goal-Picker.
    const target = new URL(finalUrl)
    target.searchParams.set('ab_goal', '1')
    const popup = window.open(target.toString(), 'ab-goal-picker', 'width=1200,height=800')
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

  function handleTypeSelect(_type: GoalType) {
    onGoalSelected({
      type: 'click',
      label: elementType === 'button' ? `Clicks on "${elementName}"` : 'Clicks on element',
    })
  }

  function handleChangePicker() {
    autoOpenedPicker.current = false
    setPickedElement(null)
    openGoalPicker()
  }

  const isConfirmDisabled = (() => {
    if (!selectedType) return true
    if (!pickedElement && !selectedGoal?.selector) return true
    return false
  })()

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] leading-relaxed text-text-2">
          What&rsquo;s your conversion goal?
        </p>
      </div>

      {/* Primary Goals */}
      <div className="space-y-2">
        {PRIMARY_GOALS.map((g) => {
          const isSelected = selectedType === g.type
          return (
            <div key={g.type}>
              <button
                onClick={() => handleTypeSelect(g.type)}
                className={`flex w-full cursor-pointer items-start gap-3 rounded-[10px] px-4 py-3.5 text-left transition-all ${
                  isSelected
                    ? 'border border-border-strong bg-bg-2 ring-1 ring-border-strong'
                    : 'border border-border bg-bg-1 hover:border-border-strong'
                }`}
              >
                <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  isSelected ? 'border-border-strong bg-fill-invert' : 'border-border'
                }`}>
                  {isSelected && <Check className="h-3 w-3 text-black" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px]">{g.emoji}</span>
                    <p className="text-[13px] font-medium text-text">{g.label}</p>
                    {g.type === 'click' && elementType === 'button' && (
                      <span className="rounded-full bg-bg-2 px-2 py-0.5 text-[9px] font-medium text-text">
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
                          <><br /><span className="text-text-3">Text: </span>&ldquo;{pickedElement.text}&rdquo;</>
                        )}
                      </div>
                      <button
                        onClick={handleChangePicker}
                        className="mt-2 text-[11px] text-text hover:text-text-2 transition-colors cursor-pointer"
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
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-text">
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
            </div>
          )
        })}
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
