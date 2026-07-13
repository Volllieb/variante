# Brand Guidelines — Variante

> v2 — Kompletter Design-Pivot weg von "Figma-nativ + Dark-Aurora-Glass" hin zu einem
> eigenen, monochromen Dashboard-System ("Panda": nur Schwarz/Weiß/Grau + 3 Funktionsfarben).
> Struktur 1:1 vom Vercel-Dashboard übernommen und auf A/B-Testing übersetzt.
> Gilt für **alle vier Oberflächen**: Web-Dashboard, Landingpage, Login, Figma-Plugin.

---

## 1. Produkt-Identität & Design-Richtung

| Attribut | Wert |
|---|---|
| **Produkt** | Variante — A/B-Testing aus Figma, kein Dev nötig |
| **Schreibweise** | **Eigene Flächen:** „variante" (klein, Stilmittel) — **Offizielle/Fremdflächen:** „Variante" (groß, z. B. Stripe, Kreditkartenabrechnung, Impressum, Rechnungen) |
| **Oberflächen** | Landingpage · Login/Signup · Web-Dashboard · Figma-Plugin |
| **Referenz-Struktur** | Vercel-Dashboard (Sidebar-Nav, Workspace-Bar, Card-Grid, Toolbar-Pattern) |
| **Farbwelt** | Monochrom (Schwarz/Weiß/Grau) — **kein** Marken-Akzentton mehr |
| **Maskottchen-Logik** | Panda = schwarz-weiß → rechtfertigt die rein monochrome Palette |
| **Design-Prinzip** | Technisch, übersichtlich, strukturiert — man sieht immer sofort, wo man ist und was man tun kann |
| **Free/Pro-Prinzip** | Eingeschränkte Bereiche bleiben **sichtbar**, nie versteckt — Upsell durch Sichtbarkeit + klare Kennzeichnung |
| **Tonalität** | Direkt, dev-frei, ermächtigend, „volle Kontrolle" |


**Abgelöst:** Das bisherige Dark-Aurora/Glassmorphism-System der Landingpage/des Dashboards
(Violet/Fuchsia-Gradients, Blur-Blobs, `bg-white/[0.03]`-Glass-Cards) sowie der Figma-Blue
(`#0D99FF`) als eigenständige Markenfarbe. Siehe [Abschnitt 9 – Migration](#9-migration--was-sich-ändert).

---

## 2. Design Tokens — Farbsystem

### 2.1 Basis (monochrom, für alle App-Oberflächen: Dashboard, Login, Landingpage)

```css
--bg-0:           #000000;   /* Seiten-Canvas, Sidebar */
--bg-1:           #0a0a0a;   /* Card-Fill, eine Stufe heller */
--bg-2:           #111111;   /* Nested Fill: aktiver Nav-Eintrag, Search-Input, Hover */
--border:         rgba(255,255,255,.10);   /* Standard-Hairline */
--border-strong:  rgba(255,255,255,.18);   /* Hover / betonte Trennung / gesperrte Cards */
--text:           #ededed;                 /* Primärtext */
--text-2:         rgba(237,237,237,.62);   /* Sekundärtext */
--text-3:         rgba(237,237,237,.40);   /* Meta/Placeholder/disabled */
```

**Regel:** Keine zusätzlichen Grautöne erfinden. Jede neue Text-/Border-Abstufung leitet sich
aus Weiß-Opacity ab (skaliert automatisch, kein Extra-Hex-Wert nötig).

### 2.2 Inverted (Primär-Buttons, CTAs)

```css
--fill-invert:      #ffffff;
--text-on-invert:   #000000;
```

Primär-Buttons sind immer weiß gefüllt mit schwarzem Text (nie farbig) — z. B. „New test",
„Upgrade", „Sign in". Genau ein invertierter Button pro Screen/Section.

### 2.3 Funktionsfarben — genau 3, nur für Bedeutung, nie Dekoration

```css
--ok:        #2fd76c;   --ok-bg:   rgba(47,215,108,.12);   /* aktiv / live / Erfolg */
--pro:       #f5a623;   --pro-bg:  rgba(245,166,35,.12);   /* gesperrt / Pro / Upgrade */
--err:       #f5455c;   --err-bg:  rgba(245,69,92,.12);    /* Fehler */
```

Keine vierte Funktionsfarbe hinzufügen. „Draft"/neutral nutzt `--text-3` + `--bg-2`, keine eigene Farbe.

### 2.4 Figma-Plugin-spezifisch — "Figma-native, nicht Panda"

Das Plugin läuft **in** Figma, nicht daneben. Ein Plugin, das wie ein Fremdkörper aussieht
(schwarzes Panda-Dashboard in Figmas heller/dunkler UI), fühlt sich billig an. Figma-Nutzer
erwarten native Widgets, native Focus-Rings, native Light/Dark-Adaption. Das ist **kein**
Kompromiss bei der Brand-Identity — es ist Respekt vor dem Host-Kontext.

**Prinzip:** Würde ein Figma-Nutzer denken „aha, ein Figma-Plugin" oder „was ist das für ein
fremdes Ding da in meiner Sidebar"? Ersteres ist das Ziel. Die Marke „Variante" transportiert
sich über Logo, Tonalität und die 3 Farbtupfer — nicht über einen komplett eigenen Look.

**Was reinkommt (Panda-Anteil):**
- Die **3 Funktionsfarben** auf Figma-Status-Tokens gemappt
- Dieselbe **Status-Ikonografie** (Dot/Ring, Badges) wie im Dashboard
- Gleiche **Gating-Sprache** (Pro-Features sichtbar, nicht versteckt)
- Gleiche **Tonalität** und **Terminologie**

**Was rausfliegt:**
- `#0D99FF` als eigener Akzent — Buttons/Fokus nutzen Figmas native Tokens
- Shadows (`--elev-0` bis `elev-3`), Gradients, `brand-subtle`-Hintergründe
- Selbstgebaute Button-/Input-/Card-Styles zugunsten von `--figma-color-*`

**Token-Mapping:**

| Panda-Token | Figma-Token |
|---|---|
| `--ok` / `--ok-bg` | `--figma-color-bg-success` / `--figma-color-text-success` |
| `--pro` / `--pro-bg` | `--figma-color-bg-warning` / `--figma-color-text-warning` |
| `--err` / `--err-bg` | `--figma-color-bg-danger` / `--figma-color-text-danger` |
| Hintergrund, Text, Border | `--figma-color-bg`, `--figma-color-text`, `--figma-color-border` |

Das Plugin bekommt **keinen eigenen Akzent mehr** — Figma's eigene native Darstellung bestimmt
das Look & Feel.

### 2.5 Radius

```css
--r-card:   10px;   /* Cards */
--r-ctrl:   6px;    /* Buttons, Inputs, Icon-Buttons, Badges */
--r-pill:   5px;    /* Kleine Tags/Status-Pills */
--r-full:   50%;    /* Avatare */
```

Kein Schatten (`box-shadow`), kein Gradient, kein Blur — irgendwo im System. Tiefe entsteht
ausschließlich über Hairline-Borders + eine Stufe Fill-Helligkeit (`--bg-0` → `--bg-1` → `--bg-2`).

---

## 3. Typografie

### 3.1 Font-Stack

```css
--font-sans: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: ui-monospace, "SF Mono", "Fira Code", monospace;
```

### 3.2 Gewichts-Skala (strikt — nie mehr als diese drei)

| Weight | Einsatz |
|---|---|
| 400 (regular) | Fließtext, Beschreibungen, sekundäre Werte |
| 500 (medium) | Section-Labels, aktive Nav-Items, Kartentitel, Zahlen/Werte |
| 600 (semibold) | Buttons, Badges/Pills, Alert-Headline |

**Nie** 700/800 verwenden — auch nicht auf der Landingpage. Hierarchie entsteht über Gewicht
und Farbe (`--text` vs. `--text-2` vs. `--text-3`), nicht über große Size-Sprünge.

### 3.3 Monospace-Regel

Monospace **ausschließlich** für Maschinenwerte: Kontingente (`8.2K / 10K`), IDs (`9vK5j3zdz`),
Pfade/URLs, Zähler, Test-Token. Signalisiert „das ist Daten", nie für Prosa oder Labels.

### 3.4 Size-Skala nach Oberfläche

| Kontext | Base | Meta/Klein | Hero/Emphasis |
|---|---|---|---|
| **Dashboard / Login** (dicht) | 13px | 11px | 15–16px (Kartentitel) |
| **Landingpage** (luftig) | 16px | 13px | 44–56px (Hero-Headline, responsive) |
| **Figma-Plugin** (360px Sidebar) | 12px | 10–11px | 13px (Titel) |

Landingpage nutzt denselben Font-Stack und dieselbe Gewichts-Skala — nur größer skaliert und
mit mehr Zeilenhöhe (`line-height: 1.5–1.6` statt 1.3–1.4 im Dashboard).

---

## 4. Layout & Spacing

### 4.1 App-Shell (Dashboard, künftig auch Login-Rahmen)

```
┌─────────────────────────────────────────────────────────┐
│ Topbar: [Panda] Workspace · Plan-Pill │ All tests ⌄ │ Overview │
├───────────┬───────────────────────────────────────────────┤
│ Sidebar   │ Toolbar: Suche (volle Breite) │ Sortieren │ Grid │ List │ CTA │
│ 200px     ├───────────────────────────────────────────────┤
│ fixed     │ Content (zweispaltig: 38% Übersicht / 62% Liste) │
└───────────┴───────────────────────────────────────────────┘
```

- **Sidebar:** 200px fest, `border-right: 1px solid var(--border)`, Nav-Items 7px/9px Padding, 6px Radius
- **Topbar:** volle Breite, `border-bottom: 1px solid var(--border)`, 12px/20px Padding
- **Toolbar:** eine Ebene **über** dem zweispaltigen Content, spannt die **gesamte Content-Breite**
  (nicht nur über der Tests-Spalte) — Suche nimmt den verfügbaren Platz (`flex: 1`), danach feste
  Icon-Buttons, danach der Primär-CTA. Siehe 5.2.
- **Content:** zwei Spalten mit `gap: 20px` — linke Spalte (Usage/Alerts/Activity) schmaler & gestapelt,
  rechte Spalte (Tests-Grid) breiter, `grid-template-columns: 1fr 1fr` für Karten
- **Navigation:** Single-Page mit Anker-Sektionen. Overview (Stats-Bar + Test-Liste) immer oberhalb
  der Scroll-Fold sichtbar. Sidebar-Links scrollen per `href="#..."` zu Plugin, Snippet, Billing,
  Account. Kein client-seitiges Routing für Sections — alles eine Seite, Sidebar als Sprungnavigation.

### 4.2 Landingpage-Shell ("gleiches System, mehr Luft")

- Gleiche Tokens (`--bg-0`, `--border`, Card-Style) wie das Dashboard — bewusst **keine** eigene
  Marketing-Palette.
- Section-Abstand: 64–120px vertikal zwischen Hero/Features/Pricing/Footer (App-Dichte: 16–20px).
- Feature-/Pricing-Cards nutzen exakt dieselben Card-Tokens (`--bg-1`, `--r-card`, Hairline-Border) —
  das signalisiert „das ist dasselbe Produkt", keine separate Marketing-Fassade.
- Pricing-Vergleich (Free vs. Pro) verwendet dieselbe Gating-Sprache wie das Dashboard
  (siehe Abschnitt 6) statt einer eigenen Pricing-Tabellen-Optik.

### 4.3 Spacing-Skala (gemeinsam)

```css
--gap-xs: 4px;  --gap-sm: 8px;  --gap-md: 12px;  --gap-lg: 20px;  --gap-xl: 32px;
```

Dashboard nutzt überwiegend `xs–md`, Landingpage überwiegend `lg–xl` plus die großen
Section-Abstände aus 4.2.

---

## 5. Component Patterns

### 5.1 Sidebar-Nav-Item

```
┌─────────────────────────────┐
│ 🧪  Tests                   │  ← aktiv: bg-2 + weight 500
│ 🚀  Results                 │  ← inaktiv: text-2
│ 📊  Analytics          🔒   │  ← gesperrt: text-3 + Lock-Icon rechts
└─────────────────────────────┘
```

- Aktiv: `background: var(--bg-2); font-weight: 500; color: var(--text)`
- Inaktiv: `color: var(--text-2)`, kein Background
- **Gesperrt (Free-Plan):** `color: var(--text-3)` + `<i class="ti ti-lock">` rechtsbündig —
  **Item bleibt immer in der Liste**, wird nie entfernt oder ausgeblendet

### 5.2 Toolbar-Pattern (Seiten-Ebene, nicht Section-Ebene)

Wie bei Vercel liegt die Toolbar **über dem gesamten Content**, nicht nur über einer einzelnen
Karten-Section — die Suche durchsucht global (hier: alle Tests), nicht nur die sichtbare Spalte.
Reihenfolge, Suche nimmt den Restplatz ein (`flex: 1`), Rest ist fixed-width und rechtsbündig:

```
[Suche ...................................] [Sortieren] [Grid] [List] [+ New test]
```

- Suche: `background: var(--bg-1); border: 1px solid var(--border)`, Icon + Placeholder, `flex: 1`
- Sortieren/Filter: quadratischer Icon-Button (34×34px), gleiche Border/Fill wie Suche
- Grid/List-View-Toggle: zwei quadratische Icon-Buttons nebeneinander, aktiver Zustand
  `background: var(--bg-2); border-color: var(--border-strong)`
- Primär-CTA: invertiert (weiß/schwarz), `+`-Icon vorangestellt, immer ganz rechts

Section-Labels (z. B. „Tests", „Usage") bleiben darunter, ohne eigene Toolbar — die Toolbar
gilt für die ganze Seite.

### 5.3 Card (Basis-Baustein für alles)

```css
.card {
  background: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: var(--r-card);
  padding: 14px 16px;
}
```

Kein Schatten, kein Hover-Lift — nur `border-color: var(--border-strong)` bei Hover, wenn klickbar.

### 5.4 Status-Indikator (Dot/Ring) — überall wiederverwendet

| Zustand | Darstellung |
|---|---|
| Aktiv/Live | gefüllter Kreis, `--ok` |
| Draft/Neutral | gestrichelter Kreis, `--text-3` |
| Fehler | gefüllter Kreis, `--err` |

Dieselbe Ikonografie in: Test-Karten (oben rechts), Activity-Feed, künftig auch im Figma-Plugin
(Ergebnis-Screen, Dashboard-Screen).

### 5.5 Badges / Pills

```css
.pill {
  font-size: 11px; font-weight: 600;
  border-radius: var(--r-pill);
  padding: 2–3px 7–8px;
}
```

- Neutral: `background: var(--bg-2); border: 1px solid var(--border); color: var(--text-2)`
- Erfolg: `background: var(--ok-bg); color: var(--ok)`
- Pro/Gesperrt: `background: var(--pro-bg); color: var(--pro); text-transform: uppercase`
- Fehler: `background: var(--err-bg); color: var(--err)`

### 5.6 Buttons

| Type | Style |
|---|---|
| Primär (invertiert) | `background: #fff; color: #000; font-weight: 600` |
| Sekundär (outlined) | `background: transparent; border: 1px solid var(--border-strong); color: var(--text)` |
| Icon-Button | quadratisch, `border: 1px solid var(--border); background: var(--bg-1)` |

### 5.7 Usage/Quota-Row

```
🔘 Visitors tracked                    8.2K / 10K
```

- Label links (Icon + `--text-2`), Wert rechts in **Monospace**, `--text-2`
- Bei Erreichen des Limits: Wert-Farbe wechselt auf `--pro` (nicht `--err` — Limit ist ein
  Upgrade-Anlass, kein Fehler)
- Free-Plan-Limits (z. B. „1 / 1"-Tests) erhalten einen Fortschrittsbalken:
  `background: var(--bg-2); height: 4px; border-radius: 2px` mit `--text`-Füllung —
  signalisiert Auslastung auf einen Blick, ohne zusätzliches Label

### 5.8 Stats-Bar (Dashboard Overview)

Vier Cards in einer Zeile direkt unter der Toolbar, oberhalb der Test-Liste:

| Card | Inhalt |
|---|---|
| Active tests | Zahl + Free: `1 / 1` mit Fortschrittsbalken (siehe 5.7) |
| Total visitors | Zahl, Monospace |
| Conversions | Zahl, Monospace |
| Plan | Free: „Upgrade →"-Button (invertiert) / Pro: „Pro" mit grünem Dot (`--ok`) |

Cards nutzen exakt denselben Card-Style wie 5.3, `display: flex; flex-direction: column; gap: 4px`.
Label in `--text-3` (11px, weight 500), Wert in `--text` (15–16px, weight 500, Monospace für Zahlen).

### 5.9 Winner-Alert

Prominente Zeile zwischen Stats-Bar und Test-Liste, nur wenn ein Test einen signifikanten Winner
hat UND Nutzer Pro-Plan hat:

```
⚡ Hero Button Test: B leads by +28% — View →
```

- Icon + Testname + Variant-Info + Uplift + Link
- `background: var(--bg-1); border: 1px solid var(--border); border-left: 3px solid var(--ok)`
- Farbe des linken Balkens: `--ok`-Grün — Winner ist Erfolg, kein Alarm

### 5.10 Empty State / Figma-Prompt

Wenn keine Tests existieren, erscheint statt der leeren Test-Liste ein Figma-Prompt mit
Schritt-für-Schritt-Anleitung. Die weiteren Zustände (Awaiting Figma, Test Received, Timeout)
sind temporäre UI-Zustände derselben Komponente und folgen denselben Token-Regeln.

**Visuelles Pattern (IDLE):**
- Zentrierte Card (`--bg-1`, `--r-card`, Hairline-Border) innerhalb des Content-Bereichs
- Icon (🎨) + Headline (`font-weight: 500`) + nummerierte Schrittliste in `--text-2`
- Ein invertierter Primär-Button („Open Figma Plugin") + sekundärer Cancel-Link in `--text-3`
- Setup-Guide-Link in `--text-3` unterhalb der Buttons

**Regel:** Der Prompt nutzt exakt dieselben Card-, Button- und Typografie-Tokens wie der Rest
des Dashboards — keine Sonderbehandlung, kein separates „Onboarding-Theme".

---

## 6. Free/Pro-Gating-Sprache (Kernstück der Anforderung)

Das Produkt muss immer zeigen: „du hast Kontrolle, aber manche Bereiche sind eingeschränkt" —
**nie** durch Verstecken, sondern durch sichtbare, klar erklärte Beschränkung.

1. **Nav-Ebene:** Gesperrter Menüpunkt bleibt sichtbar, `text-3` + Lock-Icon rechts (5.1)
2. **Karten-Ebene:** Gesperrte Karte bleibt an ihrer natürlichen Position im Grid,
   `opacity: .55` + `border: 1px solid var(--border-strong)` + `PRO`-Badge (oben rechts) +
   ein Satz Begründung in `--text-3` (z. B. „Available on Pro")
3. **Aktions-Ebene:** Upgrade-CTA ist nie ein Modal-Interrupt, sondern ein sichtbarer,
   permanent platzierter Button/Pill (Usage-Karte, Alerts-Karte, Pricing-Section) —
   dieselbe visuelle Sprache auf allen vier Oberflächen
4. **Nie:** Feature komplett ausblenden, generischen „Upgrade"-Hinweis ohne Kontext,
   Pop-up-Upsell beim Klick

---

## 7. Screen-/Seiten-Struktur pro Oberfläche

### 7.1 Web-Dashboard

Sidebar (Tests, Results, Activity log, Analytics🔒, Domains · Plugin token, Integrations, Team🔒 ·
Usage) + Topbar (Workspace-Switcher, All tests, Overview) + zweispaltiger Content
(Usage/Alerts/Recent activity ↔ Tests-Grid mit Toolbar). Details: Abschnitt 4.1, 5.1–5.7.

### 7.2 Landingpage

Hero (großer Type-Scale, invertierter CTA-Button) → Feature-Cards (identische Card-Tokens wie
Dashboard) → Pricing (Free/Pro mit der Gating-Sprache aus Abschnitt 6, keine separate
Pricing-Tabellen-Optik) → Footer. Gleiche Farbwelt wie das Dashboard, nur luftiger (4.2).

### 7.3 Login/Signup

Zentrierte Card (`--bg-1`, Hairline-Border, `--r-card`) auf `--bg-0`-Canvas. Ein invertierter
Primär-Button („Sign in"), Sekundär-Links in `--text-2`. Fokus-State auf Inputs: `border-color:
var(--border-strong)` + `outline: 1px solid rgba(255,255,255,.25)` — **kein farbiger Fokus-Ring**,
da kein Marken-Akzent mehr existiert.

### 7.4 Figma-Plugin

**Strategie:** Figma-native, nicht Panda. Das Plugin respektiert den Host-Kontext — es soll sich
anfühlen wie ein natives Figma-Feature, nicht wie eine eingebettete Fremd-App.

- **Farbwelt:** `--figma-color-*`-Tokens (Light/Dark automatisch), kein eigenes Farbsystem.
  Details und Token-Mapping siehe §2.4.
- **Kein `#0D99FF`-Akzent mehr** — Buttons, Fokus, Hover nutzen Figmas native Darstellung.
- **Keine eigenen Schatten, Gradients, Blur** — Figma hebt Elemente selbst.
- **Gating:** Lock-Icon + Pro-Badge-Konvention aus Abschnitt 6 für gesperrte Wizard-Optionen
  (z. B. Multivariate-Test-Option).
- **Status:** Dot/Ring aus 5.4 für Test-/Ergebnis-Zustände.
- **Struktur:** Wizard, 360×560px, bestehende Screen-Flow- und Polling-Pattern bleiben gültig.

**Migration (konkret):**
1. `--brand`/`--brand-hover`/`--brand-subtle`/`--brand-border` entfernen
2. Buttons, Inputs, Cards auf `--figma-color-bg`, `--figma-color-border`, `--figma-color-text` umstellen
3. Funktionsfarben mappen (siehe §2.4 Token-Mapping)
4. Status-Badges und Dots visuell 1:1 wie Dashboard, aber mit Figma-Tokens gerendert
5. Keine eigenen Schatten mehr

---

## 8. Anti-Patterns (nicht tun)

| Anti-Pattern | Grund |
|---|---|
| Marken-Akzentfarbe (Violet/Fuchsia/Figma-Blue) als UI-Farbe | Widerspricht der monochromen „Panda"-Identität |
| Gradient, Blur, Glow, Aurora-Hintergründe | Bricht mit der flachen, technischen Optik |
| Box-Shadow/Card-Lift bei Hover | Tiefe entsteht nur über Border + Fill-Stufe |
| Gesperrte Features ausblenden | Upsell-Strategie ist Sichtbarkeit, nicht Verstecken |
| Font-Weight 700/800 | Hierarchie läuft über 400/500/600, sonst wirkt es wieder wie das alte Marketing-System |
| Vierte Funktionsfarbe einführen | Nur `ok`/`pro`/`err` — mehr Farbe verwässert die Bedeutung |
| Eigene Marketing-Palette auf der Landingpage | Nutzer-Entscheidung: „gleiches System, mehr Luft" — keine zweite Optik |
| Panda-Monochrom-Palette ins Figma-Plugin zwingen | Plugin läuft *in* Figma — natives Look & Feel hat Vorrang vor Marken-Durchsetzung (§2.4) |
| Modal-Upsell beim Klick auf gesperrtes Feature | Beschränkung muss vorher sichtbar sein, nicht als Überraschung |

---

## 9. Migration — was sich ändert

Betroffene Dateien (Umsetzung folgt in separaten Schritten, nicht Teil dieses Dokuments):

- [ab-tool/app/dashboard/DashboardClient.tsx](ab-tool/app/dashboard/DashboardClient.tsx) —
  komplett von Dark-Aurora/Glass (Violet/Fuchsia-Gradients, `bg-white/[0.03]`) auf die neue
  Sidebar+Card-Struktur umbauen
- [ab-tool/app/login/page.tsx](ab-tool/app/login/page.tsx) — auf zentrierte Card im neuen
  Token-System umstellen
- Landingpage (`ab-tool/app/page.tsx`) — Hero/Features/Pricing im „gleiches System, mehr Luft"-Ansatz
- [ab-tool/app/globals.css](ab-tool/app/globals.css) — `@theme`-Block auf die Tokens aus
  Abschnitt 2 umstellen, `lp-*`-Aurora-Utilities (Zeilen 58–143) entfernen
- [figma-plugin/src/ui.html](figma-plugin/src/ui.html) — `#0D99FF`-Brand-Variablen entfernen,
  Lock/Pro-Badge-Konvention aus Abschnitt 6 in Wizard-Screens 4 (Metric Options) einbauen

---

## 10. Icon-Styleguide (produktweit)

- Tabler Outline Icons (`ti ti-*`), `currentColor`, 14–16px Standard, 20–22px Sidebar/Avatare
- Keine Emojis als funktionale Icons (Panda-Emoji 🐼 ist Ausnahme: reines Avatar-Platzhalter-Symbol,
  kein UI-Icon)
- Stroke-basiert, dünn (1.1–1.5), nie gefüllt/Bold-Variante — Ausnahme: Status-Kreise (5.4) sind
  bewusst gefüllt, da sie einen Zustand markieren, kein Aktions-Icon sind
