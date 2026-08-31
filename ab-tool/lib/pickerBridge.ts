'use client'

/**
 * pickerBridge — Rückkanal des Element-Pickers zum Wizard.
 *
 * ab.js läuft im Popup auf der Kundenseite und muss die Auswahl an das
 * Dashboard-Tab zurückgeben. Dafür gibt es zwei Wege:
 *
 *   1. postMessage an window.opener — schnell, kein Reload.
 *   2. localStorage über /picker-return — greift, wenn window.opener gekappt
 *      ist. Das passiert häufiger als erwartet: COOP-Header der Zielseite,
 *      Wiederverwendung eines benannten Fensters (window.open mit gleichem
 *      Namen setzt opener nicht neu), Browser-Privacy-Einstellungen. Vorher
 *      hing der Flow allein an Weg 1, und die Auswahl ging still verloren.
 */

import { useEffect, useRef } from 'react'

/**
 * Style-Kontext des Originals, den der Picker mitliefert.
 * Grundlage für das Delta-Modell des Editors (B erbt A statt A zu ersetzen)
 * und für die Vorschau mit echtem Site-CSS.
 */
export interface StyleContext {
  /** Relevantes CSS des Originals (inkl. @media-Wrapper, ggf. gekappt). */
  css: string
  /** Gemessene Computed-Styles des Originals (Fallback, wenn css gekappt). */
  computed: Record<string, string>
  /** true, wenn css im Fragment-Fallback gekappt wurde → Vorschau auf computed-only. */
  cssTruncated?: boolean
}

export interface PickerPayload {
  selector: string
  html?: string
  tagName?: string
  text?: string
  /** Origin der Seite, auf der gepickt wurde — wird gegen die Ziel-URL geprüft. */
  origin?: string
  styleContext?: StyleContext
}

export const PICKER_STORAGE_KEY = 'variante:picker-pick'

/** Picks älter als das hier gelten als abgestanden und werden verworfen. */
const MAX_AGE_MS = 5 * 60 * 1000

function hostnameOf(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    return parsed.hostname.replace(/^www\./i, '').toLowerCase() || null
  } catch {
    return null
  }
}

/**
 * Hostname-Vergleich, der `www.` ignoriert.
 *
 * Ein strikter origin-Vergleich (e.origin !== new URL(url).origin) verwirft
 * legitime Nachrichten, sobald die Zielseite zwischen Apex und www umleitet —
 * z. B. getvariante.com → 307 → www.getvariante.com. Der User tippt "die eine"
 * Variante, das Popup landet auf der anderen, die Auswahl wurde verworfen.
 */
export function isSameSite(a: string | null | undefined, b: string | null | undefined): boolean {
  const hostA = hostnameOf(a)
  const hostB = hostnameOf(b)
  return !!hostA && hostA === hostB
}

/**
 * Nimmt die Auswahl aus dem ab.js-Picker entgegen — über beide Transportwege.
 *
 * `onPick` wird in einem Ref gehalten, damit eine neue Callback-Identität die
 * Listener nicht bei jedem Render neu aufbaut.
 */
export function usePickerBridge(opts: {
  url: string
  mode: 'element' | 'goal'
  onPick: (payload: PickerPayload) => void
}): void {
  const { url, mode } = opts
  const onPickRef = useRef(opts.onPick)
  useEffect(() => {
    onPickRef.current = opts.onPick
  })

  useEffect(() => {
    const messageType = mode === 'goal' ? 'ab-goal' : 'ab-pick'

    function accept(payload: PickerPayload, sourceOrigin: string | null | undefined) {
      if (!payload || typeof payload.selector !== 'string' || !payload.selector.trim()) return
      // SECURITY: Nur Auswahlen von der Seite akzeptieren, die der User im
      // Wizard eingetragen hat.
      if (!isSameSite(sourceOrigin, url)) return
      onPickRef.current(payload)
    }

    function consumeStored(raw: string) {
      let parsed: (PickerPayload & { t?: number; mode?: string }) | null = null
      try {
        parsed = JSON.parse(raw)
      } catch {
        return
      }
      if (!parsed || parsed.mode !== mode) return
      if (typeof parsed.t === 'number' && Date.now() - parsed.t > MAX_AGE_MS) return
      accept(parsed, parsed.origin)
      // Einmalig konsumieren, damit ein Schritt-Wechsel keinen alten Pick erneut anwendet.
      try {
        window.localStorage.removeItem(PICKER_STORAGE_KEY)
      } catch { /* private mode */ }
    }

    function handleMessage(e: MessageEvent) {
      if (!e.data || e.data.type !== messageType) return
      accept(e.data as PickerPayload, e.origin)
    }

    function handleStorage(e: StorageEvent) {
      if (e.key !== PICKER_STORAGE_KEY || !e.newValue) return
      consumeStored(e.newValue)
    }

    // Nachzügler: /picker-return kann geschrieben haben, bevor dieser Step
    // montiert war (z. B. beim Wechsel Element → Goal). Dann gibt es kein
    // storage-Event mehr, das wir hätten hören können.
    try {
      const pending = window.localStorage.getItem(PICKER_STORAGE_KEY)
      if (pending) consumeStored(pending)
    } catch { /* private mode */ }

    window.addEventListener('message', handleMessage)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('message', handleMessage)
      window.removeEventListener('storage', handleStorage)
    }
  }, [url, mode])
}
