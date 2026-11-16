'use client'

/**
 * „Suggest copy" — KI-Textvarianten für Headline oder Button (Wizard, Schritt Change).
 *
 * Ruft /api/test-wizard/copy (Pipeline: lib/generateCopyVariants.ts) und zeigt
 * bis zu 3 Varianten, jede mit dem Hebel, den sie testet, und einem Satz
 * Begründung. Ein Klick übernimmt die Variante als Text-Zeile in die
 * Änderungsliste. Die KI schreibt nur Text — Gestaltung bleibt beim Nutzer
 * (der frühere Design-Vorschlagspfad lieferte keine brauchbaren Ergebnisse).
 */

import { useState } from 'react'
import { Sparkles, RotateCw } from 'lucide-react'
import { Badge, Button, OptionCard, OptionCardGroup } from '@/app/components'
import { LEVER_LABELS, type LeverId } from '@/lib/copyLevers'

export interface CopySuggestion {
  text: string
  lever: LeverId
  why: string
}

interface CopySuggestionsProps {
  pageUrl: string
  original: string
  kind: 'headline' | 'cta'
  selector?: string
  /** Text, der gerade in Variante B steht — markiert die übernommene Karte. */
  currentText?: string
  onUse: (s: CopySuggestion) => void
}

type State =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'done'; variants: CopySuggestion[] }
  | { phase: 'error'; message: string; upgrade: boolean }

export function CopySuggestions({ pageUrl, original, kind, selector, currentText, onUse }: CopySuggestionsProps) {
  const [state, setState] = useState<State>({ phase: 'idle' })

  async function suggest() {
    setState({ phase: 'loading' })
    try {
      const res = await fetch('/api/test-wizard/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: pageUrl, original, kind, selector }),
      })
      const body = await res.json().catch(() => ({})) as { variants?: CopySuggestion[]; message?: string; error?: string }
      if (!res.ok || !body.variants?.length) {
        setState({
          phase: 'error',
          message: body.message ?? 'Could not get suggestions. Try again or write your own.',
          upgrade: body.error === 'limit reached',
        })
        return
      }
      setState({ phase: 'done', variants: body.variants })
    } catch {
      setState({ phase: 'error', message: 'Network error. Check your connection and try again.', upgrade: false })
    }
  }

  if (state.phase === 'idle') {
    return (
      <Button variant="secondary" size="sm" onClick={suggest}>
        <Sparkles className="h-3.5 w-3.5" />
        Suggest {kind === 'headline' ? 'headline' : 'button text'}
      </Button>
    )
  }

  if (state.phase === 'loading') {
    return (
      <div className="flex items-center gap-snug rounded-md border border-border px-3 py-2.5 text-small text-text-2" role="status">
        <RotateCw className="h-3.5 w-3.5 animate-spin" />
        Reading your page and writing 3 variants… this takes about 10 seconds.
      </div>
    )
  }

  if (state.phase === 'error') {
    return (
      <div className="flex flex-wrap items-center gap-snug rounded-md border border-border px-3 py-2.5 text-small text-text-2" role="alert">
        <span>{state.message}</span>
        {state.upgrade ? (
          <Button variant="link" size="inline" href="/dashboard/billing" className="font-semibold">Upgrade to Pro</Button>
        ) : (
          <Button variant="link" size="inline" onClick={suggest} className="font-semibold">Try again</Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-snug">
      {/* Untereinander: nebeneinander schnitt der Badge die Vorschläge auf „keep m…" ab */}
      <OptionCardGroup label={kind === 'headline' ? 'Headline suggestions' : 'Button text suggestions'} className="flex-col">
        {state.variants.map((v) => (
          <OptionCard
            key={v.text}
            title={v.text}
            description={v.why}
            trailing={<Badge tone="neutral">{LEVER_LABELS[v.lever] ?? v.lever}</Badge>}
            selected={currentText === v.text}
            onClick={() => onUse(v)}
          />
        ))}
      </OptionCardGroup>
      <div className="flex items-center justify-between gap-snug">
        <p className="text-meta text-text-3">Each suggestion tests a different idea. Pick one, then edit it if you like.</p>
        <Button variant="ghost" size="sm" onClick={suggest}>
          <RotateCw className="h-3 w-3" />
          New suggestions
        </Button>
      </div>
    </div>
  )
}
