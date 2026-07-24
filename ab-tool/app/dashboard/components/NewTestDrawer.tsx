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
import { X, Loader2, FlaskConical, Check, ArrowLeft, ArrowRight, Globe } from 'lucide-react'
import { StepUrlAndElement } from './new-test/StepUrlAndElement'
import type { TestRow } from './TestCard'
import { StepVariantB } from './new-test/StepVariantB'
import { StepGoal } from './new-test/StepGoal'
import { StepReview } from './new-test/StepReview'
import { useFocusTrap } from '@/lib/useFocusTrap'


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
  type: 'click'
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
  onTestCreated: (createdTest: { id: string; name: string; site_url: string; status: string }) => void
  verifiedDomains: { url: string; verifiedAt: string | null }[]
  /** Wenn gesetzt: Existierenden Draft-Test fortsetzen statt neuen erstellen. */
  resumeTest?: TestRow | null
}

// ─── Component ───

export function NewTestDrawer({ isOpen, onClose, userId, onTestCreated, verifiedDomains, resumeTest }: NewTestDrawerProps) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createdTestId, setCreatedTestId] = useState<string | null>(null)
  // Local domain list — seeded from server, extended inline when user adds a site
  // from within the wizard without leaving the flow (Plan §5, Post-Signup UX).
  const [localDomains, setLocalDomains] = useState(verifiedDomains)
  const [_addingDomain, _setAddingDomain] = useState(false)
  const [addDomainUrl, setAddDomainUrl] = useState('')
  const [addDomainState, setAddDomainState] = useState<'input' | 'saving' | 'not-found' | 'verified'>('input')
  const [addDomainError, setAddDomainError] = useState('')
  // Sync localDomains with prop when it changes externally
  const [syncedDomainsKey, setSyncedDomainsKey] = useState('')
  const currentDomainsKey = verifiedDomains.map((d) => d.url).join(',')
  if (currentDomainsKey !== syncedDomainsKey) {
    setSyncedDomainsKey(currentDomainsKey)
    setLocalDomains(verifiedDomains)
  }
  // A11Y-02: Focus-Trap, Escape, Focus-Restore und Scroll-Lock. Der Drawer
  // hatte davon nichts — ein Tastaturnutzer tabbte direkt in das Dashboard
  // dahinter, ohne zu merken, dass er das Modal verlassen hat.
  const drawerRef = useFocusTrap<HTMLDivElement>(isOpen, onClose)
  const draftTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const mountedRef = useRef(true)
  const draftLoadedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // ─── Reset state when drawer opens ───
  // Im Render statt per Effect: sonst rendert der frisch geoeffnete Drawer
  // einen Frame lang noch den Zustand des vorigen Durchlaufs.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen) {
      setState(INITIAL_STATE)
      setCreating(false)
      setCreateError('')
      setCreatedTestId(null)
    }
  }

  // Der Draft-Load-Guard ist ein Ref und darf nur im Effect zurueckgesetzt werden.
  useEffect(() => {
    if (isOpen) draftLoadedRef.current = false
  }, [isOpen])

  // ─── Draft: Load on open (only once per open) ───
  // Priority: resumeTest (test data) > wizard draft (saved progress)

  useEffect(() => {
    if (!isOpen || !userId || draftLoadedRef.current) return
    draftLoadedRef.current = true
    ;(async () => {
      // If resuming an existing draft test, populate from test data directly
      if (resumeTest) {
        if (!mountedRef.current) return
        // Parse goal from DB format (e.g. "click:.selector" or "click")
        let goalParsed = null
        if (resumeTest.goal) {
          const goalStr = resumeTest.goal
          if (goalStr.startsWith('click:')) {
            goalParsed = {
              type: 'click' as const,
              selector: goalStr.slice(6),
              label: goalStr.slice(6) ? `Clicks on ${goalStr.slice(6)}` : 'Clicks on element',
            }
          }
        }
        // Determine first incomplete step
        let startStep = 0
        const hasElement = !!resumeTest.selector
        const hasVariant = !!resumeTest.variant_b_html
        const hasGoal = !!resumeTest.goal
        if (hasElement && hasVariant && hasGoal) startStep = 3   // all done → Review
        else if (hasElement && hasVariant) startStep = 2          // Goal missing
        else if (hasElement) startStep = 1                        // Variant missing
        // else startStep = 0                                     // Element missing

        setState({
          step: startStep,
          url: resumeTest.site_url ?? '',
          selectedElement: resumeTest.selector ? {
            selector: resumeTest.selector,
            originalHtml: resumeTest.original_html ?? '',
            elementType: 'element',
            elementName: resumeTest.selector,
          } : null,
          elementConfirmed: !!resumeTest.selector,
          variantResult: resumeTest.variant_b_html ? {
            variant: resumeTest.variant_b_html,
            variant_html: resumeTest.variant_b_html ?? undefined,
            variant_css: resumeTest.variant_b_css ?? undefined,
            explanation: '',
          } : null,
          selectedGoal: goalParsed,
          goalConfirmed: !!goalParsed,
          testName: resumeTest.name?.startsWith('Demo test') ? '' : (resumeTest.name ?? ''),
          testStatus: 'active',
        })
        return
      }

      // Normal flow: load saved wizard draft
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
            selectedGoal: draft.goal ? (() => {
              // Parse encoded goal formats:
              //   'click:div.selector' → type=click, selector=div.selector
              // Non-click goals from old drafts are ignored (click-only since 07/2026)
              const goalStr = draft.goal
              let selector: string | undefined
              if (goalStr.startsWith('click:')) {
                selector = goalStr.slice(6)
              } else if (!['click', 'form_submit', 'page_view', 'purchase', 'custom'].includes(goalStr) && !goalStr.includes(':')) {
                // Unknown format — ignore
                return null
              }
              // For non-click legacy goals, treat as no goal (user must re-select)
              if (!goalStr.startsWith('click:') && goalStr !== 'click') {
                return null
              }
              return {
                type: 'click' as const,
                selector: selector ?? draft.goal_selector ?? undefined,
                label: draft.goal ?? '',
              }
            })() : null,
            goalConfirmed: !!draft.goal,
            testName: draft.auto_name ?? '',
          }))
        }
      } catch { /* Draft-Load ist nice-to-have */ }
    })()
  // resumeTest intentionally omitted from deps — draft load only on drawer open (guarded by draftLoadedRef)
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
            goal: s.selectedGoal ? (s.selectedGoal.selector ? `click:${s.selectedGoal.selector}` : 'click') : null,
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

  const handleCreate = useCallback(async (status: 'active' | 'paused' | 'draft') => {
    if (!state.url || !state.selectedElement || !state.selectedGoal || !state.variantResult) {
      setCreateError('Please complete all steps before creating the test.')
      return
    }
    setCreating(true)
    setCreateError('')

    try {
      const goal = state.selectedGoal.selector
        ? `click:${state.selectedGoal.selector}`
        : 'click'

      // Bug 3: selector must be a valid CSS selector, not element name
      if (!state.selectedElement.selector) {
        setCreateError('No CSS selector — please re-select the element in Step 1.')
        setCreating(false)
        return
      }
      const selector = state.selectedElement.selector

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

      // Resume mode: PATCH existing draft test. Normal mode: POST new test.
      const isResume = !!resumeTest
      const endpoint = isResume ? `/api/tests/${resumeTest.id}` : '/api/test-wizard/create'
      const method = isResume ? 'PATCH' : 'POST'

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        setCreateError(err.message ?? err.error ?? 'Failed to create test')
        return
      }

      const { test } = await res.json().catch(() => ({ test: null }))
      const testResult = test ?? resumeTest // PATCH returns updated test or empty
      setCreatedTestId(testResult?.id ?? resumeTest?.id ?? '')
      onTestCreated({
        id: testResult?.id ?? resumeTest?.id ?? '',
        name: state.testName || resumeTest?.name || 'Untitled test',
        site_url: state.url,
        status: isResume ? status : (testResult?.status ?? status),
      })
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
  }, [state, onClose, onTestCreated, resumeTest])

  // ─── Inline Domain Add ───
  const normalize = (raw: string) =>
    raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '')

  const handleAddDomain = useCallback(async () => {
    const normalized = normalize(addDomainUrl)
    if (!normalized || !normalized.includes('.')) {
      setAddDomainError('Please enter a valid domain (e.g. yoursite.com)')
      return
    }
    setAddDomainError('')
    setAddDomainState('saving')

    try {
      const saveRes = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized }),
      })
      if (saveRes.status === 402) {
        const d = await saveRes.json().catch(() => ({}))
        setAddDomainError(d.error || 'Domain limit reached.')
        setAddDomainState('input')
        return
      }
      if (!saveRes.ok && saveRes.status !== 409) {
        const d = await saveRes.json().catch(() => ({}))
        setAddDomainError(d.error || 'Failed to save domain.')
        setAddDomainState('input')
        return
      }

      // Snippet check
      const checkRes = await fetch('/api/snippet-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_url: normalized }),
      })
      const json = await checkRes.json()
      if (!json.detected) {
        setAddDomainState('not-found')
        return
      }

      // Verify
      const domainsRes = await fetch('/api/domains')
      const { domains: freshDomains } = await domainsRes.json()
      const newDomain = (freshDomains || []).find((d: { url: string }) => d.url === normalized)
      if (newDomain?.id) {
        await fetch('/api/domains/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domainId: newDomain.id }),
        }).catch(() => {})
      }

      setLocalDomains((prev) => [...prev, { url: normalized, verifiedAt: new Date().toISOString() }])
      setAddDomainState('verified')
    } catch {
      setAddDomainError('Connection failed. Check your internet.')
      setAddDomainState('input')
    }
  }, [addDomainUrl])

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
      {/* Backdrop — rein dekorativ. Schliessen per Escape oder X-Button; das
          Klick-Ziel bleibt als Bequemlichkeit erhalten, ist aber aria-hidden,
          damit Screenreader keinen sinnlosen Knopf ansagen. */}
      <div
        className="fixed inset-0 z-40 bg-black/60 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-test-drawer-title"
        tabIndex={-1}
        className="fixed right-0 top-0 z-50 h-dvh w-full sm:w-[50vw] animate-slide-in-right border-l border-border bg-bg-0 shadow-2xl focus-visible:outline-none"
      >
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
              <h2 id="new-test-drawer-title" className="text-[14px] font-semibold text-text">New Test</h2>
              <p className="text-[11px] text-text-3">
                Step {state.step + 1} of 4 — {stepLabels[state.step]}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close new test wizard"
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[6px] text-text-3 transition-colors hover:bg-bg-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/40"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Draft-mode banner with inline domain input — shown when no verified domain exists */}
        {localDomains.length === 0 && (
          <div className="border-b border-pro/20 bg-pro/[0.04] px-5 py-3">
            {addDomainState === 'verified' ? (
              <p className="flex items-center gap-1.5 text-[12px] text-ok font-medium">
                <Check className="h-3.5 w-3.5" />
                {addDomainUrl.trim()} connected — you can now go live.
              </p>
            ) : addDomainState === 'saving' ? (
              <p className="flex items-center gap-2 text-[12px] text-pro font-medium">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving &amp; checking {addDomainUrl.trim()}…
              </p>
            ) : addDomainState === 'not-found' ? (
              <div className="space-y-2">
                <p className="text-[12px] text-pro font-medium">
                  Snippet not found on {addDomainUrl.trim()}. Paste it in your site&apos;s &lt;head&gt; and retry.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddDomain}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-[4px] bg-fill-invert px-2.5 py-1 text-[10px] font-semibold text-text-on-invert transition-opacity hover:opacity-85"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => { setAddDomainState('input'); setAddDomainError('') }}
                    className="cursor-pointer text-[10px] text-text-3 underline hover:text-text-2"
                  >
                    Change URL
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[12px] text-pro font-medium mb-2">
                  Draft mode — add your domain to go live with real visitors.
                </p>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 max-w-[220px]">
                    <Globe className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3" />
                    <input
                      type="text"
                      value={addDomainUrl}
                      onChange={(e) => { setAddDomainUrl(e.target.value); setAddDomainError('') }}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                      placeholder="yoursite.com"
                      disabled={addDomainState !== 'input'}
                      className="w-full h-[30px] rounded-[4px] border border-border bg-bg-0 pl-7 pr-2 text-[11px] text-text placeholder:text-text-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text/30"
                    />
                  </div>
                  <button
                    onClick={handleAddDomain}
                    disabled={!addDomainUrl.trim()}
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-[4px] bg-fill-invert px-3 py-1 text-[10px] font-semibold text-text-on-invert transition-opacity hover:opacity-85 disabled:opacity-30"
                  >
                    Check
                  </button>
                </div>
                {addDomainError && (
                  <p className="mt-1.5 text-[10px] text-err">{addDomainError}</p>
                )}
              </div>
            )}
          </div>
        )}

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
        <div className="overflow-y-auto px-5 py-5" style={{ height: 'calc(100dvh - 180px)' }}>
          {/* Step 0: URL + Element Picker */}
          {state.step === 0 && (
            <StepUrlAndElement
              url={state.url}
              onUrlChange={(url) => updateState({ url, selectedElement: null, elementConfirmed: false })}
              selectedElement={state.selectedElement}
              onElementSelected={(el) => updateState({ selectedElement: el, elementConfirmed: false })}
              onConfirm={() => updateState({ elementConfirmed: true })}
              verifiedDomains={localDomains}
            />
          )}

          {/* Step 1: Variant B */}
          {state.step === 1 && state.selectedElement && (
            <StepVariantB
              element={state.selectedElement}
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
            <StepGoal
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
              hasDomain={localDomains.length > 0}
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
                {localDomains.length === 0 ? (
                  <>
                    <button
                      onClick={() => handleCreate('active')}
                      disabled
                      title="Install the snippet on your site to go live"
                      className="flex items-center gap-1.5 rounded-[6px] border border-border bg-bg-1 px-4 py-2 text-[12px] font-medium text-text-3 cursor-not-allowed"
                    >
                      <FlaskConical className="h-3.5 w-3.5" />
                      Go Live
                    </button>
                    <button
                      onClick={() => handleCreate('draft')}
                      disabled={creating}
                      className="flex items-center gap-1.5 rounded-[6px] bg-fill-invert px-4 py-2 text-[12px] font-semibold text-text-on-invert transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : resumeTest ? 'Save Progress' : 'Save Draft'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleCreate('draft')}
                      disabled={creating}
                      className="rounded-[6px] border border-border px-4 py-2 text-[12px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : resumeTest ? 'Save Progress' : 'Save Draft'}
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
                      {creating ? 'Saving…' : resumeTest ? 'Complete & Go Live' : 'Go Live'}
                    </button>
                  </>
                )}
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
