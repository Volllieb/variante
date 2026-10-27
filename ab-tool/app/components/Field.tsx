'use client'

/**
 * Formular-Feld-Hülle (brandguidelines v3 §6.5).
 *
 * Phase 1: Label, Hilfetext und Fehlertext waren je Formular handgebaut, mit
 * dem Ergebnis, dass `htmlFor`, `aria-invalid` und `aria-describedby` meist
 * fehlten. Field erzeugt die IDs selbst und gibt sie per Context an das
 * Control weiter — <Input>/<Textarea>/<Select> greifen sie automatisch ab,
 * damit die Verdrahtung nicht an jeder Aufrufstelle wiederholt (und vergessen)
 * werden kann.
 *
 * Fehlertext ersetzt den Hilfetext, er steht nicht darunter: zwei Zeilen unter
 * einem Feld lesen sich als zwei Probleme.
 */

import { createContext, useContext, useId, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface FieldContextValue {
  controlId: string
  describedById?: string
  invalid: boolean
}

const FieldContext = createContext<FieldContextValue | null>(null)

/** Von <Input>/<Textarea>/<Select> genutzt; außerhalb eines <Field> null. */
export function useFieldControl(): FieldContextValue | null {
  return useContext(FieldContext)
}

interface FieldProps {
  label: string
  hint?: string
  error?: string | null
  /** Label optisch ausblenden, z. B. in einer Toolbar. Bleibt für Screenreader. */
  hideLabel?: boolean
  className?: string
  children: ReactNode
}

export function Field({ label, hint, error, hideLabel = false, className, children }: FieldProps) {
  const controlId = useId()
  const messageId = `${controlId}-message`
  const message = error ?? hint
  const invalid = Boolean(error)

  return (
    <FieldContext.Provider
      value={{ controlId, describedById: message ? messageId : undefined, invalid }}
    >
      <div className={cn('flex flex-col gap-tight', className)}>
        <label
          htmlFor={controlId}
          className={cn('text-meta font-medium text-text-2', hideLabel && 'sr-only')}
        >
          {label}
        </label>
        {children}
        {message && (
          <p id={messageId} className={cn('text-meta', invalid ? 'text-err' : 'text-text-3')}>
            {message}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  )
}
