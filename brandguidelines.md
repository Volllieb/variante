# Brand Guidelines — Variante Figma Plugin

> Erstellt aus `Design.md` + Codeanalyse (`figma-plugin/src/ui.html`, `figma-plugin/src/code.ts`).
> Basis: [UI UX Pro Max Skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) v2.6 — Style #38 (Neubrutalism/Figma-Apps) + #1 (Minimal Swiss).

---

## 1. Product Identity

| Attribut | Wert |
|---|---|
| **Produkt** | Variante — A/B-Testing aus Figma, kein Dev nötig |
| **Plugin-Typ** | Onboarding-Wizard (6 Screens) + Dashboard + Results |
| **Host** | Figma (rechte Sidebar, 360×560px) |
| **Design-Prinzip** | „Figma-nativ, nicht Figma-ähnlich" |
| **Tonalität** | Direkt, dev-frei, ermächtigend |

---

## 2. Design Tokens

### 2.1 Brand Colors (Variante-spezifisch)

```css
--brand:          #0D99FF;   /* Primär — Figma Blue */
--brand-hover:    #0B87E0;   /* Hover dunkler */
--brand-subtle:   rgba(13,153,255,.08);  /* Hintergrund-Tönung */
--brand-border:   rgba(13,153,255,.25);  /* Border-Tönung */
```

### 2.2 Status Colors (halbtransparent = funktionieren auf Light + Dark)

```css
--ok:             #14AE5C;   /* Success grün */
--ok-subtle:      rgba(20,174,92,.10);
--ok-border:      rgba(20,174,92,.30);
--warn:           #B36B00;   /* Warning orange */
--warn-subtle:    rgba(245,158,11,.14);
--warn-border:    rgba(245,158,11,.35);
```

### 2.3 Border Radius

```css
--r:   6px;   /* Default-Radius (inputs, buttons, cards) */
--rsm: 4px;   /* Small-Radius (Icons, kleine Elemente) */
```

### 2.4 Figma CSS Tokens (fremd, nicht überschreiben)

Alle `--figma-color-*` Tokens kommen von Figma selbst. Das Plugin nutzt sie für:
- `--figma-color-text` / `--figma-color-text-secondary` — Textfarben (Light/Dark automatisch)
- `--figma-color-bg` / `--figma-color-bg-secondary` / `--figma-color-bg-hover` — Hintergründe
- `--figma-color-border` — Trennlinien, Border
- `--figma-color-icon-secondary` — Icons
- `--figma-color-text-danger` / `--figma-color-text-success` / `--figma-color-text-warning` — Status-Texte
- `--figma-color-bg-brand-tertiary` / `--figma-color-bg-success` / `--figma-color-bg-warning` — Notices/Badges

> **Regel:** Niemals eigene Hardcode-Farben für BG/Text/Border definieren — immer Figma-Tokens nutzen. Brand- und Status-Farben sind die einzigen Ausnahmen.

---

## 3. Typography

| Ebene | Font | Size | Weight | Einsatz |
|---|---|---|---|---|
| Product Name | Inter | 13px | 700 | Brand-Mark im Welcome-Screen |
| Titel (.hdr-title) | Inter | 12px | 600 | Screen-Header |
| Step-Anzeige (.hdr-step) | Inter | 11px | — | Fortschritt („3 / 6") |
| Label (.lbl) | Inter | 11px | 500 | Feld-Beschriftung |
| Hint-Text (.hint) | Inter | 11px | — | Erklärtext unter Title |
| Card-Value (.card-val) | Inter | 12px | 500 | Werte in Property-Rows |
| Card-Label (.card-lbl) | Inter | 10px | 700 uppercase | Feld-Überschrift in Card |
| Body (input, select) | Inter | 12px | — | Eingabefelder |
| Monospace | SF Mono / Fira Code | 11px | — | Test-ID, Code, CSS-Selector |
| Notification (.notice-title) | Inter | 11px | 600 | Notice-Titel |
| Notification (.notice-body) | Inter | 11px | — | Notice-Text |
| Button (.btn) | Inter | 12px | 600 | Buttons |
| Small Button (.btn-sm) | Inter | 11px | 600 | Kleine Buttons |
| Badge (.badge) | Inter | 10px | 700 | Status-Badges |
| Metric Value (.ab-v) | Inter | 16px | 700 | Results-Metriken |
| Metric Label (.ab-k) | Inter | 10px | 700 uppercase | Results-Metrik-Labels |

**Basis:** `Inter, -apple-system, BlinkMacSystemFont, sans-serif` — immer als Fallback-Stack.

---

## 4. Layout & Spacing System

### 4.1 Plugin-Größe

- **Width:** 360px (fixed, Figma Sidebar)
- **Height:** 560px (fixed)
- `overflow: hidden` auf Body, `.body` hat eigenes Scrolling

### 4.2 Screen-Struktur (von oben nach unten)

```
┌─────────────────────────────┐
│ .hdr (Header, 32px + pad)  │
│   back-btn + hdr-title     │
│   + hdr-step               │
├─────────────────────────────┤
│ .step-bar (10px + dots)    │
│   step-dot (2px height)    │
├─────────────────────────────┤
│ .body (flex:1, overflow-y) │
│   Inhalt scrollt hier      │
├─────────────────────────────┤
│ .ftr (Footer, 42px + pad)  │
│   border-top + Buttons     │
└─────────────────────────────┘
```

### 4.3 Spacing (Padding/Margin)

| Kontext | Wert |
|---|---|
| `.hdr` padding | `10px 12px 0` |
| `.step-bar` padding | `8px 12px 0` |
| `.body` padding | `14px 12px 6px` |
| `.ftr` padding | `10px 12px` |
| Abstand zwischen Elementen | `12px` (standard) / `6px` (eng) |
| `.section-gap` | `12px` height |
| `.divider` | `12px 0` margin |
| Input zu nächstem Element | `12px` |
| Gap zwischen Cards/Buttons | `6px` |

### 4.4 Grid

Kein CSS-Grid im Plugin — alles Flexbox:
- **Header:** `display: flex; gap: 6px; align-items: center`
- **Footer:** Immer ein Full-Width-Button
- **Step-Dots:** `display: flex; gap: 3px` — füllen flex:1
- **Results (.ab-table):** `display: grid; grid-template-columns: 1fr 1fr`
- **Previews (.prev-grid):** `display: grid; grid-template-columns: 1fr 1fr; gap: 7px`

---

## 5. Component Patterns

### 5.1 Input Fields (Figma-nativ)

```
┌─────────────────────────────┐
│  🌐  https://example.com   ✓ │
└─────────────────────────────┘
   ↑ icon-left         ↑ icon-right
```

- **Default:** `background: var(--figma-color-bg-secondary); border: 1px solid transparent`
- **Hover:** `border-color: var(--figma-color-border)`
- **Focus:** `border-color: var(--brand); background: var(--figma-color-bg); box-shadow: 0 0 0 2px var(--brand-subtle)`
- **Mit Prefix-Icon:** `.input-wrap.has-prefix input { padding-left: 30px }`
- **Mit Suffix-Icon:** `padding-right: 30px`

### 5.2 Buttons

| Type | Style | States |
|---|---|---|
| **Primary** (`.btn-primary`) | `bg: var(--brand); color: #fff` | hover: `--brand-hover`; disabled: `bg-secondary, text-disabled, border` |
| **Secondary** (`.btn-secondary`) | `bg: transparent; border: 1px solid border; color: text` | hover: `bg-hover` |
| Small (`.btn-sm`) | `width: auto; padding: 5px 10px; font-size: 11px` | — |
| Icon-Only (`.icon-btn`) | `22×22px; border: 1px solid border` | hover: `bg-hover` |

### 5.3 Property Rows (statt Cards)

```
┌─────────────────────────────┐
│ TEST ID                     │
│ abc123def                   │
└─────────────────────────────┘
```

- `.testid-row` / `.card`: `background: var(--figma-color-bg-secondary)`
- **Kein Border** (entfernt seit Design.md A+E)
- `.card-lbl`: 10px, 700, uppercase, secondary-color
- `.testid-lbl`: analog

### 5.4 Segmented Control

```
┌──────────┬──────────┬──────────┐
│ Everyone │  Text    │  Colors  │
├──────────┼──────────┼──────────┤
│          │   (on)   │          │
└──────────┴──────────┴──────────┘
```

- `.seg`: Flex-Leiste mit `gap: 2px; padding: 2px; bg-secondary; border-radius: var(--r)`
- `.seg-btn`: `flex:1; padding: 5px 6px; font-size: 11px; font-weight: 500`
- `.seg-btn.on`: `bg: var(--figma-color-bg); box-shadow: 0 1px 2px rgba(0,0,0,.12)`

### 5.5 Notices

```css
.notice-blue   { background: var(--brand-subtle); border: 1px solid var(--brand-border); }
.notice-green  { background: var(--ok-subtle);    border: 1px solid var(--ok-border); }
```

- `.notice-title` + `.notice-body` + optionalem Action-Button
- **Keine Hardcode-Hex mehr** (Dark-Mode-sicher via Tokens seit Design.md)

### 5.6 Badges

| Klasse | Style |
|---|---|
| `.ba` | `brand-subtle bg, brand color` |
| `.bb` | `ok-subtle bg, success color` |
| `.bs-draft` | `bg-secondary bg, text-secondary, border` |
| `.bs-active` | `brand-subtle bg, brand` |
| `.bs-done` | `ok-subtle bg, success` |
| `.bs-paused` | `warn-subtle bg, warn` |

### 5.7 Step Dots (Progress)

- 6 Dots (1–6), je 2px height, `flex: 1`
- Default: `background: var(--figma-color-border)`
- Active: `background: var(--brand)`
- Transition: `background .25s`

### 5.8 Metric Options (Screen 4)

- `.m-opt`: Border-Card (1px border), Radio-Button links
- `.m-selected`: Brand-Border + Brand-Tönung
- `.m-disabled`: `opacity: .45`
- `.m-radio`: 14px circle, selected = Brand-Border + Brand-Fill

### 5.9 Element Chip (Screen 2)

```
┌─────────────────────────────┐
│ BUTTON :  CTA Get Started   │
└─────────────────────────────┘
```

- `.el-chip`: Brand-Background + Brand-Border + Brand-Text
- `.el-chip-type`: 10px uppercase links
- `.el-chip-text`: Ellipsis-rechts bei Overflow

### 5.10 Winner-Banner (Results)

- `.winner`: `background: var(--figma-color-bg-success); color: var(--figma-color-text-success)`
- Zentrierter Text, 13px

---

## 6. Screen Flow (Wizard)

```
s-connect    → Screen –1: Connect/Welcome
s-dashboard  → Screen  0: Dashboard (Test-Liste)
s-setup      → Screen  1: Test Details (Name + URL)
s-element    → Screen  2: Pick Element (Chrome Extension)
s-design     → Screen  3: Variant B in Figma auswählen
s-metric     → Screen  4: Conversion Goal
s-generate   → Screen  5: Generate Variant B (AI)
s-snippet    → Screen  6: Install Snippet
s-results    → Screen  —: Results (live)
```

Navigation: `navHistory[]`-Stack, `navPush()`/`navBack()`, Back-Button immer links im Header.

---

## 7. Animation & Transitions

| Element | Dauer | Typ |
|---|---|---|
| Step-Dot aktiv | 0.25s | background |
| Input border/focus | 0.15s | border-color, box-shadow, background |
| Segmented-Button | 0.12s | background, color |
| Buttons hover | 0.12s | background, opacity |
| Option hover | 0.12s | border-color, background |
| Advanced-Toggle Pfeil | 0.18s | transform |
| Loading Dots | 1.2s loop | opacity (dot-animation) |

**Philosophie:** Kurz, funktional, nie verspielt. Figma-typisch: sofortige Reaktion (<200ms).

---

## 8. Dark Mode

Der Plugin läuft in Figma — Figma wechselt CSS-Variablen automatisch. Das Plugin muss:

1. **Figma-Tokens nutzen** (`--figma-color-bg` statt `#fff`)
2. **Brand/Status-Farben als rgba mit Fallback** definieren (funktionieren auf Light + Dark)
3. **Keine Hardcode-Hex** für Text, Background oder Border außer Brand (#0D99FF) und Status (#14AE5C, #B36B00)
4. Für `.winner` / Notices / Badges: **Figma-Status-Tokens** bevorzugen, Fallback-Hex via `var(--token, #hex)`

---

## 9. UX Guidelines (Plugin-spezifisch)

### 9.1 Aus UI UX Pro Max übernommen

- **Style: Minimal Swiss (#1)** — reduziert, funktional, Inter
- **Style: Neubrutalism (#38)** — „Figma-style apps", klare Borders, hoher Kontrast
- **Accessibility: WCAG AA** — ausreichender Kontrast, Focus-States
- **Keine:** Emojis als Icons (SVG nutzen), überflüssige Dekoration, unnötige Animationen

### 9.2 Wizard-Regeln

- Jeder Screen hat genau **ein primäres Ziel** (Continue-Button im Footer)
- Back-Button immer sichtbar (außer Welcome/Dashboard)
- Erklärtext (`.hint`) maximal 2 Zeilen
- Fortschritt (`.step-bar`) immer sichtbar während des Wizards
- Ladezustände via `.dots` + Text, nicht via Spinner

### 9.3 Input-Validierung

- URL-Feld: Echtzeit-Validierung bei Tastatureingabe
- Grünes Check-Icon rechts bei gültiger URL
- Fehlermeldung (`.field-err`) unter dem Feld
- Create-Button disabled bis Formular valide

### 9.4 Polling-Pattern

- Element-Auswahl: 5s-Intervall (Server-Polling)
- Results: 30s-Intervall
- Ergebnisse werden via `afetch()` geholt, nicht via WebSocket

---

## 10. Icon-Styleguide

- **Alle Icons:** Inline-SVG (`<svg>` im HTML)
- **Größe:** 14×14px (Standard), 16×16px (Navigation/Back)
- **Stroke:** `currentColor` (erbt Textfarbe)
- **Stroke-width:** 1.1–1.5 (dünn, Figma-typisch)
- **Keine:** Font-Icons, Emoji-Icons, Bitmap-Icons
- Verwendete Icons: Globe (URL), Chevron (Back), Checkmark (Validierung), Code-Brackets (CSS-Selector), Bar-Chart (Brand)

---

## 11. Anti-Patterns (nicht tun)

| Anti-Pattern | Grund |
|---|---|
| Hardcode-Hex für BG/Text/Border | Bricht im Dark Mode |
| Emojis als Icons | Kein einheitliches Styling, Barriere |
| Globale Keyboard-Capture | Blockiert Input-Felder (gefixed in bugfix) |
| Konkurrierende disabled-Logik | Race-Conditions am Create-Button (gefixed) |
| setTimeout(focus) ohne Retry | Verliert Rennen gegen DOM-Updates (gefixed) |
| CSS-Grid im Plugin-Layout | Flexbox reicht, weniger Komplexität |
| Neue JS-Abstraktionen | Kein Framework — Vanilla JS + IIFE-Struktur |
| Dichte-Erhöhung (mehr Info als nötig) | Wizard > Inspector-Panel |
| Externe Dependencies | Aktuell keine — alles Vanilla |

---

## 12. Referenzen für KI-Design

### UI UX Pro Max Skill-Nutzung

Bei Design-Entscheidungen dieses Skill nutzen:

```bash
python src/ui-ux-pro-max/scripts/search.py "figma plugin design system" --domain style
python src/ui-ux-pro-max/scripts/search.py "a/b testing tool interface" --domain product
python src/ui-ux-pro-max/scripts/search.py "developer tool ui" --domain ux
```

### Relevante UI UX Pro Max Styles

| Style | Relevanz |
|---|---|
| #1 Minimalism & Swiss Style | Enterprise-Feeling, Inter, Grid |
| #38 Neubrutalism | Figma-Apps, klare Borders |
| #5 Minimal Swiss (Typo) | Inter-only, Weight-Variation |
| #31 Financial Trust (Typo) | IBM Plex, professionell |
| #43 AI-Native UI | Chat/Streaming, minimal Chrome |

### Relevante Color Palettes (colors.csv #n)

- `#5 SaaS (General)` — Trust blue + orange CTA → nah an #0D99FF
- `#6 Financial Dashboard` — Dark bg, high contrast
- `#42 Banking/Traditional Finance` — Trust navy, premium

---

## 13. Code-Struktur (für Maintenance-Design)

```
figma-plugin/
├── src/
│   ├── code.ts        → Figma-Plugin-Logik (Node-API)
│   └── ui.html        → Komplettes UI (HTML + CSS + JS inline)
└── dist/
    ├── code.js        → Build-Output (esbuild)
    └── ui.html        → Copy von src/
```

**CSS:** Alles inline in `ui.html` `<style>` (kein Framework, keine CSS-Dateien).  
**JS:** Vanilla JS in `<script>` am Ende von `ui.html`.  
**Build:** `npm run build` (esbuild + copy).

---

## 14. Pre-Release Checklist (aus UI UX Pro Max)

- [ ] Keine Hardcode-Hex für Figma-Tokens (außer Brand/Status)
- [ ] `cursor: pointer` auf allen klickbaren Elementen
- [ ] Hover-States mit smooth transitions (120–250ms)
- [ ] Focus-States sichtbar für Keyboard-Navigation
- [ ] `prefers-reduced-motion` respektiert (keine Bewegung bei Animationen)
- [ ] Dark Mode: alle Notices/Badges sichtbar
- [ ] Input-Felder: Tastatureingabe funktioniert (kein Capture-Block)
- [ ] 360px Breite eingehalten (Figma Sidebar)
- [ ] Keine Emojis als Icons
- [ ] SVG-Icons via currentColor (erben Textfarbe automatisch)
- [ ] Segmented Control: aktiver State visuell eindeutig
- [ ] Upgrade-Banner: auf allen relevanten Screens sichtbar
