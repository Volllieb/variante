'use client'

/**
 * NewTestDrawer — Vercel-Style Drawer für die Test-Erstellung.
 *
 * Slide-in von rechts, nimmt 50vw auf Desktop, 100vw auf Mobile.
 * Enthält die komplette Wizard-State-Machine und rendert die 4 Steps.
 *
 * Flow ohne KI (ausser Variant-Generierung):
 * Step 0: URL + Element auf Live-Site wählen
 * Step 1: Variant B (KI-generiert — Ausnahme)
 * Step 2: Goal/Metrik wählen
 * Step 3: Review + Create
 *
 * Draft: Fortschritt wird automatisch serverseitig gespeichert (debounced).
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { X, Loader2, FlaskConical, Check, ArrowLeft, ArrowRight } from 'lucide-react'
import { StepUrlAndElement } from './new-test/StepUrlAndElement'
import { StepVariantB } from './new-test/StepVariantB'
import { StepMetricPicker } from './new-test/StepMetricPicker'
import { StepReview } from './new-test/StepReview'


// ─── Types ───

export interface ElementSelection {
  selector: string
  originalHtml: string
  elementType: string
  elementName: string
}

export interface VariantResult {
  variant: string
  variant_html?: string
  variant_css?: string
  explanation: string
}

export interface GoalSelection {
  type: 'click' | 'form_submit' | 'page_view' | 'purchase' | 'custom'
  selector?: string
  label: string
}

interface WizardState {
  step: number // 0–3
  url: string
  selectedElement: ElementSelection | null
  elementConfirmed: boolean
  variantResult: VariantResult | null
  selectedGoal: GoalSelection | null
  goalConfirmed: boolean
  testName: string
  testStatus: 'active' | 'paused'
}

const INITIAL_STATE: WizardState = {
  step: 0,
  url: '',
  selectedElement: null,
  elementConfirmed: false,
  variantResult: null,
  selectedGoal: null,
  goalConfirmed: false,
  testName: '',
  testStatus: 'active',
}

// ─── Props ───

interface NewTestDrawerProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  onTestCreated: () => void
  verifiedDomains: { url: string; verifiedAt: string | null }[]
}

// ─── Component ───

export function NewTestDrawer({ isOpen, onClose, userId, onTestCreated, verifiedDomains }: NewTestDrawerProps) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createdTestId, setCreatedTestId] = useState<string | null>(null)
  const draftTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const mountedRef = useRef(true)
  const draftLoadedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // ─── Reset state when drawer opens ───
  useEffect(() => {
    if (isOpen) {
      setState(INITIAL_STATE)
      setCreating(false)
      setCreateError('')
      setCreatedTestId(null)
      draftLoadedRef.current = false
    }
  }, [isOpen])

  // ─── Draft: Load on open (only once per open) ───

  useEffect(() => {
    if (!isOpen || !userId || draftLoadedRef.current) return
    draftLoadedRef.current = true
    ;(async () => {
      try {
        const res = await fetch('/api/test-wizard/draft')
        if (!res.ok) return
        const { draft } = await res.json()
        if (draft && mountedRef.current) {
          setState((prev) => ({
            ...prev,
            step: draft.step ?? 0,
            url: draft.url ?? '',
            selectedElement: draft.selector ? {
              selector: draft.selector,
              originalHtml: draft.original_html ?? '',
              elementType: 'element',
              elementName: draft.selector,
            } : null,
            elementConfirmed: !!draft.selector,
            variantResult: draft.variant_text ? {
              variant: draft.variant_text,
              variant_html: draft.variant_b_html ?? undefined,
              variant_css: draft.variant_b_css ?? undefined,
              explanation: '',
            } : null,
            selectedGoal: draft.goal ? {
              type: (draft.goal?.startsWith('click:') ? 'click' : draft.goal as GoalSelection['type']) || 'click',
              selector: draft.goal_selector ?? undefined,
              label: draft.goal ?? '',
            } : null,
            goalConfirmed: !!draft.goal,
            testName: draft.auto_name ?? '',
          }))
        }
      } catch { /* Draft-Load ist nice-to-have */ }
    })()
  }, [isOpen, userId])

  // ─── Draft: Save on change (debounced 500ms) ───

  const saveDraft = useCallback((s: WizardState) => {
    if (draftTimer.current) clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(async () => {
      try {
        await fetch('/api/test-wizard/draft', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            step: s.step,
            url: s.url || null,
            selector: s.selectedElement?.selector ?? null,
            original_html: s.selectedElement?.originalHtml ?? null,
            variant_b_html: s.variantResult?.variant_html ?? null,
            variant_b_css: s.variantResult?.variant_css ?? null,
            variant_text: s.variantResult?.variant ?? null,
            goal: s.selectedGoal ? (s.selectedGoal.type === 'click' && s.selectedGoal.selector ? `click:${s.selectedGoal.selector}` : s.selectedGoal.type) : null,
            goal_selector: s.selectedGoal?.selector ?? null,
            auto_name: s.testName || null,
          }),
        })
      } catch { /* silent */ }
    }, 500)
  }, [])

  const updateState = useCallback((patch: Partial<WizardState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch }
      saveDraft(next)
      return next
    })
  }, [saveDraft])

  // ─── Create Test ───

  const handleCreate = useCallback(async (status: 'active' | 'paused') => {
    if (!state.url || !state.selectedElement || !state.selectedGoal || !state.variantResult) {
      setCreateError('Please complete all steps before creating the test.')
      return
    }
    setCreating(true)
    setCreateError('')

    try {
      const goal = state.selectedGoal.type === 'click' && state.selectedGoal.selector
        ? `click:${state.selectedGoal.selector}`
        : state.selectedGoal.type === 'custom'
          ? state.selectedGoal.label
          : state.selectedGoal.type

      // Fallback: use element name as selector if no CSS selector is available
      const selector = state.selectedElement.selector || state.selectedElement.elementName

      const body: Record<string, unknown> = {
        site_url: state.url,
        selector,
        goal,
        goal_selector: state.selectedGoal.selector ?? undefined,
        variant_b_html: state.variantResult?.variant_html ?? undefined,
        variant_b_css: state.variantResult?.variant_css ?? undefined,
        variant_text: state.variantResult?.variant ?? undefined,
        original_html: state.selectedElement.originalHtml,
        status,
        name: state.testName || undefined,
      }

      const res = await fetch('/api/test-wizard/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        setCreateError(err.message ?? err.error ?? 'Failed to create test')
        return
      }

      const { test } = await res.json()
      setCreatedTestId(test.id)
      onTestCreated()
      // Keep drawer open briefly to show success, then close
      setTimeout(() => {
        if (mountedRef.current) {
          setState(INITIAL_STATE)
          setCreatedTestId(null)
          onClose()
        }
      }, 1500)
    } catch {
      setCreateError('Network error — please try again.')
    } finally {
      setCreating(false)
    }
  }, [state, onClose, onTestCreated])

  // ─── Step Navigation ───

  const canAdvanceFromStep = (step: number): boolean => {
    switch (step) {
      case 0: return state.selectedElement !== null && state.elementConfirmed
      case 1: return state.variantResult !== null
      case 2: return state.selectedGoal !== null && state.goalConfirmed
      default: return true
    }
  }

  const stepLabels = ['Element', 'Variant', 'Goal', 'Review']

  // ─── Render ───

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 h-screen w-full sm:w-[50vw] animate-slide-in-right border-l border-border bg-bg-0 shadow-2xl">
        {/* Success overlay */}
        {createdTestId && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg-0/90">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-ok/20">
                <Check className="h-6 w-6 text-ok" />
              </div>
              <p className="text-[15px] font-semibold text-text">Test created!</p>
              <p className="mt-1 text-[13px] text-text-2">Redirecting to dashboard…</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-fill-invert">
              <FlaskConical className="h-4 w-4 text-text-on-invert" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-text">New Test</p>
              <p className="text-[11px] text-text-3">
                Step {state.step + 1} of 4 — {stepLabels[state.step]}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[6px] text-text-3 transition-colors hover:bg-bg-2 hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 border-b border-border px-5 py-2.5">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium transition-colors ${
                  i < state.step
                    ? 'bg-ok text-black'
                    : i === state.step
                      ? 'bg-fill-invert text-text-on-invert'
                      : 'bg-bg-2 text-text-3'
                }`}
              >
                {i < state.step ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              {i < 3 && (
                <div className={`h-px w-5 transition-colors ${i < state.step ? 'bg-ok' : 'bg-border'}`} />
              )}
            </div>
          ))}
          <span className="ml-3 text-[10px] text-text-3">{stepLabels[state.step]}</span>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-5" style={{ height: 'calc(100vh - 180px)' }}>
          {/* Step 0: URL + Element Picker */}
          {state.step === 0 && (
            <StepUrlAndElement
              url={state.url}
              onUrlChange={(url) => updateState({ url, selectedElement: null, elementConfirmed: false })}
              selectedElement={state.selectedElement}
              onElementSelected={(el) => updateState({ selectedElement: el, elementConfirmed: false })}
              onConfirm={() => updateState({ elementConfirmed: true })}
              verifiedDomains={verifiedDomains}
            />
          )}

          {/* Step 1: Variant B */}
          {state.step === 1 && state.selectedElement && (
            <StepVariantB
              element={state.selectedElement}
              url={state.url}
              variantResult={state.variantResult}
              onVariantUpdate={(patch) => {
                updateState({
                  variantResult: state.variantResult
                    ? { ...state.variantResult, ...patch }
                    : patch as VariantResult,
                })
              }}
            />
          )}

          {/* Step 2: Goal/Metric */}
          {state.step === 2 && (
            <StepMetricPicker
              elementType={state.selectedElement?.elementType ?? 'element'}
              elementName={state.selectedElement?.elementName ?? ''}
              url={state.url}
              selectedGoal={state.selectedGoal}
              onGoalSelected={(goal) => updateState({ selectedGoal: goal, goalConfirmed: false })}
              onConfirm={() => updateState({ goalConfirmed: true })}
            />
          )}

          {/* Step 3: Review */}
          {state.step === 3 && state.selectedElement && (
            <StepReview
              url={state.url}
              element={state.selectedElement}
              variantResult={state.variantResult}
              goal={state.selectedGoal}
              testName={state.testName}
              onTestNameChange={(name) => updateState({ testName: name })}
            />
          )}
        </div>

        {/* Footer: Navigation */}
        {!createdTestId && (
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between border-t border-border bg-bg-0 px-5 py-3.5">
            <button
              onClick={() => {
                if (state.step > 0) updateState({ step: state.step - 1 })
                else onClose()
              }}
              className="flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[12px] text-text-3 transition-colors hover:text-text cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {state.step === 0 ? 'Cancel' : 'Back'}
            </button>

            {state.step < 3 ? (
              <button
                onClick={() => updateState({ step: state.step + 1 })}
                disabled={!canAdvanceFromStep(state.step)}
                className="flex items-center gap-1.5 rounded-[6px] bg-fill-invert px-4 py-2 text-[12px] font-semibold text-text-on-invert transition-opacity hover:opacity-90 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCreate('paused')}
                  disabled={creating}
                  className="rounded-[6px] border border-border px-4 py-2 text-[12px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save Paused'}
                </button>
                <button
                  onClick={() => handleCreate('active')}
                  disabled={creating}
                  className="flex items-center gap-1.5 rounded-[6px] bg-ok px-4 py-2 text-[12px] font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {creating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FlaskConical className="h-3.5 w-3.5" />
                  )}
                  {creating ? 'Creating…' : 'Go Live'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Create Error */}
        {createError && (
          <div className="absolute bottom-16 left-0 right-0 px-5">
            <div className="rounded-[6px] border border-err/20 bg-err/5 px-3 py-2 text-[11px] text-err/80">
              {createError}
            </div>
          </div>
        )}
      </div>

      {/* Slide-in animation */}
      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.25s ease-out;
        }
      `}</style>
    </>
  )
}
