'use client'

/**
 * TestCreationPanel — 4-Step Wizard für die Web-basierte Test-Erstellung.
 *
 * Step 1: URL scannen → CRO-Vorschläge vom AI
 * Step 2: Variante generieren → Screenshot-Preview mit urlbox
 * Step 3: Conversion-Ziel wählen
 * Step 4: Review & Test erstellen
 *
 * Architektur: Server Actions für Mutations, Route-Handler für AI-Calls.
 * Zustand lebt im useState — kein Form-Library-Overkill für 4 Steps.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  FlaskConical, Loader2, Check, X, Globe, Search, Wand2,
  Target, ArrowRight, ArrowLeft, Sparkles, Image, Eye,
  MousePointerClick, FileText, ShoppingCart, Gauge, PlusCircle,
  ExternalLink, RefreshCw, AlertTriangle, Puzzle, Code, Palette,
  Copy,
} from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { useTestsInsert } from '@/lib/useRealtime'
import { SNIPPET_CODE } from '@/lib/snippetCode'

// ─── Token-Palette (bestehendes Dashboard-Design) ───

const T = {
  bg1: '#0a0a0a', bg2: '#111111', text: '#ededed',
  ok: '#2fd76c', pro: '#f5a623', err: '#f5455c', accent: '#a78bfa',
}

// ─── Typen ───

interface CROSuggestion {
  element: string
  original: string
  variant: string
  why: string
  type?: 'text' | 'color' | 'css' | 'layout'
  selector?: string
}

interface VariantResult {
  variant: string
  variant_html?: string
  variant_css?: string
  explanation: string
}

interface GoalDef {
  type: 'click' | 'form_submit' | 'page_view' | 'purchase' | 'custom'
  label: string
  description: string
  selector?: string
}

type WizardStep = 1 | 2 | 3 | 4

// ─── Props ───

interface TestCreationPanelProps {
  apiToken: string
  onClose: () => void
}

// ─── Main ───

export function TestCreationPanel({ apiToken, onClose }: TestCreationPanelProps) {
  const router = useRouter()

  // Step state
  const [step, setStep] = useState<WizardStep>(1)

  // Step 1: Scan
  const [url, setUrl] = useState('')
  const [scanning, setScanning] = useState(false)
  const [suggestions, setSuggestions] = useState<CROSuggestion[]>([])
  const [scanError, setScanError] = useState('')
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState<number | null>(null)

  // Figma helper state
  const [figmaListening, setFigmaListening] = useState(false)
  const [figmaElapsed, setFigmaElapsed] = useState(0)
  const [figmaTestName, setFigmaTestName] = useState('')
  const [figmaReceived, setFigmaReceived] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    getBrowserSupabase().auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [])

  // Figma realtime: neuer Test via Plugin → sofort reagieren
  useTestsInsert(userId, (name) => {
    if (!mountedRef.current) return
    if (figmaListening) {
      setFigmaReceived(true)
      setFigmaTestName(name)
      setFigmaListening(false)
    }
  })

  // Figma timer
  useEffect(() => {
    if (!figmaListening) return
    const t = setInterval(() => setFigmaElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [figmaListening])

  // Snippet copy state
  const [snippetCopied, setSnippetCopied] = useState(false)
  const [aiPromptCopied, setAiPromptCopied] = useState(false)

  // Step 2: Variant
  const [variantDescription, setVariantDescription] = useState('')
  const [generating, setGenerating] = useState(false)
  const [variantResult, setVariantResult] = useState<VariantResult | null>(null)
  const [genError, setGenError] = useState('')
  const [screenshotUrl, setScreenshotUrl] = useState('')

  // Step 3: Goal
  const [goalType, setGoalType] = useState<GoalDef['type']>('click')
  const [goalSelector, setGoalSelector] = useState('')
  const [customGoalName, setCustomGoalName] = useState('')

  // Step 4: Create
  const [testName, setTestName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // ─── Derived ───

  const selectedSuggestion = selectedSuggestionIdx !== null ? suggestions[selectedSuggestionIdx] : null
  const canAdvanceFromStep1 = selectedSuggestionIdx !== null
  const canAdvanceFromStep2 = variantResult !== null
  const canAdvanceFromStep3 = goalType !== 'custom' || customGoalName.trim().length > 0
  const canCreate = testName.trim().length > 0

  // ─── Step 1: Scan ───

  const handleScan = useCallback(async () => {
    if (!url.trim()) return
    setScanning(true)
    setScanError('')
    setSuggestions([])
    setSelectedSuggestionIdx(null)

    try {
      const supabase = getBrowserSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setScanError('Not authenticated'); return }

      const normalizedUrl = url.trim()
      const finalUrl = /^https?:\/\//i.test(normalizedUrl) ? normalizedUrl : `https://${normalizedUrl}`

      const res = await fetch('/api/test-wizard/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: finalUrl }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        setScanError(err.message ?? err.error ?? 'Scan failed')
        return
      }

      const data = await res.json()
      if (!data.suggestions?.length) {
        setScanError('No optimization opportunities found on this page.')
        return
      }
      setSuggestions(data.suggestions)
    } catch {
      setScanError('Network error — please try again.')
    } finally {
      setScanning(false)
    }
  }, [url])

  // ─── Step 2: Generate ───

  const handleGenerate = useCallback(async () => {
    if (!selectedSuggestion || !variantDescription.trim()) return
    setGenerating(true)
    setGenError('')
    setVariantResult(null)
    setScreenshotUrl('')

    try {
      const res = await fetch('/api/test-wizard/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          element: selectedSuggestion.element,
          original: selectedSuggestion.original,
          variantDescription: variantDescription.trim(),
          type: selectedSuggestion.type ?? 'text',
          selector: selectedSuggestion.selector,
          pageContext: undefined, // TODO: später aus ab.js picker anreichern
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        setGenError(err.message ?? err.error ?? 'Generation failed')
        return
      }

      const data: VariantResult = await res.json()
      setVariantResult(data)
    } catch {
      setGenError('Network error — please try again.')
    } finally {
      setGenerating(false)
    }
  }, [selectedSuggestion, variantDescription])

  // ─── Step 2: Screenshot (via /api/preview) ───

  const handlePreview = useCallback(async () => {
    if (!url.trim()) return
    try {
      const finalUrl = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: finalUrl }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.originalUrl) setScreenshotUrl(data.originalUrl)
      }
    } catch { /* Screenshot ist nice-to-have, kein Blocker */ }
  }, [url])

  // ─── Step 4: Create ───

  const handleCreate = useCallback(async () => {
    if (!canCreate || !variantResult) return
    setCreating(true)
    setCreateError('')

    try {
      const goal = goalType === 'custom'
        ? customGoalName.trim()
        : goalType === 'click' && goalSelector.trim()
          ? `click:${goalSelector.trim()}`
          : goalType

      const body: Record<string, unknown> = {
        name: testName.trim(),
        site_url: url.trim(),
        goal: goalType === 'click' && goalSelector.trim()
          ? `click:${goalSelector.trim()}`
          : goalType,
        selector: selectedSuggestion?.selector,
      }

      // Varianten-Daten anhängen
      if (variantResult.variant_html) body.variant_html = variantResult.variant_html
      if (variantResult.variant_css) body.variant_css = variantResult.variant_css
      body.variant_text = variantResult.variant

      const supabase = getBrowserSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${apiToken}` } : {}),
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        setCreateError(err.message ?? err.error ?? 'Failed to create test')
        return
      }

      router.push('/dashboard?tab=tests&new=1')
      router.refresh()
      onClose()
    } catch {
      setCreateError('Network error — please try again.')
    } finally {
      setCreating(false)
    }
  }, [canCreate, variantResult, testName, url, goalType, goalSelector, customGoalName, selectedSuggestion, apiToken, router, onClose])

  // ─── Render ───

  return (
    <div className="relative mb-4 overflow-hidden rounded-[12px] border border-white/10 bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-white">
            <FlaskConical className="h-4 w-4 text-black" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#ededed]">Create test</p>
            <p className="text-[11px] text-[#ededed]/40">Step {step} of 4</p>
          </div>
        </div>
        <button onClick={onClose}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[6px] text-[#ededed]/40 transition-colors hover:bg-white/[0.04] hover:text-[#ededed]">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-white/[0.04]">
        {([1, 2, 3, 4] as WizardStep[]).map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium transition-colors ${
              s < step ? 'bg-[#2fd76c] text-black' :
              s === step ? 'bg-white text-black' :
              'bg-white/[0.06] text-[#ededed]/30'
            }`}>
              {s < step ? <Check className="h-3 w-3" /> : s}
            </div>
            {i < 3 && (
              <div className={`h-px w-6 transition-colors ${s < step ? 'bg-[#2fd76c]' : 'bg-white/[0.06]'}`} />
            )}
          </div>
        ))}
        <span className="ml-2 text-[10px] text-[#ededed]/25">
          {['Scan', 'Variant', 'Goal', 'Create'][step - 1]}
        </span>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {/* ─── Step 1: Scan Page ─── */}
        {step === 1 && (
          <Step1
            url={url} setUrl={setUrl}
            scanning={scanning} onScan={handleScan}
            suggestions={suggestions} scanError={scanError}
            selectedIdx={selectedSuggestionIdx} onSelect={setSelectedSuggestionIdx}
            apiToken={apiToken}
            figmaListening={figmaListening}
            setFigmaListening={setFigmaListening}
            figmaElapsed={figmaElapsed}
            figmaReceived={figmaReceived}
            figmaTestName={figmaTestName}
            snippetCopied={snippetCopied}
            setSnippetCopied={setSnippetCopied}
            aiPromptCopied={aiPromptCopied}
            setAiPromptCopied={setAiPromptCopied}
          />
        )}

        {/* ─── Step 2: Create Variant ─── */}
        {step === 2 && selectedSuggestion && (
          <Step2
            suggestion={selectedSuggestion}
            variantDescription={variantDescription}
            setVariantDescription={setVariantDescription}
            generating={generating} onGenerate={handleGenerate}
            variantResult={variantResult} genError={genError}
            screenshotUrl={screenshotUrl} onPreview={handlePreview}
          />
        )}

        {/* ─── Step 3: Choose Goal ─── */}
        {step === 3 && (
          <Step3
            goalType={goalType} setGoalType={setGoalType}
            goalSelector={goalSelector} setGoalSelector={setGoalSelector}
            customGoalName={customGoalName} setCustomGoalName={setCustomGoalName}
          />
        )}

        {/* ─── Step 4: Review ─── */}
        {step === 4 && selectedSuggestion && variantResult && (
          <Step4
            url={url} suggestion={selectedSuggestion}
            variantResult={variantResult}
            goalType={goalType} goalSelector={goalSelector} customGoalName={customGoalName}
            testName={testName} setTestName={setTestName}
            creating={creating} createError={createError}
            onCreate={handleCreate}
          />
        )}

        {/* ─── Navigation ─── */}
        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={() => step > 1 && setStep((step - 1) as WizardStep)}
            disabled={step === 1}
            className="flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[12px] text-[#ededed]/40 transition-colors hover:text-[#ededed]/60 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>

          {step < 4 ? (
            <button
              onClick={() => setStep((step + 1) as WizardStep)}
              disabled={
                (step === 1 && !canAdvanceFromStep1) ||
                (step === 2 && !canAdvanceFromStep2) ||
                (step === 3 && !canAdvanceFromStep3)
              }
              className="flex items-center gap-1.5 rounded-[6px] bg-white px-4 py-1.5 text-[12px] font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={!canCreate || creating}
              className="flex items-center gap-1.5 rounded-[6px] bg-[#2fd76c] px-4 py-1.5 text-[12px] font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
              {creating ? 'Creating…' : 'Create test'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Step 1: Scan Page
// ═══════════════════════════════════════════════════════════════

function Step1({
  url, setUrl, scanning, onScan,
  suggestions, scanError, selectedIdx, onSelect,
  apiToken,
  figmaListening, setFigmaListening,
  figmaElapsed, figmaReceived, figmaTestName,
  snippetCopied, setSnippetCopied,
  aiPromptCopied, setAiPromptCopied,
}: {
  url: string; setUrl: (v: string) => void
  scanning: boolean; onScan: () => void
  suggestions: CROSuggestion[]; scanError: string
  selectedIdx: number | null; onSelect: (i: number | null) => void
  apiToken: string
  figmaListening: boolean; setFigmaListening: (v: boolean) => void
  figmaElapsed: number; figmaReceived: boolean; figmaTestName: string
  snippetCopied: boolean; setSnippetCopied: (v: boolean) => void
  aiPromptCopied: boolean; setAiPromptCopied: (v: boolean) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-relaxed text-[#ededed]/50">
        Enter your page URL. The AI scans it for optimization opportunities.
      </p>

      {/* URL Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Globe className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#ededed]/25" />
          <input
            type="url"
            value={url}
            onChange={e => { setUrl(e.target.value); onSelect(null); }}
            onKeyDown={e => e.key === 'Enter' && onScan()}
            placeholder="https://example.com/landing"
            className="w-full rounded-[6px] border border-white/[0.08] bg-[#111111] py-2 pl-8 pr-3 text-[12px] text-[#ededed] placeholder:text-[#ededed]/20 outline-none focus:border-white/[0.18]"
            disabled={scanning}
          />
        </div>
        <button
          onClick={onScan}
          disabled={scanning || !url.trim()}
          className="flex items-center gap-1.5 rounded-[6px] bg-white px-4 py-2 text-[12px] font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
        >
          {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          {scanning ? 'Scanning…' : 'Scan'}
        </button>
      </div>

      {/* Error */}
      {scanError && (
        <div className="flex items-start gap-2 rounded-[6px] border border-[#f5455c]/20 bg-[#f5455c]/[0.04] px-3 py-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#f5455c]/70" />
          <p className="text-[11px] text-[#f5455c]/70">{scanError}</p>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-[#ededed]/40">
            {suggestions.length} optimization{ suggestions.length !== 1 ? 's' : ''} found — pick one:
          </p>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSelect(selectedIdx === i ? null : i)}
              className={`flex w-full cursor-pointer items-start gap-3 rounded-[7px] px-3 py-2.5 text-left transition-colors ${
                selectedIdx === i
                  ? 'border border-[#a78bfa]/30 bg-[#a78bfa]/[0.06]'
                  : 'border border-white/[0.05] bg-[#111111] hover:border-white/[0.1]'
              }`}
            >
              <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                selectedIdx === i ? 'border-[#a78bfa] bg-[#a78bfa]' : 'border-white/[0.12]'
              }`}>
                {selectedIdx === i && <Check className="h-3 w-3 text-black" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-[#ededed] truncate">{s.element}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[#ededed]/40 line-clamp-2">{s.why}</p>
              </div>
              <span className="mt-0.5 shrink-0 rounded-[4px] border border-white/[0.06] px-1.5 py-0.5 text-[9px] text-[#ededed]/25">
                {s.type ?? 'text'}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Helpers: Alternative element sources ── */}
      <div className="mt-4 border-t border-white/[0.05] pt-3">
        <p className="text-[10px] text-[#ededed]/20 uppercase tracking-wider mb-2">Or pick an element from</p>
        <div className="grid grid-cols-2 gap-2">
          {/* Figma Helper */}
          <FigmaHelper
            apiToken={apiToken}
            listening={figmaListening}
            setListening={setFigmaListening}
            elapsed={figmaElapsed}
            received={figmaReceived}
            testName={figmaTestName}
          />
          {/* Snippet Helper */}
          <SnippetHelper
            snippetCopied={snippetCopied}
            setSnippetCopied={setSnippetCopied}
            aiPromptCopied={aiPromptCopied}
            setAiPromptCopied={setAiPromptCopied}
          />
        </div>
      </div>
    </div>
  )
}

/* ── Figma Helper (Step 1) ── */

function FigmaHelper({
  apiToken, listening, setListening, elapsed, received, testName,
}: {
  apiToken: string
  listening: boolean; setListening: (v: boolean) => void
  elapsed: number; received: boolean; testName: string
}) {
  const [copied, setCopied] = useState(false)
  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`

  function copyToken() {
    navigator.clipboard.writeText(apiToken).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-[7px] border border-white/[0.06] bg-[#111111] px-3 py-2.5">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-[#a78bfa]/15">
          <Palette className="h-3 w-3 text-[#a78bfa]" />
        </div>
        <span className="text-[11px] font-medium text-[#ededed]">Figma Plugin</span>
      </div>

      {received ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[#2fd76c]">
            <Check className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium">Test received!</span>
          </div>
          <p className="text-[11px] text-[#ededed]/50 truncate">{testName}</p>
        </div>
      ) : listening ? (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#a78bfa]" />
            <span className="text-[11px] text-[#a78bfa]">Listening for Figma…</span>
            <span className="text-[10px] text-[#ededed]/25">{timeStr}</span>
          </div>
          <button
            onClick={() => setListening(false)}
            className="text-[10px] text-[#ededed]/30 hover:text-[#ededed]/50 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] leading-relaxed text-[#ededed]/35">
            Select an element in Figma and push it here. Appears automatically via realtime.
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setListening(true)}
              className="flex items-center gap-1 rounded-[5px] bg-[#a78bfa]/15 px-2.5 py-1 text-[10px] font-medium text-[#a78bfa] hover:bg-[#a78bfa]/25 transition-colors cursor-pointer"
            >
              <Puzzle className="h-3 w-3" />
              Start listening
            </button>
            <button
              onClick={copyToken}
              className="flex items-center gap-1 rounded-[5px] border border-white/[0.06] px-2 py-1 text-[10px] text-[#ededed]/30 hover:text-[#ededed]/50 transition-colors cursor-pointer"
            >
              {copied ? <Check className="h-3 w-3 text-[#2fd76c]" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Token'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Snippet Helper (Step 1) ── */

function SnippetHelper({
  snippetCopied, setSnippetCopied, aiPromptCopied, setAiPromptCopied,
}: {
  snippetCopied: boolean; setSnippetCopied: (v: boolean) => void
  aiPromptCopied: boolean; setAiPromptCopied: (v: boolean) => void
}) {
  function copySnippet() {
    navigator.clipboard.writeText(SNIPPET_CODE).then(() => {
      setSnippetCopied(true)
      setTimeout(() => setSnippetCopied(false), 2000)
    })
  }

  function copyAiPrompt() {
    const prompt = `Add this A/B testing snippet to the <head> of my site:\n\n\`\`\`html\n${SNIPPET_CODE}\n\`\`\`\n\nInstructions: Place this in the <head> of every page. Keep the async attribute. Do not modify the script src or the anti-flicker style block.`
    navigator.clipboard.writeText(prompt).then(() => {
      setAiPromptCopied(true)
      setTimeout(() => setAiPromptCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-[7px] border border-white/[0.06] bg-[#111111] px-3 py-2.5">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-[#2fd76c]/10">
          <Code className="h-3 w-3 text-[#2fd76c]" />
        </div>
        <span className="text-[11px] font-medium text-[#ededed]">ab.js Picker</span>
      </div>
      <p className="text-[10px] leading-relaxed text-[#ededed]/35 mb-2">
        Use the built-in element picker on your site. Install the snippet once, then pick elements visually.
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={copySnippet}
          className="flex items-center gap-1 rounded-[5px] border border-white/[0.06] px-2.5 py-1 text-[10px] text-[#ededed]/30 hover:text-[#ededed]/50 transition-colors cursor-pointer"
        >
          {snippetCopied ? <Check className="h-3 w-3 text-[#2fd76c]" /> : <Copy className="h-3 w-3" />}
          {snippetCopied ? 'Copied' : 'Snippet'}
        </button>
        <button
          onClick={copyAiPrompt}
          className="flex items-center gap-1 rounded-[5px] border border-white/[0.06] px-2.5 py-1 text-[10px] text-[#ededed]/30 hover:text-[#ededed]/50 transition-colors cursor-pointer"
        >
          {aiPromptCopied ? <Check className="h-3 w-3 text-[#a78bfa]" /> : <Sparkles className="h-3 w-3" />}
          {aiPromptCopied ? 'Copied' : 'AI prompt'}
        </button>
      </div>
    </div>
  )
}

function Step2({
  suggestion, variantDescription, setVariantDescription,
  generating, onGenerate, variantResult, genError,
  screenshotUrl, onPreview,
}: {
  suggestion: CROSuggestion
  variantDescription: string; setVariantDescription: (v: string) => void
  generating: boolean; onGenerate: () => void
  variantResult: VariantResult | null; genError: string
  screenshotUrl: string; onPreview: () => void
}) {
  return (
    <div className="space-y-3">
      {/* Selected element info */}
      <div className="rounded-[7px] border border-white/[0.06] bg-[#111111] px-3 py-2.5">
        <p className="text-[10px] text-[#ededed]/25 uppercase tracking-wider">Element</p>
        <p className="mt-0.5 text-[12px] font-medium text-[#ededed]">{suggestion.element}</p>
        <p className="mt-0.5 text-[11px] text-[#ededed]/35 truncate">
          Original: &ldquo;{suggestion.original}&rdquo;
        </p>
      </div>

      {/* Variation description */}
      <div>
        <label className="text-[11px] font-medium text-[#ededed]/50">
          What should change — and why?
        </label>
        <textarea
          value={variantDescription}
          onChange={e => setVariantDescription(e.target.value)}
          placeholder={suggestion.why || 'Describe the change…'}
          rows={3}
          className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-[#111111] px-3 py-2 text-[12px] text-[#ededed] placeholder:text-[#ededed]/20 outline-none focus:border-white/[0.18] resize-none"
          disabled={generating}
        />
      </div>

      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={generating || !variantDescription.trim()}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[7px] border border-[#a78bfa]/20 bg-[#a78bfa]/[0.06] px-4 py-2.5 text-[12px] font-medium text-[#a78bfa] transition-colors hover:bg-[#a78bfa]/[0.12] disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {generating ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating variant…</>
        ) : (
          <><Wand2 className="h-3.5 w-3.5" /> Generate variant</>
        )}
      </button>

      {/* Error */}
      {genError && (
        <div className="flex items-start gap-2 rounded-[6px] border border-[#f5455c]/20 bg-[#f5455c]/[0.04] px-3 py-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#f5455c]/70" />
          <p className="text-[11px] text-[#f5455c]/70">{genError}</p>
        </div>
      )}

      {/* Result + Preview */}
      {variantResult && (
        <div className="space-y-2">
          <div className="rounded-[7px] border border-[#2fd76c]/15 bg-[#2fd76c]/[0.03] px-3 py-2.5">
            <p className="text-[10px] text-[#ededed]/25 uppercase tracking-wider">Variant</p>
            <p className="mt-0.5 text-[12px] font-medium text-[#ededed] break-all">
              {variantResult.variant}
            </p>
            {variantResult.variant_css && (
              <pre className="mt-1.5 max-h-24 overflow-auto rounded-[4px] bg-black/30 px-2 py-1.5 text-[10px] text-[#ededed]/40 font-mono">
                {variantResult.variant_css}
              </pre>
            )}
            <p className="mt-1 text-[10px] text-[#2fd76c]/60">{variantResult.explanation}</p>
          </div>

          {/* Screenshot preview button */}
          <button
            onClick={onPreview}
            disabled={!screenshotUrl}
            className="flex items-center gap-1.5 text-[11px] text-[#ededed]/30 hover:text-[#ededed]/50 transition-colors cursor-pointer"
          >
            {screenshotUrl ? (
              <><Eye className="h-3 w-3" /> View page preview</>
            ) : (
              <><Image className="h-3 w-3" /> Load preview (urlbox)</>
            )}
          </button>

          {screenshotUrl && (
            <img
              src={screenshotUrl}
              alt="Page preview"
              className="w-full rounded-[6px] border border-white/[0.06]"
              loading="lazy"
            />
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Step 3: Choose Goal
// ═══════════════════════════════════════════════════════════════

const GOAL_OPTIONS: { type: GoalDef['type']; icon: typeof MousePointerClick; label: string; desc: string }[] = [
  { type: 'click', icon: MousePointerClick, label: 'Click on element', desc: 'Track clicks on a button, link, or any element.' },
  { type: 'form_submit', icon: FileText, label: 'Form submit', desc: 'Track when a form is submitted.' },
  { type: 'page_view', icon: Eye, label: 'Page view', desc: 'Track visits to a specific page (e.g. /thank-you).' },
  { type: 'purchase', icon: ShoppingCart, label: 'Purchase', desc: 'Track purchases / checkout completions.' },
  { type: 'custom', icon: PlusCircle, label: 'Custom event', desc: 'Define a custom conversion event.' },
]

function Step3({
  goalType, setGoalType, goalSelector, setGoalSelector,
  customGoalName, setCustomGoalName,
}: {
  goalType: GoalDef['type']; setGoalType: (t: GoalDef['type']) => void
  goalSelector: string; setGoalSelector: (s: string) => void
  customGoalName: string; setCustomGoalName: (s: string) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-relaxed text-[#ededed]/50">
        What counts as a &ldquo;conversion&rdquo; on this page?
      </p>

      {/* Goal type grid */}
      <div className="grid grid-cols-2 gap-2">
        {GOAL_OPTIONS.map(opt => {
          const Icon = opt.icon
          const isSelected = goalType === opt.type
          return (
            <button
              key={opt.type}
              onClick={() => setGoalType(opt.type)}
              className={`flex cursor-pointer items-start gap-2.5 rounded-[7px] px-3 py-2.5 text-left transition-colors ${
                isSelected
                  ? 'border border-[#a78bfa]/30 bg-[#a78bfa]/[0.06]'
                  : 'border border-white/[0.05] bg-[#111111] hover:border-white/[0.1]'
              }`}
            >
              <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-[#a78bfa]' : 'text-[#ededed]/25'}`} />
              <div>
                <p className="text-[11px] font-medium text-[#ededed]">{opt.label}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-[#ededed]/30">{opt.desc}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* CSS selector (for click goal) */}
      {goalType === 'click' && (
        <div className="rounded-[7px] border border-white/[0.06] bg-[#111111] px-3 py-2.5">
          <p className="text-[10px] text-[#ededed]/25 uppercase tracking-wider">CSS Selector</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#ededed]/35">
            The element users click to trigger a conversion. Use the picker in your Figma plugin or ab.js picker mode.
          </p>
          <input
            type="text"
            value={goalSelector}
            onChange={e => setGoalSelector(e.target.value)}
            placeholder='e.g. #hero-cta, .buy-button, a[href="/pricing"]'
            className="mt-2 w-full rounded-[5px] border border-white/[0.06] bg-black/30 px-2.5 py-1.5 text-[11px] text-[#ededed]/60 font-mono placeholder:text-[#ededed]/15 outline-none focus:border-white/[0.12]"
          />
        </div>
      )}

      {/* Custom goal name */}
      {goalType === 'custom' && (
        <div>
          <label className="text-[11px] font-medium text-[#ededed]/50">Event name</label>
          <input
            type="text"
            value={customGoalName}
            onChange={e => setCustomGoalName(e.target.value)}
            placeholder='e.g. video_played, scroll_80%'
            className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-[#111111] px-3 py-2 text-[12px] text-[#ededed] placeholder:text-[#ededed]/20 outline-none focus:border-white/[0.18]"
          />
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Step 4: Review & Create
// ═══════════════════════════════════════════════════════════════

function Step4({
  url, suggestion, variantResult,
  goalType, goalSelector, customGoalName,
  testName, setTestName, creating, createError, onCreate,
}: {
  url: string
  suggestion: CROSuggestion
  variantResult: VariantResult
  goalType: GoalDef['type']; goalSelector: string; customGoalName: string
  testName: string; setTestName: (v: string) => void
  creating: boolean; createError: string
  onCreate: () => void
}) {
  const goalLabel = goalType === 'custom'
    ? customGoalName
    : goalType === 'click' && goalSelector
      ? `Click: ${goalSelector}`
      : GOAL_OPTIONS.find(o => o.type === goalType)?.label ?? goalType

  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-relaxed text-[#ededed]/50">
        Review your test configuration, give it a name, and create it.
      </p>

      {/* Summary card */}
      <div className="space-y-2 rounded-[7px] border border-white/[0.06] bg-[#111111] px-3 py-3">
        <SummaryRow label="Page" value={url} icon={Globe} />
        <SummaryRow label="Element" value={suggestion.element} icon={Target} />
        <SummaryRow label="Original" value={suggestion.original} icon={FileText} />
        <SummaryRow label="Variant" value={variantResult.variant} icon={Wand2} highlight />
        <SummaryRow label="Goal" value={goalLabel} icon={Gauge} />
        {variantResult.explanation && (
          <p className="text-[10px] leading-relaxed text-[#ededed]/25 pl-7">{variantResult.explanation}</p>
        )}
      </div>

      {/* Test name */}
      <div>
        <label className="text-[11px] font-medium text-[#ededed]/50">Test name</label>
        <input
          type="text"
          value={testName}
          onChange={e => setTestName(e.target.value)}
          placeholder={suggestion.element ? `${suggestion.element} optimization` : 'My A/B test'}
          className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-[#111111] px-3 py-2 text-[13px] text-[#ededed] placeholder:text-[#ededed]/20 outline-none focus:border-white/[0.18]"
          onKeyDown={e => e.key === 'Enter' && onCreate()}
        />
      </div>

      {/* Error */}
      {createError && (
        <div className="flex items-start gap-2 rounded-[6px] border border-[#f5455c]/20 bg-[#f5455c]/[0.04] px-3 py-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#f5455c]/70" />
          <p className="text-[11px] text-[#f5455c]/70">{createError}</p>
        </div>
      )}
    </div>
  )
}

// ─── Summary Row Helper ───

function SummaryRow({
  label, value, icon: Icon, highlight,
}: {
  label: string; value: string; icon: typeof Globe; highlight?: boolean
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className={`mt-0.5 h-3 w-3 shrink-0 ${highlight ? 'text-[#2fd76c]' : 'text-[#ededed]/20'}`} />
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-wider text-[#ededed]/20">{label}</p>
        <p className={`mt-0.5 truncate text-[11px] ${highlight ? 'text-[#2fd76c] font-medium' : 'text-[#ededed]/50'}`}>
          {value}
        </p>
      </div>
    </div>
  )
}
