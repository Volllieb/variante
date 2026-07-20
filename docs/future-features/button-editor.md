# Button-Editor — Visueller Werkzeugkasten im Onboarding

> Stand: 20.07.2026 · Status: **Planung** · Aufwand: groß (neuer Component-Typ, Canvas-Rendering, Property-Panel, CSS-Generator, Hover-Animation-Vorschau)

---

## Kernidee

Wenn der User im Test-Erstellungs-Flow einen Button als Test-Element auswählt, bekommt er **statt oder ergänzend zum AI-generierten Variant B** einen visuellen Werkzeugkasten. Er kann den Button direkt im Onboarding umdesignen — Farbe, Inhalt, Border Radius, Padding, Typografie, Hover-Animation — und sieht jede Änderung live in einer Vorschau.

**NICHT: Natural-Language-Refine („Mach den Button blau"). SONDERN: Direkter, visueller Editor mit Slidern, Color Pickern, Text-Inputs und Live-Preview.**

Der Editor generiert daraus sauberes `variant_b_css` und optional `variant_b_html` — kein manuelles CSS-Schreiben nötig.

---

## 1. Position im Flow

Der Button-Editor sitzt in **Step 2 (Variant B)** des neuen Test-Erstellungs-Wizards (`new-test-flow-plan.md`) und des Hybrid-Onboarding-Flows (`hybrid-onboarding-plan.md`).

```
Step 0: URL → AI Scan
Step 1: Element picken → Button erkannt
Step 2: Variant B → 🆕 Button-Editor ODER AI-Generate (Tabs/Umschalter)
Step 3: Metrik wählen
Step 4: Review & Create
```

**Trigger:** `elementType === 'button'` in der AI-Analyse. Nur bei Buttons erscheint der Editor. Andere Elementtypen (Headline, Form, Image) bekommen weiterhin AI-Generate + Natural-Language-Refine.

---

## 2. Editor-Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Variant B                                          [AI] [Editor]│
│                                                                  │
│  ┌─────────────────────────┐  ┌────────────────────────────────┐│
│  │                         │  │  🎨 Background                 ││
│  │                         │  │  ┌────────────────────────────┐││
│  │     Live Button         │  │  │ #3B82F6    [████████]  🔲 │││
│  │     Preview             │  │  └────────────────────────────┘││
│  │                         │  │                                ││
│  │   [Get Started →]       │  │  📝 Content                    ││
│  │                         │  │  ┌────────────────────────────┐││
│  │   ↑ hover preview       │  │  │ Get Started                │││
│  │                         │  │  └────────────────────────────┘││
│  │                         │  │                                ││
│  └─────────────────────────┘  │  🔤 Typography                ││
│                               │  Font Size:  ──●── 16px       ││
│  ┌─────────────────────────┐  │  Font Weight: [Bold    ▾]     ││
│  │ Original                 │  │                                ││
│  │ [Get Started]  (ghost)   │  │  📐 Shape                     ││
│  └─────────────────────────┘  │  Border Radius: ──●── 8px     ││
│                               │  Padding X:     ──●── 24px    ││
│                               │  Padding Y:     ──●── 12px    ││
│                               │                                ││
│                               │  ✨ Hover Animation            ││
│                               │  Type: [Scale + Darken  ▾]    ││
│                               │  Duration: ──●── 200ms        ││
│                               │  [▶ Vorschau]                  ││
│                               │                                ││
│                               │  🖼️ Icon (optional)            ││
│                               │  Position: [Left  ▾]           ││
│                               │  Icon: [→ Arrow Right  ▾]     ││
│                               └────────────────────────────────┘│
│                                                                  │
│  [Reset to Original]                    [Apply & Continue →]     │
└──────────────────────────────────────────────────────────────────┘
```

### 2.1 Linke Seite: Live-Preview

- Zeigt den Button **exakt so, wie er auf der echten Seite aussehen wird** (CSS-Injection-Preview).
- Beim Hovern über den Preview-Button: Hover-Animation wird abgespielt.
- Darunter: kleiner Screenshot des Original-Buttons zum Vergleich.
- **Stretch-Goal:** Preview in einem Mini-Browser-Frame (Site-Hintergrund angedeutet).

### 2.2 Rechte Seite: Property-Panel

Jede Property-Gruppe ist eine collapsible Section. Änderungen sind sofort in der Live-Preview sichtbar.

| Gruppe | Properties | Input-Typ |
|---|---|---|
| **🎨 Background** | `background-color`, `background-gradient` | Color Picker + Gradient-Option |
| **📝 Content** | Button-Text | Text-Input (max 40 Zeichen) |
| **🔤 Typography** | `font-size`, `font-weight`, `color`, `letter-spacing` | Slider + Dropdown + Color Picker |
| **📐 Shape** | `border-radius`, `padding-x`, `padding-y`, `border-width`, `border-color` | Slider (px) + Color Picker |
| **✨ Hover** | Animation-Typ, Dauer, Intensität | Dropdown + Slider + Play-Button |
| **🖼️ Icon** | Icon-Position (left/right/none), Icon-Typ | Dropdown (Preset-Icons: Pfeil, Check, Plus, Cart, etc.) |

---

## 3. Hover-Animationen — Preset-Bibliothek

Statt den User CSS schreiben zu lassen, bekommt er eine Auswahl vordefinierter Animationen:

| Name | Beschreibung | CSS-Technik |
|---|---|---|
| **Scale + Darken** | Button wird 5% größer + 10% dunkler | `transform: scale(1.05); filter: brightness(0.9)` |
| **Slide Up** | Button schiebt sich 4px nach oben | `transform: translateY(-4px)` |
| **Glow** | Box-Shadow erscheint in Button-Farbe | `box-shadow: 0 0 20px var(--btn-color)` |
| **Border Expand** | Border wächst von 0 auf 3px | `border-width` Transition |
| **Shine** | Glanz-Effekt fährt über den Button | `::before` Pseudo-Element mit `translateX` |
| **Fill Left** | Hintergrund füllt sich von links | `::before` mit `scaleX(0)` → `scaleX(1)` |
| **Pulse** | Button pulsiert sanft | `@keyframes pulse` |
| **None** | Keine Hover-Animation | — |

Jede Animation hat:
- **Duration-Slider** (100ms – 800ms, Default 200ms)
- **Easing-Dropdown** (ease, ease-in-out, cubic-bezier)
- **Play-Button** für Vorschau im Preview-Panel

---

## 4. Technische Architektur

### 4.1 Component-Struktur

```
components/
  ButtonEditor/
    ButtonEditor.tsx          — Client Component, Root-Layout (Split-Pane)
    ButtonPreview.tsx         — Canvas/iframe mit Echtzeit-CSS-Injection
    PropertyPanel.tsx         — Rechte Seite, alle Property-Gruppen
    ColorPicker.tsx           — Wiederverwendbarer Color Input (Hex + Preset-Palette)
    Slider.tsx                — Range-Slider mit Label + Zahlenwert
    HoverAnimationPicker.tsx  — Dropdown + Duration + Easing + Play-Button
    IconPicker.tsx            — Dropdown mit SVG-Icon-Presets
    buttonPresets.ts          — Hover-Animation-Definitionen, Icon-Liste
    generateButtonCss.ts      — Properties → variant_b_css String
```

### 4.2 State-Management

```ts
// ButtonEditorState — zentraler State, per Props an Children
interface ButtonEditorState {
  // Original-Werte (aus DOM-Extraktion)
  original: {
    text: string
    bgColor: string
    textColor: string
    fontSize: string        // "16px"
    fontWeight: string      // "600"
    borderRadius: string    // "8px"
    paddingX: string
    paddingY: string
    borderWidth: string
    borderColor: string
    letterSpacing: string
  }

  // Aktuelle Edit-Werte
  current: {
    text: string
    bgColor: string
    textColor: string
    fontSize: number        // px, numerisch für Slider
    fontWeight: number      // 100–900
    borderRadius: number
    paddingX: number
    paddingY: number
    borderWidth: number
    borderColor: string
    letterSpacing: number
    hoverAnimation: HoverPreset | null
    hoverDuration: number   // ms
    icon: IconPreset | null
    iconPosition: 'left' | 'right'
  }
}
```

### 4.3 CSS-Generierung

`generateButtonCss.ts` nimmt den `current`-State und produziert `variant_b_css`:

```ts
function generateButtonCss(
  originalSelector: string,  // z.B. ".hero .cta-button"
  state: ButtonEditorState['current']
): string {
  return `
${originalSelector} {
  background-color: ${state.bgColor};
  color: ${state.textColor};
  font-size: ${state.fontSize}px;
  font-weight: ${state.fontWeight};
  border-radius: ${state.borderRadius}px;
  padding: ${state.paddingY}px ${state.paddingX}px;
  border: ${state.borderWidth}px solid ${state.borderColor};
  letter-spacing: ${state.letterSpacing}px;
  transition: all ${state.hoverDuration}ms ease;
}

${originalSelector}:hover {
  ${generateHoverCss(state.hoverAnimation, state)}
}
  `.trim();
}
```

Die Hover-CSS-Generierung erfolgt aus den Preset-Definitionen in `buttonPresets.ts`.

### 4.4 Optional: HTML-Änderung

Wenn der User den **Text** oder das **Icon** ändert, reicht CSS-Injection nicht — der DOM-Inhalt muss sich ändern. In dem Fall wird zusätzlich `variant_b_html` generiert:

```ts
function generateButtonHtml(
  originalHtml: string,
  state: ButtonEditorState['current']
): string {
  // Klont das Original-HTML, ersetzt Text + fügt ggf. Icon-Element ein
}
```

Nur bei Text-/Icon-Änderungen. Reine Style-Änderungen (Farbe, Border, Hover) erzeugen nur `variant_b_css`.

---

## 5. Original-Wert-Extraktion

Um dem Editor die aktuellen Button-Werte zu geben, muss der Server beim Scan die CSS-Computed-Properties des Buttons extrahieren:

### 5.1 Erweiterung von `lib/extractPageCode.ts`

```ts
interface ExtractedButtonProps {
  selector: string
  text: string
  bgColor: string
  textColor: string
  fontSize: string
  fontWeight: string
  borderRadius: string
  paddingX: string
  paddingY: string
  borderWidth: string
  borderColor: string
  letterSpacing: string
  html: string            // Original-InnerHTML für HTML-Generator
  hasIcon: boolean
  iconPosition?: 'left' | 'right'
}
```

Extraktion via Puppeteer/Playwright oder durch Parsen der Inline-Styles + Computed-Styles aus dem Screenshot-DOM.

### 5.2 Fallback: AI-gestützte Extraktion

Wenn der Server die Computed-Properties nicht live auslesen kann (z.B. weil die Seite SPA ist und das Rendering nicht deterministic), kann GPT-4o-mini die Button-Properties aus dem HTML + Inline-CSS + Kontext approximieren.

---

## 6. Integration in bestehende Flows

### 6.1 Web-Onboarding (`/onboarding`)

Der Button-Editor ersetzt oder ergänzt das Refine-Panel. Statt Natural-Language-Input („Mach den Button blau") kriegt der User den visuellen Editor. AI-Vorschlag und Editor sind **Tabs** (wie im Layout oben: `[AI] [Editor]`).

**Flow:**
1. AI scannt Seite, erkennt Button, extrahiert Properties
2. Dual-Screenshot-Preview (Original vs. AI-Vorschlag)
3. User klickt auf "Edit manually" → Button-Editor öffnet sich
4. User passt Properties an, sieht Live-Preview
5. "Apply & Continue" → generiert CSS/HTML → geht zu Step 3 (Metrik)

### 6.2 Drawer-Wizard (Dashboard, `new-test-flow-plan.md`)

Gleicher Editor-Component im Drawer. Der `ButtonEditor` ist ein standalone Client Component, der sowohl im Full-Page-Onboarding als auch im Drawer funktioniert.

### 6.3 Figma-Plugin

**Nicht im Figma-Plugin.** Der Button-Editor ist ein reines Web-Feature. Das Figma-Plugin bleibt Stats-Viewer + Link-ins-Dashboard. Die Button-Properties aus Figma-Layern zu extrahieren wäre ein separates, deutlich aufwändigeres Feature (Figma API hat keine Computed-Styles).

---

## 7. Abhängigkeiten & Voraussetzungen

| Voraussetzung | Status | Anmerkung |
|---|---|---|
| **New Test Flow** (`new-test-flow-plan.md`) | 📐 Planung | Button-Editor ist ein Component in Step 2 |
| **Hybrid-Onboarding** (`hybrid-onboarding-plan.md`) | ✅ Live | Editor wird in Refine-Phase integriert |
| **`variant_b_css`** | ✅ Live | Output-Format existiert bereits |
| **CSS-Injection-Preview** (urlbox) | ✅ Live | Live-Preview nutzt denselben Mechanismus |
| **Button-Erkennung** (`croAnalyze.ts`) | 🟡 Teilweise | `elementType` muss aus Scan-Response kommen |
| **`lib/extractPageCode.ts`** | ✅ Live | Muss um `extractButtonProps()` erweitert werden |

---

## 8. Offene Fragen

- **Icon-Bibliothek:** Welche Icons? Lucide, Heroicons, oder eigene SVGs? Lizenz?
- **Gradient-Backgrounds:** Soll der Editor Gradienten unterstützen (Color Stop 1 + 2, Winkel)? Oder nur Solid-Color? → Für v1: nur Solid.
- **Shadow:** `box-shadow` als eigene Property-Gruppe oder Teil von "Shape"? → v1: Teil von Shape.
- **Responsive Preview:** Soll der Button in verschiedenen Viewport-Größen angezeigt werden? → v1: Desktop only.
- **Mobile-First-Buttons:** Viele Sites haben unterschiedliche Button-Styles für Mobile. Wie geht der Editor damit um? → v1: ignoriert, nur Desktop-Properties extrahiert.
- **Dark Mode:** Was, wenn die Site Dark Mode hat und der Button im Dark Mode anders aussieht? → v1: ignoriert.

---

## 9. Warum das wichtig ist

- **Aktueller Pain Point:** AI-generierte Varianten treffen oft nicht den Geschmack des Users. Natural-Language-Refine („mach ihn runder") ist unpräzise und frustrierend.
- **Designer-Erwartung:** Designer sind visuelle Tools gewohnt (Figma, Webflow, Framer). Ein Textfeld für CSS-Änderungen fühlt sich falsch an.
- **Conversion-Impact:** Buttons sind das mit Abstand häufigste Test-Element. Ein spezialisierter Editor für den häufigsten Use Case hat den höchsten ROI.
- **Differenzierung:** Kein anderer A/B-Testing-Anbieter hat einen visuellen Button-Editor im Onboarding. Das ist ein „Wow, das ist einfach"-Moment.
