'use client'

/**
 * StepChange — Step 2: Change.
 *
 * Variante B ist kein Neubau, sondern ein Delta auf A: Markup, Klassen und
 * Attribute kommen von A, die Änderungsliste ist die Quelle der Wahrheit, und
 * variant_b_html/-css werden daraus komponiert (delta.ts).
 *
 * Wichtige Unterscheidung: Die ANZEIGE-Basis der Liste ist immer A — der
 * Nutzer will „B gegenüber Original" sehen. Die CSS-ERZEUGUNGS-Basis ist die
 * Menge aller applied-Zeilen: ein übernommenes KI-Ergebnis steht als Zeilen
 * in der Liste (inkl. `other`-Roh-CSS) und wird beim Editieren einzelner
 * Zeilen nicht ersetzt — dasselbe Garant wie früher baseCss → mergeVariantCss.
 *
 * Manual-first: die KI ist Vorschlagsquelle („Suggest changes"), kein
 * Auto-Trigger mehr beim Betreten des Steps.
 */

import { useState, useCallback } from 'react'
import { Plus, Sparkles, Loader2, AlertCircle, ChevronDown, ExternalLink, Palette, AlertTriangle } from 'lucide-react'
import { ChangeList } from './ChangeList'
import { ButtonEditor } from './ButtonEditor'
import { TextInputEditor } from './TextInputEditor'
import { composeVariant, diffCssToEntries, diffTextToEntry, entryId, baselineValue } from './delta'
import { getEditorCategory } from './types'
import type { ChangeEntry, ChangeProperty, VariantChangeSet } from './types'
import type { ElementSelection } from '../NewTestDrawer'
import { buildPreviewSrcDoc, extractTextFromHtml } from '@/lib/previewDoc'
import { BreakpointSwitcher, BREAKPOINTS, type Breakpoint } from './PreviewBreakpoints'

interface StepChangeProps {
  element: ElementSelection
  changes: VariantChangeSet
  onChanges: (next: VariantChangeSet) => void
}

type SuggestState = 'idle' | 'loading' | 'error'

/** „+ Add change"-Menü je Editor-Kategorie (getEditorCategory). */
const ADD_MENU: Record<'button' | 'text', Array<{ property: ChangeProperty; label: string }>> = {
  button: [
    { property: 'text', label: 'Text' },
    { property: 'bgColor', label: 'Background' },
    { property: 'textColor', label: 'Text colour' },
    { property: 'paddingY', label: 'Padding' },
    { property: 'borderRadius', label: 'Border radius' },
  ],
  text: [{ property: 'text', label: 'Text' }],
}

const COLOR_FALLBACKS: Partial<Record<ChangeProperty, string>> = {
  bgColor: '#2563EB',
  textColor: '#FFFFFF',
  borderColor: 'transparent',
}

export function StepChange({ element, changes, onChanges }: StepChangeProps) {
  const category = getEditorCategory(element.elementType)

  // ── Suggest changes (KI als Vorschlagsquelle — kein Auto-Trigger) ──
  const [suggestState, setSuggestState] = useState<SuggestState>('idle')
  const [suggestError, setSuggestError] = useState('')

  // ── Inline-Editor-Zeile (kontrolliert, damit neue Zeilen direkt aufgehen) ──
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [scratchEditorOpen, setScratchEditorOpen] = useState(false)
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(375)

  // ─── Listen-Mutationen ───

  const updateEntries = useCallback(
    (entries: ChangeEntry[]) => {
      // Schritt zurück in den inherit-Modus: die Liste ist wieder die Quelle.
      onChanges({ ...changes, mode: 'inherit', entries })
    },
    [changes, onChanges],
  )

  /** Neue manuelle Zeile — ersetzt eine bestehende Zeile desselben Properties. */
  const addChange = useCallback(
    (property: ChangeProperty) => {
      // "Padding" erzeugt zwei Zeilen (horizontal + vertikal) — beide einzeln
      // editier- und löschbar, wie das Property-Modell es kennt.
      const targets: ChangeProperty[] =
        property === 'paddingY' ? ['paddingY', 'paddingX'] : [property]

      const existing = changes.entries.find(
        (e) => e.property === targets[0] && e.status === 'applied'
      )
      if (existing) {
        setEditingId(existing.id)
        return
      }

      const newEntries = targets.map((prop): ChangeEntry => {
        let before = baselineValue(changes.baseline, prop) ?? ''
        let after = baselineValue(changes.baseline, prop) ?? COLOR_FALLBACKS[prop] ?? ''
        if (prop === 'text') {
          before = extractTextFromHtml(element.originalHtml)
          after = before
        }
        if (prop === 'paddingX' || prop === 'paddingY') {
          after = baselineValue(changes.baseline, prop) ?? (prop === 'paddingY' ? '12' : '24')
        }
        return { id: entryId(), property: prop, before, after, source: 'manual', status: 'applied' }
      })

      // Gleich-Property-Vorschläge werden obsolet, sobald der Nutzer selbst
      // Zeilen dafür anlegt — sonst stünden widersprüchliche Werte nebeneinander.
      updateEntries([
        ...changes.entries.filter(
          (e) => !(e.status === 'suggested' && targets.includes(e.property))
        ),
        ...newEntries,
      ])
      setEditingId(newEntries[0].id)
      setAddMenuOpen(false)
    },
    [changes, element.originalHtml, updateEntries],
  )

  // ─── Suggest changes ───

  const handleSuggest = useCallback(async () => {
    setSuggestState('loading')
    setSuggestError('')

    try {
      const res = await fetch('/api/test-wizard/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          element: element.elementName || element.selector,
          original: element.originalHtml || `<${element.elementType}>`,
          elementType: element.elementType,
          selector: element.selector || undefined,
          pageContext: element.styleContext?.css || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Generation failed' }))
        setSuggestError(err.message ?? err.error ?? 'AI generation failed')
        setSuggestState('error')
        return
      }

      const data = await res.json()
      const textEntry = diffTextToEntry(element.originalHtml, data.variant_html ?? null, 'ai')
      if (textEntry && data.explanation) textEntry.explanation = data.explanation
      const suggested = [
        ...diffCssToEntries(data.variant_css ?? null, changes.baseline, 'ai'),
        ...(textEntry ? [textEntry] : []),
      ]
      // Regenerate ersetzt nur die suggested-Zeilen — manuelle Edits bleiben.
      updateEntries([
        ...changes.entries.filter((e) => e.status !== 'suggested'),
        ...suggested,
      ])
      setEditingId(null)
      setSuggestState('idle')
    } catch {
      setSuggestError('Network error — please try again.')
      setSuggestState('error')
    }
  }, [element, changes, updateEntries])

  // ─── Advanced / Scratch ───

  /**
   * Der Scratch-Editor ersetzt A komplett — in diesem Zustand zeigt die Liste
   * keine Zeilen („B replaces A completely"). Die Einträge tragen trotzdem
   * den Text und das komplette Editor-CSS als `other`-Roh-CSS, damit
   * composeVariant das Ergebnis 1:1 reproduziert und der Draft es persistiert.
   */
  const applyScratch = useCallback(
    (html: string, css: string) => {
      const textEntry = diffTextToEntry(element.originalHtml, html, 'manual')
      const entries: ChangeEntry[] = []
      if (textEntry) entries.push({ ...textEntry, status: 'applied' })
      if (css.trim()) {
        entries.push({
          id: entryId(),
          property: 'other',
          before: '',
          after: 'Custom CSS',
          source: 'manual',
          status: 'applied',
          rawCss: css.trim(),
        })
      }
      onChanges({ mode: 'scratch', entries, baseline: changes.baseline })
    },
    [element.originalHtml, changes.baseline, onChanges],
  )

  /** Scratch verwerfen: zurück zur leeren Änderungsliste (B ≡ A). */
  const discardScratch = useCallback(() => {
    onChanges({ mode: 'inherit', entries: [], baseline: changes.baseline })
    setScratchEditorOpen(false)
  }, [changes.baseline, onChanges])

  // ─── Vorschau ───

  const selector = element.selector || element.elementName
  const applied = changes.entries.filter((e) => e.status === 'applied')
  const composed = applied.length
    ? composeVariant(changes, element.originalHtml, selector)
    : { html: element.originalHtml, css: '' }
  // Eine visuelle Vorschau ist nur belastbar, wenn der Picker Styles und
  // Markup mitgebracht hat — sonst der ehrliche Textvergleich.
  const canRenderPreview = !!element.originalCss.trim() && !!element.originalHtml.trim()
  const previewWidth = BREAKPOINTS.find((bp) => bp.value === breakpoint)?.width ?? 375
  const srcDoc = buildPreviewSrcDoc(
    [
      { html: element.originalHtml || '' },
      { html: composed.html, css: composed.css, scopeToSelector: true, selector },
    ],
    { siteCss: element.styleContext?.css ?? element.originalCss },
  )

  return (
    <div className="space-y-4">
      {/* Modell-Satz */}
      <p className="text-[13px] leading-relaxed text-text-2">
        Variant B is your original plus the changes below. Anything you don&apos;t
        change stays exactly as it is — including responsive behaviour.
      </p>

      {/* A/B-Live-Vorschau — immer sichtbar, auch bei leerer Liste (B zeigt A) */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-4">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-text-2">
            <Sparkles className="h-3 w-3" />
            Preview
          </p>
          <BreakpointSwitcher value={breakpoint} onChange={setBreakpoint} />
        </div>
        {canRenderPreview ? (
          <div className="overflow-x-auto">
            <div className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-bg-0">
              <iframe
                srcDoc={srcDoc}
                sandbox=""
                title="Live preview — original vs. variant"
                className="h-32"
                style={{ width: previewWidth }}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <TextPane label="Original (A)" value={extractTextFromHtml(element.originalHtml) || element.elementName} />
            <TextPane label="Variant (B)" value={extractTextFromHtml(composed.html) || element.elementName} />
          </div>
        )}
        {!canRenderPreview && (
          <p className="mt-1.5 text-[10px] text-text-3">
            Text-only preview — this element was picked without the visual picker, so its
            styles from your site aren&apos;t available. Pick it with the picker to see it rendered.
          </p>
        )}
      </div>

      {/* Suggest-Error: Banner ÜBER der Liste — die Liste bleibt bedienbar */}
      {suggestState === 'error' && (
        <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-err/20 bg-err/[0.04] px-3 py-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-err/60" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-err/80">AI suggestions failed</p>
            <p className="mt-0.5 text-[11px] text-text-3">{suggestError}</p>
          </div>
          <button
            type="button"
            onClick={handleSuggest}
            className="shrink-0 rounded-[var(--radius-sm)] border border-border px-2.5 py-1 text-[10px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Änderungsliste — im Scratch-Zustand ersetzt der Hinweis die Zeilen,
          und die Delta-Aktionen (Add/Suggest) verschwinden: ein Delta auf dem
          Scratch-Ergebnis wäre ein gemischtes Modell. Zurück geht es nur über
          "Back to change list" (verwirft das Scratch-Ergebnis). */}
      {changes.mode === 'scratch' ? (
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-4">
          <p className="text-[12px] font-medium text-text">B replaces A completely</p>
          <p className="mt-1 text-[11px] leading-relaxed text-text-3">
            Built in the advanced editor — markup, classes and responsive rules
            from your site no longer apply to Variant B.
          </p>
          <button
            type="button"
            onClick={discardScratch}
            className="mt-2.5 cursor-pointer rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-[11px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text"
          >
            Back to change list
          </button>
        </div>
      ) : (
        <>
          <ChangeList
            entries={changes.entries}
            editingId={editingId}
            onEditingChange={setEditingId}
            onEntriesChange={updateEntries}
          />

          {/* Aktionen: manuelle Zeile hinzufügen + KI-Vorschläge */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setAddMenuOpen((v) => !v)}
                className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] border border-border px-3.5 py-2 text-[12px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text"
              >
                <Plus className="h-3.5 w-3.5" />
                Add change
                <ChevronDown className={`h-3 w-3 transition-transform ${addMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {addMenuOpen && (
                <div className="absolute left-0 top-full z-10 mt-1.5 w-44 rounded-[var(--radius-md)] border border-border bg-bg-1 p-1 shadow-lg">
                  {ADD_MENU[category].map((item) => (
                    <button
                      key={item.property}
                      type="button"
                      onClick={() => addChange(item.property)}
                      className="w-full cursor-pointer rounded-[var(--radius-sm)] px-2.5 py-1.5 text-left text-[12px] text-text-2 transition-colors hover:bg-bg-2 hover:text-text"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleSuggest}
              disabled={suggestState === 'loading'}
              className="flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] border border-pro/25 bg-pro/[0.05] px-3.5 py-2 text-[12px] font-medium text-pro transition-colors hover:bg-pro/[0.09] disabled:opacity-50"
            >
              {suggestState === 'loading' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {suggestState === 'loading' ? 'Suggesting…' : 'Suggest changes'}
            </button>
          </div>
        </>
      )}

      {/* Advanced: Scratch-Editor (Warnung + unveränderte Editoren, Modus fest 'scratch') */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex w-full cursor-pointer items-center justify-between px-4 py-3"
          aria-expanded={advancedOpen}
        >
          <span className="flex items-center gap-2 text-[12px] font-medium text-text-2">
            <AlertTriangle className="h-3.5 w-3.5 text-text-3" />
            Advanced: start from scratch
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-text-3 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
        </button>
        {advancedOpen && (
          <div className="space-y-4 border-t border-border px-4 py-4">
            <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-pro/20 bg-pro/[0.04] px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pro" />
              <p className="text-[11px] leading-relaxed text-text-2">
                Variant B gets its own markup. A&apos;s classes, responsive rules
                (<code className="text-text">@media</code>, <code className="text-text">clamp()</code>,
                container queries) and hover styles will no longer apply.
              </p>
            </div>
            {!scratchEditorOpen ? (
              <button
                type="button"
                onClick={() => setScratchEditorOpen(true)}
                className="cursor-pointer rounded-[var(--radius-md)] border border-border px-3.5 py-2 text-[12px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text"
              >
                Open scratch editor
              </button>
            ) : category === 'button' ? (
              <ButtonEditor
                element={element}
                originalHtml={element.originalHtml}
                modeLocked="scratch"
                onApply={(html, css) => applyScratch(html, css)}
                onCancel={() => setScratchEditorOpen(false)}
              />
            ) : (
              <TextInputEditor
                element={element}
                originalHtml={element.originalHtml}
                modeLocked="scratch"
                onApply={(html, css) => applyScratch(html, css)}
                onCancel={() => setScratchEditorOpen(false)}
              />
            )}
          </div>
        )}
      </div>

      {/* Figma-Fußnote — ein Satz statt eigener Modus-Tab */}
      <p className="text-[11px] leading-relaxed text-text-3">
        Want to sketch the change in Figma first? The variante plugin shows your live
        test stats inside Figma — it&apos;s not a design tool.{' '}
        <button
          type="button"
          onClick={() => window.open('https://www.figma.com/community/plugin/1653734891132085565', '_blank', 'noopener,noreferrer')}
          className="inline-flex cursor-pointer items-center gap-0.5 underline transition-colors hover:text-text-2"
        >
          <Palette className="h-3 w-3" />
          Open the plugin
          <ExternalLink className="h-2.5 w-2.5" />
        </button>
      </p>
    </div>
  )
}

function TextPane({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-text-3">{label}</p>
      <div className="flex min-h-16 items-center rounded-[var(--radius-md)] border border-border bg-bg-0 p-3">
        <p className="text-[13px] leading-relaxed text-text break-words">{value || '—'}</p>
      </div>
    </div>
  )
}
