# Plan: Goal-Step UI/UX Redesign — New Test Flow

> **Datum:** 2026-07-21
> **Status:** Geplant
> **Betroffene Bereiche:** Step 2 (Goal), NewTestDrawer, Picker-Bridge, Types
> **Abhängigkeit:** Sollte NACH dem Button-Editor-Redesign (`plan-button-editor-ui.md`) umgesetzt werden, da Step 1 und Step 2 denselben Picker-Mechanismus teilen.

## 1. Ziel

Den aktuellen Goal-Step (Step 2) im New-Test-Wizard mit einer übersichtlichen, interaktiven UI ersetzen.

**Kern-Prinzipien:**
- **Vorauswahl:** Wenn ein Button getestet wird → "Klick auf Button" vorauswählen (existiert bereits, wird verbessert)
- **Choose Element:** Seite öffnet sich, User wählt Ziel-Element visuell (gleiches Pattern wie Step 0)
- **Übersichtlichkeit:** Primäre Goals prominent, Advanced einklappbar
- **Sicherheit:** Nach Pick: Vorschau mit Selector + Text, damit User weiss was gewählt wurde

## 2. Aktuelle Architektur (IST)

```
StepMetricPicker (Step 2)
├── 5 Goal-Typen als Grid-Buttons (click, form_submit, page_view, purchase, custom)
├── Bei "click": "Pick on site"-Button → öffnet picker-bridge im goal-Modus
├── Bei "custom": Text-Input für Beschreibung
├── Confirm-Button
└── Auto-Select: wenn elementType === 'button' → click vorausgewählt
```

**Probleme:**
- 5 Goal-Typen gleichrangig → User muss erst überlegen, welcher Typ passt
- "Pick on site" ist versteckt (erst nach Auswahl von "click" sichtbar)
- Keine Vorschau nach Element-Pick → User muss sich merken was er gewählt hat
- Keine visuelle Hierarchie (primär vs. advanced)
- Page View hat kein klares Input-Feld

## 3. Ziel-Architektur (SOLL)

```
StepGoal (Step 2) — NEU
├── Header: "What's your conversion goal?"
├── Preselect (nur bei Button-Element):
│   └── "Click on element" vorausgewählt + Badge "Recommended"
│
├── PRIMÄRE GOALS (Radio-Liste, visuell prominent):
│   ├── ○ Click on element
│   │   └── [Pick on site] → Picker öffnen → Vorschau nach Pick
│   └── ○ Visit a page
│       └── URL-Input (relativ, z.B. /thank-you)
│
├── ADVANCED GOALS (Accordion, collapsed):
│   ├── ○ Form Submit
│   ├── ○ Purchase / Checkout
│   └── ○ Custom event
│       └── Text-Input bei Auswahl
│
└── Footer: [Confirm conversion goal] (disabled bis Goal gesetzt)
```

## 4. Datenfluss (NEU)

```
Step 1 (Variant) → Step 2 (Goal)
  │
  ├── Preselect (nur bei button/link):
  │   └── selectedType = 'click'
  │   └── openPicker() automatisch (wie bei "Recommended")
  │
  ├── User wählt "Click on element"
  │   └── Klick "Pick on site"
  │       └── window.open(/api/picker-bridge?mode=goal)
  │       └── postMessage({ type: 'ab-goal', selector, text })
  │           └── GoalSelection { type: 'click', selector, label }
  │           └── Vorschau: Selector + Text + "Change"-Button
  │
  ├── User wählt "Visit a page"
  │   └── Input: relative URL → GoalSelection { type: 'page_view', label, targetUrl }
  │
  ├── User öffnet "Advanced" (Accordion)
  │   ├── Form Submit → GoalSelection { type: 'form_submit', label }
  │   ├── Purchase → GoalSelection { type: 'purchase', label }
  │   └── Custom → Text-Input → GoalSelection { type: 'custom', label }
  │
  └── Confirm → goalConfirmed = true → Step 3 (Review)
```

## 5. Änderungen im Detail

### 5.1 Neue Datei: `StepGoal.tsx`

**Ersetzt `StepMetricPicker.tsx` komplett.**

```typescript
interface StepGoalProps {
  elementType: string
  elementName: string
  url: string
  selectedGoal: GoalSelection | null
  onGoalSelected: (goal: GoalSelection) => void
  onConfirm: () => void
}
```

**Interne States:**
- `selectedType: 'click' | 'page_view' | 'form_submit' | 'purchase' | 'custom' | null`
- `showAdvanced: boolean`
- `waitingForPicker: boolean`
- `pickedElement: { selector: string; text: string } | null`
- `targetUrl: string`
- `customLabel: string`

**Sub-Komponenten (alle inline in StepGoal):**
- `PrimaryGoalOption` — Radio-Card für Click / Page View
- `ElementPickerSection` — "Pick on site"-Button + Vorschau nach Pick
- `UrlInputSection` — Einfaches Input für Page-View-Ziel
- `AdvancedAccordion` — Einklappbarer Bereich
- `GoalConfirmButton` — Primary CTA

### 5.2 Anpassungen: `NewTestDrawer.tsx`

- Import `StepMetricPicker` → `StepGoal` ändern
- Render: `{state.step === 2 && <StepGoal ... />}` (Props bleiben identisch)
- Keine State-Änderungen nötig

### 5.3 Anpassungen: `GoalSelection` Interface

```typescript
export interface GoalSelection {
  type: 'click' | 'form_submit' | 'page_view' | 'purchase' | 'custom'
  selector?: string
  label: string
  targetUrl?: string  // NEU: für page_view
}
```

### 5.4 Anpassungen: Draft-Speicherung

In `NewTestDrawer.tsx` `saveDraft`:
- `targetUrl` mitspeichern (analog zu `goal_selector`)

### 5.5 Entfernen

| Datei | Grund |
|---|---|
| `StepMetricPicker.tsx` | Wird durch `StepGoal.tsx` ersetzt |

## 6. UI-Konzept (Detail)

### 6.1 Primary Goals (Radio-Liste)

```
┌──────────────────────────────────────────────┐
│  What's your conversion goal?                │
│                                              │
│  ┌──────────────────────────────────────────┐│
│  │ ● Click on element                  🎯  ││ ← Radio selected
│  │   Pick the element users click to       ││
│  │   convert                               ││
│  │                                          ││
│  │   ┌──────────────────────────────────┐   ││
│  │   │ [Pick on site]  → div.cta-button │   ││
│  │   │                  "Get Started"    │   ││
│  │   └──────────────────────────────────┘   ││
│  └──────────────────────────────────────────┘│
│                                              │
│  ┌──────────────────────────────────────────┐│
│  │ ○ Visit a page                      📄  ││ ← Radio unchecked
│  │   Users reach a specific URL after       ││
│  │   converting                             ││
│  └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

### 6.2 Page View (bei Auswahl)

```
┌──────────────────────────────────────────────┐
│  ● Visit a page                         📄  │
│                                              │
│  ┌──────────────────────────────────────────┐│
│  │  Target URL                              ││
│  │  ┌────────────────────────────────────┐  ││
│  │  │  /thank-you                        │  ││
│  │  └────────────────────────────────────┘  ││
│  │  Relative to your site, e.g. /thank-you  ││
│  └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

### 6.3 Advanced Accordion

```
┌── Advanced ────────────────────────────────┐  ← Klickbarer Header
│  ┌────────────────────────────────────────┐ │
│  │ ○ Form Submit                     📝  │ │
│  │   Track form submissions               │ │
│  ├────────────────────────────────────────┤ │
│  │ ○ Purchase / Checkout             🛒  │ │
│  │   Track completed purchases            │ │
│  ├────────────────────────────────────────┤ │
│  │ ○ Custom event                    ✚   │ │
│  │   ┌──────────────────────────────┐     │ │
│  │   │ Describe your goal...        │     │ │
│  │   └──────────────────────────────┘     │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 6.4 Zustände

| Zustand | Darstellung |
|---|---|
| **Kein Goal ausgewählt** | Alle Optionen neutral, Confirm disabled |
| **Preselect (Button)** | "Click on element" radio selected, Picker öffnet automatisch |
| **Picker offen** | Loading-Spinner + "Waiting for element selection…" |
| **Element gepickt** | Grüner Badge + Selector + Text + "Change"-Button |
| **Page View eingegeben** | URL im Input, Confirm enabled |
| **Advanced ausgewählt** | Accordion geöffnet, entsprechende Option selected |
| **Confirm gedrückt** | Step 3 (Review) |

## 7. Implementierungs-Schritte

### Phase 1: Types & Vorbereitung

| # | Agent | Task | Aufwand |
|---|---|---|---|
| 1.1 | [@engineer] | `GoalSelection` um `targetUrl` erweitern | trivial |
| 1.2 | [@engineer] | Draft-Speicherung um `targetUrl` ergänzen | trivial |

### Phase 2: StepGoal Komponente

| # | Agent | Task | Aufwand |
|---|---|---|---|
| 2.1 | [@engineer] | `StepGoal.tsx` erstellen — Grundgerüst + Radio-Liste + Preselect-Logik | mittel |
| 2.2 | [@engineer] | "Click on element"-Picker + postMessage-Handler + Vorschau | mittel |
| 2.3 | [@engineer] | "Visit a page"-URL-Input + Validierung | trivial |
| 2.4 | [@engineer] | Advanced-Accordion (Form Submit, Purchase, Custom mit Text-Input) | mittel |
| 2.5 | [@ponytail] | Review Phase 2 — ist die UI over-engineered? | — |

### Phase 3: Integration & Aufräumen

| # | Agent | Task | Aufwand |
|---|---|---|---|
| 3.1 | [@engineer] | `NewTestDrawer.tsx`: Import + Render updaten | trivial |
| 3.2 | [@engineer] | Alte `StepMetricPicker.tsx` entfernen | trivial |
| 3.3 | [@engineer] | Build prüfen: `npm run vercel-build` | trivial |
| 3.4 | [@ponytail] | Final Review — Draft-Kompatibilität, keine broken Imports | — |
| 3.5 | [@wrapup] | Session-Abschluss: Commit, Doku, PROJEKT.md fortschreiben | trivial |

## 8. Risiken & Annahmen

| Risiko | Massnahme |
|---|---|
| **Picker-Bridge** unterstützt `mode=goal` vielleicht nicht vollständig (fehlende Daten im postMessage) | Vorher testen, ggf. Bridge erweitern um `tagName` + `text` |
| **Page View** braucht relative URL — User könnte absolute eingeben | Input validieren: muss mit `/` beginnen, kein `http` erlauben |
| **Preselect + Auto-Picker** könnte aufdringlich wirken | Nur bei Button-Element, mit Badge "Recommended" erklären |
| **Draft-Kompatibilität** — alte Drafts haben `goal`-Feld im alten Format | Draft-Loader normalisiert: `click:selector` → `{ type: 'click', selector }` |
| **Accordion-Zustand** geht verloren bei Step-Navigation | `showAdvanced` als lokaler State (flüchtig) — ok |
| **Picker Popup** wird vom Browser geblockt | Hinweis: "Please allow popups for this site" + Fallback-Button |

## 9. Abgrenzung

| Nicht in diesem Plan | Grund |
|---|---|
| Form-Submit-Picker (welches Formular) | Kann später kommen — erstmal nur Typ ohne Selector |
| Purchase-Value-Tracking | Erfordert Stripe/Checkout-Integration — eigenes Projekt |
| Goal-History (zuletzt verwendete Goals) | Zu viel State für zu wenig Nutzen |
| A/B-Test-Zielgruppen-Segmentierung | Nicht Teil des Wizard-Flows |

## 10. Visuelle Referenz

Siehe `docs/screenshots/` für aktuelle StepMetricPicker-UI.
