# Autonomous A/B Testing Agent — Implementation Prompt

> **Ziel:** Ein KI-Agent, der eine Landingpage vollautomatisch analysiert, Optimierungs-Varianten generiert und A/B-Tests in variante anlegt.
> **Stand:** 14.07.2026 — Prompt-Dokument. Noch kein Code. Baut auf existierender Infrastruktur auf.
> **Vorgänger:** `self-improving-site-engine.md` (Konzept), `WhatToTestNext.tsx` (UI), `POST /api/suggestions` (Analyse), `POST /api/generate` (Variant-Gen), `POST /api/tests` (Test-Anlage).

---

## 1. Vision

"Deine Landingpage hat diese 3 Schwachstellen. Ich generiere die Varianten und lege die Tests an."

Der Agent führt 3 Schritte in einem durch:
1. **Analyze** — Seite fetchen, DOM parsen, CRO-Schwachstellen identifizieren
2. **Generate** — Für die Top-3-Vorschläge konkrete Varianten (Text/Color/Layout) generieren
3. **Create** — A/B-Tests in variante anlegen, ready to run

User-Experience: Ein Button im Dashboard. Der Rest passiert live gestreamt vor den Augen des Users.

---

## 2. Ansatz-Entscheidung: B → A

### Ansatz B: Vercel AI SDK Agent (PRIMÄR, 3–5 Tage)

**Warum:** Streaming-UX ist der Aha-Moment. Der Agent bekommt Tools (`fetchSite`, `analyzeCRO`, `generateVariant`, `createTest`) und das LLM entscheidet selbst, was es wann braucht. Jeder Schritt wird in die UI gestreamt.

**Tech:** `ai` + `@ai-sdk/openai` (Vercel AI SDK), `streamText()` mit `tools` und `maxSteps`.

**Vorteile:**
- Live-Streaming: User sieht "Analysiere landingpage.com... → 3 Optimierungen gefunden → Generiere Variante... → Test #1 angelegt ✓"
- Flexibel: LLM passt Strategie an Seitentyp an (E-Commerce vs SaaS vs Blog)
- Erweiterbar: Neue Tools = neue Fähigkeiten, kein Umbau nötig
- Passt perfekt zu Next.js/Vercel (gleicher Vendor, 1A Integration)

**Nachteile:**
- `maxSteps`-Kostenkontrolle nötig (~$0.015–0.03/Run bei gpt-4o-mini)
- Tool-Design braucht Sorgfalt (klare Schemas, robuste Error-Handling)
- Braucht neue npm-Packages (`ai`, `@ai-sdk/openai`)

### Ansatz A: Pipeline-API (FALLBACK, 2–3 Tage)

**Wann:** Falls AI SDK nicht funktioniert (Vercel-Edge-Kompatibilität, Package-Konflikte, Zeitdruck).

**Was:** Ein deterministischer `POST /api/agent/run`-Endpunkt, der die existierenden Bausteine linear verkettet. Kein Streaming, einfacher Spinner.

```
fetchPage → stripForCRO → extractStructure → GPT-4o-mini analyze
  → forEach(suggestion): generateVariant → createTest
  → response: { tests_created: [...], suggestions: [...] }
```

**Vorteile:** Schneller MVP, alles existiert schon, kein neues Package.
**Nachteile:** Kein Streaming, starrer Ablauf, fühlt sich weniger "magisch" an.

**→ Immer zuerst B versuchen. Nur zu A wechseln, wenn B technisch blockiert ist.**

---

## 3. Existierende Infrastruktur (REUSE, nicht neu bauen)

### 3.1 Was schon da ist und direkt wiederverwendet wird

| Komponente | Datei | Was sie kann | Wiederverwendung |
|---|---|---|---|
| **SSRF-Schutz** | `lib/ssrf.ts` | `BLOCKED_HOSTS`, `BLOCKED_HOSTNAMES` | 1:1 importieren in `fetchSite`-Tool |
| **Safe Logging** | `lib/safeLog.ts` | `safeError(context, err)` | 1:1 importieren |
| **Auth** | `lib/auth.ts` | `getApiUser(req)`, `unauthorized()`, `paymentRequired()` | 1:1 für Agent-Route |
| **CORS** | `lib/cors.ts` | `corsHeaders()`, `preflight()` | 1:1 |
| **Supabase Client** | `lib/supabase.ts` | Service-Role Client für DB-Zugriff | 1:1, für `createTest`-Tool |
| **HTML-Stripping** | `app/api/suggestions/route.ts` | `stripForCRO(html)`, `extractStructure(html)` | **Extrahiere in `lib/croAnalyze.ts`** |
| **Suggestions System Prompt** | `app/api/suggestions/route.ts` | `SYSTEM_PROMPT` (7 CRO-Kriterien) | **Extrahiere in `lib/croAnalyze.ts`** |
| **Suggestions POST-Handler** | `app/api/suggestions/route.ts` | Fetch → Strip → GPT-4o-mini → JSON | Wird als `analyzeCRO`-Tool gewrappt |
| **Variant-Generierung** | `app/api/generate/route.ts` | Figma-JSON → HTML/CSS | Wird als Basis für `generateVariant`-Tool genutzt |
| **Test-Anlage** | `app/api/tests/route.ts` | Insert in `tests`-Tabelle mit Domain-Gate, Gating | Logik 1:1 in `createTest`-Tool extrahieren |
| **Cost-Tracking** | RPC `increment_gen_cost` | Zählt OpenAI-Kosten pro User/Monat | Derselbe RPC für Agent-Calls |
| **WhatToTestNext-UI** | `app/dashboard/components/WhatToTestNext.tsx` | Zeigt Suggestions mit Blur/Paywall | Wird durch `AgentPanel` erweitert, nicht ersetzt |

### 3.2 Was neu gebaut werden muss

| Komponente | Neu/Modifiziert | Beschreibung |
|---|---|---|
| `lib/croAnalyze.ts` | **NEU** (extracted) | `stripForCRO()`, `extractStructure()`, `SYSTEM_PROMPT`, `analyzePage()` |
| `lib/generateVariantText.ts` | **NEU** | Text/Color/Layout-Varianten generieren (kein Figma) |
| `lib/agentTools.ts` | **NEU** | `fetchSite`, `analyzeCRO`, `generateVariant`, `createTest` als AI-SDK-Tools |
| `app/api/agent/route.ts` | **NEU** | `streamText()`-Route mit Agent-Loop |
| `app/dashboard/components/AgentPanel.tsx` | **NEU** | `useChat()`-basierte Streaming-UI |
| `app/dashboard/DashboardClient.tsx` | **MODIFIED** | `AgentPanel` oberhalb oder neben `WhatToTestNext` einbauen |
| `db/migrations/018_agent_runs.sql` | **NEU** | `agent_runs` + `site_insights` Tabellen |
| `package.json` | **MODIFIED** | `ai`, `@ai-sdk/openai`, `zod` (falls nicht via ai) hinzufügen |

---

## 4. Architektur — Ansatz B im Detail

### 4.1 Datenfluss

```
User klickt "🔍 Automatisch optimieren"
  ↓
POST /api/agent  { domain: "landingpage.com", pageGoal: "signups" }
  ↓
streamText() mit tools:
  ↓
  [1] fetchSite(url)
      → SSRF-Check (lib/ssrf.ts)
      → fetch(url, { timeout: 10000 })
      → stripForCRO(html) + extractStructure(html)
      → return { html, structure, title, metaDescription }
  ↓
  [2] analyzeCRO(html, structure, pageGoal)
      → GPT-4o-mini mit Suggestions-System-Prompt
      → response_format: { type: "json_object" }
      → return { suggestions: Array<{ element, original, variant, why, type }> }
  ↓
  [3] generateVariant(element, original, variant, type)
      → GPT-4o-mini mit Variant-Generator-Prompt
      → type=text → neuer Text-String
      → type=color → neue Hex-Color
      → type=css → CSS-Regeln
      → type=layout → CSS für Reorder
      → return { variant_html?, variant_css? }
  ↓
  [4] createTest(name, site_url, selector?, goal?, variant_html?, variant_css?)
      → Domain-Gate prüfen (gegen verified domain)
      → Free-Gating prüfen (max 1 aktiver Test)
      → Insert in tests-Tabelle
      → return { id, snippet_key }
  ↓
Stream Ende: "3 Tests angelegt: [Link zu Dashboard]"
```

### 4.2 Package-Installation

```bash
cd ab-tool
npm install ai @ai-sdk/openai zod
```

- `ai` — Vercel AI SDK (`streamText`, `tool`, `useChat`)
- `@ai-sdk/openai` — OpenAI-Provider für AI SDK
- `zod` — Tool-Parameter-Validierung (wird von AI SDK erwartet)

### 4.3 Dateispezifikationen

---

#### 4.3.1 `lib/croAnalyze.ts` (NEU — Extracted aus `suggestions/route.ts`)

**Aufgabe:** Wiederverwendbare CRO-Analyse-Funktionen, extrahiert aus `/api/suggestions`, damit Agent-Tools und Suggestions-Route dieselbe Logik nutzen.

```typescript
// Exportiere diese aus suggestions/route.ts hierher:
export function stripForCRO(html: string): string { /* ... */ }
export function extractStructure(html: string): string { /* ... */ }
export const CRO_SYSTEM_PROMPT = `...` // Der existierende System-Prompt
export const FEW_SHOT_EXAMPLE = { /* das existierende Few-Shot-Beispiel */ }

// NEU: Wrapper für den OpenAI-Call
export async function analyzePage(
  html: string,
  structure: string,
  options?: { pageGoal?: string; industry?: string }
): Promise<CROSuggestion[]> {
  // Ruft GPT-4o-mini mit CRO_SYSTEM_PROMPT + few-shot auf
  // Gibt Array<CROSuggestion> zurück
}

export interface CROSuggestion {
  element: string      // "CTA-Button (Hero)"
  original: string     // "Get Started"
  variant: string      // "Start Free — No Credit Card"
  why: string          // CRO-Begründung
  type: 'text' | 'color' | 'css' | 'layout'  // NEU: für generateVariant
  selector?: string    // CSS-Selector, falls aus HTML extrahierbar
}
```

**Wichtig:** `suggestions/route.ts` muss NACH der Extraktion so umgebaut werden, dass es `analyzePage()` aus `lib/croAnalyze.ts` importiert. Erstelle KEINE neue Suggestions-Route — modifiziere die existierende so, dass sie die extrahierten Funktionen nutzt.

---

#### 4.3.2 `lib/generateVariantText.ts` (NEU)

**Aufgabe:** Generiert Varianten für Nicht-Figma-Elemente (Text-Änderungen, Farben, CSS-Tweaks). Das existierende `/api/generate` arbeitet NUR mit Figma-JSON — der Agent braucht einen Generator für Text/Color/Layout-Vorschläge.

```typescript
import { safeError } from '@/lib/safeLog'

const MODEL = 'gpt-4o-mini'

interface GenerateVariantInput {
  element: string       // Beschreibung des Elements
  original: string      // Original-Text/Farbe/CSS
  variantDescription: string  // Was geändert werden soll
  type: 'text' | 'color' | 'css' | 'layout'
  pageContext?: string  // Optional: umgebender HTML-Kontext
}

interface GenerateVariantOutput {
  variant: string       // Der neue Wert
  variant_html?: string // HTML-Fragment (nur bei type=layout)
  variant_css?: string  // CSS-Regeln (bei type=css/layout)
  explanation: string   // Warum diese Änderung
}

const SYSTEM_PROMPTS: Record<string, string> = {
  text: `Du bist ein Conversion-Copywriter. Erstelle eine textliche Variante,
die auf Conversion optimiert ist. Halte dich kurz — maximal 2 Sätze oder
eine prägnante Phrase. Gib NUR den neuen Text zurück, keine Erklärungen.`,

  color: `Du bist ein UI-Designer. Schlage eine Farbe vor, die den Kontrast
und die visuelle Hierarchie verbessert. Gib NUR den Hex-Code zurück (z.B. "#f97316").
Keine Erklärungen, kein CSS.`,

  css: `Du bist ein CSS-Spezialist. Erstelle CSS-Regeln für die beschriebene
Änderung. Gib NUR CSS zurück, keine Erklärungen, kein HTML.`,

  layout: `Du bist ein Layout-Spezialist. Erstelle CSS-Regeln, die die
beschriebene Layout-Änderung umsetzen. Verwende flexbox, grid, oder
position. Gib NUR CSS zurück.`,
}

export async function generateVariantText(
  input: GenerateVariantInput
): Promise<GenerateVariantOutput> {
  const systemPrompt = SYSTEM_PROMPTS[input.type] ?? SYSTEM_PROMPTS.text

  const userPrompt = [
    `Element: ${input.element}`,
    `Original: ${input.original}`,
    `Gewünschte Änderung: ${input.variantDescription}`,
    input.pageContext ? `Seiten-Kontext: ${input.pageContext}` : '',
  ].filter(Boolean).join('\n')

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY missing')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    safeError('generateVariantText-openai-error', { status: res.status, body: errText.slice(0, 200) })
    throw new Error('Variant generation failed')
  }

  const json = await res.json() as { choices: Array<{ message: { content: string } }> }
  const raw = json.choices?.[0]?.message?.content?.trim()

  if (!raw) throw new Error('Empty variant generation response')

  const output: GenerateVariantOutput = {
    variant: raw,
    explanation: input.variantDescription,
  }

  // Für text/color: raw IST die Variante
  // Für css: raw sind die CSS-Regeln
  if (input.type === 'css' || input.type === 'layout') {
    output.variant_css = raw
  }
  if (input.type === 'layout') {
    output.variant_html = undefined // Layout-Änderungen brauchen i.d.R. kein neues HTML
  }

  return output
}
```

---

#### 4.3.3 `lib/agentTools.ts` (NEU)

**Aufgabe:** Die 4 Tools, die der Agent verwenden kann. Als AI-SDK-Tool-Objekte definiert.

```typescript
import { tool } from 'ai'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { BLOCKED_HOSTS, BLOCKED_HOSTNAMES } from '@/lib/ssrf'
import { safeError } from '@/lib/safeLog'
import { stripForCRO, extractStructure, analyzePage, type CROSuggestion } from '@/lib/croAnalyze'
import { generateVariantText } from '@/lib/generateVariantText'

// ─── Tool 1: fetchSite ───

export const fetchSiteTool = tool({
  description: 'Fetched und parsed die HTML-Struktur einer Landingpage. Gibt bereinigtes HTML und extrahierte Struktur (Headlines, CTAs, Links) zurück.',
  parameters: z.object({
    url: z.string().url().describe('Die vollständige URL der Landingpage (mit https://)'),
  }),
  execute: async ({ url }) => {
    // SSRF-Check (aus lib/ssrf.ts)
    const hostname = new URL(url).hostname
    if (BLOCKED_HOSTS.test(hostname) || BLOCKED_HOSTNAMES.includes(hostname)) {
      throw new Error(`Blocked host: ${hostname}`)
    }

    // Nur http/https erlauben
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('Only http/https URLs allowed')
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'variante-cro-agent/1.0 (+https://www.getvariante.com)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      })
      clearTimeout(timeout)

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)

      const html = await res.text()
      const structure = extractStructure(html)
      const stripped = stripForCRO(html)

      return {
        html: stripped,
        structure,
        title: structure.match(/Title: "([^"]+)"/)?.[1] ?? '',
        url,
        success: true,
      }
    } catch (err) {
      clearTimeout(timeout)
      safeError('agent-fetchSite', err)
      throw new Error(`Failed to fetch ${url}: ${err instanceof Error ? err.message : 'unknown error'}`)
    }
  },
})

// ─── Tool 2: analyzeCRO ───

export const analyzeCROTool = tool({
  description: 'Analysiert eine Landingpage nach CRO-Kriterien und gibt 3-4 konkrete A/B-Test-Vorschläge mit erwartetem Uplift zurück.',
  parameters: z.object({
    html: z.string().describe('Das bereinigte HTML der Seite (von fetchSite)'),
    structure: z.string().describe('Die extrahierte Struktur (von fetchSite)'),
    pageGoal: z.enum(['signups', 'purchases', 'engagement']).default('signups').describe('Das Conversion-Ziel der Seite'),
    industry: z.string().optional().describe('Optional: Die Branche (saas, ecommerce, agency, etc.)'),
  }),
  execute: async ({ html, structure, pageGoal, industry }) => {
    const suggestions = await analyzePage(html, structure, { pageGoal, industry })

    if (!suggestions.length) {
      throw new Error('No CRO suggestions generated')
    }

    return {
      suggestions,
      count: suggestions.length,
      pageGoal,
      industry: industry ?? 'unknown',
    }
  },
})

// ─── Tool 3: generateVariant ───

export const generateVariantTool = tool({
  description: 'Generiert eine konkrete Test-Variante (Text, Farbe, CSS oder Layout) basierend auf einem CRO-Vorschlag.',
  parameters: z.object({
    element: z.string().describe('Beschreibung des zu ändernden Elements'),
    original: z.string().describe('Der aktuelle Zustand (Text, Farbe, etc.)'),
    description: z.string().describe('Was geändert werden soll'),
    type: z.enum(['text', 'color', 'css', 'layout']).describe('Art der Änderung'),
    pageContext: z.string().optional().describe('Optional: HTML-Kontext um das Element'),
  }),
  execute: async ({ element, original, description, type, pageContext }) => {
    try {
      const result = await generateVariantText({
        element,
        original,
        variantDescription: description,
        type,
        pageContext,
      })

      return {
        ...result,
        success: true,
      }
    } catch (err) {
      safeError('agent-generateVariant', err)
      return {
        variant: `[Generation failed: ${err instanceof Error ? err.message : 'unknown'}]`,
        explanation: description,
        success: false,
      }
    }
  },
})

// ─── Tool 4: createTest ───

export const createTestTool = tool({
  description: 'Erstellt einen A/B-Test in variante. Validiert Domain-Gate und Plan-Limits.',
  parameters: z.object({
    name: z.string().max(256).describe('Name des Tests'),
    site_url: z.string().describe('URL der Landingpage'),
    selector: z.string().optional().describe('CSS-Selector des zu testenden Elements'),
    goal: z.string().optional().describe('Conversion-Ziel (z.B. "button-click", "form-submit")'),
    variant_html: z.string().optional().describe('HTML der Variante B'),
    variant_css: z.string().optional().describe('CSS der Variante B'),
    user_id: z.string().uuid().describe('UUID des Users'),
  }),
  execute: async ({ name, site_url, selector, goal, variant_html, variant_css, user_id }) => {
    // ─── Domain-Gate (kopiert aus tests/route.ts) ───
    const { data: verifiedDomains } = await supabase
      .from('domains')
      .select('url')
      .eq('user_id', user_id)
      .eq('verified', true)
      .limit(1)

    const primaryDomain = verifiedDomains?.[0]?.url
    if (!primaryDomain) {
      throw new Error('No verified domain. User must verify their website first.')
    }

    let testHost = site_url.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split('?')[0]
    testHost = testHost.replace(/^www\./, '')
    let domainHost = primaryDomain.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '')

    if (testHost !== domainHost) {
      throw new Error(`site_url must match verified domain (${domainHost}). Got: ${testHost}`)
    }

    // ─── Free-Gating ───
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('user_id', user_id)
      .single()

    if (profile?.plan === 'free') {
      const { count } = await supabase
        .from('tests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user_id)
        .neq('status', 'done')
      if ((count ?? 0) >= 1) {
        throw new Error('Free plan allows only 1 active test. Upgrade to Pro.')
      }
    }

    // ─── Insert Test ───
    const { data, error } = await supabase
      .from('tests')
      .insert({
        name,
        site_url,
        selector: selector ?? null,
        goal: goal ?? null,
        variant_html: variant_html ?? null,
        variant_css: variant_css ?? null,
        user_id,
        // Kein traffic_split, min_visitors, min_uplift → Defaults
      })
      .select('id, snippet_key')
      .single()

    if (error || !data) {
      safeError('agent-createTest', error)
      throw new Error('Failed to create test in database')
    }

    // ─── Log Event ───
    await supabase.rpc('log_event', {
      p_test_id: data.id,
      p_user_id: user_id,
      p_type: 'created',
      p_message: `[Agent] Test "${name}" created`,
    })

    // ─── Track Cost ───
    const costPerTest = 0.005 // $0.005 pro Agent-erstelltem Test
    await supabase.rpc('increment_gen_cost', {
      p_user_id: user_id,
      p_amount: costPerTest,
    })

    return {
      id: data.id,
      snippet_key: data.snippet_key,
      name,
      success: true,
    }
  },
})

// ─── Alle Tools als Record ───

export const agentTools = {
  fetchSite: fetchSiteTool,
  analyzeCRO: analyzeCROTool,
  generateVariant: generateVariantTool,
  createTest: createTestTool,
}
```

---

#### 4.3.4 `app/api/agent/route.ts` (NEU)

**Aufgabe:** Der API-Endpunkt, der `streamText()` mit den Tools aufruft. Authentifizierung, Cost-Tracking, Error-Handling.

```typescript
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized, paymentRequired } from '@/lib/auth'
import { safeError } from '@/lib/safeLog'
import { agentTools } from '@/lib/agentTools'
import { supabase } from '@/lib/supabase'

export const maxDuration = 120 // Agent kann länger laufen als normale API-Calls

export async function OPTIONS() {
  return preflight('POST, OPTIONS')
}

const AGENT_SYSTEM_PROMPT = `Du bist ein autonomer CRO-Agent für variante, ein A/B-Testing-Tool für Landingpages.
Deine Aufgabe: Analysiere die Landingpage eines Nutzers, finde die 3 wirkungsvollsten
Optimierungsmöglichkeiten, generiere konkrete Varianten und erstelle A/B-Tests.

ABLAUF (immer in dieser Reihenfolge):
1. **fetchSite(url)** — Hole und parse die Landingpage
2. **analyzeCRO(html, structure, pageGoal)** — Identifiziere die Top-3-Optimierungen
3. **generateVariant(element, original, description, type)** — Generiere eine Variante pro Vorschlag
4. **createTest(name, site_url, selector, goal, variant_html, variant_css, user_id)** — Lege den Test an

REGELN:
- Immer ALLE 4 Schritte ausführen. Kein Schritt darf übersprungen werden.
- Maximal 3 Tests pro Run. Wenn analyzeCRO mehr als 3 Vorschläge liefert, nimm die Top 3.
- Bei generateVariant-Fehlern: Überspringe diesen Vorschlag und mache mit dem nächsten weiter. Nicht alles abbrechen.
- createTest NUR aufrufen, wenn generateVariant erfolgreich war.
- Am Ende: Gib eine strukturierte Zusammenfassung:
  "✅ **{N} Tests erstellt:**
  1. **{Test-Name}** — {Element} ({Typ})
  2. **{Test-Name}** — {Element} ({Typ})
  ...
  ❌ **{M} Vorschläge übersprungen:** {Grund}"

KOMMUNIKATION:
- Sprich Deutsch mit dem User.
- Gib zwischen den Schritten kurze Status-Updates (z.B. "Analysiere landingpage.com...", "3 Optimierungen gefunden, generiere Varianten...").
- Sei präzise, kein Marketing-Blabla.
- Wenn ein Test erfolgreich angelegt wurde, nenne den Test-Namen und was getestet wird.

KOSTEN:
- Jeder Run kostet ca. $0.015–0.03 (GPT-4o-mini).
- Sei effizient mit deinen Tool-Calls — max 10 Steps insgesamt.`

export async function POST(req: Request) {
  // ─── Auth ───
  const user = await getApiUser(req)
  if (!user) return unauthorized('POST, OPTIONS')

  // ─── Parse Body ───
  let domain: string
  let pageGoal: 'signups' | 'purchases' | 'engagement' = 'signups'
  try {
    const body = await req.json()
    domain = body.domain
    if (body.pageGoal) pageGoal = body.pageGoal
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  if (!domain) {
    return Response.json({ error: 'domain is required' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  // ─── Domain normalisieren ───
  let url = domain.trim()
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }

  // ─── Cost-Check ───
  const { data: costData } = await supabase
    .rpc('get_monthly_gen_cost', { p_user_id: user.userId })
    .single()
  const monthlyCost = Number(costData?.monthly_cost ?? 0)
  const maxMonthlyCost = Number(process.env.OPENAI_MAX_MONTHLY_COST) || 20

  if (monthlyCost >= maxMonthlyCost) {
    return Response.json(
      { error: 'Monthly AI cost limit reached. Please try again next month.' },
      { status: 429, headers: corsHeaders('POST, OPTIONS') }
    )
  }

  // ─── Agent Run ───
  try {
    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: AGENT_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analysiere ${url} und erstelle A/B-Tests. Conversion-Ziel: ${pageGoal}. User-ID: ${user.userId}.`,
        },
      ],
      tools: agentTools,
      maxSteps: 10,        // Max 10 Tool-Calls pro Run
      temperature: 0.7,
      onFinish: async ({ text, toolCalls, toolResults, finishReason }) => {
        // Persist in agent_runs
        const testIds = toolResults
          ?.filter(tr => tr.toolName === 'createTest' && tr.result?.success)
          .map(tr => (tr.result as { id: string })?.id)
          .filter(Boolean) ?? []

        await supabase.from('agent_runs').insert({
          user_id: user.userId,
          domain: url,
          page_goal: pageGoal,
          suggestions_json: toolResults
            ?.filter(tr => tr.toolName === 'analyzeCRO')
            .map(tr => tr.result) ?? [],
          tests_created: testIds.length > 0 ? testIds : null,
          tool_calls_count: toolCalls?.length ?? 0,
          finish_reason: finishReason,
        }).select('id').single().catch(err => safeError('agent-run-persist', err))
      },
    })

    return result.toDataStreamResponse({
      headers: corsHeaders('POST, OPTIONS'),
    })
  } catch (err) {
    safeError('agent-stream', err)
    return Response.json(
      { error: 'Agent execution failed' },
      { status: 500, headers: corsHeaders('POST, OPTIONS') }
    )
  }
}
```

---

#### 4.3.5 `app/dashboard/components/AgentPanel.tsx` (NEU)

**Aufgabe:** Die Client-Komponente, die `useChat()` von `@ai-sdk/react` nutzt, um den Agent-Stream live anzuzeigen.

```typescript
'use client'

import { useChat } from '@ai-sdk/react'
import { Sparkles, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface AgentPanelProps {
  domain: string
  plan: string
}

export function AgentPanel({ domain, plan }: AgentPanelProps) {
  const [expanded, setExpanded] = useState(false)

  const { messages, sendMessage, isLoading, error, setMessages } = useChat({
    api: '/api/agent',
    onError: (err) => {
      console.error('Agent error:', err)
    },
  })

  const handleRun = () => {
    setMessages([]) // Clear previous run
    sendMessage({ domain, pageGoal: 'signups' })
  }

  const lastMessage = messages[messages.length - 1]
  const isDone = lastMessage && !isLoading

  // ─── Pro-Gate ───
  if (plan !== 'pro') {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-medium text-zinc-200">Automatische Optimierung</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">Pro</span>
        </div>
        <p className="text-sm text-zinc-400 mb-4">
          Lass unsere KI deine Seite analysieren und automatisch A/B-Tests erstellen.
        </p>
        <div className="relative">
          <div className="blur-sm select-none pointer-events-none">
            <div className="text-xs text-zinc-500 space-y-1">
              <p>🔍 Analysiere {domain}...</p>
              <p>✅ 3 Optimierungen gefunden</p>
              <p>🧪 Generiere Varianten...</p>
              <p>📊 Test #1: CTA-Text-Optimierung ✓</p>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <a
              href="/dashboard?upgrade=1"
              className="px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
            >
              Upgrade auf Pro
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ─── Pro-UI ───
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-zinc-900/70 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-medium text-zinc-200">Automatische Optimierung</h3>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        )}
      </button>

      {expanded && (
        <div className="px-6 pb-6 space-y-4">
          {/* Run Button */}
          {!isLoading && messages.length === 0 && (
            <div>
              <p className="text-sm text-zinc-400 mb-4">
                Unsere KI analysiert deine Seite, findet Optimierungspotential und erstellt automatisch A/B-Tests — alles in einem Durchlauf.
              </p>
              <button
                onClick={handleRun}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                {domain} analysieren
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-purple-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analysiere {domain}...
            </div>
          )}

          {/* Messages Stream */}
          {messages.map((msg, i) => (
            <div
              key={msg.id}
              className={`text-sm leading-relaxed ${
                i === messages.length - 1 ? 'text-zinc-200' : 'text-zinc-500'
              }`}
            >
              {/* Parse markdown-like content for basic formatting */}
              <div
                className="prose prose-invert prose-sm max-w-none [&_strong]:text-zinc-200 [&_code]:text-purple-300"
                dangerouslySetInnerHTML={{
                  __html: msg.content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/`(.*?)`/g, '<code>$1</code>')
                    .replace(/\n/g, '<br/>')
                }}
              />
            </div>
          ))}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <XCircle className="w-4 h-4" />
              {error.message || 'Fehler bei der Analyse'}
            </div>
          )}

          {/* Done State */}
          {isDone && messages.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                Analyse abgeschlossen
              </div>
              <button
                onClick={handleRun}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-zinc-700 hover:border-zinc-600 text-zinc-300 rounded-lg transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Erneut analysieren
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

---

#### 4.3.6 `app/dashboard/DashboardClient.tsx` (MODIFIED)

**Änderung:** `AgentPanel` zwischen den Metric-Cards und `WhatToTestNext` einbauen.

```tsx
// Import hinzufügen:
import { AgentPanel } from './components/AgentPanel'

// Im JSX, nach den Metric-Cards und VOR WhatToTestNext:
{primaryDomain && (
  <AgentPanel domain={primaryDomain} plan={plan} />
)}
```

**Position im Layout:**
```
Metric Cards (Visitors, Conversions, Rate)
  ↓
AgentPanel ("Automatische Optimierung")  ← NEU
  ↓
WhatToTestNext
  ↓
Test-Grid
```

---

#### 4.3.7 `db/migrations/018_agent_runs.sql` (NEU)

```sql
-- Migration 018: Agent Runs & Site Insights
-- Baut auf dem self-improving-site-engine-Konzept auf.

-- Tabelle für Agent-Durchläufe (Audit + Cost-Tracking)
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  domain TEXT NOT NULL,
  page_goal TEXT DEFAULT 'signups',
  suggestions_json JSONB,     -- Array von CRO-Vorschlägen
  tests_created UUID[],       -- Array von test-ids
  tool_calls_count INTEGER DEFAULT 0,
  cost_estimate NUMERIC(10, 6) DEFAULT 0.0,  -- in USD
  finish_reason TEXT,         -- 'stop', 'tool-calls', 'error'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_runs_user ON agent_runs(user_id, created_at DESC);

-- Tabelle für akkumulierte Site-Insights (Learning Loop v3)
CREATE TABLE IF NOT EXISTS site_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  domain TEXT NOT NULL,
  page_url TEXT NOT NULL,
  page_goal TEXT,
  detected_industry TEXT,

  -- Analyse-Ergebnisse
  analysis_json JSONB,        -- Vollständige Heuristik + AI-Analyse
  top_opportunities JSONB,    -- Top 3 Vorschläge mit Rationale
  analyzed_at TIMESTAMPTZ DEFAULT now(),

  -- Feedback aus abgeschlossenen Tests
  test_results_json JSONB,    -- Ergebnisse der Tests, die hier vorgeschlagen wurden
  effective_uplift NUMERIC(5,2),  -- Aggregierter Uplift aus umgesetzten Vorschlägen

  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, domain, page_url)
);

CREATE INDEX idx_site_insights_user ON site_insights(user_id, domain);

-- RLS: User sehen nur eigene Agent-Runs
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own agent runs" ON agent_runs
  FOR SELECT USING (user_id = (SELECT get_user_id()));

-- RLS: User sehen nur eigene Insights
ALTER TABLE site_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own insights" ON site_insights
  FOR SELECT USING (user_id = (SELECT get_user_id()));
```

---

#### 4.3.8 `app/api/suggestions/route.ts` (REFACTOR)

**Änderung:** Extrahiere `stripForCRO()`, `extractStructure()`, `SYSTEM_PROMPT`, `FEW_SHOT` nach `lib/croAnalyze.ts`. Importiere sie von dort.

Konkret:
1. Verschiebe die Funktionen `stripForCRO` und `extractStructure` nach `lib/croAnalyze.ts`
2. Verschiebe `SYSTEM_PROMPT` nach `lib/croAnalyze.ts` als `CRO_SYSTEM_PROMPT`
3. Verschiebe `FEW_SHOT` nach `lib/croAnalyze.ts` als `FEW_SHOT_EXAMPLE`
4. In `suggestions/route.ts`: Importiere alle 4 aus `@/lib/croAnalyze`
5. Der POST-Handler bleibt identisch, nutzt nur jetzt die extrahierten Funktionen

---

### 4.4 Agent System Prompt (vollständig)

Der Prompt wird in `route.ts` als Konstante definiert. Hier die finale Version:

```
Du bist ein autonomer CRO-Agent für variante, ein A/B-Testing-Tool für Landingpages.
Deine Aufgabe: Analysiere die Landingpage eines Nutzers, finde die 3 wirkungsvollsten
Optimierungsmöglichkeiten, generiere konkrete Varianten und erstelle A/B-Tests.

ABLAUF (immer in dieser Reihenfolge):
1. **fetchSite(url)** — Hole und parse die Landingpage
2. **analyzeCRO(html, structure, pageGoal)** — Identifiziere die Top-3-Optimierungen
3. **generateVariant(element, original, description, type)** — Generiere eine Variante pro Vorschlag
4. **createTest(name, site_url, selector, goal, variant_html, variant_css, user_id)** — Lege den Test an

REGELN:
- Immer ALLE 4 Schritte ausführen. Kein Schritt darf übersprungen werden.
- Maximal 3 Tests pro Run. Wenn analyzeCRO mehr als 3 Vorschläge liefert, nimm die Top 3.
- Bei generateVariant-Fehlern: Überspringe diesen Vorschlag und mache mit dem nächsten weiter. Nicht alles abbrechen.
- createTest NUR aufrufen, wenn generateVariant erfolgreich war.
- Am Ende: Gib eine strukturierte Zusammenfassung:
  "✅ **{N} Tests erstellt:**
  1. **{Test-Name}** — {Element} ({Typ})
  2. **{Test-Name}** — {Element} ({Typ})
  ...
  ❌ **{M} Vorschläge übersprungen:** {Grund}"

KOMMUNIKATION:
- Sprich Deutsch mit dem User.
- Gib zwischen den Schritten kurze Status-Updates.
- Sei präzise, kein Marketing-Blabla.
- Wenn ein Test erfolgreich angelegt wurde, nenne den Test-Namen und was getestet wird.

KOSTEN:
- Jeder Run kostet ca. $0.015–0.03 (GPT-4o-mini).
- Sei effizient mit deinen Tool-Calls — max 10 Steps insgesamt.
```

---

## 5. Ansatz A — Pipeline-Fallback (nur wenn B scheitert)

### 5.1 Wann zu A wechseln

- `ai`-Package lässt sich nicht installieren (Next.js 16-Kompatibilität)
- `streamText()` wirft Runtime-Errors auf Vercel Edge
- `useChat()`-Hook verursacht Hydration-Mismatches
- Zeitdruck: brauchst was in 1 Tag statt 3–5

### 5.2 Architektur

```typescript
// app/api/agent/route.ts (Pipeline-Variante)
export async function POST(req: Request) {
  const user = await getApiUser(req)
  if (!user) return unauthorized('POST, OPTIONS')

  const { domain, pageGoal = 'signups' } = await req.json()
  const url = normalizeUrl(domain)

  // Schritt 1: Fetch
  const html = await fetchPageSafe(url)
  const structure = extractStructure(html)
  const stripped = stripForCRO(html)

  // Schritt 2: Analyze
  const suggestions = await analyzePage(stripped, structure, { pageGoal })

  // Schritt 3: Generate + Create (sequentiell)
  const results: AgentTestResult[] = []
  for (const suggestion of suggestions.slice(0, 3)) {
    try {
      const variant = await generateVariantText({
        element: suggestion.element,
        original: suggestion.original,
        variantDescription: suggestion.variant,
        type: suggestion.type,
      })
      const test = await createTestInternal({
        name: `[AI] ${suggestion.element}`,
        site_url: url,
        selector: suggestion.selector,
        goal: pageGoal,
        variant_html: variant.variant_html,
        variant_css: variant.variant_css,
        user_id: user.userId,
      })
      results.push({ test, suggestion, status: 'created' })
    } catch (err) {
      results.push({ suggestion, status: 'failed', error: String(err) })
    }
  }

  // Schritt 4: Summary
  return Response.json({
    tests_created: results.filter(r => r.status === 'created').length,
    tests_failed: results.filter(r => r.status === 'failed').length,
    results,
  }, { headers: corsHeaders('POST, OPTIONS') })
}
```

Kein Streaming. Kein `useChat()`. Einfacher `fetch()` + Spinner im Frontend.

---

## 6. Implementierungs-Reihenfolge

### Phase 1: Foundation (Tag 1)

1. **Packages installieren:**
   ```bash
   cd ab-tool && npm install ai @ai-sdk/openai zod
   ```

2. **`lib/croAnalyze.ts` extrahieren:**
   - `stripForCRO()`, `extractStructure()` aus `suggestions/route.ts` verschieben
   - `CRO_SYSTEM_PROMPT` + `FEW_SHOT_EXAMPLE` exportieren
   - `analyzePage()`-Wrapper bauen
   - `suggestions/route.ts` refactoren → importiert aus `lib/croAnalyze.ts`

3. **`db/migrations/018_agent_runs.sql` anlegen und ausführen:**
   ```bash
   # Manuell in Supabase SQL Editor, oder via CLI
   supabase db push
   ```

### Phase 2: Core (Tag 2–3)

4. **`lib/generateVariantText.ts` bauen** — mit Unit-Test manuell prüfen:
   ```bash
   # Quick smoke test
   node -e "require('./lib/generateVariantText').generateVariantText({...})"
   ```

5. **`lib/agentTools.ts` bauen** — alle 4 Tools implementieren:
   - `fetchSiteTool` — SSRF, Timeout, HTML-Parse
   - `analyzeCROTool` — Delegiert an `analyzePage()`
   - `generateVariantTool` — Delegiert an `generateVariantText()`
   - `createTestTool` — Domain-Gate, Free-Gating, Insert

6. **`app/api/agent/route.ts` bauen:**
   - Auth, Cost-Check, `streamText()` mit Tools
   - `onFinish` persistiert in `agent_runs`
   - Error-Handling: 429 (Cost-Limit), 401 (Auth), 500 (Stream-Error)

### Phase 3: UI (Tag 4)

7. **`app/dashboard/components/AgentPanel.tsx` bauen:**
   - `useChat()` von `@ai-sdk/react`
   - 3 Zustände: Idle, Streaming, Done
   - Paywall für Free-User (Blur + Upgrade-Button)
   - Expand/Collapse mit Chevron

8. **`app/dashboard/DashboardClient.tsx` modifizieren:**
   - `AgentPanel` importieren und einbauen
   - Position: nach Metric-Cards, vor `WhatToTestNext`

### Phase 4: Test & Polish (Tag 5)

9. **Manueller End-to-End-Test:**
   - Pro-User anlegen (lokal)
   - Agent über Dashboard triggern
   - Prüfen: Werden Tests in DB angelegt?
   - Prüfen: Streaming funktioniert?
   - Prüfen: Kosten werden getrackt?

10. **Edge Cases fixen:**
    - Leere Seite (keine CTAs, keine Headlines)
    - 404-Seite
    - Weiterleitung (redirect)
    - Sehr große Seite (>500KB HTML)
    - JS-rendered Seite (SPA) → Agent soll graceful failen

11. **Styling-Finish:**
    - Dark Mode (das ist der Default in variante)
    - Mobile: AgentPanel nimmt volle Breite
    - Animationen: `animate-spin` für Loading, `transition-all` für Expand

---

## 7. Edge Cases & Error-Handling

| Fall | Verhalten |
|---|---|
| **Seite nicht erreichbar** | `fetchSite` wirft Error → Agent meldet "Konnte Seite nicht laden: [Grund]" → kein Test erstellt |
| **Seite hat keine CTAs/Headlines** | `analyzeCRO` findet 0 Vorschläge → Agent meldet "Keine optimierbaren Elemente gefunden" → kein Test |
| **Seite ist SPA (JS-rendered)** | `fetchSite` bekommt leeres `<body>` → structure bleibt leer → `analyzeCRO` kriegt nur Meta-Daten → weniger Vorschläge |
| **Free-User hat schon 1 Test** | `createTest` wirft "Free plan limit" → Agent überspringt diesen Vorschlag, macht mit nächstem weiter |
| **Domain nicht verified** | `createTest` wirft "No verified domain" → Alle createTest-Calls failen → Agent meldet "Keine verified Domain" |
| **OpenAI-Rate-Limit** | `analyzeCRO`/`generateVariant` wirft 429 → Agent gibt auf, meldet Fehler |
| **Monthly-Cost-Limit erreicht** | API-Route returned 429 BEVOR Agent startet → UI zeigt "Monatliches Limit erreicht" |
| **Stream bricht ab** | `useChat().onError` fängt es → UI zeigt Fehler mit Retry-Button |
| **OpenAI gibt ungültiges JSON** | `analyzePage()` hat Fallback-Parsing → retry mit `response_format: json_object` |
| **User-ID passt nicht** | `createTest` prüft Domain-Gate → Fehler wenn User-ID keine verified Domain hat |

---

## 8. Testing-Strategie

### 8.1 Unit-Tests (Node, kein Browser nötig)

```javascript
// __tests__/agent-tools.mjs
// Testet fetchSite, analyzeCRO, generateVariant isoliert

test('fetchSite blocks internal IPs', async () => {
  await expect(fetchSite('http://127.0.0.1/admin')).rejects.toThrow('Blocked')
  await expect(fetchSite('http://192.168.1.1')).rejects.toThrow('Blocked')
})

test('fetchSite strips scripts and styles', async () => {
  const result = await fetchSite('https://example.com')
  expect(result.html).not.toContain('<script>')
  expect(result.html).not.toContain('<style>')
})

test('analyzeCRO returns 3-4 suggestions', async () => {
  const result = await analyzeCRO(testHtml, testStructure)
  expect(result.suggestions.length).toBeGreaterThanOrEqual(3)
  expect(result.suggestions.length).toBeLessThanOrEqual(4)
})

test('generateVariant text type returns string', async () => {
  const result = await generateVariantText({
    element: 'CTA-Button',
    original: 'Get Started',
    variantDescription: 'Add no credit card reassurance',
    type: 'text',
  })
  expect(typeof result.variant).toBe('string')
  expect(result.variant.length).toBeGreaterThan(0)
})
```

### 8.2 Integration-Test (Playwright)

```typescript
// __tests__/e2e/agent.spec.ts
test('@agent Pro user can trigger agent run', async ({ page }) => {
  // Login als Pro-User
  // Navigiere zu Dashboard
  // Klicke "Automatische Optimierung" → Expand
  // Klicke "analysieren"
  // Warte auf Streaming-Output
  // Prüfe: "Tests erstellt" erscheint
  // Prüfe: Tests erscheinen in Test-Grid
})

test('@agent Free user sees paywall', async ({ page }) => {
  // Login als Free-User
  // Prüfe: Blur + "Upgrade auf Pro"-Button sichtbar
  // Prüfe: Kein Run-Button sichtbar
})
```

---

## 9. Rollout-Plan

1. **Dev:** `POST /api/agent` mit `NODE_ENV=development` testen
2. **Staging:** Vercel Preview Deploy → Agent-Panel manuell durchklicken
3. **Production:** Feature-Flag `ENABLE_AGENT` env var → erst für 1 Pro-User aktivieren
4. **Monitoring:** `agent_runs`-Tabelle auf Fehler prüfen, OpenAI-Kosten tracken
5. **Full Rollout:** Nach 1 Woche ohne Fehler → Flag entfernen, für alle Pro-User

---

## 10. Nächste Iterationen (NICHT in diesem Prompt bauen)

- **v2: Learning Loop** — `site_insights` befüllen, abgeschlossene Testergebnisse in Prompt einspeisen
- **v2: Selector-Extraction** — `analyzeCRO` extrahiert CSS-Selector aus HTML (nicht nur Text-Beschreibung)
- **v2: Scheduled Scans** — Cron-Job, der alle 7 Tage automatisch re-analysiert
- **v3: Visual Agent** — Playwright-Screenshot → GPT-4o Vision für visuelle Analyse (Farbkontraste, Whitespace)
- **v3: Auto-Winner-Apply** — Wenn Winner detected → Agent schlägt vor, Variante fest zu übernehmen

---

## Checkliste für die Implementierung

- [ ] `npm install ai @ai-sdk/openai zod`
- [ ] `lib/croAnalyze.ts` extrahiert & `suggestions/route.ts` refactored
- [ ] `lib/generateVariantText.ts` erstellt & manuell getestet
- [ ] `lib/agentTools.ts` mit allen 4 Tools
- [ ] `app/api/agent/route.ts` mit Auth, Cost-Check, `streamText()`
- [ ] `db/migrations/018_agent_runs.sql` ausgeführt
- [ ] `AgentPanel.tsx` mit `useChat()`, Paywall, Expand/Collapse
- [ ] `DashboardClient.tsx` um `AgentPanel` erweitert
- [ ] Manueller E2E-Test: Pro-User → Agent → Tests in DB
- [ ] Free-User-Paywall visuell geprüft
- [ ] Edge Cases getestet (SPA, 404, leere Seite)
- [ ] `git commit` + `git push`
- [ ] `PROJEKT.md` §8: Eintrag hinzugefügt
