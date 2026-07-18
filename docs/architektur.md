# Architektur & Roadmap

> Dashboard-Architektur, Produkt-Ebenen, New-Test-Flow, Meilensteine, Nordstern, Leitplanken.

## Produkt-Ebenen

| Ebene | Ort | Zweck |
|---|---|---|
| **Health** | `/dashboard/health` | Health-Check: Snippet, Figma Plugin — permanenter Check, kein One-Time-Gate. |
| **Dashboard** | `/dashboard` | Täglicher Arbeitsplatz: Tests verwalten, Results checken, Billing. **Test-Erstellung hier** (TestCreationPanel). |
| **Creation** | Web (Dashboard) | 4-Step Wizard: Scan → Variant → Goal → Create. AI-generierte Varianten mit urlbox-Screenshot-Preview. |
| **Figma Plugin** | Figma | Referenz-Picker (Element-Selektor für `?ab_pick=`) + Akquise-Kanal. Keine Variant-Erstellung mehr. |

## "New test"-Flow

```
User klickt [+ New test]
         │
         └─ TestCreationPanel öffnet (4 Steps)
              Step 1: URL scannen → AI CRO-Vorschläge
              Step 2: Element wählen → Variante generieren → Preview (urlbox)
              Step 3: Conversion-Goal definieren
              Step 4: Review → Test erstellen
```

**AI-Limits pro Plan** (in `planLimits.ts`):

| Plan | AI Scans/Monat | Variant-Generierungen/Monat | Agent-Runs/Monat | OpenAI-Budget/Monat |
|---|---|---|---|---|
| Free | 1 | 1 | 0 | $5 |
| Pro | 50 | 50 | 20 | $25 |
| Agency | ∞ | ∞ | ∞ | $100 |

## Meilensteine

1. ~~**M1: Fremd-Site-Test**~~ ✅
2. ~~**M2: Store-Freigaben**~~ 🎉 — Figma-Plugin LIVE. Design-Partner-Onboarding (1/5 angefragt).
3. **M3: Product Hunt Launch** — Demo-GIF + Case-Studies.
4. **M4: Erster Pro-Kunde** (Ziel: September) — Checkout → Webhook → Badge-aus.
5. **M5: Self-Improving Site Engine v1** (Ziel: nach 3 Design-Partnern) — Rule-Based Site-Analyse mit Top-3-Chancen.

## Nordstern

- **Distribution > Produkt.** Figma Community = Burggraben.
- **Badge = Wachstumsmotor.** Viral > bezahlt.
- **Plugin = Creation, Web = Analysis.** Keine Results ins Plugin.
- **Self-Improving Site Engine = Moat.** Kein anderes A/B-Tool analysiert deine Site und sagt dir, was du als nächstes testen sollst — geschweige denn, dass es aus deinen Ergebnissen lernt.
- **Keine Features ohne Revenue-Signal.**

## Vision: ab.js → Auto-Scan → 1-Klick

1. **ab.js installieren** — DomainGate führt durch Snippet-Installation + Verify
2. **Auto-Scan** — Sobald ab.js lebt, scannt variante die Site automatisch
3. **1-Klick "Optimize my site"** — CRO-Agent analysiert, generiert 3 Varianten, legt A/B-Tests an

**Onboarding-Wahl:** Nach Domain-Verifikation zwei Pfade:
- 🎨 **Start with Figma** — Designer-native: Plugin installieren, Varianten in Figma bauen, syncen
- 🤖 **Start with Auto-Optimize** — AI-native: Site-Scan, automatische Varianten, Tests in 30s live

## Anti-Roadmap

| Nicht bauen | Warum |
|---|---|
| Agency-Tier | Kein Revenue-Signal |
| Mehrere Metriken parallel | 6–10h, alle Schichten |
| A/B-Editor im Web | Creation = Plugin |
| Analytics-Dashboard | Fokus auf A/B-Testing |
| ⬇️ Self-Improving Site Engine | **Ausnahme — bauen wir.** Start v1 sofort nach ersten 3 Design-Partnern. |

## Technische Leitplanken

- **Monolith** (`ab-tool/`). Kein Microservice-Split bis >1000 Tests/Tag.
- **Eine Produktions-URL** (`www.getvariante.com`). Kein Staging bis >10 Kunden.
- **Supabase + Upstash Redis.** Kein Kafka, TimescaleDB. Redis nur für Rate-Limiting (Free Tier).
- **ab.js bleibt Vanilla JS.** Kein npm, kein Build. Das ist der USP.

## Pattern-Katalog

> Verbindliche Code-Patterns für KI-Agenten. Jedes Pattern ist ein Template, keine Option.

### 1. API-Route

```ts
// Imports (in dieser Reihenfolge)
import { supabase } from '@/lib/supabase'
import { corsHeaders, preflight } from '@/lib/cors'
import { getApiUser, unauthorized, paymentRequired } from '@/lib/auth'
import { checkRateLimit, getClientIp, loadtestBypass } from '@/lib/rateLimit'
import { safeError } from '@/lib/safeLog'
import { NextRequest, NextResponse } from 'next/server'  // nur wenn NextRequest-Features nötig

// OPTIONS-Handler — IMMER
export async function OPTIONS() {
  return preflight('GET, POST, OPTIONS')
}

// Handler
export async function POST(req: Request) {
  // 1. Auth
  const user = await getApiUser(req)
  if (!user) return unauthorized('POST, OPTIONS')

  // 2. Rate-Limit
  const ip = getClientIp(req)
  if (!loadtestBypass(req) && !await checkRateLimit(`key:${ip}`, 30, 60_000)) {
    return Response.json({ error: 'too many requests' }, { status: 429, headers: corsHeaders('POST, OPTIONS') })
  }

  // 3. Body parsen
  let body: { example?: string }
  try { body = await req.json() } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders('POST, OPTIONS') })
  }

  // 4. DB-Operation
  const { data, error } = await supabase.from('tests').select('*').eq('id', body.example).single()
  if (error) {
    safeError('context-label', error)
    return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders('POST, OPTIONS') })
  }

  // 5. Success — IMMER corsHeaders
  return Response.json({ data }, { headers: corsHeaders('POST, OPTIONS') })
}
```

**Regeln:**
- Jede Response braucht `corsHeaders('METHODS')`. Keine Ausnahme.
- Auth: `getApiUser(req)` → prüft Bearer → Cookie → X-Temp-Token in dieser Reihenfolge.
- Owner-Check: `.eq(ownerCol, user.userId)` bei jedem Query. `ownerCol = user.plan === 'temp' ? 'temp_session_id' : 'user_id'`.
- Fehler: `safeError('label', err)` loggen, generische Message zum Client.
- `maxDuration = 60` für langlaufende AI-Calls.

**Response-Shapes:**

| Status | Shape |
|---|---|
| 400 | `{ error: 'invalid json' }` |
| 401 | `{ error: 'unauthorized', hint: '...' }` |
| 402 | `{ error: 'plan_limit', message: '...', upgrade: true }` |
| 403 | `{ error: 'Blocked host' }` |
| 404 | `{ error: 'test not found' }` |
| 422 | `{ error: 'PII detected', message: '...', piiFields: [...] }` |
| 429 | `{ error: 'too many requests' }` |
| 500 | `{ error: 'db error' }` |
| 502 | `{ error: 'AI generation failed' }` |

### 2. Supabase-Migration

```sql
-- Migration 0XX — <einzeilige Zusammenfassung>
-- <Warum diese Migration existiert, welches Problem sie löst>
-- Idempotent. Ausführen im Supabase SQL-Editor:
--   https://supabase.com/dashboard/project/_/sql/new

-- ---------------------------------------------------------------------------
-- 1. <Sektions-Titel>
-- ---------------------------------------------------------------------------

create or replace function my_func(p_param uuid, p_amount numeric)
returns boolean
language plpgsql
set search_path = 'public'    -- IMMER setzen
as $$
declare
  v_var text;
begin
  -- Logik
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. <Sektions-Titel>
-- ---------------------------------------------------------------------------

drop policy if exists "policy_name" on my_table;
create policy "policy_name" on my_table
  for all
  using (false);
```

**Regeln:**
- Immer `set search_path = 'public'` auf allen Functions.
- Immer idempotent: `create or replace` oder `drop if exists` + `create`.
- Sektionen mit `-- 1.`, `-- 2.` nummeriert, Trennlinien mit `---`.
- `revoke execute` für Functions, die nur intern gebraucht werden.

### 3. Client Component

```tsx
'use client'   // Zeile 1, immer

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { LucideIcon } from 'lucide-react'
import { libFunction } from '@/lib/whatever'

// Typ-Export
export type SomeRow = { id: string; name: string }

// Pure Helpers (außerhalb Component)
function extractDomain(url: string | null): string | null { ... }

// Sub-Components (in gleicher Datei)
function SubThing({ prop }: { prop: string }) { ... }

// Haupt-Component
export function MyComponent({ row, onDelete }: {
  row: SomeRow
  onDelete?: (id: string) => void
}) {
  // State → Refs → Effects → Derived → Handlers
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // click-outside, etc.
  }, [])

  async function handleAction(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return               // Double-Submit-Schutz
    setBusy(true)
    try {
      const res = await fetch(`/api/thing/${row.id}`, { method: 'PATCH', ... })
      if (res.ok) { /* update state */ }
    } catch { /* silent */ }
    setBusy(false)
  }

  return ( ... )
}
```

**Regeln:**
- `'use client'` Zeile 1, keine Ausnahme.
- Props-Destructuring direkt in der Signatur, Typen inline (kein separates Interface außer wiederverwendet).
- Sub-Components in gleicher Datei co-located.
- `busy`-Flag als Double-Submit-Schutz vor jedem async-Handler.
- API-Calls via `fetch()` zu `/api/...`, silent catch.

### 4. Error Boundary

```tsx
'use client'

import Link from 'next/link'
import { RefreshCw, ArrowLeft } from 'lucide-react'

export default function Error({ error, reset }: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-0">
      <div className="text-center">
        <p className="text-6xl font-semibold text-text-3">500</p>
        <p className="mt-2 text-sm text-text-3">Something went wrong.</p>
        {error.digest && <p className="mt-1 text-[11px] text-text-3/60">Error ID: {error.digest}</p>}
        <div className="mt-6 flex items-center justify-center gap-2">
          <button onClick={reset}>Try again</button>
          <Link href="/">Back to home</Link>
        </div>
      </div>
    </div>
  )
}
```

**Regeln:**
- Nur Design-Tokens (`bg-bg-0`, `text-text-3`), kein rohes Hex.
- `error.digest` zeigen (Debugging).
- `reset()`-Button + Escape-Hatch (`<Link href="/">`).
- `global-error.tsx`: Inline-Styles, kein CSS-Import, kein Sentry-Client-Import.

### 5. Auth

```ts
// Immer diesen Flow:
const user = await getApiUser(req)  // prüft Bearer → Cookie → X-Temp-Token
if (!user) return unauthorized('METHODS')

// Plan-Gating:
if (user.plan === 'free') return paymentRequired('METHODS', 'Upgrade to Pro')

// Owner-Check:
const ownerCol = user.plan === 'temp' ? 'temp_session_id' : 'user_id'
const { data } = await supabase.from('tests').select('*').eq('id', id).eq(ownerCol, user.userId).single()
```

### 6. Typische Datei-Referenzen

| Aufgabe | Referenz-Datei |
|---|---|
| API-Route bauen | `app/api/generate/route.ts` |
| Auth-Prüfung | `lib/auth.ts` (`getApiUser`) |
| Plan-Limits | `lib/planLimits.ts` |
| Migration schreiben | `db/migrations/027_recreate_increment_gen_cost.sql` |
| Client Component bauen | `app/dashboard/components/TestCard.tsx` |
| Rate-Limiting | `lib/rateLimit.ts` |
| Fehler loggen | `lib/safeLog.ts` (`safeError`) |
| CRO-Analyse | `lib/croAnalyze.ts` |
| Variant-Generierung | `lib/generateVariantText.ts` |
| CORS | `lib/cors.ts` (`corsHeaders`, `preflight`) |
