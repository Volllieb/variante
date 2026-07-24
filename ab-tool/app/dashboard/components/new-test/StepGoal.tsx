'use client'

/**
 * StepGoal — Step 2: Conversion-Ziel wählen.
 *
 * Zwei Modi:
 *   picker — Öffnet die Seite mit ?ab_goal=1 (benötigt installiertes Snippet)
 *   manual — CSS-Selektor manuell eingeben (Fallback ohne Snippet)
 *
 * Click-only: User definiert, welches Element für die Conversion geklickt werden muss.
 */

import { useState, useEffect, useRef } from 'react'
import {
  MousePointerClick, ExternalLink, Check, Loader2, Code2,
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
type GoalMode = 'picker' | 'manual'

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

// Einfache CSS-Selektor-Validierung
function isValidCssSelector(sel: string): boolean {
  if (!sel || sel.length < 2) return false
  if (sel.length > 512) return false
  if (/[<>{};]/.test(sel)) return false
  if (!/^[.#[a-zA-Z_*]/.test(sel)) return false
  if (!/\S/.test(sel)) return false
  try {
    document.querySelector(sel)
    return true
  } catch {
    return false
  }
}

export function StepGoal({
  elementType, elementName, url, selectedGoal, onGoalSelected, onConfirm,
}: StepGoalProps) {
  const [waitingForPicker, setWaitingForPicker] = useState(false)
  const [pickerBlocked, setPickerBlocked] = useState(false)
  const [pickedElement, setPickedElement] = useState<{ selector: string; text: string } | null>(null)
  const [mode, setMode] = useState<GoalMode>('picker')
  const [manualSelector, setManualSelector] = useState('')
  const [manualSelectorError, setManualSelectorError] = useState('')
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

  // Auto-open picker when click is pre-selected (only once, only in picker mode)
  useEffect(() => {
    if (mode === 'picker' && selectedType === 'click' && !pickedElement && !autoOpenedPicker.current && !waitingForPicker) {
      autoOpenedPicker.current = true
      openGoalPicker()
    }
  }, [selectedType, mode])

  // Cleanup picker timeout on unmount
  useEffect(() => {
    return () => {
      if (pickerTimeoutRef.current) clearTimeout(pickerTimeoutRef.current)
    }
  }, [])

  // Listen for postMessage from ab.js goal picker
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
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
    const target = new URL(finalUrl)
    target.searchParams.set('ab_goal', '1')
    const popup = window.open(target.toString(), 'ab-goal-picker', 'width=1200,height=800')
    if (!popup || popup.closed) {
      setPickerBlocked(true)
      setWaitingForPicker(false)
      return
    }
    setPickerBlocked(false)
    setWaitingForPicker(true)
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
    if (mode === 'picker') {
      openGoalPicker()
    }
  }

  // ── Manual Mode: Confirm manual goal selection ──
  function confirmManualGoal() {
    const sel = manualSelector.trim()
    if (!sel) {
      setManualSelectorError('Please enter a CSS selector for the conversion element.')
      return
    }
    if (!isValidCssSelector(sel)) {
      setManualSelectorError('Invalid CSS selector. Try: .buy-button, #checkout, button.primary')
      return
    }
    setManualSelectorError('')
    onGoalSelected({
      type: 'click',
      selector: sel,
      label: `Clicks on ${sel}`,
    })
  }

  const isConfirmDisabled = (() => {
    if (!selectedType) return true
    if (mode === 'manual' && !selectedGoal?.selector) return true
    if (mode === 'picker' && !pickedElement && !selectedGoal?.selector) return true
    return false
  })()

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] leading-relaxed text-text-2">
          What&rsquo;s your conversion goal?
        </p>
      </div>

      {/* Mode Toggle — always visible so user can switch if picker fails */}
      <div className="flex rounded-[6px] border border-border bg-bg-1 p-0.5">
        <button
          onClick={() => setMode('picker')}
          className={`flex-1 rounded-[5px] py-1.5 text-[12px] font-medium transition-colors cursor-pointer ${
            mode === 'picker' ? 'bg-bg-2 text-text' : 'text-text-3 hover:text-text-2'
          }`}
        >
          <MousePointerClick className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
          Visual Picker
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`flex-1 rounded-[5px] py-1.5 text-[12px] font-medium transition-colors cursor-pointer ${
            mode === 'manual' ? 'bg-bg-2 text-text' : 'text-text-3 hover:text-text-2'
          }`}
        >
          <Code2 className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
          Manual Selector
        </button>
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

              {/* Click: Picker / Manual section */}
              {isSelected && g.type === 'click' && (
                <div className="mt-2 ml-8 rounded-[8px] border border-border bg-bg-0 p-3">
                  {/* ── PICKER MODE ── */}
                  {mode === 'picker' && (
                    <>
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
                              Popup was blocked. Please allow popups for this site and try again — or switch to{' '}
                              <button onClick={() => setMode('manual')} className="underline hover:text-err cursor-pointer">Manual Selector</button>.
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* ── MANUAL MODE ── */}
                  {mode === 'manual' && (
                    <div className="space-y-2.5">
                      <p className="text-[11px] text-text-3">
                        Enter the CSS selector of the element users click to convert.
                      </p>
                      <div>
                        <input
                          type="text"
                          value={manualSelector}
                          onChange={(e) => { setManualSelector(e.target.value); setManualSelectorError('') }}
                          onKeyDown={(e) => e.key === 'Enter' && confirmManualGoal()}
                          placeholder=".buy-button, #checkout, button.cta"
                          className="w-full rounded-[6px] border border-border bg-bg-1 py-2 px-3 text-[12px] text-text font-mono placeholder:text-text-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40"
                        />
                        {manualSelectorError && (
                          <p className="mt-1 text-[10px] text-err">{manualSelectorError}</p>
                        )}
                        <p className="mt-1 text-[10px] text-text-3">
                          This is the element users must click for a conversion to be counted.{' '}
                          <code className="text-text-2 bg-bg-2 px-1 rounded text-[9px]">.add-to-cart</code>,{' '}
                          <code className="text-text-2 bg-bg-2 px-1 rounded text-[9px]">#signup-btn</code>
                        </p>
                      </div>
                      <button
                        onClick={confirmManualGoal}
                        className="flex items-center gap-1.5 rounded-[6px] bg-fill-invert px-3 py-1.5 text-[11px] font-semibold text-text-on-invert transition-opacity hover:opacity-90 cursor-pointer"
                      >
                        <Check className="h-3 w-3" />
                        Apply Selector
                      </button>
                    </div>
                  )}

                  {/* Show confirmed selector in manual mode */}
                  {mode === 'manual' && selectedGoal?.selector && (
                    <div className="mt-3 border-t border-border pt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1.5 rounded-full bg-ok/15 px-2.5 py-1">
                          <Check className="h-3 w-3 text-ok" />
                          <span className="text-[10px] font-medium text-ok">Element selected</span>
                        </div>
                      </div>
                      <div className="rounded-[6px] bg-bg-1 p-2.5 font-mono text-[11px] text-text-2 break-all">
                        <span className="text-text-3">Selector: </span>{selectedGoal.selector}
                      </div>
                      <button
                        onClick={() => { onGoalSelected({ type: 'click', label: 'Clicks on element' }); setManualSelector('') }}
                        className="mt-2 text-[11px] text-text hover:text-text-2 transition-colors cursor-pointer"
                      >
                        Change element
                      </button>
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
