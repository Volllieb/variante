'use client'

/**
 * PickerReturnClient — Landeseite des Picker-Fallbacks.
 *
 * ab.js navigiert das Picker-Popup hierher, wenn window.opener gekappt ist und
 * postMessage deshalb nicht ankommt. Diese Seite liegt auf derselben Origin wie
 * das Dashboard und kann die Auswahl über localStorage weiterreichen — das
 * offene Dashboard-Tab hört auf das storage-Event (siehe lib/pickerBridge.ts).
 *
 * Die Nutzdaten stehen im URL-Fragment und gehen damit nie an den Server.
 */

import { useEffect, useState } from 'react'
import { Check, AlertCircle, Loader2 } from 'lucide-react'
import { PICKER_STORAGE_KEY } from '@/lib/pickerBridge'

type State = 'working' | 'done' | 'error'
type Outcome = { state: 'done'; selector: string } | { state: 'error' }

// Spiegelt die Limits von /api/capture bzw. test-wizard/draft.
const MAX_HTML = 10_000

/**
 * Liest das Fragment und legt die Auswahl in localStorage ab.
 *
 * Bewusst ausserhalb der Komponente: die Zustellung ist ein reiner Seiteneffekt
 * gegen zwei externe Systeme (URL + localStorage) und hat mit dem Render nichts
 * zu tun.
 */
function deliverPick(): Outcome {
  let raw = ''
  try {
    raw = decodeURIComponent(window.location.hash.replace(/^#/, ''))
  } catch {
    return { state: 'error' }
  }
  if (!raw) return { state: 'error' }

  let data: Record<string, unknown>
  try {
    data = JSON.parse(raw)
  } catch {
    return { state: 'error' }
  }

  // Das Fragment ist nicht vertrauenswürdig — jeder kann diese URL bauen.
  // Hier wird nur normalisiert und gekappt; die inhaltliche Prüfung macht der
  // Wizard, der Picks mit unpassender origin verwirft (lib/pickerBridge.ts).
  const selector = typeof data.selector === 'string' ? data.selector.trim() : ''
  if (!selector) return { state: 'error' }

  const payload = {
    mode: data.mode === 'goal' ? 'goal' : 'element',
    selector: selector.slice(0, 2000),
    html: typeof data.html === 'string' ? data.html.slice(0, MAX_HTML) : '',
    tagName: typeof data.tagName === 'string' ? data.tagName.slice(0, 40) : '',
    text: typeof data.text === 'string' ? data.text.slice(0, 200) : '',
    origin: typeof data.origin === 'string' ? data.origin.slice(0, 300) : '',
    t: Date.now(),
  }

  try {
    window.localStorage.setItem(PICKER_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Private Mode o. Ä. — ohne localStorage gibt es keinen Rückweg.
    return { state: 'error' }
  }

  // Fragment aus der History nehmen, damit ein Reload nichts erneut zustellt.
  try {
    window.history.replaceState(null, '', window.location.pathname)
  } catch { /* nicht kritisch */ }

  return { state: 'done', selector: payload.selector }
}

export function PickerReturnClient() {
  const [state, setState] = useState<State>('working')
  const [selector, setSelector] = useState('')

  useEffect(() => {
    let cancelled = false
    let closeTimer: ReturnType<typeof setTimeout> | undefined

    // Zustellung als Task statt synchron im Effect-Body — setState direkt im
    // Effect löst eine Render-Kaskade aus (react-hooks/set-state-in-effect).
    // Nebeneffekt: der "Sending…"-Frame wird tatsächlich gepaintet.
    const kick = setTimeout(() => {
      const outcome = deliverPick()
      if (cancelled) return
      if (outcome.state === 'done') {
        setSelector(outcome.selector)
        setState('done')
        closeTimer = setTimeout(() => {
          try {
            window.close()
          } catch { /* Fenster wurde nicht per Skript geöffnet */ }
        }, 700)
      } else {
        setState('error')
      }
    }, 0)

    return () => {
      cancelled = true
      clearTimeout(kick)
      if (closeTimer) clearTimeout(closeTimer)
    }
  }, [])

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg-0 px-6">
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-border bg-bg-1 p-8 text-center">
        {state === 'working' && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-bg-2">
              <Loader2 className="h-6 w-6 animate-spin text-text-3" />
            </div>
            <p className="text-[15px] font-semibold text-text">Sending your selection…</p>
          </>
        )}

        {state === 'done' && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-ok/10 ring-1 ring-ok/20">
              <Check className="h-6 w-6 text-ok" />
            </div>
            <p className="text-[15px] font-semibold text-text">Element sent to your wizard</p>
            <p className="mt-1.5 text-[12px] text-text-3">
              You can close this tab and continue in the dashboard.
            </p>
            <code className="mt-4 inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-[var(--radius-sm)] bg-bg-2 px-2.5 py-1.5 font-mono text-[11px] text-text-2">
              {selector}
            </code>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-err/10 ring-1 ring-err/20">
              <AlertCircle className="h-6 w-6 text-err" />
            </div>
            <p className="text-[15px] font-semibold text-text">Nothing to hand over</p>
            <p className="mt-1.5 text-[12px] text-text-3">
              Open this page from the element picker, or paste the CSS selector into the
              wizard&apos;s Manual Selector field.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
