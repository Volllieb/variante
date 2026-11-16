'use client'

/**
 * OptionCard (brandguidelines v3 §6.3) — klickbare Karte mit Titel, Beschreibung
 * und optionalem Vorspann (Icon, Nummer).
 *
 * Phase 2 hat alle rohen `<button>` auf `<Button>` gezogen, bis auf diese:
 * eine Karte mit zwei Textzeilen ist kein Button mit Label. Sie kam zweimal
 * vor und war beide Male anders gebaut — in `ResultsClient.tsx` mit
 * `border-white/20 bg-white/[0.06]` für die Auswahl (nach §12 Regel 7 keine
 * Roh-Weißtöne), in `StepUrlAndElement.tsx` mit einer eigenen Pro-Tönung.
 *
 * Zwei Verwendungen, ein Bauteil:
 *   - Auswahl (`selected`): eine aus mehreren. Gehört in eine
 *     <OptionCardGroup>, damit Screenreader „Radiogruppe, 1 von 3" ansagen
 *     statt dreimal „Schaltfläche".
 *   - Aktion (ohne `selected`): die Karte führt etwas aus. `tone="pro"`
 *     hebt die Empfehlung hervor, ist aber kein Auswahlzustand.
 */

import type { ComponentProps, KeyboardEvent, ReactNode } from 'react'

import { cn } from '@/lib/utils'

type OptionTone = 'neutral' | 'pro'

interface OptionCardProps extends Omit<ComponentProps<'button'>, 'title'> {
  title: ReactNode
  description?: ReactNode
  /** Icon oder Nummer vor dem Titel. */
  leading?: ReactNode
  /** Rechts neben dem Titel, z. B. ein <Badge>. */
  trailing?: ReactNode
  /**
   * Gesetzt = die Karte ist eine Auswahloption und zeigt ihren Zustand.
   * Weggelassen = reine Aktion, dann gibt es keinen „nicht gewählt"-Zustand.
   */
  selected?: boolean
  tone?: OptionTone
  /**
   * `inline`: Vorspann steht neben dem Titel, die Beschreibung darunter über
   * die volle Breite. `aside`: Vorspann ist eine eigene linke Spalte neben
   * beiden Zeilen — für Listen mit Nummern.
   */
  layout?: 'inline' | 'aside'
}

export function OptionCard({
  title,
  description,
  leading,
  trailing,
  selected,
  tone = 'neutral',
  layout = 'inline',
  className,
  ...rest
}: OptionCardProps) {
  const isOption = selected !== undefined

  // Fläche bewusst transparent statt bg-bg-1: die Karten liegen mal auf
  // bg-bg-0, mal in einer Card auf bg-bg-1. Der gewählte Zustand hebt sich
  // über die nächste Füllstufe ab (§2), nicht über eine eigene Farbe.
  const toneClasses =
    tone === 'pro'
      ? 'border-pro/25 bg-pro/[0.05] hover:bg-pro/[0.09]'
      : selected
        ? 'border-border-strong bg-bg-2'
        : 'border-border bg-transparent hover:border-border-strong'

  const head = (
    <div className="flex min-w-0 items-center gap-snug">
      {layout === 'inline' && leading}
      <span className={cn('min-w-0 truncate text-meta font-semibold', selected === false && 'text-text-3')}>
        {title}
      </span>
      {trailing}
    </div>
  )

  const body = (
    <>
      {head}
      {description && <div className="mt-0.5 text-meta leading-relaxed text-text-3">{description}</div>}
    </>
  )

  return (
    <button
      type="button"
      // Roving tabindex: Tab springt in die Gruppe hinein auf die gewählte
      // Option, zwischen den Optionen bewegen die Pfeiltasten (OptionCardGroup).
      // So verhält sich die Gruppe wie die Radiogruppe, als die sie sich ansagt.
      {...(isOption ? { role: 'radio', 'aria-checked': selected, tabIndex: selected ? 0 : -1 } : {})}
      className={cn(
        'w-full cursor-pointer rounded-md border px-3 py-2 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30',
        'disabled:cursor-not-allowed disabled:opacity-40',
        toneClasses,
        className,
      )}
      {...rest}
    >
      {layout === 'aside' ? (
        <div className="flex items-start gap-snug">
          {leading}
          <div className="min-w-0 flex-1">{body}</div>
        </div>
      ) : (
        body
      )}
    </button>
  )
}

/**
 * Hülle für <OptionCard selected>: macht aus mehreren Karten eine Radiogruppe.
 * Ohne sie hört ein Screenreader drei einzelne Schaltflächen und erfährt
 * nicht, dass sie Alternativen sind.
 *
 * Die Pfeiltasten gehören zur Rolle dazu: wer `role="radio"` ansagt und dann
 * nur auf Tab reagiert, verspricht etwas, das die Gruppe nicht hält. Die
 * Auswahl folgt dem Fokus (Klick auf die Zieloption), wie bei nativen Radios.
 */
export function OptionCardGroup({
  label,
  className,
  children,
  onKeyDown,
  ...rest
}: ComponentProps<'div'> & { label: string }) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event)
    if (event.defaultPrevented) return

    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown'
      ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
        ? -1
        : 0
    if (step === 0) return

    const options = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]:not([disabled])'),
    )
    if (options.length === 0) return

    const current = options.findIndex((o) => o === document.activeElement)
    const next = options[(((current < 0 ? 0 : current) + step) + options.length) % options.length]
    event.preventDefault()
    next.focus()
    next.click()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn('flex gap-snug', className)}
      {...rest}
    >
      {children}
    </div>
  )
}
