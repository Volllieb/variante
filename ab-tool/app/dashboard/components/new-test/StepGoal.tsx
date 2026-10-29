'use client'

/**
 * StepGoal — Step 1: Conversion-Ziel wählen.
 *
 * Click-only: GoalSelection['type'] hat nur einen möglichen Wert ('click'),
 * es gibt also nichts zwischen mehreren Zieltypen zu wählen — nur WELCHES
 * Element den Klick zählt. Drei Modi:
 *   tested — das getestete Element selbst zählt als Conversion. Default für
 *            klickbare Elemente (button/link): wer einen Button testet, muss
 *            das Goal nicht ein zweites Mal picken. Nicht klickbar → gegraut
 *            mit Hover-Meldung.
 *   picker — Öffnet die Seite mit ?ab_goal=1 (benötigt installiertes Snippet)
 *   manual — CSS-Selektor manuell eingeben (Fallback ohne Snippet)
 */

import { useState, useEffect, useRef } from 'react'
import {
  MousePointerClick, ExternalLink, Check, Loader2, Code2, Crosshair,
} from 'lucide-react'
import type { GoalSelection } from '../NewTestDrawer'
import { validateManualSelector } from '@/lib/manualSelector'
import { usePickerBridge } from '@/lib/pickerBridge'
import { Button, Input, SegmentedControl } from '@/app/components'

interface StepGoalProps {
  elementType: string
  elementName: string
  /** CSS-Selektor des getesteten Elements — Basis für den 'tested'-Modus. */
  elementSelector: string
  url: string
  selectedGoal: GoalSelection | null
  onGoalSelected: (goal: GoalSelection) => void
  onConfirm: () => void
}

type GoalMode = 'tested' | 'picker' | 'manual'

/** Elemente, deren Klicks als Goal taugen — nur für sie ist 'tested' wählbar. */
const CLICKABLE_TYPES = new Set(['button', 'link'])

export function StepGoal({
  elementType, elementName, elementSelector, url, selectedGoal, onGoalSelected, onConfirm,
}: StepGoalProps) {
  const elementClickable = CLICKABLE_TYPES.has(elementType)
  const [waitingForPicker, setWaitingForPicker] = useState(false)
  const [pickerBlocked, setPickerBlocked] = useState(false)
  const [pickedElement, setPickedElement] = useState<{ selector: string; text: string } | null>(null)
  // Klickbares Element → 'tested' ist der Default, sonst startet der Picker.
  // Beim Wiedereinstieg (Back-Navigation, Draft-Resume) bestimmt das
  // vorhandene Goal den Modus, damit nichts Überschriebenes neu aufpoppt.
  const [mode, setMode] = useState<GoalMode>(() => {
    if (!selectedGoal) return elementClickable ? 'tested' : 'picker'
    if (selectedGoal.selector === elementSelector) return 'tested'
    return selectedGoal.source === 'manual' ? 'manual' : 'picker'
  })
  const [manualSelector, setManualSelector] = useState('')
  const [manualSelectorError, setManualSelectorError] = useState('')
  const autoSelected = useRef(false)
  const autoOpenedPicker = useRef(false)
  const pickerTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Tested element: Ist das getestete Element selbst klickbar, ist es der
  // Default-Goal — kein zweiter Picker-Roundtrip. Genau einmal vorwählen.
  useEffect(() => {
    if (mode === 'tested' && elementClickable && !selectedGoal && !autoSelected.current) {
      autoSelected.current = true
      onGoalSelected({
        type: 'click',
        selector: elementSelector || undefined,
        label: `Clicks on "${elementName}"`,
        source: 'tested',
      })
    }
  }, [mode, elementClickable, elementSelector, elementName, selectedGoal, onGoalSelected])

  // Auto-open picker once when the step opens in picker mode without a goal
  // (nicht klickbares Element) — der User landet direkt auf "Pick on site"
  // statt vor einem leeren Screen. Klickbare Elemente starten im
  // 'tested'-Modus, für sie öffnet kein Popup.
  // pickedElement/waitingForPicker bewusst nicht in den Deps: das Popup soll
  // nur beim Eintritt in den Modus aufgehen, nicht bei jeder Picker-Antwort.
  useEffect(() => {
    if (mode === 'picker' && !selectedGoal && !pickedElement && !autoOpenedPicker.current && !waitingForPicker) {
      autoOpenedPicker.current = true
      openGoalPicker()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedGoal])

  // Cleanup picker timeout on unmount
  useEffect(() => {
    return () => {
      if (pickerTimeoutRef.current) clearTimeout(pickerTimeoutRef.current)
    }
  }, [])

  // Auswahl aus dem ab.js-Goal-Picker entgegennehmen. Beide Transportwege
  // (postMessage + /picker-return via localStorage) liegen in usePickerBridge.
  usePickerBridge({
    url,
    mode: 'goal',
    onPick: (p) => {
      setPickedElement({ selector: p.selector, text: p.text || '' })
      onGoalSelected({
        type: 'click',
        selector: p.selector,
        label: p.text ? `Clicks on "${p.text}"` : `Clicks on ${p.selector}`,
        source: 'picker',
      })
      setWaitingForPicker(false)
      setPickerBlocked(false)
      if (pickerTimeoutRef.current) clearTimeout(pickerTimeoutRef.current)
    },
  })

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

  /**
   * Moduswechsel = Goal-Wechsel: 'tested' setzt das Goal sofort aufs getestete
   * Element, 'picker' öffnet die Seite direkt, wenn noch nichts gepickt ist.
   * So zeigt der Modus immer, was das Goal IST — nie einen Zustand, bei dem
   * Anzeige und Auswahl auseinanderlaufen.
   */
  function switchMode(next: GoalMode) {
    if (next === mode) return
    if (next === 'tested' && elementClickable) {
      onGoalSelected({
        type: 'click',
        selector: elementSelector || undefined,
        label: `Clicks on "${elementName}"`,
        source: 'tested',
      })
    }
    setMode(next)
    if (next === 'picker' && !pickedElement) {
      autoOpenedPicker.current = false
      openGoalPicker()
    }
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
    const result = validateManualSelector(manualSelector)
    if (!result.ok) {
      setManualSelectorError(result.error ?? 'Invalid CSS selector. Try: .buy-button, #checkout, button.primary')
      return
    }
    setManualSelectorError('')
    onGoalSelected({
      type: 'click',
      selector: result.selector,
      label: `Clicks on ${result.selector}`,
      source: 'manual',
    })
  }

  // Der Confirm-Button ist genau dann aktiv, wenn das im aktuellen Modus
  // sichtbare Goal auch das ausgewählte ist — kein Unsichtbar-Goal bestätigen.
  const isConfirmDisabled = (() => {
    if (!selectedGoal) return true
    if (mode === 'picker' && selectedGoal.source !== 'picker') return true
    if (mode === 'manual' && !selectedGoal.selector) return true
    if (mode === 'tested' && !selectedGoal.selector) return true
    return false
  })()

  return (
    <div className="space-y-4">
      <div>
        <p className="text-body leading-relaxed text-text-2">
          Pick the element users must click to count as a conversion.
        </p>
      </div>

      {/* Mode Toggle — always visible so user can switch if picker fails.
          Phase 2: war ein handgebauter Umschalter; die gesperrte Option
          brauchte dort einen Wrapper mit eigenem Tooltip, weil Firefox auf
          disabled-Buttons kein :hover feuert. <SegmentedControl> nutzt
          aria-disabled und kommt ohne den Wrapper aus. */}
      <SegmentedControl
        label="How to pick the element"
        grow
        value={mode}
        onChange={switchMode}
        options={[
          {
            value: 'tested',
            label: <><Crosshair className="h-3.5 w-3.5" />Tested element</>,
            disabled: !elementClickable,
            title: elementClickable ? undefined : 'It seems that the tested element is not clickable',
          },
          { value: 'picker', label: <><MousePointerClick className="h-3.5 w-3.5" />Visual Picker</> },
          { value: 'manual', label: <><Code2 className="h-3.5 w-3.5" />Manual Selector</> },
        ]}
      />

      {/* Target element — no goal-TYPE choice here, there's only ever one
          (a click); the only real decision is WHICH element counts. */}
      <div className="rounded-md border border-border bg-bg-0 p-3">
        {/* ── TESTED MODE ── */}
        {mode === 'tested' && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1.5 rounded-full bg-ok/15 px-2.5 py-1">
                <Check className="h-3 w-3 text-ok" />
                <span className="text-meta font-medium text-ok">
                  Defaulted to your tested {elementType}
                </span>
              </div>
            </div>
            <p className="text-small text-text-2">{selectedGoal?.label ?? `Clicks on "${elementName}"`}</p>
            <div className="mt-1.5 rounded-md bg-bg-1 p-2.5 font-mono text-meta text-text-2 break-all">
              <span className="text-text-3">Selector: </span>{elementSelector || '—'}
            </div>
            <p className="mt-2 text-meta text-text-3">
              A conversion is counted when visitors click the element you&apos;re testing.
            </p>
            <Button variant="link" size="inline"
              onClick={() => switchMode('picker')}
              className="mt-1 text-meta text-text"
            >
              Pick a different goal element
            </Button>
          </div>
        )}

        {/* ── PICKER MODE ── */}
        {mode === 'picker' && (
          <>
            {pickedElement || (selectedGoal?.source === 'picker' && selectedGoal.selector) ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1.5 rounded-full bg-ok/15 px-2.5 py-1">
                    <Check className="h-3 w-3 text-ok" />
                    <span className="text-meta font-medium text-ok">Element selected</span>
                  </div>
                </div>
                <div className="rounded-md bg-bg-1 p-2.5 font-mono text-meta text-text-2 break-all">
                  <span className="text-text-3">Selector: </span>{pickedElement?.selector ?? selectedGoal?.selector}
                  {pickedElement?.text && (
                    <><br /><span className="text-text-3">Text: </span>&ldquo;{pickedElement.text}&rdquo;</>
                  )}
                </div>
                <Button variant="link" size="inline"
                  onClick={handleChangePicker}
                  className="mt-2 text-meta text-text"
                >
                  Change element
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-meta text-text-3 mb-2">
                  Click &quot;Pick on site&quot;, then click the element on your page.
                </p>
                <Button
                  variant="secondary" size="sm"
                  onClick={openGoalPicker}
                >
                  <ExternalLink className="h-3 w-3" />
                  Pick on site
                </Button>
                {waitingForPicker && (
                  <div className="mt-2 flex items-center gap-1.5 text-meta text-text">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Waiting for element selection…
                  </div>
                )}
                {pickerBlocked && (
                  <div className="mt-2 rounded-md border border-err/20 bg-err/5 px-3 py-2 text-meta text-err/80">
                    Popup was blocked. Please allow popups for this site and try again — or switch to{' '}
                    <Button variant="link" size="inline" onClick={() => switchMode('manual')}>Manual Selector</Button>.
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── MANUAL MODE ── */}
        {mode === 'manual' && (
          <div className="space-y-2.5">
            {selectedGoal?.source === 'manual' && selectedGoal.selector ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1.5 rounded-full bg-ok/15 px-2.5 py-1">
                    <Check className="h-3 w-3 text-ok" />
                    <span className="text-meta font-medium text-ok">Element selected</span>
                  </div>
                </div>
                <div className="rounded-md bg-bg-1 p-2.5 font-mono text-meta text-text-2 break-all">
                  <span className="text-text-3">Selector: </span>{selectedGoal.selector}
                </div>
                <Button variant="link" size="inline"
                  onClick={() => {
                    onGoalSelected({ type: 'click', label: 'Clicks on element', source: 'manual' })
                    setManualSelector('')
                  }}
                  className="mt-2 text-meta text-text"
                >
                  Change element
                </Button>
              </div>
            ) : (
              <>
                <p className="text-meta text-text-3">
                  Enter the CSS selector of the element users click to convert.
                </p>
                <div>
                  <Input
                    type="text"
                    value={manualSelector}
                    onChange={(e) => { setManualSelector(e.target.value); setManualSelectorError('') }}
                    onKeyDown={(e) => e.key === 'Enter' && confirmManualGoal()}
                    placeholder=".buy-button, #checkout, button.cta"
                    className="text-small font-mono"
                  />
                  {manualSelectorError && (
                    <p className="mt-1 text-meta text-err">{manualSelectorError}</p>
                  )}
                  <p className="mt-1 text-meta text-text-3">
                    This is the element users must click for a conversion to be counted.{' '}
                    <code className="text-text-2 bg-bg-2 px-1 rounded text-meta">.add-to-cart</code>,{' '}
                    <code className="text-text-2 bg-bg-2 px-1 rounded text-meta">#signup-btn</code>
                  </p>
                </div>
                <Button
                  variant="primary" size="sm"
                  onClick={confirmManualGoal}
                  className="hover:opacity-90"
                >
                  <Check className="h-3 w-3" />
                  Apply Selector
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Confirm button */}
      <Button
        variant="primary"
        onClick={onConfirm}
        disabled={isConfirmDisabled}
        className="w-full gap-2 rounded-md py-2.5 text-body hover:opacity-90 disabled:opacity-30"
      >
        <Check className="h-4 w-4" />
        Confirm conversion goal
      </Button>
    </div>
  )
}
