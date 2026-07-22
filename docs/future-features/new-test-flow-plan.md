# Multi-Agent-Plan: New Test Flow

> Stand: 22.07.2026 · Status: **Umgesetzt** · Aufwand: groß (Drawer-Wizard, 5 neue Components, 3 API-Routen, Figma-Plugin-Radikalkur)
>
> **Fragebogen-Antworten:** `web-test-creation-fragebogen.md`
> **Pattern-Katalog:** `../architektur.md`

---

## Zielbild: Der neue Test-Erstellungs-Flow

```
Dashboard [+ New Test] → Drawer öffnet (rechte Bildschirmhälfte, Vercel-Style)

Step 0: URL → AI Scan       → AI wählt bestes Element vor
Step 1: Element picken       → Live-Site Picker (ab.js) · AI-Vorauswahl, änderbar
Step 2: Variant B            → AI auto-generate (CRO Best Practice)
Step 3: Metrik wählen        → Live-Site Picker (ab.js) · Button = vorausgewählt
Step 4: Review & Create      → AI-generierter Name · "Go Live" / "Save Paused"
```

**Prinzipien (aus Fragebogen):**
- Pro Schritt: User macht selbst ODER akzeptiert AI-Vorschlag (kein globaler Mode-Switch)
- AI-Vorschlag erscheint sofort, User kann mit einem Klick "Anderes Element" selbst picken
- 1 Element pro Test, 1 Variant B pro Generation, kein Natural-Language-Refine
- Figma-Plugin = reiner Stats-Viewer + Link-ins-Dashboard. KEINE Test-Erstellung, KEIN Element-Picking.
- Production-Ready, nicht MVP. UX first.
- **Drawer (Vercel-Style):** Rechte Bildschirmhälfte slide-in. Dashboard bleibt sichtbar. Kein Seitenwechsel.

**Inspiration aus Hybrid-Onboarding (`docs/future-features/hybrid-onboarding-plan.md`):**
- Server-seitige Screenshot-Preview mit CSS-Injection (urlbox) für Variant-B-Vorschau
- `lib/extractPageCode.ts` für DOM-Analyse
- `lib/previewAnalyze.ts` für AI-gestützte CSS-Generierung
- Temp-Session-Pattern für User ohne Account

---

## Phase 1: Foundation — DB & API

### Schritt 1.1 — [@supabase] DB-Migration: `wizard_drafts` + `auto_name`

**Warum:** Der Wizard soll den Fortschritt speichern (Browser-Crash, Tab-Wechsel). Das Figma-Plugin nutzt `clientStorage` — fürs Web brauchen wir eine serverseitige Lösung. Zusätzlich: `auto_generated_name`-Feld für KI-generierte Testnamen.

**Artefakt:** `db/migrations/028_wizard_drafts.sql`

```sql
-- Migration 028 — Wizard Drafts + Auto-Name
-- Speichert partiellen Wizard-Fortschritt, damit User nach Abbruch weitermachen können.
-- Idempotent.

-- 1. wizard_drafts Tabelle
create table if not exists wizard_drafts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  step        smallint not null default 0,          -- 0–4
  url         text,                                   -- Step 0
  selector    text,                                   -- Step 1 (CSS-Selector)
  original_html text,                                 -- Step 1 (Original-Element-HTML)
  variant_b_html text,                                -- Step 2
  variant_b_css  text,                                -- Step 2
  variant_text   text,                                -- Step 2 (KI-Erklärung)
  goal           text,                                -- Step 3
  goal_selector  text,                                -- Step 3 (CSS-Selector für Goal)
  auto_name      text,                                -- Step 4 (KI-generiert)
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique(user_id)                                     -- 1 Draft pro User
);

-- 2. auto_generated_name auf tests
alter table tests add column if not exists auto_generated_name text;

-- 3. RLS für wizard_drafts
alter table wizard_drafts enable row level security;
drop policy if exists "users_own_drafts" on wizard_drafts;
create policy "users_own_drafts" on wizard_drafts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. updated_at trigger
create or replace function update_wizard_draft_timestamp()
returns trigger
language plpgsql
set search_path = 'public'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_wizard_drafts_updated on wizard_drafts;
create trigger trg_wizard_drafts_updated
  before update on wizard_drafts
  for each row execute function update_wizard_draft_timestamp();
```

**Aufwand:** trivial (1 Tabelle, 1 Column, RLS, Trigger)

---

### Schritt 1.2 — [@engineer] API: `/api/test-wizard/scan` erweitern

**Warum:** Der existierende Scan-Endpoint liefert CRO-Suggestions, aber keine Element-Vorauswahl. Für den neuen Flow muss die AI ein primäres Element vorschlagen (das der User direkt akzeptieren oder überschreiben kann).

**Was ändert sich:**
- Response erweitert um `primarySuggestionIndex: number` — Index des von der AI als "bestes erstes Test-Element" gewählten Vorschlags
- Prompt in `lib/croAnalyze.ts::analyzePage` erweitert: "Wähle das EINE Element, das den größten Conversion-Impact verspricht"
- `primarySuggestion` mit `selector` + `rationale` + `elementType` (button, headline, form, etc.)
- Button-Erkennung: Wenn primäres Element ein Button ist → `elementType: 'button'` → Step 3 schlägt "Klick auf diesen Button" als Metrik vor

**Artefakt:** `app/api/test-wizard/scan/route.ts` (Edit), `lib/croAnalyze.ts` (Edit)

**Pattern:** architektur.md §1 (API-Route)

**Aufwand:** mittel (Prompt-Engineering + Response-Shape-Änderung)

---

### Schritt 1.3 — [@engineer] API: `/api/test-wizard/generate` erweitern

**Warum:** Aktuell braucht `generate` eine `variantDescription` vom User. Für den neuen Flow soll die AI OHNE User-Input eine CRO-Best-Practice-Variante generieren. Der User-Kontext (Element-Typ, aktuelle Eigenschaften) reicht als Prompt-Input.

**Was ändert sich:**
- `variantDescription` wird optional (`string | undefined`)
- Wenn undefined → Prompt: "Generate the best CRO variant for this element based on proven conversion patterns"
- Prompt bekommt mehr Kontext: `elementType`, `pageContext` (aus Scan), `framework` (tailwind/bootstrap/custom)
- Response unverändert: `{ variant, variant_html?, variant_css?, explanation }`
- `lib/generateVariantText.ts` erweitern um `generateBestPracticeVariant()`

**Artefakt:** `app/api/test-wizard/generate/route.ts` (Edit), `lib/generateVariantText.ts` (Edit)

**Pattern:** architektur.md §1

**Aufwand:** mittel

---

### Schritt 1.4 — [@engineer] API: `/api/test-wizard/create` (NEU)

**Warum:** Neuer Endpoint, der den kompletten Wizard-State entgegennimmt, einen KI-Namen generiert und den Test erstellt. Bündelt Auto-Name + Create in einem Call.

**Request-Body:**
```ts
{
  site_url: string
  selector: string           // CSS-Selector des getesteten Elements
  goal: string               // "click:.cta-button" | "form_submit" | "page_view" | "purchase"
  goal_selector?: string     // nur bei click/custom
  variant_b_html?: string
  variant_b_css?: string
  variant_text?: string      // KI-Erklärung der Variante
  original_html?: string
  status: 'active' | 'paused'  // "Go Live" oder "Save Paused"
}
```

**Response:**
```ts
{
  test: { id, name, auto_generated_name, snippet_key, status, ... }
}
```

**Logik:**
1. Auth + Plan-Limit-Prüfung (activeTests)
2. KI generiert `auto_generated_name` aus Kontext (Element + Variant + Goal)
3. Name = `auto_generated_name` (User kann später im Dashboard umbenennen)
4. Test in `tests` einfügen mit `status = body.status`
5. Wizard-Draft löschen (`wizard_drafts`)

**Artefakt:** `app/api/test-wizard/create/route.ts` (NEU)

**Pattern:** architektur.md §1, §5

**Aufwand:** mittel (neue Route + Auth + Plan-Limit + AI-Name-Generation)

---

### Schritt 1.5 — [@engineer] API: `/api/test-wizard/draft` (NEU)

**Warum:** Speichert/Liest den Wizard-Zwischenstand. User soll nach Tab-Schließen weitermachen können.

**Endpoints:**
- `GET /api/test-wizard/draft` → `{ draft: WizardDraft | null }`
- `PUT /api/test-wizard/draft` → speichert partiellen State
- `DELETE /api/test-wizard/draft` → löscht Draft nach erfolgreichem Create

**Artefakt:** `app/api/test-wizard/draft/route.ts` (NEU)

**Pattern:** architektur.md §1

**Aufwand:** trivial (CRUD auf `wizard_drafts`)

---

## Phase 2: Frontend — Drawer-Wizard (Vercel-Style)

**UX-Entscheidung:** Kein Full-Page-Wizard, kein Modal. Ein **Drawer** der von rechts einslide't und die rechte Bildschirmhälfte einnimmt — wie bei Vercel (Deploy-Drawer, Settings-Drawer). Das Dashboard (Test-Liste, Sidebar) bleibt sichtbar. Der User verliert nie den Kontext.

```
┌─ Sidebar ─┬── Dashboard (Tests, Stats) ──────┬── Drawer (Wizard) ──┐
│           │                                   │  Step 0/4           │
│  Tests    │  ┌──────────┐ ┌──────────┐       │  ┌──────────────┐   │
│  Health   │  │ Test 1   │ │ Test 2   │       │  │ URL input    │   │
│  Account  │  └──────────┘ └──────────┘       │  │ AI scan...   │   │
│           │                                   │  └──────────────┘   │
│  + New───┼───(klicken)────────────────────→  │                     │
└───────────┴───────────────────────────────────┴─────────────────────┘
```

### Schritt 2.1 — [@engineer] `NewTestDrawer.tsx` — Drawer-Container

**Warum:** Zentraler Drawer-Container. Wird in `DashboardClient.tsx` gerendert. Öffnet per State-Trigger ("New Test"-Button). Enthält den gesamten Wizard.

**Struktur:**
```
app/dashboard/components/
├── NewTestDrawer.tsx          # 'use client' — Drawer Shell + State Machine
└── new-test/
    ├── StepUrlScan.tsx        # Step 0: URL → KI-Scan
    ├── StepElementPicker.tsx  # Step 1: Element wählen
    ├── StepVariantB.tsx       # Step 2: Variante AI-generieren
    ├── StepMetricPicker.tsx   # Step 3: Metrik wählen
    └── StepReview.tsx         # Step 4: Review & Create
```

**`NewTestDrawer.tsx` — Drawer-Shell:**
- `isOpen` / `onClose` Props (von `DashboardClient` gesteuert)
- Slide-in von rechts: `translate-x-full` → `translate-x-0` mit Transition
- Backdrop: semi-transparent overlay auf dem Dashboard (nicht auf Sidebar)
- Width: 50vw auf Desktop, 100vw auf Mobile
- Header: "New Test" + Step-Indikator + Close-Button (X)
- Body: Scrollable, gerendert je nach `step`
- Footer: Back/Next/Create-Buttons
- **Wichtig:** Drawer schließen = Draft speichern → beim nächsten Öffnen wiederherstellen

**Artefakt:** `app/dashboard/components/NewTestDrawer.tsx` (NEU)

**Pattern:** architektur.md §3 (Client Component)

**Aufwand:** mittel (~150 Zeilen, Drawer-Animation + State-Machine-Integration)

---

### Schritt 2.2 — [@engineer] Wizard State Machine (in `NewTestDrawer.tsx` co-located)

**Warum:** Die State-Logik lebt direkt im Drawer-Container. Keine separate Page, kein Router — alles client-seitiger State.

**State:**
```ts
interface WizardState {
  step: 0 | 1 | 2 | 3 | 4
  // Step 0
  url: string
  scanResult: ScanResult | null       // { suggestions, primarySuggestionIndex, pageContext }
  scanError: string
  // Step 1
  selectedElement: ElementSelection | null  // { selector, originalHtml, elementType }
  elementConfirmed: boolean
  // Step 2 (AI-only, kein Figma)
  variantResult: VariantResult | null      // { variant, variant_html, variant_css, explanation }
  // Step 3
  selectedGoal: GoalSelection | null       // { type, selector?, label }
  goalConfirmed: boolean
  // Step 4
  autoName: string
  testStatus: 'active' | 'paused'
}
```

**Key Behaviors:**
- **Draft-Load:** Beim Öffnen des Drawers GET `/api/test-wizard/draft` → State wiederherstellen
- **Draft-Save:** Nach jeder State-Änderung PUT `/api/test-wizard/draft` (debounced, 500ms)
- **AI-First:** Jeder Step zeigt SOFORT den AI-Vorschlag, mit "Selbst machen"-Alternative
- **Per-Step Manual Override:** User kann AI-Vorschlag verwerfen und selbst picken/generieren
- **Drawer-Close:** Schließt den Drawer, speichert Draft. "Schließen"-Button = Draft sichern + Drawer zu.
- **Kein Figma-Weg:** Variant B kommt NUR von AI. Figma-Plugin hat keinen "Send to Dashboard"-Button mehr.

**Artefakt:** State-Logik in `app/dashboard/components/NewTestDrawer.tsx` (NEU)

**Pattern:** architektur.md §3

**Aufwand:** groß (zentrale State-Logik, ~300 Zeilen)

---

### Schritt 2.3 — [@engineer] `StepUrlScan.tsx` — Step 0

**Warum:** URL-Eingabe + AI-Scan. Der existierende Step 1 aus `TestCreationPanel` dient als Vorlage.

**UX-Flow:**
1. User gibt URL ein → "Scan" klicken
2. Loading: "KI analysiert deine Seite..." mit Progress-Animation (wie Hybrid-Onboarding)
3. AI-Scan zeigt Vorschläge als Karten:
   - **Primärer Vorschlag** (hervorgehoben, "Empfohlen"): Element-Name, Warum-Erklärung, Vorschau-Thumbnail
   - **Alternative Vorschläge** (Collapse/Expand): 2–3 weitere Elemente
4. User klickt "Weiter mit [Element]" → Step 1 mit Vorauswahl
5. ODER: User klickt "Anderes Element wählen" → Step 1 ohne Vorauswahl

**Props:** `url`, `scanResult`, `scanError`, `onScan`, `onSelect`, `onSkip`

**Artefakt:** `app/dashboard/components/new-test/StepUrlScan.tsx` (NEU)

**Pattern:** architektur.md §3, existierender `TestCreationPanel.tsx` Step1 als Vorlage

**Aufwand:** mittel (~200 Zeilen, baut auf existierendem Scan-Step auf)

---

### Schritt 2.4 — [@engineer] `StepElementPicker.tsx` — Step 1

**Warum:** User wählt das zu testende Element auf seiner Live-Site aus. Integration mit dem existierenden `ab.js`-Picker.

**UX-Flow:**
1. **AI-Vorauswahl aktiv:** Zeigt das von Step 0 vorausgewählte Element:
   - Element-Name ("Button 'Get Started'"), CSS-Selector, Typ
   - "Weiter mit diesem Element →" (Primary CTA)
   - "Anderes Element auf der Site auswählen" (Secondary Link)
2. **Picker-Mode:** Wenn User "Anderes Element" klickt:
   - Öffnet neue Tab: `https://[user-site]?ab_pick=new&ab_token=[token]&ab_api=[origin]`
   - Picker (`ab.js`) aktiviert sich, User klickt Element auf der Site
   - Picker sendet Selector per `postMessage` zurück an den opener (Dashboard-Tab)
   - Dashboard-Tab empfängt per `window.addEventListener('message', ...)`
   - ODER: Picker sendet direkt an API → Dashboard pollt
3. Nach Auswahl: Element-Info wird angezeigt, User bestätigt mit "Weiter →"

**Technische Entscheidung:** Der `ab.js`-Picker kommuniziert aktuell per `window.opener.postMessage`. Für den Web-Wizard öffnen wir die User-Site in einem neuen Tab (`window.open`). Der Picker postet zurück, der Wizard-Tab hört mit.

**Artefakt:** `app/dashboard/components/new-test/StepElementPicker.tsx` (NEU)

**Pattern:** architektur.md §3, `ab.js` Picker-Mechanismus (§`?ab_pick=`)

**Aufwand:** groß (~250 Zeilen, postMessage-Kommunikation, State-Handling für "warte auf Picker")

---

### Schritt 2.5 — [@engineer] `StepVariantB.tsx` — Step 2 (AI-only)

**Warum:** Variant B wird AUSSCHLIESSLICH per AI generiert. Figma spielt hier keine Rolle mehr — das Plugin ist reiner Stats-Viewer.

**UX-Flow:**
1. "KI generiert beste CRO-Variante..." → Spinner → Ergebnis
2. Zeigt: vorher/nachher Screenshot-Preview (urlbox CSS-Injection wie Hybrid-Onboarding)
3. Zeigt: Erklärung ("Button von Ghost zu Solid, +23% CTR erwartet")
4. User: "Variante übernehmen →" ODER "Neu generieren" (Regenerate)
5. **Kein Natural-Language-Refine** (laut Fragebogen D)
6. **Kein Figma-Weg.** Wer in Figma designen will, macht das unabhängig und nutzt den AI-Weg als Inspiration.

**AI-Generate-Logik:**
- Ruft `POST /api/test-wizard/generate` mit `variantDescription: undefined`
- Prompt: "Generate best CRO variant for [elementType] '[elementName]'. Current: [originalHtml/css]. Apply proven conversion patterns."
- Ergebnis: `{ variant, variant_html?, variant_css?, explanation }`

**Screenshot-Preview:**
- Wie Hybrid-Onboarding: `POST /api/preview` mit URL → urlbox-Screenshots (Original + Variant)
- A/B-Toggle zwischen beiden Screenshots

**Artefakt:** `app/dashboard/components/new-test/StepVariantB.tsx` (NEU)

**Pattern:** architektur.md §3, `HybridDemo.tsx` als Vorlage für Screenshot-Toggle

**Aufwand:** mittel (~200 Zeilen, Screenshot-Preview + AI-Generate, kein Figma-Pfad)

---

### Schritt 2.6 — [@engineer] `StepMetricPicker.tsx` — Step 3

**Warum:** Conversion-Metrik wählen. Button = vorausgewählt. Ohne Button: AI schlägt sinnvollsten Button vor.

**UX-Flow:**
1. **AI-Vorauswahl:**
   - Wenn Element aus Step 1 ein Button ist → "Klicks auf [Button-Name]" vorausgewählt
   - Wenn kein Button → AI schlägt nächsten CTA-Button der Seite vor
   - Angezeigte Metrik: Icon + Label ("MousePointerClick: Klicks auf 'Get Started'")
2. **User-Override:**
   - "Andere Metrik wählen" → Öffnet Picker auf Live-Site mit `?ab_goal=<testId>`
   - Gleicher postMessage-Mechanismus wie Step 1
   - Alternativ: Quick-Select aus vordefinierten Typen (`click`, `form_submit`, `page_view`, `purchase`)
3. **Custom CSS-Selector** (Advanced, collapsed): Für Power-User

**Artefakt:** `app/dashboard/components/new-test/StepMetricPicker.tsx` (NEU)

**Pattern:** architektur.md §3, existierender `TestCreationPanel.tsx` Step3 als Vorlage

**Aufwand:** mittel (~200 Zeilen, baut auf Goal-Logik aus `TestCreationPanel` auf)

---

### Schritt 2.7 — [@engineer] `StepReview.tsx` — Step 4

**Warum:** Finaler Review-Schritt. Alle Test-Infos auf einer Karte. AI-generierter Name. "Go Live" vs. "Save Paused".

**UX-Flow:**
1. **Test-Summary Card:**
   ```
   ┌─────────────────────────────────────────┐
   │  🔬 Test Summary                         │
   │                                          │
   │  📍 example.com/landing                  │
   │  🎯 Button "Get Started"                 │
   │  🎨 Ghost → Solid Blue (AI-generated)    │
   │  📊 Goal: Klicks auf "Get Started"       │
   │                                          │
   │  ✨ Auto-Name:                            │
   │  ┌─────────────────────────────────────┐ │
   │  │ Hero-CTA: Ghost zu Solid Button     │ │
   │  └─────────────────────────────────────┘ │
   │  (✎ editierbar)                          │
   └─────────────────────────────────────────┘
   ```
2. **Auto-Name:** Von `POST /api/test-wizard/create` generiert, im Input vorausgefüllt, editierbar
3. **Actions:**
   - 🟢 **"Go Live"** → `POST /api/test-wizard/create { status: 'active' }` → Test startet sofort
   - 🟡 **"Save Paused for Later"** → `POST /api/test-wizard/create { status: 'paused' }` → Test wird angelegt, nicht gestartet
4. **Nach Create:** Drawer schließen, Test-Liste im Dashboard neu laden, neuer Test oben mit Highlight-Effekt. Kein Redirect.

**Artefakt:** `app/dashboard/components/new-test/StepReview.tsx` (NEU)

**Pattern:** architektur.md §3

**Aufwand:** mittel (~150 Zeilen, Summary-Karte + Create-Action)

---

## Phase 3: Integration — Figma Plugin Radikalkur & Dashboard

### Schritt 3.1 — [@engineer] Figma Plugin: Radikal eindampfen (nur Stats + 2 Buttons)

**Warum:** Das Figma-Plugin wird zum reinen Dashboard-Teaser. Keine Test-Erstellung, kein Element-Picking, kein "Send to Dashboard". Nur noch: Stats-Übersicht (wie läuft's?), "Open Dashboard"-Button (zum Dashboard), "New Test"-Button (leitet in Drawer-Wizard im Dashboard).

**Was das Plugin NOCH macht:**
| Screen | Inhalt |
|---|---|
| **Dashboard** | Allgemeine Stats: Aktive Tests, Visitors, Conversions, Plan-Badge. Das war's. |
| **Buttons** | "Open Dashboard" → `window.open('.../dashboard')` · "New Test" → `window.open('.../dashboard?newTest=1')` → öffnet Dashboard MIT geöffnetem Drawer |

**Was ALLES rausfliegt:**
| Entfernen | Grund |
|---|---|
| **Alle 6 Wizard-Screens** | Test-Erstellung passiert nur noch im Web-Dashboard-Drawer |
| **Element-Picker** | Picking passiert nur über `ab.js` im Browser, getriggert aus dem Drawer |
| **Variant-Generierung** | AI-only im Drawer |
| **Goal-Auswahl** | Passiert im Drawer |
| **Snippet-Screen** | Passiert im Drawer |
| **`figmaListening`-Pattern** | Dashboard wartet nicht mehr auf Figma-Daten |
| **`ab_draft`-Speicherung** | Drafts leben jetzt serverseitig im Dashboard (`wizard_drafts`) |
| **`code.ts`: `selectionSummary`, `extractNode`, `paintsToArr`, `effectsToArr`, alle Export-Logik** | Kein Figma-Export mehr nötig |

**Was das Plugin BEHÄLT:**
- `figma.clientStorage` für `ab_token` (Login-State)
- Stats-Abfrage per API (`GET /api/tests`)
- Design-Tokens (CSS-Variablen)
- Panda-Logo + Branding

**Plugin-Größe nach Umbau:** `ui.html` ~150 Zeilen (von ~1500), `code.ts` ~30 Zeilen (von ~400)

**Artefakt:** `figma-plugin/src/ui.html` (massiver Edit), `figma-plugin/src/code.ts` (massiver Edit)

**Aufwand:** mittel (Plugin von 6 Screens auf 1 eindampfen)

---

### Schritt 3.2 — [@engineer] Dashboard: "New Test"-Button → Drawer öffnen

**Warum:** "New Test"-Button (Sidebar + Header) öffnet den Drawer statt auf eine Seite zu navigieren.

**Was ändert sich:**
- `DashboardClient.tsx`: Neuer State `const [drawerOpen, setDrawerOpen] = useState(false)`
- "New Test"-Button in Sidebar: `onClick={() => setDrawerOpen(true)}`
- "+ New Test"-Button im Header: `onClick={() => setDrawerOpen(true)}`
- `NewTestDrawer`-Component rendern: `<NewTestDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} userId={...} plan={...} />`
- **`TestCreationPanel.tsx` wird ENTFERNT.** Kein Fallback. Der Drawer ist der einzige Entry Point.
- URL-Parameter `?newTest=1` (von Figma-Plugin-Link) → Drawer beim Page-Load öffnen

**Artefakt:** `app/dashboard/DashboardClient.tsx` (Edit), `app/dashboard/Sidebar.tsx` (Edit)

**Aufwand:** trivial (State + Drawer-Rendering, ~40 Zeilen)

---

### Schritt 3.3 — [@engineer] Dashboard: `figmaListening`-Pattern entfernen

**Warum:** Das existierende Pattern (`useTestsInsert`, `figmaListening`-State) wartet auf neue Tests, die das Figma-Plugin erstellt. Da das Plugin keine Tests mehr erstellt, fliegt das komplett raus.

**Was wird entfernt:**
- `DashboardClient.tsx`: `figmaListening`, `figmaElapsed`, `figmaTestName`, `figmaReceived`-State
- `DashboardClient.tsx`: `useTestsInsert`-Hook-Aufruf
- `DashboardClient.tsx`: `figmaListening`-Timer-`useEffect`
- `TestCreationPanel.tsx`: Komplette Datei (wird durch Drawer ersetzt, siehe 3.2)
- `app/dashboard/tests/new/`: Existiert nicht, war nie gebaut.
- `lib/useRealtime.ts`: `useTestsInsert`-Hook (falls nirgends sonst verwendet)

**Artefakt:** `app/dashboard/DashboardClient.tsx` (Edit), `lib/useRealtime.ts` (Edit)

**Aufwand:** trivial (Code entfernen, ~50 Zeilen)

---

## Phase 4: Quality Assurance

### Schritt 4.1 — [@ponytail] Review aller neuen Components

**Was:** `NewTestDrawer.tsx` + alle 5 Step-Components auf Over-Engineering prüfen. State-Logik vereinfachen wo möglich. Sub-Components in gleiche Datei co-located.

**Artefakt:** Kein neues File — Edits an den Components nach Review

**Aufwand:** trivial (Review, ~30 Min)

---

### Schritt 4.2 — [@ponytail] Review aller API-Routen

**Was:** `scan`, `generate`, `create`, `draft` — Pattern-Konformität prüfen. Auth, CORS, Rate-Limits, Fehler-Shapes. Keine doppelten Queries. Budget-Check vorhanden.

**Artefakt:** Kein neues File — Edits an den Routes nach Review

**Aufwand:** trivial (Review, ~30 Min)

---

### Schritt 4.3 — [@wrapup] Aufräumen, Build, PROJEKT.md aktualisieren

**Was:**
- **`TestCreationPanel.tsx` LÖSCHEN** — komplett. Wird durch `NewTestDrawer.tsx` ersetzt. Kein Fallback.
- `app/dashboard/tests/new/`-Verzeichnis LÖSCHEN (falls existiert) — nie gebaut, war im alten Plan.
- `npm run vercel-build` in `ab-tool/` muss grün sein
- `PROJEKT.md` §1 (Dashboard-Philosophie: "Drawer-Wizard (Vercel-Style)" statt "4-Step Wizard im Web"), §3 (Struktur: `app/dashboard/components/new-test/`), §8 (Historie) aktualisieren
- `docs/architektur.md` "New Test"-Flow-Sektion aktualisieren: Drawer statt Page, AI-only Variant B, Figma-Plugin = Stats-Viewer
- `docs/future-features/web-test-creation-fragebogen.md` auf Status "Beantwortet → In Umsetzung" setzen
- README.md aktualisieren
- Git: `git add -A && git commit -m "feat: new test flow — drawer wizard + figma plugin radikalkur" && git push`

**Artefakt:** Cleanup-Edits, Build-Log, PROJEKT.md-Update

**Aufwand:** trivial

---

## Zusammenfassung: Reihenfolge & Abhängigkeiten

```
Phase 1 (Foundation)
  1.1 [@supabase]     DB-Migration         ─── kein Dependency
  1.2 [@engineer]      API scan erweitern   ─── kein Dependency
  1.3 [@engineer]      API generate erw.    ─── kein Dependency
  1.4 [@engineer]      API create (NEU)     ─── braucht 1.1 (DB)
  1.5 [@engineer]      API draft (NEU)      ─── braucht 1.1 (DB)

Phase 2 (Frontend — Drawer)
  2.1 [@engineer]      NewTestDrawer          ─── kein Dependency
  2.2 [@engineer]      Wizard State Machine   ─── braucht 1.4, 1.5 (API)
  2.3 [@engineer]      StepUrlScan            ─── braucht 1.2 (API scan)
  2.4 [@engineer]      StepElementPicker      ─── kein API-Dep (ab.js client-side)
  2.5 [@engineer]      StepVariantB (AI-only) ─── braucht 1.3 (API generate)
  2.6 [@engineer]      StepMetricPicker       ─── kein API-Dep (ab.js client-side)
  2.7 [@engineer]      StepReview             ─── braucht 1.4 (API create)

Phase 3 (Integration)
  3.1 [@engineer]      Figma Plugin Radikalkur  ─── kein Dependency (parallel)
  3.2 [@engineer]      Dashboard "New Test"     ─── braucht 2.1 (Drawer existiert)
  3.3 [@engineer]      figmaListening entfernen ─── braucht 3.2

Phase 4 (Quality)
  4.1 [@ponytail]      Frontend Review      ─── braucht Phase 2+3
  4.2 [@ponytail]      API Review           ─── braucht Phase 1
  4.3 [@wrapup]        Cleanup & Build      ─── braucht 4.1, 4.2
```

**Parallelisierbare Batches:**
- **Batch A:** 1.1 + 1.2 + 1.3 (keine Abhängigkeiten untereinander)
- **Batch B:** 1.4 + 1.5 + 2.1 + 3.1 (hängen nur von Batch A ab)
- **Batch C:** 2.2 + 2.3 + 2.4 + 2.5 + 2.6 (hängen von Batch B ab, parallel zueinander wo möglich)
- **Batch D:** 2.7 + 3.2 + 3.3 (Finalisierung)
- **Batch E:** 4.1 + 4.2 + 4.3 (Quality)

---

## Was dieser Plan NICHT abdeckt (bewusste Auslassungen)

| Auslassung | Grund |
|---|---|
| Natural-Language-Refine für Varianten | Fragebogen D: "Ohne Natürlichsprachiges Refine" |
| Mehrere Varianten zur Auswahl | Fragebogen D: "Eine Variante zur Wahl" |
| Globaler AI/Manual-Mode-Switch | Fragebogen B: "Pro Schritt" |
| Mehrere Elemente pro Test | Fragebogen C3: Immer 1 Element |
| Snippet-lose Element-Wahl (Screenshot) | Fragebogen C: "Picker via Snippet, wie gehabt" |
| Neue Abhängigkeiten (npm-Packages) | Keine nötig — alles mit existierendem Stack |
| E2E-Tests für den Wizard | Kommt nach Stabilisierung (Playwright-Test im CI) |
