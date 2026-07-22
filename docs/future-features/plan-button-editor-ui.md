# Plan: Button-Editor UI — Neuer Variante-B-Erstellungs-Flow

> **Datum:** 2026-07-21
> **Status:** Geplant
> **Betroffene Bereiche:** Test-Wizard (Step 1), API, Types, Editor-Komponenten

## 1. Ziel

Den aktuellen KI-Generierungs-Flow (OpenAI GPT-4o-mini) in Step 1 des Test-Wizards **entfernen** und durch einen **manuellen Button/Text-Editor** ersetzen. Der User erstellt Variante B direkt per UI — ohne API-Call, ohne KI, ohne Wartezeit.

## 2. Aktuelle Architektur (IST)

```
StepVariantB (Step 1)
├── Tab "AI Generate" (default) ← ENTFERNEN
│   └── POST /api/test-wizard/generate → OpenAI → variant_html + variant_css
├── Tab "Edit Manually"
│   └── VariantEditor → PropertyControls (Text, Color, Spacing, Typography)
└── Tab "Inspiration"
    └── InspirationGallery → 5 CRO-Patterns → API-Call → Variante
```

**Probleme:**
- KI-Generierung ist langsam (2-5s Wartezeit)
- Erfordert OpenAI-API-Key und funktioniert ohne nicht
- User hat wenig Kontrolle über das Ergebnis
- Inspiration-Tab macht ebenfalls API-Call
- Komplexe State-Machine mit `generating`, `error`, `autoFired`-Ref

## 3. Ziel-Architektur (SOLL)

```
StepVariantB (Step 1)
├── Erkennung: Text vs. Button-Element
│   ├── button, link → ButtonEditor (voll)
│   ├── text, headline → TextInput (einfach)
│   └── element → ButtonEditor (vereinfacht)
├── ButtonEditor
│   ├── Live-Vorschau (sofort, kein Debounce nötig)
│   ├── Text-Input
│   ├── Farben (Background, Text, Border) mit Reset-Buttons
│   ├── Rahmen (Dicke, Stil, Farbe, Ecken-Radius)
│   ├── Hover (Checkbox + Hover-Vorschau + Hintergrund + Scale + Schatten)
│   └── "Auf Original zurücksetzen"
├── TextInput (für text/headline)
│   ├── Einzeiliges Input-Feld
│   ├── Vorausgefüllt mit Original-Text
│   └── Reset-Button
└── "Übernehmen"-Button → schliesst Editor, setzt Variante
```

**Keine API-Calls mehr in Step 1.** Variante wird rein clientseitig erzeugt.

## 4. Änderungen im Detail

### 4.1 Types (`new-test/types.ts`)

**Erweitere `UserEdits`:**
```typescript
export interface UserEdits {
  // Bestehend
  text?: string
  bgColor?: string
  textColor?: string
  fontSize?: number
  fontWeight?: number
  borderRadius?: number
  paddingX?: number
  paddingY?: number
  borderWidth?: number
  borderColor?: string

  // NEU
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none'
  hoverEnabled?: boolean
  hoverBgColor?: string
  hoverScale?: number      // 100-120%
  hoverShadow?: boolean
}
```

**Neue Types:**
```typescript
export type ElementCategory = 'button' | 'link' | 'text' | 'headline' | 'element'

/** Ermittelt den Editor-Typ basierend auf elementType */
export function getEditorCategory(elementType: string): 'button' | 'text' {
  if (elementType === 'button' || elementType === 'link') return 'button'
  if (elementType === 'text' || elementType === 'headline') return 'text'
  return 'button' // fallback: button-editor (vereinfacht)
}
```

**Entfernen:**
- `VariantTab` — wird nicht mehr gebraucht (nur noch ein Modus)
- `InspirationPattern` — wird nicht mehr gebraucht
- `ELEMENT_CONTROLS` — wird durch neue Editor-Komponenten ersetzt
- `SLIDER_CONFIGS` — wird teilweise ersetzt

### 4.2 StepVariantB (`new-test/StepVariantB.tsx`)

**Komplette Neuschreibung:**
- Entferne: `VariantTab`, 3-Tab-System, `generating`-State, `error`-State, `autoFired`-Ref
- Entferne: `onGenerate`-Prop, `InspirationGallery`-Import
- Neue Props: `originalHtml`, `originalCss` (aus ElementSelection)
- Logik:
  1. Beim Mount: `elementType` analysieren → `getEditorCategory()`
  2. Button → `ButtonEditor` rendern
  3. Text → `TextInputEditor` rendern
  4. "Übernehmen"-Button → `onVariantUpdate()` mit generiertem HTML/CSS

**Variant-HTML/CSS-Generierung (clientseitig):**
```typescript
function generateButtonHtml(text: string): string {
  return `<button class="ab-variant-b">${text}</button>`
}

function generateButtonCss(
  edits: UserEdits,
  selector: string,
  includeHover: boolean,
): string {
  const lines: string[] = []
  lines.push(`${selector} {`)
  if (edits.bgColor) lines.push(`  background-color: ${edits.bgColor};`)
  if (edits.textColor) lines.push(`  color: ${edits.textColor};`)
  // ... alle Properties
  lines.push('}')
  if (includeHover && edits.hoverEnabled) {
    lines.push(`${selector}:hover {`)
    if (edits.hoverBgColor) lines.push(`  background-color: ${edits.hoverBgColor};`)
    if (edits.hoverScale) lines.push(`  transform: scale(${edits.hoverScale / 100});`)
    if (edits.hoverShadow) lines.push(`  box-shadow: 0 4px 12px rgba(0,0,0,0.15);`)
    lines.push('}')
  }
  return lines.join('\n')
}
```

### 4.3 ButtonEditor (NEU — `new-test/ButtonEditor.tsx`)

**Neue Komponente, ersetzt `VariantEditor.tsx` + `PropertyControls.tsx`:**

```typescript
interface ButtonEditorProps {
  element: ElementSelection
  originalHtml: string
  onApply: (html: string, css: string) => void
  onCancel: () => void
}
```

**Sektionen (vertikal, scrollbar):**

| Sektion | Inhalt |
|---|---|
| **Vorschau** | Zentrierte Live-Vorschau des Buttons mit aktuellen Styles |
| **Text** | Text-Input, vorausgefüllt mit Original-Text |
| **Farben** | Background, Text, Border — je ColorPicker + Hex-Input + 🔄 Reset |
| **Rahmen** | Border-Width (Slider), Border-Style (Dropdown), Border-Color (Picker), Border-Radius (Slider) |
| **Hover** | Checkbox "Aktivieren" + Hover-Vorschau + Hover-Background + Scale (Slider 100-120%) + Shadow (Toggle) |
| **Footer** | "Auf Original zurücksetzen" + "Übernehmen" |

**Live-Vorschau:** Rendert einen `<button>` mit inline `style={{...}}` — kein Debounce nötig, da rein clientseitig.

### 4.4 TextInputEditor (NEU — `new-test/TextInputEditor.tsx`)

**Einfache Komponente für Text-Elemente:**

```typescript
interface TextInputEditorProps {
  element: ElementSelection
  originalText: string
  onApply: (html: string, css: string) => void
  onCancel: () => void
}
```

- Einzeiliges Input-Feld
- Vorausgefüllt mit Original-Text
- Reset-Button setzt auf Original zurück
- "Übernehmen" → generiert `variant_html` (Text in `<span>` oder `<p>`)
- Minimales CSS (nur Textfarbe, Font-Grösse wenn vorhanden)

### 4.5 ColorPicker (`new-test/ColorPicker.tsx`)

**Besteht bereits, wird erweitert:**
- Hex-Input + native Color-Picker (wie gehabt)
- NEU: 🔄 Reset-Button (setzt auf Original-Farbe zurück)
- NEU: Props `originalColor?: string` und `onReset?: () => void`

### 4.6 PropertySlider (`new-test/PropertySlider.tsx`)

**Besteht bereits, wird erweitert:**
- NEU: Slider + Zahlen-Input nebeneinander (wie im UI-Plan)
- NEU: Props `showInput?: boolean` (default true)

### 4.7 Entfernte Dateien

| Datei | Grund |
|---|---|
| `InspirationGallery.tsx` | Wird nicht mehr gebraucht |
| `inspirationPatterns.ts` | Wird nicht mehr gebraucht |
| `generatePatternVariant.ts` | Wird nicht mehr gebraucht |
| `mergeVariantEdits.ts` | Wird durch clientseitige Generierung ersetzt |
| `VariantEditor.tsx` | Wird durch `ButtonEditor.tsx` + `TextInputEditor.tsx` ersetzt |
| `PropertyControls.tsx` | Wird durch `ButtonEditor.tsx` ersetzt |

### 4.8 API-Routes

| Route | Änderung |
|---|---|
| `POST /api/test-wizard/generate` | **Entfernen** — wird nicht mehr aufgerufen |
| `POST /api/test-wizard/create` | **Keine Änderung** — bekommt weiterhin `variant_b_html` + `variant_b_css` |

### 4.9 NewTestDrawer (`NewTestDrawer.tsx`)

**Anpassungen:**
- `onGenerate`-Prop von `StepVariantB` entfernen
- `variantTab`-State entfernen (nicht mehr nötig)
- `onVariantUpdate` bleibt, wird aber vom neuen Editor anders angesteuert
- `VariantResult`-Interface bleibt (für Kompatibilität mit create-API)

## 5. Datenfluss (NEU)

```
User öffnet Drawer
  → Step 0: URL + Element wählen (unverändert)
  → Step 1: Element-Typ erkennen
    ├── button/link → ButtonEditor
    │   └── User editiert → Live-Vorschau (sofort)
    │   └── "Übernehmen" → generateButtonHtml() + generateButtonCss()
    │   └── → variantResult = { variant, variant_html, variant_css, explanation: '' }
    └── text/headline → TextInputEditor
        └── User editiert → "Übernehmen" → variantResult
  → Step 2: Goal wählen (unverändert)
  → Step 3: Review + Create (unverändert)
  → POST /api/test-wizard/create (unverändert)
```

## 6. Implementierungs-Schritte

### Phase 1: Types & Vorbereitung

| Schritt | Agent | Beschreibung |
|---|---|---|
| 1.1 | [@engineer] | `UserEdits` in `types.ts` erweitern (borderStyle, hoverEnabled, hoverBgColor, hoverScale, hoverShadow) |
| 1.2 | [@engineer] | `getEditorCategory()` in `types.ts` hinzufügen |
| 1.3 | [@engineer] | `VariantTab`, `InspirationPattern`, `ELEMENT_CONTROLS`, `SLIDER_CONFIGS` aus `types.ts` entfernen |
| 1.4 | [@engineer] | `ColorPicker.tsx` erweitern: `originalColor`-Prop + Reset-Button |
| 1.5 | [@engineer] | `PropertySlider.tsx` erweitern: `showInput`-Prop + Zahlen-Input |

### Phase 2: Neue Editor-Komponenten

| Schritt | Agent | Beschreibung |
|---|---|---|
| 2.1 | [@engineer] | `ButtonEditor.tsx` erstellen (Vorschau, Text, Farben, Rahmen, Hover) |
| 2.2 | [@engineer] | `TextInputEditor.tsx` erstellen (einfaches Input + Reset) |
| 2.3 | [@engineer] | Clientseitige HTML/CSS-Generierung (`generateButtonHtml`, `generateButtonCss`) |
| 2.4 | [@ponytail] | Review Phase 2 — ist der Editor zu over-engineered? |

### Phase 3: StepVariantB umbauen

| Schritt | Agent | Beschreibung |
|---|---|---|
| 3.1 | [@engineer] | `StepVariantB.tsx` neuschreiben: Erkennung → Editor-Rendering → "Übernehmen" |
| 3.2 | [@engineer] | `NewTestDrawer.tsx` anpassen: `onGenerate` entfernen, `variantTab` entfernen |
| 3.3 | [@ponytail] | Review Phase 3 |

### Phase 4: Aufräumen

| Schritt | Agent | Beschreibung |
|---|---|---|
| 4.1 | [@engineer] | Alte Dateien löschen: `InspirationGallery.tsx`, `inspirationPatterns.ts`, `generatePatternVariant.ts`, `mergeVariantEdits.ts`, `VariantEditor.tsx`, `PropertyControls.tsx` |
| 4.2 | [@engineer] | API-Route `POST /api/test-wizard/generate` deaktivieren/entfernen |
| 4.3 | [@engineer] | Build prüfen: `npm run vercel-build` |
| 4.4 | [@wrapup] | Session-Abschluss: Commit, Doku, PROJEKT.md fortschreiben |

## 7. Risiken & Annahmen

| Risiko | Massnahme |
|---|---|
| **Hover-Funktionalität** braucht CSS `:hover` — in der Vorschau nur via DevTools sichtbar | Hover-Vorschau im Editor selbst (zweite Button-Darstellung im Hover-Zustand) |
| **Border-Style** wird von manchen Elementen nicht unterstützt | Auf `solid`, `dashed`, `dotted`, `none` beschränken |
| **Original-Werte** sind nicht immer bekannt (nur `originalHtml`, kein geparstes CSS) | Original-CSS aus `originalHtml` parsen oder Default-Werte nutzen |
| **Element-Typ-Erkennung** ist nicht 100% zuverlässig | Fallback auf ButtonEditor (vereinfacht) für unbekannte Typen |

## 8. Offene Fragen

1. Soll der Button-Editor auch **Schriftart (font-family)** und **Schriftstärke (font-weight)** einzeln steuern? (Im UI-Plan nicht explizit, aber in aktuellen PropertyControls vorhanden)
2. Soll der Hover-Effekt auch **Transition-Dauer** konfigurierbar machen? (Default: 0.2s)
3. Was passiert mit bestehenden Wizard-Drafts, die noch KI-generierte Varianten enthalten? → Beim Laden des Drafts wird der Editor geöffnet, User kann weiterbearbeiten.

> **Annahme:** Font-Size und Font-Weight bleiben im Button-Editor (aus aktuellen PropertyControls). Hover-Transition wird auf 0.2s ease festgelegt (nicht konfigurierbar).
