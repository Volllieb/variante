'use client'

/**
 * NewTestDrawer — Vercel-Style Drawer für die Test-Erstellung.
 *
 * Slide-in von rechts, nimmt 50vw auf Desktop, 100vw auf Mobile.
 * Enthält die komplette Wizard-State-Machine und rendert die 4 Steps.
 *
 * Flow:
 * Step 0: URL + Element auf Live-Site wählen
 * Step 1: Goal/Metrik wählen (VOR der Variante — die Variante soll aufs Ziel
 *         hin gebaut werden, nicht umgekehrt)
 * Step 2: Change — Änderungsliste als Delta auf A (KI nur als Vorschlagsquelle)
 * Step 3: Review + Create
 *
 * Die Änderungsliste (variantChanges) ist die Quelle der Wahrheit:
 * variantResult wird bei jeder Listenänderung aus composeVariant() neu
 * abgeleitet, nie direkt gesetzt. Draft: Fortschritt wird automatisch
 * serverseitig gespeichert (debounced).
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { X, Loader2, FlaskConical, Check, ArrowLeft, ArrowRight } from 'lucide-react'
import { StepUrlAndElement } from './new-test/StepUrlAndElement'
import type { TestRow } from './TestCard'
import { StepChange } from './new-test/StepChange'
import { StepGoal } from './new-test/StepGoal'
import { StepReview } from './new-test/StepReview'
import {
  collectedOriginalComputed,
  buildStyleBaseline,
  composeVariant,
  diffCssToEntries,
  diffTextToEntry,
  entryId,
} from './new-test/delta'
import type { ChangeEntry, ChangeProperty, StyleBaseline, VariantChangeSet } from './new-test/types'
import { extractTextFromHtml } from '@/lib/previewDoc'
import { useFocusTrap } from '@/lib/useFocusTrap'


// ─── Types ───

export interface ElementSelection {
  selector: string
  originalHtml: string
  /**
   * Styles der Zielseite fuer dieses Element (site_css). Nur der Picker liefert
   * sie — AI-Scan und manueller Modus lassen das Feld leer, und die Vorschau in
   * StepReview faellt dann bewusst auf den Textvergleich zurueck, statt einen
   * ungestylten Browser-Default-Button zu zeigen.
   */
  originalCss: string
  elementType: string
  elementName: string
  /** Style-Kontext vom Picker (Site-CSS + Computed-Styles) — Basis für Delta-Editor und Vorschau. */
  styleContext?: import('@/lib/pickerBridge').StyleContext
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
  /** Änderungsliste — Quelle der Wahrheit; variantResult wird daraus abgeleitet. */
  variantChanges: VariantChangeSet
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
  variantChanges: { mode: 'inherit', entries: [], baseline: null },
  variantResult: null,
  selectedGoal: null,
  goalConfirmed: false,
  testName: '',
  testStatus: 'active',
}

// ─── Resume-Helfer: variant_b_changes laden/validieren ───

const CHANGE_PROPERTIES: ReadonlySet<string> = new Set([
  'text', 'bgColor', 'textColor', 'fontSize', 'fontWeight', 'borderRadius',
  'paddingX', 'paddingY', 'borderWidth', 'borderColor', 'borderStyle',
  'hoverBgColor', 'hoverScale', 'hoverShadow', 'other',
])
const CHANGE_SOURCES: ReadonlySet<string> = new Set(['manual', 'ai', 'figma'])
const CHANGE_STATUSES: ReadonlySet<string> = new Set(['applied', 'suggested'])

function sanitizeBaseline(raw: unknown): StyleBaseline | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const num = (v: unknown): number | undefined => (typeof v === 'number' && !Number.isNaN(v) ? v : undefined)
  const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)
  const b: StyleBaseline = {
    ...(str(o.bgColor) !== undefined ? { bgColor: str(o.bgColor) } : {}),
    ...(str(o.textColor) !== undefined ? { textColor: str(o.textColor) } : {}),
    ...(str(o.borderColor) !== undefined ? { borderColor: str(o.borderColor) } : {}),
    ...(str(o.borderStyle) !== undefined ? { borderStyle: str(o.borderStyle) } : {}),
    ...(num(o.fontSize) !== undefined ? { fontSize: num(o.fontSize) } : {}),
    ...(num(o.fontWeight) !== undefined ? { fontWeight: num(o.fontWeight) } : {}),
    ...(num(o.borderRadius) !== undefined ? { borderRadius: num(o.borderRadius) } : {}),
    ...(num(o.paddingX) !== undefined ? { paddingX: num(o.paddingX) } : {}),
    ...(num(o.paddingY) !== undefined ? { paddingY: num(o.paddingY) } : {}),
    ...(num(o.borderWidth) !== undefined ? { borderWidth: num(o.borderWidth) } : {}),
  }
  return Object.keys(b).length ? b : null
}

/**
 * Parsed die persistierte Änderungsliste. Kommt als jsonb-Objekt (Supabase
 * parst) oder als JSON-String — beides wird akzeptiert. Unbekannte/ungültige
 * Zeilen fliegen raus statt den Drawer zu crashen.
 */
function parseChanges(raw: unknown): VariantChangeSet | null {
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw) } catch { return null }
  }
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (!Array.isArray(obj.entries)) return null
  const entries: ChangeEntry[] = []
  for (const e of obj.entries) {
    if (!e || typeof e !== 'object') continue
    const row = e as Record<string, unknown>
    if (typeof row.property !== 'string' || !CHANGE_PROPERTIES.has(row.property)) continue
    entries.push({
      id: typeof row.id === 'string' && row.id ? row.id : entryId(),
      property: row.property as ChangeProperty,
      before: typeof row.before === 'string' ? row.before : '',
      after: typeof row.after === 'string' ? row.after : '',
      source: CHANGE_SOURCES.has(String(row.source)) ? row.source as ChangeEntry['source'] : 'ai',
      status: CHANGE_STATUSES.has(String(row.status)) ? row.status as ChangeEntry['status'] : 'suggested',
      ...(typeof row.explanation === 'string' ? { explanation: row.explanation } : {}),
      ...(typeof row.rawCss === 'string' ? { rawCss: row.rawCss } : {}),
    })
  }
  return {
    mode: obj.mode === 'scratch' ? 'scratch' : 'inherit',
    entries,
    baseline: sanitizeBaseline(obj.baseline),
  }
}

/** Host einer (evtl. unvollstaendigen) URL — leer, wenn sie keinen ergibt. */
function hostOf(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  try {
    return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
      .hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/**
 * Alttest ohne variant_b_changes: Liste aus variant_b_css/-html rekonstruieren
 * — derselbe Diff-Pfad wie für KI-Ergebnisse, nur direkt 'applied' (die
 * Änderungen sind ja bereits der Zustand von B). Ein Sonderfall für den
 * Status, keiner für das Parsen.
 */
function reconstructChanges(
  originalHtml: string | null | undefined,
  variantHtml: string | null | undefined,
  variantCss: string | null | undefined,
  baseline: StyleBaseline | null
): VariantChangeSet {
  const textEntry = diffTextToEntry(originalHtml ?? '', variantHtml ?? null, 'ai')
  const entries = [
    ...diffCssToEntries(variantCss ?? null, baseline, 'ai'),
    ...(textEntry ? [textEntry] : []),
  ].map((e) => ({ ...e, status: 'applied' as const }))
  return { mode: 'inherit', entries, baseline }
}

/** Komponiert variantResult aus der Änderungsliste — nie direkt gesetzt. */
function resultFromChanges(
  changes: VariantChangeSet,
  originalHtml: string,
  selector: string
): VariantResult | null {
  if (!changes.entries.some((e) => e.status === 'applied')) return null
  const { html, css } = composeVariant(changes, originalHtml, selector)
  return {
    variant: extractTextFromHtml(html),
    variant_html: html,
    variant_css: css,
    explanation: '',
  }
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
  const [goLiveConfirm, setGoLiveConfirm] = useState(false)
  // Local domain list — seeded from server, extended inline when user adds a site
  // from within the wizard without leaving the flow (Plan §5, Post-Signup UX).
  const [localDomains, setLocalDomains] = useState(verifiedDomains)
  // Inline domain-connect (Step 0) — the hostname is derived from the URL the
  // user already typed there, so there's no second "yoursite.com" input.
  const [connectingDomain, setConnectingDomain] = useState('')
  const [domainConnectState, setDomainConnectState] = useState<'idle' | 'saving' | 'not-found' | 'verified'>('idle')
  const [domainConnectError, setDomainConnectError] = useState('')
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
      setGoLiveConfirm(false)
      setConnectingDomain('')
      setDomainConnectState('idle')
      setDomainConnectError('')
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
        // Änderungsliste laden — fehlt sie (Alttest), wird sie aus
        // variant_b_css/-html rekonstruiert. Baseline: gemessene Computed-
        // Styles aus dem site_css (.__original-Block), sonst die
        // mitpersistierte Baseline der Liste.
        const computed = collectedOriginalComputed(resumeTest.site_css ?? '')
        const measuredBaseline = buildStyleBaseline(computed)
        const parsedChanges = parseChanges(resumeTest.variant_b_changes)
        const variantChanges = parsedChanges
          ? { ...parsedChanges, baseline: parsedChanges.baseline ?? measuredBaseline }
          : reconstructChanges(
              resumeTest.original_html,
              resumeTest.variant_b_html,
              resumeTest.variant_b_css,
              measuredBaseline,
            )
        // Determine first incomplete step — "hat Variante" heisst jetzt:
        // die Änderungsliste trägt angewandte Zeilen.
        let startStep = 0
        const hasElement = !!resumeTest.selector
        const hasVariant = variantChanges.entries.some((e) => e.status === 'applied')
        const hasGoal = !!resumeTest.goal
        if (hasElement && hasGoal && hasVariant) startStep = 3   // all done → Review
        else if (hasElement && hasGoal) startStep = 2              // Change missing
        else if (hasElement) startStep = 1                        // Goal missing
        // else startStep = 0                                     // Element missing

        setState({
          step: startStep,
          url: resumeTest.site_url ?? '',
          selectedElement: resumeTest.selector ? {
            selector: resumeTest.selector,
            originalHtml: resumeTest.original_html ?? '',
            originalCss: resumeTest.site_css ?? '',
            // element_type kommt seit 044 aus der DB — vorher 'element',
            // was getEditorCategory immer auf 'button' fallen liess.
            elementType: resumeTest.element_type ?? 'element',
            elementName: resumeTest.selector,
            styleContext: resumeTest.site_css ? { css: resumeTest.site_css, computed: computed ?? {} } : undefined,
          } : null,
          elementConfirmed: !!resumeTest.selector,
          variantChanges,
          variantResult: resumeTest.selector
            ? resultFromChanges(variantChanges, resumeTest.original_html ?? '', resumeTest.selector)
            : null,
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
          const draftComputed = collectedOriginalComputed(draft.site_css ?? '')
          const draftBaseline = buildStyleBaseline(draftComputed)
          const draftParsed = parseChanges(draft.variant_b_changes)
          const draftChanges = draftParsed
            ? { ...draftParsed, baseline: draftParsed.baseline ?? draftBaseline }
            : reconstructChanges(
                draft.original_html,
                draft.variant_b_html,
                draft.variant_b_css,
                draftBaseline,
              )
          setState((prev) => ({
            ...prev,
            step: draft.step ?? 0,
            url: draft.url ?? '',
            selectedElement: draft.selector ? {
              selector: draft.selector,
              originalHtml: draft.original_html ?? '',
              originalCss: draft.site_css ?? '',
              elementType: draft.element_type ?? 'element',
              elementName: draft.element_name ?? draft.selector,
              styleContext: draft.site_css ? { css: draft.site_css, computed: draftComputed ?? {} } : undefined,
            } : null,
            elementConfirmed: !!draft.selector,
            variantChanges: draftChanges,
            variantResult: draft.selector
              ? resultFromChanges(draftChanges, draft.original_html ?? '', draft.selector)
              : null,
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
            // originalCss wird beim Pick aus styleContext.css befüllt
            // (StepUrlAndElement) — eine Quelle für Draft und Test.
            site_css: s.selectedElement?.originalCss || null,
            variant_b_html: s.variantResult?.variant_html ?? null,
            variant_b_css: s.variantResult?.variant_css ?? null,
            variant_text: s.variantResult?.variant ?? null,
            // Änderungsliste als JSON — die Quelle der Wahrheit fürs Resume.
            variant_b_changes: s.variantChanges.entries.length
              ? JSON.stringify(s.variantChanges)
              : null,
            element_type: s.selectedElement?.elementType ?? null,
            element_name: s.selectedElement?.elementName ?? null,
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

  /**
   * Die eine Schreibstelle für die Änderungsliste: variantResult wird bei
   * jeder Listenänderung aus composeVariant() neu abgeleitet — der
   * Abwärtsfluss ist damit immer Liste → Ergebnis, nie umgekehrt.
   */
  const applyVariantChanges = useCallback((changes: VariantChangeSet) => {
    setState((prev) => {
      const next: WizardState = { ...prev, variantChanges: changes }
      next.variantResult = prev.selectedElement
        ? resultFromChanges(changes, prev.selectedElement.originalHtml, prev.selectedElement.selector || prev.selectedElement.elementName)
        : null
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
        setCreateError('No CSS selector — please go back to the Element step and re-select the element.')
        setCreating(false)
        return
      }
      const selector = state.selectedElement.selector

      const body: Record<string, unknown> = {
        site_url: state.url,
        selector,
        goal,
        // null statt undefined: ein Resume-PATCH muss die Felder auch LEEREN
        // können — undefined würde den Key aus dem JSON-Body streichen.
        variant_b_html: state.variantResult?.variant_html ?? null,
        variant_b_css: state.variantResult?.variant_css ?? null,
        variant_text: state.variantResult?.variant ?? null,
        variant_b_changes: state.variantChanges.entries.length
          ? JSON.stringify(state.variantChanges)
          : null,
        element_type: state.selectedElement.elementType || null,
        original_html: state.selectedElement.originalHtml,
        // Ohne site_css rendert die Preview auf der Results-Seite spaeter
        // ungestylt — bis 08/2026 wurde es aus dem Wizard nie mitgeschickt.
        site_css: state.selectedElement.originalCss || undefined,
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

  // ─── Inline Domain Connect (triggered from within Step 0's URL field) ───
  const normalize = (raw: string) =>
    raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '')

  const handleConnectDomain = useCallback(async (hostname: string) => {
    const normalized = normalize(hostname)
    if (!normalized || !normalized.includes('.')) {
      setDomainConnectError('Please enter a valid domain (e.g. yoursite.com)')
      return
    }
    setConnectingDomain(normalized)
    setDomainConnectError('')
    setDomainConnectState('saving')

    try {
      const saveRes = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized }),
      })
      if (saveRes.status === 402) {
        const d = await saveRes.json().catch(() => ({}))
        setDomainConnectError(d.error || 'Domain limit reached.')
        setDomainConnectState('idle')
        return
      }
      if (!saveRes.ok && saveRes.status !== 409) {
        const d = await saveRes.json().catch(() => ({}))
        setDomainConnectError(d.error || 'Failed to save domain.')
        setDomainConnectState('idle')
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
        setDomainConnectState('not-found')
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
      setDomainConnectState('verified')
    } catch {
      setDomainConnectError('Connection failed. Check your internet.')
      setDomainConnectState('idle')
    }
  }, [])

  // ─── Step Navigation ───

  const canAdvanceFromStep = (step: number): boolean => {
    switch (step) {
      case 0: return state.selectedElement !== null && state.elementConfirmed
      case 1: return state.selectedGoal !== null && state.goalConfirmed
      // Eine leere Änderungsliste ist kein Test — B wäre identisch mit A.
      // (Server-Guard empty_variant fängt zusätzlich Altbestand und PATCH ab.)
      case 2: return state.variantChanges.entries.some((e) => e.status === 'applied')
      default: return true
    }
  }

  const stepLabels = ['Element', 'Goal', 'Change', 'Review']

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
            <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-fill-invert">
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
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[var(--radius-md)] text-text-3 transition-colors hover:bg-bg-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30"
          >
            <X className="h-4 w-4" aria-hidden="true" />
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
        <div className="overflow-y-auto px-5 py-5" style={{ height: 'calc(100dvh - 180px)' }}>
          {/* Step 0: URL + Element Picker */}
          {state.step === 0 && (
            <StepUrlAndElement
              url={state.url}
              // Andere Seite = neues Element — Änderungsliste und Ergebnis
              // starten frisch, sonst hinge ein stale Delta am Draft.
              // Bleibt der Host gleich (Step 0 normalisiert Alt-URLs auf die
              // verbundene Wurzel), ist das keine neue Seite: die Auswahl darf
              // dann nicht verloren gehen.
              onUrlChange={(url) => updateState(
                hostOf(url) === hostOf(state.url)
                  ? { url }
                  : {
                      url,
                      selectedElement: null,
                      elementConfirmed: false,
                      variantChanges: { mode: 'inherit', entries: [], baseline: null },
                      variantResult: null,
                    }
              )}
              selectedElement={state.selectedElement}
              // Ein neues Element macht die alte Änderungsliste wertlos —
              // Zeilen und Ergebnis starten frisch, die Baseline wird beim
              // Bestätigen einmalig gemessen.
              onElementSelected={(el) => updateState({
                selectedElement: el,
                elementConfirmed: false,
                variantChanges: { mode: 'inherit', entries: [], baseline: null },
                variantResult: null,
              })}
              onConfirm={() => {
                // Baseline einmalig bestimmen, wenn das Element bestätigt
                // wird (buildStyleBaseline aus den gemessenen Computed-Styles).
                // Ohne Picker degeneriert das Delta bewusst zu absoluten
                // Werten — Step 0 warnt dann sichtbar.
                const baseline = buildStyleBaseline(state.selectedElement?.styleContext?.computed) ?? null
                updateState({
                  elementConfirmed: true,
                  variantChanges: { ...state.variantChanges, baseline: baseline ?? state.variantChanges.baseline },
                })
              }}
              verifiedDomains={localDomains}
              domainConnectState={domainConnectState}
              domainConnectError={domainConnectError}
              connectingDomain={connectingDomain}
              onConnectDomain={handleConnectDomain}
            />
          )}

          {/* Step 1: Goal/Metric — vor der Variante, damit die Variante aufs Ziel hin gebaut wird */}
          {state.step === 1 && (
            <StepGoal
              elementType={state.selectedElement?.elementType ?? 'element'}
              elementName={state.selectedElement?.elementName ?? ''}
              url={state.url}
              selectedGoal={state.selectedGoal}
              onGoalSelected={(goal) => updateState({ selectedGoal: goal, goalConfirmed: false })}
              onConfirm={() => updateState({ goalConfirmed: true })}
            />
          )}

          {/* Step 2: Change — Änderungsliste als Delta auf A */}
          {state.step === 2 && state.selectedElement && (
            <StepChange
              element={state.selectedElement}
              changes={state.variantChanges}
              onChanges={applyVariantChanges}
            />
          )}

          {/* Step 3: Review */}
          {state.step === 3 && state.selectedElement && (
            <StepReview
              url={state.url}
              element={state.selectedElement}
              variantResult={state.variantResult}
              changes={state.variantChanges}
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
              className="flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-[12px] text-text-3 transition-colors hover:text-text cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {state.step === 0 ? 'Cancel' : 'Back'}
            </button>

            {state.step < 3 ? (
              <button
                onClick={() => updateState({ step: state.step + 1 })}
                disabled={!canAdvanceFromStep(state.step)}
                className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-fill-invert px-4 py-2 text-[12px] font-semibold text-text-on-invert transition-opacity hover:opacity-90 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
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
                      className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-border bg-bg-1 px-4 py-2 text-[12px] font-medium text-text-3 cursor-not-allowed"
                    >
                      <FlaskConical className="h-3.5 w-3.5" />
                      Go Live
                    </button>
                    <button
                      onClick={() => handleCreate('draft')}
                      disabled={creating}
                      className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-fill-invert px-4 py-2 text-[12px] font-semibold text-text-on-invert transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : resumeTest ? 'Save Progress' : 'Save Draft'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleCreate('draft')}
                      disabled={creating}
                      className="rounded-[var(--radius-md)] border border-border px-4 py-2 text-[12px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : resumeTest ? 'Save Progress' : 'Save Draft'}
                    </button>
                    {!goLiveConfirm ? (
                      <button
                        onClick={() => setGoLiveConfirm(true)}
                        disabled={creating}
                        className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-ok px-4 py-2 text-[12px] font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <FlaskConical className="h-3.5 w-3.5" />
                        {resumeTest ? 'Complete & Go Live' : 'Go Live'}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCreate('active')}
                          disabled={creating}
                          className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-ok px-4 py-2 text-[12px] font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          {creating ? 'Saving…' : 'Confirm — go live now'}
                        </button>
                        <button
                          onClick={() => setGoLiveConfirm(false)}
                          disabled={creating}
                          className="rounded-[var(--radius-md)] border border-border px-3 py-2 text-[12px] text-text-3 transition-colors hover:text-text disabled:opacity-30 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Create Error */}
        {createError && (
          <div className="absolute bottom-16 left-0 right-0 px-5">
            <div className="rounded-[var(--radius-md)] border border-err/20 bg-err/5 px-3 py-2 text-[11px] text-err/80">
              {createError}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
