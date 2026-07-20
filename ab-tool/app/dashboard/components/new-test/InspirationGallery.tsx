'use client'

/**
 * InspirationGallery — Zeigt 3–5 CRO-Pattern-Karten.
 *
 * Jede Karte zeigt: Pattern-Name, Icon, kurze Erklärung.
 * Klick auf "Apply" generiert eine KI-Variante mit dem Pattern.
 *
 * Nach erfolgreicher Generierung wird die Variante an den Parent
 * zurückgegeben und der Tab wechselt automatisch zu "Edit Manually".
 */

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { getPatternsForElementType } from './inspirationPatterns'
import { generatePatternVariant } from './generatePatternVariant'
import type { InspirationPattern } from './types'
import type { ElementSelection, VariantResult } from '../NewTestDrawer'

interface InspirationGalleryProps {
  element: ElementSelection
  onPatternApplied: (result: VariantResult) => void
}

export function InspirationGallery({ element, onPatternApplied }: InspirationGalleryProps) {
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const patterns = getPatternsForElementType(element.elementType)
  const original = element.originalHtml || element.elementName

  async function handleApply(pattern: InspirationPattern) {
    setApplyingId(pattern.id)
    setError('')

    try {
      const result = await generatePatternVariant({
        pattern,
        elementName: element.elementName,
        original,
        elementType: element.elementType,
        selector: element.selector,
      })
      onPatternApplied(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to apply pattern'
      setError(msg)
    } finally {
      setApplyingId(null)
    }
  }

  if (patterns.length === 0) {
    return (
      <div className="rounded-[10px] border border-border bg-bg-1 p-6 text-center">
        <p className="text-[13px] text-text-3">
          No inspiration patterns available for this element type.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-text-2">
        Choose a CRO pattern to apply to your {element.elementType}:
      </p>

      {error && (
        <div className="rounded-[6px] border border-err/20 bg-err/5 px-3 py-2 text-[11px] text-err/80">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {patterns.map((pattern) => (
          <PatternCard
            key={pattern.id}
            pattern={pattern}
            applying={applyingId === pattern.id}
            onApply={handleApply}
          />
        ))}
      </div>
    </div>
  )
}

function PatternCard({
  pattern,
  applying,
  onApply,
}: {
  pattern: InspirationPattern
  applying: boolean
  onApply: (pattern: InspirationPattern) => void
}) {
  return (
    <div className="group rounded-[10px] border border-border bg-bg-1 p-3.5 transition-colors hover:border-border-strong">
      <div className="mb-2 flex items-start gap-2.5">
        <span className="mt-0.5 text-lg">{pattern.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-text">{pattern.name}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-text-2">
            {pattern.description}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onApply(pattern)}
        disabled={applying}
        className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[6px] border border-border bg-bg-0 px-3 py-2 text-[11px] font-medium text-text-2 transition-colors hover:border-accent hover:text-accent group-hover:border-accent/50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {applying ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            Applying…
          </>
        ) : (
          <>
            <Sparkles className="h-3 w-3" />
            Apply Pattern
          </>
        )}
      </button>
    </div>
  )
}
