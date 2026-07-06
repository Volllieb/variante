# Dashboard-Neustruktur — Plan

> Stand: 06.07.2026 · Ergebnis der Brainstorming-Session

## Architektur-Entscheidung

```
┌──────────────────────────────────────────────────┐
│                 ONBOARDING (/onboarding)          │
│  Setup-Tools: Chrome Extension + Figma Plugin    │
│  Einmalig. Danach nie wieder.                    │
├──────────────────────────────────────────────────┤
│                 DASHBOARD (/dashboard)            │
│  Overview: Stats + Test-Liste                    │
│  "New test" → Figma Wizard (Polling)             │
│  Plugin-Token, Extension, Snippet, Billing,      │
│  Account in Sidebar/Footer                       │
└──────────────────────────────────────────────────┘
```

**Prinzip:** Onboarding = einmaliges Setup. Dashboard = täglicher Arbeitsplatz. Kein Setup-Cruft im Daily-Driver.

---

## Phase 1 — Onboarding verfeinern (besteht schon, nur ergänzen)

**Datei:** `ab-tool/app/onboarding/OnboardingClient.tsx`

### 1.1 Onboarding als „abgeschlossen" markieren

Expliziter „Go to Dashboard"-Button am Ende des Onboardings, der `PATCH /api/profile` mit `{ onboarded: true }` aufruft UND dann nach `/dashboard` navigiert. Kein Redirect-Race mehr.

### 1.2 `has_figma_plugin`-Flag

In `profiles` ein Boolean `has_figma_plugin` (default `false`). Wird auf `true` gesetzt, sobald das Figma-Plugin zum ersten Mal erfolgreich den Token austauscht.

**Migration:** `db/migrations/013_plugin_flag.sql`
```sql
ALTER TABLE profiles ADD COLUMN has_figma_plugin BOOLEAN DEFAULT FALSE;
```

---

## Phase 2 — Dashboard-Layout neu

### 2.1 Sidebar

```
┌─ variante ──────────────────────────┐
│  [FREE]                             │
│                                     │
│  🧪 Overview                        │
│  ──────────────────────────────     │
│  🔑 Plugin & Extension              │
│  📋 Snippet                         │
│  💳 Billing                         │
│  ⚙️ Account                         │
│                                     │
│                         [AV] u@x.de │
└─────────────────────────────────────┘
```

Single-Page-Dashboard mit Anker-Sektionen. Sidebar-Links: `href="#plugin-token"`, `href="#snippet"`, `href="#billing"`, `href="#account"`. Overview immer sichtbar, Rest unterhalb gescrollt.

### 2.2 Overview-Bereich (oberhalb der Scroll-Fold)

```
┌──────────────────────────────────────────────────┐
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────┐ │
│  │ 2 Active │ │ 12.4K    │ │ 487      │ │ PRO │ │
│  │ tests    │ │ visitors │ │ conv.    │ │ ★→  │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────┘ │
│                                                   │
│  ⚡ Hero Button Test: B leads by +28% — View →   │
│     (nur wenn Winner detected & Pro)              │
│                                                   │
│  Tests                        [+ New test] [🔍▽] │
│  ┌──────────────────────────────────────────────┐ │
│  │ (Test-Cards oder Empty State)                 │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

**Stats-Bar (4 Cards):**
1. **Active tests** — `2` (Free: `1 / 1` mit Fortschrittsbalken)
2. **Total visitors** — `12.4K`
3. **Conversions** — `487`
4. **Plan** — Free: Upgrade-Button / Pro: „Pro" mit grünem Dot

**Winner-Alert (nur wenn vorhanden + Pro):** Prominente Zeile zwischen Stats und Test-Liste.

### 2.3 Test-Cards (aktuelle Logik bleibt)

Visitor-Bar, CR, Uplift-Badge bleiben. Empty State wird durch „New test"-Guide ersetzt (Phase 3).

---

## Phase 3 — „New test"-Flow

### 3.1 Button-Verhalten nach Plugin-Status

```
User klickt [+ New test]
         │
         ├─ has_figma_plugin === true
         │    → Figma-Prompt mit Polling (3.2)
         │
         └─ has_figma_plugin === false
              → Mini-Dialog: "Install the Figma plugin first"
                [Go to setup → /onboarding]
```

### 3.2 Figma-Prompt-Komponente (neue Komponente)

Ersetzt den Empty State UND erscheint bei Klick auf „+ New test" mit bestehenden Tests.

**Zustandsmaschine:**

```
IDLE → AWAITING_FIGMA → TEST_RECEIVED
                    ↘ TIMEOUT
                    ↘ CANCELLED
```

#### IDLE (Initial-Prompt)

```
┌────────────────────────────────────────────────┐
│                                                │
│           🎨  Create in Figma                   │
│                                                │
│   Open the Variante Figma plugin, select an    │
│   element, describe your variant, and push     │
│   it to your dashboard.                        │
│                                                │
│   ┌────────────────────────────────────────┐   │
│   │  1. Open Figma                         │   │
│   │  2. Run Variante plugin                │   │
│   │  3. Select element → describe variant  │   │
│   │  4. Push to dashboard                  │   │
│   └────────────────────────────────────────┘   │
│                                                │
│   [Open Figma Plugin]     [Cancel]              │
│                                                │
│   Don't have the plugin? [Setup guide →]        │
│                                                │
└────────────────────────────────────────────────┘
```

#### AWAITING_FIGMA (Polling)

```
┌────────────────────────────────────────────────┐
│                                                │
│           ⏳  Waiting for Figma...               │
│                                                │
│   Listening for your test. Open the Variante   │
│   plugin in Figma, create a variant, and       │
│   push it to your dashboard.                   │
│                                                │
│   ░░░░░░░░░░░░░░░░░░  (Pulsierende Dots)       │
│   Waiting for new test • 0:42 elapsed          │
│                                                │
│   [Cancel]                                     │
│                                                │
└────────────────────────────────────────────────┘
```

**Polling-Logik:**
- `GET /api/tests` alle 3 Sekunden
- Vergleicht `tests.length` mit Snapshot von vor dem Klick
- Neuer Test gefunden → `TEST_RECEIVED`
- Nach 5 Minuten → `TIMEOUT`

#### TEST_RECEIVED

```
┌────────────────────────────────────────────────┐
│                                                │
│           ✅  Test created!                     │
│                                                │
│   "Hero Button Redesign" is in your dashboard. │
│                                                │
│   [View test →]     [Close]                    │
│                                                │
└────────────────────────────────────────────────┘
```

Neuer Test erscheint animiert (kurzer Hintergrund-Pulse) in der Test-Liste.

#### TIMEOUT

```
┌────────────────────────────────────────────────┐
│                                                │
│           ⏰  No test received                  │
│                                                │
│   We didn't detect a new test within 5 minutes.│
│   You can always create one later from Figma.  │
│                                                │
│   [Try again]     [Close]                      │
│                                                │
└────────────────────────────────────────────────┘
```

#### CANCELLED

Zurück zu IDLE (Test-Liste oder Empty State).

### 3.3 Implementierung

**Neue Datei:** `ab-tool/app/dashboard/NewTestFlow.tsx` (Client Component)

```typescript
type FlowState = 'idle' | 'awaiting_figma' | 'test_received' | 'timeout' | 'cancelled'

type NewTestFlowProps = {
  apiToken: string
  currentTestCount: number       // Snapshot vor Polling-Start
  hasFigmaPlugin: boolean         // aus profiles
  onTestCreated: (test: TestRow) => void
  onClose: () => void
}
```

**Polling-Hook:** `usePollForNewTest(initialCount, intervalMs = 3000, timeoutMs = 300000)`

---

## Phase 4 — Sektionen unterhalb (Scroll-Bereich)

### 4.1 Plugin & Extension (besteht, 2-Col-Grid)

Token + CWS-Link nebeneinander. Keine Änderung.

### 4.2 Snippet (besteht, Collapsible)

Kopierbarer Code + Framework-Varianten. Keine Änderung.

### 4.3 Billing

**Verschieben** aus der linken Spalte in die Scroll-Sektion. Quota-Anzeige wandert in Stats-Bar (2.2).

### 4.4 Account

Account-Settings als eigene Sektion. Logout, Passwort ändern, E-Mail.

---

## Datenmodell-Änderungen

| Migration | Inhalt |
|---|---|
| `013_plugin_flag.sql` | `profiles.has_figma_plugin BOOLEAN DEFAULT FALSE` |
| API: `POST /api/tests` | Bei erstem erfolgreichen Token-Austausch: `UPDATE profiles SET has_figma_plugin = TRUE` |

---

## Datei-Änderungen (Übersicht)

| Datei | Art | Beschreibung |
|---|---|---|
| `DashboardShell.tsx` | Edit | Sidebar-Links: Overview, Plugin & Extension, Snippet, Billing, Account |
| `DashboardClient.tsx` | Refactor | 2-Col-Layout entfernen → Single-Column mit Stats-Bar + Test-Liste + Sektionen |
| `NewTestFlow.tsx` | **Neu** | Zustandsmaschine + Polling für Figma-Test-Erstellung |
| `OnboardingClient.tsx` | Edit | „Go to Dashboard"-Button + `onboarded`-Flag explizit setzen |
| `db/migrations/013_plugin_flag.sql` | **Neu** | `has_figma_plugin`-Spalte |
| `PROJEKT.md` | Edit | §3 Struktur, §8 Historie, Dashboard-Konzept dokumentieren |

---

## Reihenfolge der Umsetzung

| Schritt | Aufwand | Abhängigkeit |
|---|---|---|
| **1. Migration 013** | 15 min | — |
| **2. Onboarding: „Go to Dashboard" + onboarded-Flag fixen** | 30 min | — |
| **3. `has_figma_plugin` in API setzen** | 30 min | Schritt 1 |
| **4. DashboardShell: Sidebar aktualisieren** | 20 min | — |
| **5. DashboardClient: Layout-Restruktur** (Stats-Bar, Single-Col, Sektionen) | 2 h | — |
| **6. NewTestFlow-Komponente** (Zustandsmaschine + Polling) | 3 h | Schritt 3 |
| **7. Winner-Alert in Stats-Bar** | 1 h | Schritt 5 |
| **8. Test-Card Highlight-Animation** (bei neuem Test) | 30 min | Schritt 6 |
| **9. Build & Deploy** | 15 min | Alle |

**Gesamtaufwand: ~8–9 Stunden**

---

## Nicht anfassen (Anti-Roadmap)

- Kein Web-Editor für Tests
- Kein Analytics-Dashboard mit Zeitreihen
- Kein Agency-Tier
- Keine Multi-Metrik-Konfiguration
