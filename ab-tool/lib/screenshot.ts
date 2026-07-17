// Screenshot-Wrapper um urlbox.com — genutzt vom Hybrid-Onboarding (/api/preview).
//
// Zwei Renders pro Preview:
//   1. Original  — die Seite wie sie ist.
//   2. Variant   — dieselbe Seite, aber urlbox injiziert unser CSS VOR dem Rendern.
//      Dadurch ist die Variante ein echter Browser-Render (Gradients, CSS-Vars,
//      Stacking-Contexts intakt) statt eines draufgeklebten Overlays.
//
// Auth: `Authorization: Bearer $URLBOX_API_KEY` gegen api.urlbox.com/v1/render/sync.
// Die alte Pfad-Key-Form (urlbox.io/{key}/png?url=…) funktioniert mit diesem
// Secret-Key NICHT — sie antwortet mit ApiKeyNotFound.

import { supabase } from '@/lib/supabase'
import { safeError } from '@/lib/safeLog'

const URLBOX_ENDPOINT = 'https://api.urlbox.com/v1/render/sync'
const BUCKET = 'previews'

// Above the fold, Desktop. Mobile folgt später (Plan §7 Punkt 5).
export const SHOT_WIDTH = 1440
export const SHOT_HEIGHT = 900

// urlbox rendert selbst mit Headless-Chrome und braucht bei langsamen Seiten
// Zeit — plus unser 2.5s Settle-Delay pro Render. Die Preview-Route hat 120s
// maxDuration; 2 Renders à 40s + AI-Call passen da mit Reserve rein.
const RENDER_TIMEOUT_MS = 40_000

export interface ShotOptions {
  /** CSS das urlbox vor dem Render in die Seite injiziert. */
  css?: string
  width?: number
  height?: number
  /** Settle-Zeit vor dem Capture (Default 2500ms, siehe unten). */
  delayMs?: number
}

// Blank-Detection über die PNG-Größe: ein einfarbiges 1440x900-PNG komprimiert
// auf ~5-15 KB, eine echte Seite liegt bei 80-800 KB. Preloader-Overlays
// (weißer Ladescreen), JS-gated Paint oder Bot-Walls produzieren solche
// Leer-Renders — in Produktion als "komplett weiße Preview" aufgeschlagen.
//   < RETRY:  verdächtig → einmal mit längerem Delay neu rendern (billig)
//   < BLANK:  auch danach praktisch sicher leer → Aufrufer soll ablehnen
// Dazwischen (12-30 KB): vermutlich echte Minimal-Seite (à la example.com) —
// durchlassen, lieber eine karge Preview als ein falscher Fehler.
const BLANK_RETRY_BYTES = 30_000
const BLANK_REJECT_BYTES = 12_000
const SETTLE_RETRY_DELAY_MS = 6_000

/**
 * Rendert `url` bei urlbox und gibt die PNG-Bytes zurück.
 * Wirft bei Fehlern — der Aufrufer entscheidet, ob er einen Fallback fährt.
 */
export async function renderScreenshot(url: string, opts: ShotOptions = {}): Promise<Buffer> {
  const apiKey = process.env.URLBOX_API_KEY
  if (!apiKey) throw new Error('URLBOX_API_KEY missing')

  // Verifiziert (Plan §6 Phase 1 Step 0): url/format/width/height/css → 200 + renderUrl.
  const core: Record<string, unknown> = {
    url,
    format: 'png',
    width: opts.width ?? SHOT_WIDTH,
    height: opts.height ?? SHOT_HEIGHT,
  }
  if (opts.css) core.css = opts.css

  // Nicht mitverifiziert, aber wichtig: ein Consent-Layer über dem Hero macht die
  // Preview wertlos, und lazy geladene Bilder fehlen im Screenshot. Sollte urlbox
  // eine dieser Optionen ablehnen, ist das kein Grund die Preview zu verlieren —
  // dann rendern wir ohne sie (siehe Retry unten).
  //
  // delay: Anti-Flicker-Snippets (auch unser eigenes: html.__ab_pending →
  // opacity:0 bis ab.js resolved), Consent-Layer und Load-Animationen verstecken
  // die Seite in den ersten ~1-2s. Ein Capture direkt bei "requests finished"
  // kann in dieses Fenster fallen → leerer/halbfertiger Screenshot. 2.5s
  // Settle-Zeit räumt das Fenster ab; kostet Latenz pro Render, macht das Bild
  // verlässlich. (Vorsorge — in Produktion bisher nicht als Fehlerbild belegt.)
  const enhanced: Record<string, unknown> = {
    ...core,
    block_ads: true,
    hide_cookie_banners: true,
    wait_until: 'requestsfinished',
    delay: opts.delayMs ?? 2500,
  }

  let json = await postRender(apiKey, enhanced)
  if (!json) {
    safeError('screenshot-urlbox-retry', { message: 'enhanced options rejected — retrying with core params' })
    json = await postRender(apiKey, core)
  }
  if (!json) throw new Error('Screenshot failed')
  if (!json.renderUrl) throw new Error('Screenshot response had no renderUrl')

  const imgRes = await fetch(json.renderUrl, { signal: AbortSignal.timeout(RENDER_TIMEOUT_MS) })
  if (!imgRes.ok) throw new Error(`Screenshot download failed (${imgRes.status})`)

  return Buffer.from(await imgRes.arrayBuffer())
}

/**
 * Ein Render-Request. Gibt null zurück, wenn urlbox die Optionen ablehnt (4xx) —
 * der Aufrufer kann dann mit einem kleineren Parameter-Set retryen. 5xx und
 * Netzwerkfehler werfen, da hilft ein Retry mit anderen Optionen nicht.
 */
async function postRender(
  apiKey: string,
  body: Record<string, unknown>
): Promise<{ renderUrl?: string } | null> {
  const res = await fetch(URLBOX_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(RENDER_TIMEOUT_MS),
  })

  if (res.ok) return (await res.json()) as { renderUrl?: string }

  const errText = await res.text().catch(() => '')
  safeError('screenshot-urlbox-error', { message: `status ${res.status}: ${errText.slice(0, 300)}` })
  if (res.status >= 400 && res.status < 500) return null
  throw new Error(`Screenshot failed (${res.status})`)
}

/**
 * Lädt PNG-Bytes in den `previews`-Bucket und gibt die öffentliche URL zurück.
 * Public read ist Absicht: das Bild wird als <img src> im Browser geladen UND
 * von OpenAI als image_url gefetcht — beides ohne unsere Credentials.
 * Aufräumen macht cleanup_stale_previews() bzw. deletePreviewShots() nach Claim.
 */
export async function uploadShot(path: string, png: Buffer): Promise<string> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, png, {
    contentType: 'image/png',
    upsert: true,
  })
  if (error) {
    safeError('screenshot-upload', error)
    throw new Error('Screenshot upload failed')
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) throw new Error('Screenshot URL generation failed')

  // Cache-Buster: Refine überschreibt variant.png unter demselben Pfad (upsert),
  // ohne ?v= zeigt der Browser weiter den alten Screenshot.
  return `${data.publicUrl}?v=${Date.now()}`
}

/**
 * Rendert mit Blank-Detection: verdächtig kleine PNGs werden einmal mit
 * längerem Settle-Delay neu gerendert (Preloader/Animationen brauchen manchmal
 * mehr als 2.5s). `blank: true` heißt: auch der Retry war praktisch leer —
 * der Aufrufer sollte dem User eine Fehlermeldung zeigen statt eines weißen
 * Screenshots, der wie ein kaputtes Produkt aussieht.
 */
export async function renderSettledScreenshot(
  url: string,
  opts: ShotOptions = {}
): Promise<{ png: Buffer; blank: boolean }> {
  let png = await renderScreenshot(url, opts)
  if (png.length < BLANK_RETRY_BYTES) {
    safeError('screenshot-blank-retry', {
      message: `render was ${png.length} bytes — retrying with ${SETTLE_RETRY_DELAY_MS}ms delay`,
    })
    const retry = await renderScreenshot(url, { ...opts, delayMs: SETTLE_RETRY_DELAY_MS })
    if (retry.length > png.length) png = retry
  }
  return { png, blank: png.length < BLANK_REJECT_BYTES }
}

/** Rendert und lädt in einem Schritt hoch. */
export async function captureToStorage(
  url: string,
  path: string,
  opts: ShotOptions = {}
): Promise<string> {
  const png = await renderScreenshot(url, opts)
  return uploadShot(path, png)
}

/** Löscht alle Screenshots eines Previews (nach Claim oder beim Cleanup). */
export async function deletePreviewShots(previewId: string): Promise<void> {
  const { data: files } = await supabase.storage.from(BUCKET).list(previewId)
  if (!files?.length) return
  await supabase.storage.from(BUCKET).remove(files.map((f) => `${previewId}/${f.name}`))
}
