# Preview Code-First — Umsetzungsdokument

> **Branch:** `preview-code-first` | **Aufwand:** mittel | **Erstellt:** 2026-07-20

## Problem

Die aktuelle `/api/preview` analysiert JEDE Seite multimodal (GPT-4o Vision + Screenshot), obwohl für ~90% der Seiten der serverseitige Code der bessere, schnellere und günstigere Input ist.

| Metrik | Aktuell | Ziel |
|---|---|---|
| Time-to-first-result | ~15s | ~3s |
| KI-Kosten pro Call | $0.011 (GPT-4o + Vision) | $0.003 (GPT-4o-mini, text-only) |
| Screenshot-Rolle | Primärer Analyse-Input | Präsentation (nur bei SPA Analyse-Input) |
| Screenshot-Timing | Blockierend (sequenziell) | Async, Client pollt |

## Architektur-Übersicht

```
                     POST /api/preview
                           │
                    extractPageCode(url)
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
          FAILS         SPA          HAS DOM (✨ Fast Path, ~90%)
              │            │            │
     Screenshot +     Screenshot    analyzeCodeOnly()
     GPT-4o Vision    für Display    GPT-4o-mini, text-only
     (degraded)       (isSpa:true)       │
              │            │         DB insert
              │            │         RETURN { changes, screenshotsPending }
              │            │            ⏱ ~3s
              │            │            │
              └────────────┴────────────┘
                           │
                    Client zeigt Changes SOFORT
                    Pollt Screenshots parallel
                           │
                           ▼
              GET /api/preview/screenshots
                    ?previewId=xxx
                           │
               renderScreenshot (original)  [4-8s]
               renderScreenshot (variant)   [4-8s]
               DB update (screenshot URLs)
               RETURN { originalUrl, variantUrl }
```

### Timing-Vergleich

| Phase | Vorher | Nachher |
|---|---|---|
| Code-Extraktion | parallel zu Screenshot (versteckt) | 0.5–1s |
| KI-Analyse | 2–4s (GPT-4o + Vision) | 1–2s (GPT-4o-mini, text-only) |
| Screenshots | blockierend (8–16s) | asynchron (Client pollt) |
| **User sieht erste Resultate** | **~15s** | **~3s** |
| User sieht Screenshots | ~15s | ~13s (Text war schon da) |

### Kosten-Vergleich

| Komponente | Vorher | Nachher |
|---|---|---|
| KI-Modell | GPT-4o ($0.01/Call) | GPT-4o-mini ($0.00015/Call) |
| urlbox Renders | 2 pro Call | 2 pro Call (nur via Screenshot-Endpoint) |
| **Pro Call** | **~$0.011** | **~$0.003** (−72%) |

---

## 1. `lib/previewAnalyze.ts` — Neue Funktion `analyzeCodeOnly()`

### Ziel

Code-Only-Analyse für SSR-Seiten — kein Screenshot, kein Vision-Modell. Gleiche Output-Shape wie `analyzePreview()`, gleiche Selector-Verifikation via cheerio.

### Prompt-Design

Der System-Prompt ist identisch zu `analyzePreview()`, ABER das Modell bekommt KEIN `image_url` im User-Message-Content. Dadurch ist es **gezwungen**, nur aus der Kandidatenliste zu wählen — es KANN gar keine Selektoren aus Pixeln erfinden.

Da der Prompt keine Bild-Anweisungen braucht, entfallen:
- "Do not invent class names — a wrong selector means the change never applies" (kann nicht passieren)
- Visuelle Beschreibungen im System Prompt

### Signatur

```typescript
export async function analyzeCodeOnly(
  url: string,
  page: ExtractedPage
): Promise<PreviewAnalysis>
```

- `page` ist garantiert nicht-null und nicht-SPA (Aufrufer prüft das vorher)
- Return-Typ identisch: `{ changes: PreviewChange[], injectedCss: string, summary: string }`

### Prompt

```
System: Gleicher SYSTEM_PROMPT wie analyzePreview(), aber ohne "from the screenshot"-Referenzen

User (text-only, kein image_url):
  Page: {url}
  Title: {page.title}

  CANDIDATE ELEMENTS (selectors verified against the real DOM — copy one verbatim into "selector"):
  {page.elements}

  CSS CONTEXT (design tokens and matched rules):
  {page.css}

  PAGE HTML (body, scripts/styles stripped):
  {page.html}

  Return the JSON object described in the system prompt.
```

### Modell & Parameter

```typescript
const MODEL_CODE_ONLY = 'gpt-4o-mini'
// Gleiche temperature, max_tokens, response_format wie analyzePreview()
```

### Code — vollständig

```typescript
const SYSTEM_PROMPT_CODE = `You are a CRO (conversion rate optimization) expert who writes CSS.

You receive a page's real HTML and a list of candidate elements with VERIFIED CSS
selectors extracted from that HTML server-side.

Your job: pick 2-4 elements and describe a higher-converting visual variant of each,
expressed purely as CSS.

HARD RULES:
1. The "selector" of every change MUST be copied verbatim from the candidate element
   list. Never invent, simplify or shorten a selector.
2. "css" is a plain CSS declaration list (e.g. "background: #0D99FF; color: #fff;").
   No selector, no braces, no !important — the server adds that.
3. Only visual properties: color, background, border, border-radius, padding, margin,
   font-size, font-weight, letter-spacing, line-height, text-transform, box-shadow,
   opacity, display (flex/block/inline-flex only), gap, width, max-width, text-align.
4. Never use: position: fixed, position: absolute, display: none, visibility: hidden,
   z-index, transform, content, @import, url() with anything but https:.
5. Whatever you change, the element must stay READABLE — if you set a background,
   set a matching color too. If you enlarge text, keep it inside its container.
6. Focus on what actually moves conversion: CTA contrast and size, headline clarity
   and hierarchy, trust signals, pricing emphasis. No decorative changes.

Respond with JSON only:
{
  "changes": [
    { "selector": "<verbatim from candidates>", "css": "<declarations>", "rationale": "<one sentence, why this lifts conversion>" }
  ],
  "summary": "<short sentence naming what changed>"
}`

export async function analyzeCodeOnly(
  url: string,
  page: ExtractedPage
): Promise<PreviewAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY missing')

  const promptParts: string[] = [`Page: ${url}`]
  if (page.title) promptParts.push(`Title: ${page.title}`)

  promptParts.push(
    '',
    'CANDIDATE ELEMENTS (selectors verified against the real DOM — copy one verbatim into "selector"):',
    page.elements!.map((e) => `- ${e.selector}  [${e.kind}, <${e.tag}>]  text: "${e.text}"`).join('\n')
  )
  if (page.css) {
    promptParts.push('', 'CSS CONTEXT (design tokens and matched rules):', truncate(page.css, 6000))
  }
  if (page.html) {
    promptParts.push('', 'PAGE HTML (body, scripts/styles stripped):', truncate(page.html, 24_000))
  }

  promptParts.push('', 'Return the JSON object described in the system prompt.')

  const parsed = await callOpenAI(apiKey, 'gpt-4o-mini', [
    { role: 'system', content: SYSTEM_PROMPT_CODE },
    { role: 'user', content: promptParts.join('\n') },
  ])

  const changes = normalizeChanges(parsed.changes, page)
  if (changes.length === 0) throw new Error('No usable changes generated')

  return {
    changes,
    injectedCss: buildInjectedCss(changes),
    summary: typeof parsed.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim().slice(0, 200)
      : changes.map((c) => c.rationale).join(' '),
  }
}
```

### Was wiederverwendet wird (kein Duplikat-Code)

- `normalizeChanges()` — identische Validierungspipeline
- `buildInjectedCss()` — unverändert
- `callOpenAI()` — unverändert (gleiche API, anderer Model-String)
- `sanitizeDeclarations()` — unverändert
- `truncate()` — unverändert

### Export

```typescript
// In previewAnalyze.ts ergänzen:
export { analyzeCodeOnly } // zusätzlich zu analyzePreview, refinePreview
```

---

## 2. `app/api/preview/route.ts` — Flow-Refactor

### Änderungen im Überblick

| Bereich | Vorher | Nachher |
|---|---|---|
| `maxDuration` | 120s | 45s |
| `URLBOX_API_KEY`-Check | immer, am Anfang | nur im Fallback/SPA-Pfad |
| Screenshot-Promise | parallel zu `codePromise`, blockiert | nur im Fallback/SPA-Pfad, sequenziell |
| Analyse | immer `analyzePreview()` (Vision) | `analyzeCodeOnly()` im Fast Path, `analyzePreview()` im Fallback |
| Response | enthält immer Screenshot-URLs | Fast Path: `screenshotsPending: true`, URLs = null |

### Neuer Flow (Pseudocode)

```typescript
export async function POST(req: Request) {
  // ... Rate-Limiting, Body-Parse, URL-Validate, SSRF-Check (unverändert) ...

  const previewId = crypto.randomUUID()

  // ── Schritt 1: Code extrahieren (SEQUENTIAL, kein Screenshot parallel) ──
  let page: ExtractedPage | null
  try {
    page = await extractPageCode(url)
  } catch (err) {
    safeError('preview-extract', err)
    page = null
  }

  // ── Branch A: Code-Fetch fehlgeschlagen → Screenshot + Vision (Fallback) ──
  if (!page) {
    // URLBOX_API_KEY prüfen
    if (!process.env.URLBOX_API_KEY) {
      safeError('preview-config', 'URLBOX_API_KEY missing')
      return json({ error: 'config_missing', ... }, 500)
    }

    // Screenshot rendern (blockierend — wir BRAUCHEN ihn für Vision)
    let shotResult: string
    try {
      const { png, blank } = await renderSettledScreenshot(url)
      if (blank) return json({ error: 'blank_page', ... }, 422)
      shotResult = await uploadShot(`${previewId}/original.png`, png)
    } catch (err) {
      safeError('preview-screenshot', err)
      return json({ error: 'screenshot_failed', ... }, 502)
    }

    // Vision-Analyse (multimodal, Screenshot + null-Code-Kontext)
    let analysis
    try {
      analysis = await analyzePreview(url, shotResult, null)
    } catch (err) {
      safeError('preview-analyze', err)
      return json({ error: 'no_changes', ... }, 422)
    }

    // Variant-Screenshot
    let variantShot: string
    try {
      const { png, blank } = await renderSettledScreenshot(url, { css: buildHighlightCss(analysis.changes) })
      if (blank) throw new Error('variant render blank')
      variantShot = await uploadShot(`${previewId}/variant.png`, png)
    } catch (err) {
      safeError('preview-variant-screenshot', err)
      return json({ error: 'screenshot_failed', ... }, 502)
    }

    // DB insert + return (mit Screenshots)
    const { id: testId } = await insertTest({ url, previewId, shotResult, variantShot, analysis, page, session })
    return json({
      previewId, testId, tempToken: session.token,
      originalScreenshotUrl: shotResult,
      variantScreenshotUrl: variantShot,
      changes: analysis.changes,
      summary: analysis.summary,
      degraded: "We couldn't read your page's code, so this is our best guess from the screenshot.",
    })
  }

  // ── Branch B: SPA → Screenshot für Display, Snippet-First ──
  if (page.isSpa) {
    if (!process.env.URLBOX_API_KEY) {
      safeError('preview-config', 'URLBOX_API_KEY missing')
      return json({ error: 'config_missing', ... }, 500)
    }

    let shotResult: string
    try {
      const { png, blank } = await renderSettledScreenshot(url)
      if (blank) return json({ error: 'blank_page', ... }, 422)
      shotResult = await uploadShot(`${previewId}/original.png`, png)
    } catch (err) {
      safeError('preview-screenshot', err)
      return json({ error: 'screenshot_failed', ... }, 502)
    }

    return json({
      isSpa: true,
      spaType: page.spaType,
      originalScreenshotUrl: shotResult,
      screenshotWidth: SHOT_WIDTH,
      screenshotHeight: SHOT_HEIGHT,
      message: `Your site is built with ${spaLabel(page.spaType)}. ...`,
    })
  }

  // ── Branch C: ✨ FAST PATH — Code-Only, keine Screenshots ──
  let analysis
  try {
    analysis = await analyzeCodeOnly(url, page)
  } catch (err) {
    safeError('preview-analyze-code', err)
    return json({ error: 'no_changes', ... }, 422)
  }

  // DB insert: Screenshot-URLs = null (werden später per GET gefüllt)
  const session = await ensureTempSession(body.temp_token)
  const testName = (body.testName ?? '').trim().slice(0, 80) || `Preview — ${hostOf(url)}`

  const { data: test, error: dbError } = await supabase
    .from('tests')
    .insert({
      name: testName,
      site_url: url,
      status: 'preview',
      temp_session_id: session.id,
      preview_original_screenshot_url: null,  // ← NEU: null
      preview_variant_screenshot_url: null,   // ← NEU: null
      preview_data: {
        previewId,
        previewedUrl: url,
        changes: analysis.changes,
        injectedCss: analysis.injectedCss,
        summary: analysis.summary,
        selectorSource: 'code-analysis',
      },
    })
    .select('id')
    .single()

  if (dbError) {
    safeError('preview-insert', dbError)
    return json({ error: 'db error' }, 500)
  }

  return json({
    previewId,
    testId: test.id,
    tempToken: session.token,
    // Keine Screenshot-URLs — Client pollt GET /api/preview/screenshots
    screenshotsPending: true,  // ← NEU: Signal an Client
    changes: analysis.changes,
    summary: analysis.summary,
  })
}
```

### Hilfsfunktion: `insertTest()` extrahieren

Da der DB-Insert jetzt in zwei Branches passiert (Fallback + Fast Path), lohnt sich eine gemeinsame Funktion:

```typescript
async function insertTest(params: {
  url: string
  previewId: string
  testName?: string
  session: { id: string; token: string }
  analysis: PreviewAnalysis
  page: ExtractedPage | null
  originalUrl?: string | null
  variantUrl?: string | null
}): Promise<{ id: string }> {
  const testName = (params.testName ?? '').trim().slice(0, 80) || `Preview — ${hostOf(params.url)}`
  const { data, error } = await supabase
    .from('tests')
    .insert({
      name: testName,
      site_url: params.url,
      status: 'preview',
      temp_session_id: params.session.id,
      preview_original_screenshot_url: params.originalUrl ?? null,
      preview_variant_screenshot_url: params.variantUrl ?? null,
      preview_data: {
        previewId: params.previewId,
        previewedUrl: params.url,
        changes: params.analysis.changes,
        injectedCss: params.analysis.injectedCss,
        summary: params.analysis.summary,
        selectorSource: params.page ? 'code-analysis' : 'screenshot-only',
      },
    })
    .select('id')
    .single()

  if (error) {
    safeError('preview-insert', error)
    throw new Error('DB insert failed')
  }
  return { id: data.id }
}
```

### `maxDuration`

120s → 45s. 3s Code-Extraktion + 2s KI + DB + Puffer = ~10s real. 45s ist 4.5× Headroom.

---

## 3. `app/api/preview/screenshots/route.ts` — NEU

### Ziel

Rendert Original + Variant-Screenshot für eine bereits analysierte Preview. Idempotent: wenn URLs schon in der DB stehen, sofort return.

### Rate-Limiting

- `preview-screenshots:{ip}`: 5/min (gleiche Logik wie Preview)
- `preview-screenshots:{previewId}`: 10/Stunde (gegen Enumeration)

### Vollständiger Code

```typescript
// Screenshot-Rendering für Code-First-Previews (Plan §3.1, Code-First-Refactor).
//
// GET /api/preview/screenshots?previewId=xxx&testId=yyy
//
// Wird vom Client gepollt, nachdem POST /api/preview die Changes ohne
// Screenshots zurückgegeben hat (screenshotsPending: true). Idempotent:
// sind die URLs schon da, wird kein zweiter Render angestoßen.

import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { safeError } from '@/lib/safeLog'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { buildHighlightCss, type PreviewChange } from '@/lib/previewAnalyze'
import { renderSettledScreenshot, uploadShot, SHOT_WIDTH, SHOT_HEIGHT } from '@/lib/screenshot'

export const maxDuration = 90

const HOUR_MS = 3_600_000

export async function OPTIONS() {
  return preflight('GET, OPTIONS')
}

export async function GET(req: Request) {
  const ip = getClientIp(req)
  if (!(await checkRateLimit(`preview-screenshots:${ip}`, 5, 60_000))) {
    return json({ error: 'too many requests' }, 429)
  }

  const { searchParams } = new URL(req.url)
  const previewId = searchParams.get('previewId')
  const testId = searchParams.get('testId')
  if (!previewId || !testId) return json({ error: 'previewId and testId required' }, 400)

  // Enumeration-Schutz
  if (!(await checkRateLimit(`preview-screenshots:pid:${previewId}`, 10, HOUR_MS))) {
    return json({ error: 'too many requests' }, 429)
  }

  // Config-Check
  if (!process.env.URLBOX_API_KEY) {
    safeError('preview-config', 'URLBOX_API_KEY missing in screenshots endpoint')
    return json({ error: 'config_missing' }, 500)
  }

  // Test laden
  const { data: test, error } = await supabase
    .from('tests')
    .select('id, site_url, status, preview_original_screenshot_url, preview_variant_screenshot_url, preview_data')
    .eq('id', testId)
    .maybeSingle()

  if (error) {
    safeError('preview-screenshots-load', error)
    return json({ error: 'db error' }, 500)
  }
  if (!test || test.status !== 'preview') return json({ error: 'not found' }, 404)

  // previewId verifizieren (der Client kennt beides)
  const previewData = (test.preview_data ?? {}) as { previewId?: string; previewedUrl?: string; changes?: PreviewChange[] }
  if (previewData.previewId !== previewId) return json({ error: 'not found' }, 404)

  // Idempotent: wenn schon da, sofort return
  if (test.preview_original_screenshot_url && test.preview_variant_screenshot_url) {
    return json({
      originalUrl: test.preview_original_screenshot_url,
      variantUrl: test.preview_variant_screenshot_url,
      width: SHOT_WIDTH,
      height: SHOT_HEIGHT,
    })
  }

  const url = previewData.previewedUrl || test.site_url
  const changes = previewData.changes ?? []
  if (!url) return json({ error: 'preview has no URL' }, 422)

  // Original-Screenshot
  let originalUrl: string
  try {
    const { png, blank } = await renderSettledScreenshot(url)
    if (blank) return json({ error: 'blank_page' }, 422)
    originalUrl = await uploadShot(`${previewId}/original.png`, png)
  } catch (err) {
    safeError('preview-screenshots-original', err)
    return json({ error: 'screenshot_failed' }, 502)
  }

  // Variant-Screenshot (mit Highlights falls Changes vorhanden)
  let variantUrl: string
  try {
    const css = changes.length > 0 ? buildHighlightCss(changes) : undefined
    const { png, blank } = await renderSettledScreenshot(url, { css })
    if (blank) throw new Error('variant render blank')
    variantUrl = await uploadShot(`${previewId}/variant.png`, png)
  } catch (err) {
    safeError('preview-screenshots-variant', err)
    return json({ error: 'variant_screenshot_failed' }, 502)
  }

  // DB updaten
  const { error: updateError } = await supabase
    .from('tests')
    .update({
      preview_original_screenshot_url: originalUrl,
      preview_variant_screenshot_url: variantUrl,
    })
    .eq('id', testId)

  if (updateError) {
    safeError('preview-screenshots-update', updateError)
    // Kein Abbruch — die URLs wurden gerendert, nur das DB-Update ging schief.
    // Der Client kann sie trotzdem nutzen, beim nächsten Poll ist es dann drin.
  }

  return json({ originalUrl, variantUrl, width: SHOT_WIDTH, height: SHOT_HEIGHT })
}

function json(payload: unknown, status = 200): Response {
  return Response.json(payload, { status, headers: corsHeaders('GET, OPTIONS') })
}
```

---

## 4. `app/components/HybridDemo.tsx` — Progressive Loading

### Neue States

```typescript
// Neu:
const [screenshotsPending, setScreenshotsPending] = useState(false)
const [screenshotsReady, setScreenshotsReady] = useState(false)
const [screenshotUrls, setScreenshotUrls] = useState<{ original: string; variant: string } | null>(null)
```

### Response-Typ erweitern

```typescript
interface PreviewResponse {
  previewId: string
  testId: string
  tempToken: string
  originalScreenshotUrl?: string       // ← optional (nicht im Fast Path)
  variantScreenshotUrl?: string        // ← optional
  screenshotsPending?: boolean         // ← NEU
  screenshotWidth?: number
  screenshotHeight?: number
  changes: Change[]
  summary: string
  degraded?: string
}
```

### `doSubmit()` anpassen

```typescript
async function doSubmit(trimmed: string) {
  // ... unverändert bis Response ...

  if (json.isSpa) {
    setSpa(json as SpaResponse)
    setState('spa')
    return
  }

  if (json.tempToken) tempTokenRef.current = json.tempToken

  if (json.screenshotsPending) {
    // Fast Path: Changes sind da, Screenshots kommen später
    setData(json as PreviewResponse)
    setScreenshotsPending(true)
    setScreenshotsReady(false)
    setState('preview')
    startPollingScreenshots(json.previewId, json.testId)
  } else {
    // Fallback/SPA: Screenshots sind schon in der Response
    setData(json as PreviewResponse)
    setScreenshotsReady(true)
    setState('preview')
    setTimeout(() => setShowingVariant(true), 600)
  }
}
```

### Polling-Logik

```typescript
function startPollingScreenshots(previewId: string, testId: string) {
  let attempts = 0
  const MAX_ATTEMPTS = 30  // 30 × 2s = 60s
  const POLL_MS = 2000

  const poll = async () => {
    attempts++
    try {
      const res = await fetch(`/api/preview/screenshots?previewId=${previewId}&testId=${testId}`)
      if (!res.ok) {
        if (attempts < MAX_ATTEMPTS) setTimeout(poll, POLL_MS)
        return
      }
      const json = await res.json()
      if (json.originalUrl && json.variantUrl) {
        setScreenshotUrls({ original: json.originalUrl, variant: json.variantUrl })
        setData(prev => prev ? {
          ...prev,
          originalScreenshotUrl: json.originalUrl,
          variantScreenshotUrl: json.variantUrl,
          screenshotWidth: json.width,
          screenshotHeight: json.height,
        } : null)
        setScreenshotsReady(true)
        setScreenshotsPending(false)
        setTimeout(() => setShowingVariant(true), 600)
      } else if (attempts < MAX_ATTEMPTS) {
        setTimeout(poll, POLL_MS)
      }
    } catch {
      if (attempts < MAX_ATTEMPTS) setTimeout(poll, POLL_MS)
    }
  }

  setTimeout(poll, POLL_MS)
}
```

### Screenshot-Bereich im JSX

```tsx
{/* Screenshot — zeigt Skeleton solange Screenshots nicht ready */}
{!screenshotsReady ? (
  <ScreenshotSkeleton />
) : (
  <div className="overflow-hidden rounded-[10px] border border-border-strong bg-bg-0">
    {/* Laptop-Frame + img (unverändert) */}
  </div>
)}
```

### Neue Komponente: `<ScreenshotSkeleton />`

```typescript
function ScreenshotSkeleton() {
  return (
    <div className="mx-auto mt-5 max-w-4xl">
      <div className="overflow-hidden rounded-[10px] border border-border-strong bg-bg-0">
        <div className="flex items-center gap-1.5 border-b border-border bg-bg-2 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="ml-3 h-3 w-40 animate-pulse rounded bg-white/10" />
        </div>
        <div className="flex items-center justify-center bg-bg-0 py-16">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
            <p className="mt-3 text-[11px] text-text-3">Rendering your variant…</p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### Loading-Steps anpassen

- `STEP_MS` von 4000 auf 2000 (Code-Extraktion + KI sind ~3s)
- Dritten Step "✨ Rendering variant…" entfernen — passiert jetzt asynchron
- Steps-Array im `LandingCopy` anpassen (nur 2 Steps statt 3)

### `LandingCopy`-Typ & Übersetzungen

```typescript
// In lib/landingCopy.ts:
demo: {
  // ...
  loadingSteps: readonly string[]  // von 3 auf 2 Steps
  // NEU:
  screenshotPending: string        // "Rendering your screenshots…"
  screenshotFailed: string         // "Screenshots not available"
}
```

---

## 5. Was sich NICHT ändert

| Bereich | Grund |
|---|---|
| `/api/preview/refine` | Arbeitet bereits text-only mit GPT-4o-mini. Screenshots werden hier weiterhin synchron gerendert (es ist ein einzelner Render, kein doppelter). |
| `lib/screenshot.ts` | Keine Änderungen nötig — alle Funktionen werden unverändert genutzt. |
| `lib/extractPageCode.ts` | Keine Änderungen nötig — wird weiterhin als erster Schritt aufgerufen. |
| DB-Schema | `preview_original_screenshot_url` und `preview_variant_screenshot_url` sind bereits nullable. |
| SPA-Pfad | Bleibt wie gehabt (Screenshot + Snippet-First-Message). |
| `lib/sanitize.ts` | Keine Änderungen. |
| `lib/cors.ts`, `lib/safeLog.ts`, `lib/rateLimit.ts` | Keine Änderungen. |
| `lib/landingCopy.ts` (Typen) | Nur Werte-Ergänzung, keine Typ-Änderung. |

---

## 6. Risiken & Mitigation

| Risiko | Eintrittswahr. | Mitigation |
|---|---|---|
| GPT-4o-mini liefert schlechtere CRO-Qualität | Niedrig | Die Selektoren sind DOM-verifiziert — das Modell wählt nur AUS, es erfindet nicht. Der Prompt ist derselbe. Bei Vision hat das Modell MEHR Freiheit, Fehler zu machen. |
| Screenshot-Endpoint schlägt fehl (urlbox down) | Niedrig–Mittel | Client zeigt Fallback-Text ("Screenshots not available") + Link zur Original-URL. DB-Eintrag bleibt ohne URLs — cleanup_previews Cron räumt >24h auf. |
| Client pollt endlos | Niedrig | Max 60s Timeout (30×2s). Danach zeigt Client Info-Text mit manuellem Retry-Button. |
| DB-Inkonsistenz (Changes da, Screenshots null) | Niedrig | cleanup_previews Cron löscht Tests >24h ohne Screenshots. GET-Endpoint ist idempotent — wiederholtes Pollen ist harmlos. |
| Langsame Netzwerke → Timeout während Screenshot-Poll | Mittel | Polling nutzt fetch() mit eigenem Timeout. Bei Netzwerkfehler wird nächster Poll in 2s gestartet. |
| Race Condition: zwei Clients pollen gleichzeitig | Niedrig | Beide rendern unabhängig — der zweite upsert überschreibt nur. Kein DB-Konflikt. |

---

## 7. Test-Plan

### Manuell

1. SSR-Seite (z. B. `example.com`): Fast Path, Changes nach ~3s, Screenshots nach ~12s
2. SPA-Seite (z. B. React-App auf Vercel): SPA-Fallback, Screenshot + Message
3. Nicht erreichbare URL: Fallback-Pfad (`extractPageCode` wirft), Screenshot + Vision
4. Leere Seite: `blank_page`-Error
5. Screenshot-Endpoint direkt aufrufen: Idempotenz prüfen (zweiter Call sofort)
6. Screenshot-Endpoint mit falscher previewId: 404

### Build

```bash
cd ab-tool && npm run vercel-build
```

Muss grün sein vor jedem Commit.

---

## 8. Commit-Strategie

Jeder Schritt ein Commit auf `preview-code-first`-Branch:

1. `feat(preview): add analyzeCodeOnly() for code-first CRO analysis`
2. `feat(preview): refactor route to code-first flow with async screenshots`
3. `feat(preview): add GET /api/preview/screenshots endpoint`
4. `feat(preview): progressive screenshot loading in HybridDemo`
5. `chore(preview): update landingCopy loading steps for 2-phase flow`

---

## 9. Checkliste vor Merge

- [ ] `npm run vercel-build` grün
- [ ] `tsc --noEmit` grün
- [ ] Keine `any`-Typen
- [ ] `.env.local` nicht im Diff
- [ ] Manueller Test: Fast Path (SSR-Seite)
- [ ] Manueller Test: SPA-Fallback
- [ ] Manueller Test: Fallback (URL nicht erreichbar)
- [ ] Manueller Test: Screenshot-Endpoint Idempotenz
- [ ] Preview-Deploy auf Vercel
- [ ] PROJEKT.md aktualisiert
