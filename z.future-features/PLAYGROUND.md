# PLAYGROUND.md — Figma-Plugin Playground

> **Status:** Spezifikation v2. Stand 01.07.2026.
> **Ziel:** Interaktiver Demo-Durchlauf des echten Plugin-Wizards — mit vordefiniertem Element, animiertem Live-Dashboard und Sandbox-Banner.

---

## 1. Konzept

Der Playground simuliert das Figma-Plugin in einer 360×560px-Box (exakt die Plugin-Größe). Der Nutzer durchläuft **denselben Wizard wie im echten Plugin** — Connect → Element → Variant B → Goal → Snippet → Dashboard. Alle Daten sind vorausgefüllt, keine API-Calls.

Der Clou: Auf der Dashboard-Seite **animieren die Zahlen live hoch** — als würden echte Besucher reinkommen. Nach 3–4 Sekunden steht ein signifikanter Winner da. Das erzeugt den Aha-Moment.

Ein **Sandbox-Banner** („You're in the sandbox — not a real test") ist durchgehend sichtbar.

**Zielgruppe:** Designer, die das Plugin noch nicht installiert haben.

**Nicht-Ziel:** Kein Figma-API-Zugriff, keine KI-Generierung, kein Login.

---

## 2. Technische Basis

| Feld | Wert |
|---|---|
| **URL** | `https://www.getvariante.com/playground` |
| **Framework** | Next.js 16 (App Router) — Client Component (`'use client'`) |
| **CSS** | Tailwind |
| **Font** | `Inter, system-ui, sans-serif` |
| **Größe Plugin-Box** | 360×560px (fix), `border-2`, `shadow-xl`, `rounded-xl` |
| **Responsive** | Desktop: Box links, Erklärungen rechts. Mobile: Box oben, Erklärungen darunter. |

---

## 3. Seitenlayout

### 3.1 Desktop

```
┌──────────────────────────────────────────────────────────────────────┐
│  [← Back to home]          Playground                                │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │  🏖️ You're in the sandbox — this is a demo, not a real test.    ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌──────────────────────┐   ┌──────────────────────────────────────┐│
│  │                      │   │                                      ││
│  │   Figma-Plugin-Box   │   │  👆 What's happening?               ││
│  │   360 × 560 px       │   │                                      ││
│  │                      │   │  Contextual explanation for the     ││
│  │   (Plugin-Wizard     │   │  current screen.                    ││
│  │    with demo data)   │   │                                      ││
│  │                      │   │  ──────────────────────────────      ││
│  │                      │   │                                      ││
│  │                      │   │  Step 3 of 6                         ││
│  │                      │   │  [● ● ● ○ ○ ○]                      ││
│  │                      │   │                                      ││
│  └──────────────────────┘   └──────────────────────────────────────┘│
│                                                                      │
│  [🎨 Install Figma Plugin →]  [✨ Create free account →]           │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 Mobile

Plugin-Box oben (320px Breite), Erklärungen als Cards darunter. Sandbox-Banner + CTAs sticky.

---

## 4. Wizard-Verlauf (entspricht echtem Plugin)

Der Playground folgt dem echten 6-Schritt-Wizard. Jeder Schritt ist ein Screen in der Box + eine Erklärung daneben.

```
Schritt 1: Welcome        →  Connect („Start demo")
Schritt 2: Pick Element   →  Pre-filled element
Schritt 3: Variant B      →  Pre-filled Figma layer
Schritt 4: Conversion Goal →  Pre-filled goal
Schritt 5: Install Snippet →  Demo snippet
Schritt 6: Dashboard       →  ✨ Animierte Live-Zahlen
```

### Navigation

- **Plugin-Box:** Der Nutzer klickt die echten Plugin-Buttons. Jeder Klick führt zum nächsten Screen.
- **Erklärungs-Panel (rechts):** Zeigt Kontext zum aktuellen Screen + Step-Indikator.
- **Reset-Button:** Unter der Box: „↺ Start over".
- **Kein manuelles Zurück** im Playground (vereinfacht).

---

## 5. Voraussetzungen im echten Workflow

Der Playground überspringt diese Schritte — aber für den echten Einsatz brauchst du:

| Voraussetzung | Warum | Im Playground |
|---|---|---|
| **Figma Plugin** (kostenlos) | Läuft in Figmas Sidebar, steuert den Wizard | Wird simuliert (360×560-Box) |
| **Variante Browser Extension** (Chrome, kostenlos) | Klickt Elemente auf deiner Live-Site an — das Plugin selbst kann nicht auf Browser-Tabs zugreifen | Übersprungen (Element ist vorausgewählt) |
| **Variante Account** (Free) | Speichert deine Tests, tracked Conversions | Übersprungen (kein Login nötig) |
| **Site-CSS für Variant-A-Vorschau** | Das vollständige Site-CSS (inkl. `:root`-Variablen) wird von der Extension erfasst, ist aber **erst nach der KI-Generierung** im Plugin verfügbar. Auf Screen 2 (Pick Element) erscheint Variant A nur als Text-Chip („BUTTON „Get Started""), nicht als gerenderte Vorschau. | Übersprungen (Element ist vorausgewählt, Vorschau nicht nötig) |

> **Ohne Extension kein Element-Picking.** Das Figma-Plugin läuft in Figmas Sandbox — es kann deine Browser-Tabs nicht sehen. Die Extension ist die Brücke: einmal installiert, funktioniert sie mit jedem Plugin-Update weiter.
>
> **Variant-A-Vorschau erst nach Generation.** Das `siteCss` wird vom Server erst in der `/api/generate`-Response mitgeliefert. Vorher (Screen 2) sieht der Nutzer nur einen Text-Chip mit Element-Typ und Label — kein gerendertes HTML mit Original-CSS. Das ist eine bekannte UX-Lücke: Der Nutzer kann erst nach der KI-Generierung visuell prüfen, ob das richtige Element gepickt wurde.

---

## 6. Sandbox-Banner (immer sichtbar)

```
┌──────────────────────────────────────────────────────────────────┐
│  🏖️  You're in the sandbox — this is a demo, not a real test.   │
└──────────────────────────────────────────────────────────────────┘
```

- Position: Unter der Top-Nav, über der Plugin-Box.
- Styling: `bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-2 text-sm text-amber-800`
- Sichtbar auf **allen** Screens.

---

## 7. Screens im Detail

### 7.1 Schritt 1/6 — Welcome / Connect

**Plugin-Box:**

```
┌──────────────────────────────────┐
│                                  │
│         ┌──┐                     │
│         │▐▐│  Variante           │
│         │▐▐│                     │
│         └──┘                     │
│                                  │
│  A/B testing from Figma —        │
│  no dev needed.                  │
│  Pick an element, AI generates   │
│  Variant B.                      │
│                                  │
│  ┌──────────────────────────┐    │
│  │  🚀 Try the demo →       │    │
│  └──────────────────────────┘    │
│                                  │
│          ─────────────────       │
│                                  │
│  ┌──────────────────────────┐    │
│  │  I have an account —      │    │
│  │  connect                  │    │
│  └──────────────────────────┘    │
│                                  │
└──────────────────────────────────┘
```

- Exakt der echte Connect-Screen, nur der Token-Mode ist ausgeblendet.
- Brand-Mark (zwei Balken), „Variante" in Bold.
- Primär: **„🚀 Try the demo →"** → Schritt 2.
- Sekundär: „I have an account — connect" → disabled, kein Effekt.

**Erklärungs-Panel:**

> ### 👋 Welcome to Variante
>
> This is a **sandboxed demo** of the Variante Figma plugin — pixel-identical to what you'd see in Figma's sidebar.
>
> We've prepared a demo website and a pre-selected element so you can walk through the full workflow without installing anything.
>
> **Voraussetzung im echten Workflow:** Du brauchst die kostenlose [Variante Browser Extension](https://chromewebstore.google.com/detail/variante-—-ab-test-elemen/hopbdjfpmknemchgoonjommfemgihkbh) (Chrome), um Elemente auf deiner Live-Site anzuklicken. Im Playground überspringen wir das.
>
> In the real plugin, you'd connect your account here. For this demo, just click **„Try the demo"**.

---

### 7.2 Schritt 2/6 — Pick Element

**Plugin-Box:**

```
┌──────────────────────────────────┐
│  ← Back        Connect    1 / 6  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                  │
│  ┌──────────────────────────────┐│
│  │  ┌─┐ Browser Extension       ││
│  │  └─┘                        ││
│  │  ⚠️ Required before you     ││
│  │  can pick elements.         ││
│  │  The element picker runs in  ││
│  │  your browser. Install once. ││
│  │  ┌──────────────────────────┐││
│  │  │  ↓ Download Extension    │││
│  │  │  (skipped in demo)       │││
│  │  └──────────────────────────┘││
│  └──────────────────────────────┘│
│                                  │
│  Selected element                │
│  ┌──────────────────────────────┐│
│  │  ┌─┐ BUTTON  "Get Started"   ││
│  │  └─┘                         ││
│  └──────────────────────────────┘│
│                                  │
│  ┌──────────────────────────┐    │
│  │  Continue to Variant B →  │    │
│  └──────────────────────────┘    │
│                                  │
└──────────────────────────────────┘
```

- **Oben:** Extension-Hinweis (wie im echten Plugin): „⚠️ Required before you can pick elements." Der Download-Button ist disabled mit dem Zusatz „(skipped in demo)".
- **Element-Chip:** `┌─┐ BUTTON "Get Started"` — vorausgefüllt.
- **Footer-Button:** „Continue to Variant B →" → Schritt 3.

**Erklärungs-Panel:**

> ### 🎯 Pick what to test
>
> **So läuft's im echten Workflow:** Du öffnest deine Website und nutzt die **kostenlose Variante Browser Extension** für Chrome. Ein Klick auf ein beliebiges Element — Button, Headline, Hero-Section — und die Extension erfasst HTML, CSS und Seitenkontext automatisch.
>
> **Ohne Extension kein Picking.** Das Plugin selbst läuft in Figmas Sandbox und kann nicht auf deine Browser-Tabs zugreifen. Die Extension ist die Brücke. Einmal installiert, funktioniert sie mit jedem Plugin-Update weiter.
>
> **In dieser Demo** haben wir einen „Get Started"-Button auf `getvariante.com` vorausgewählt. Keine Extension nötig.
>
> **Im echten Plugin** erscheint Variant A an dieser Stelle nur als Text-Chip — nicht als gerenderte Vorschau mit Site-CSS. Das CSS der Originalseite wird erst mit der `/api/generate`-Response ans Plugin geliefert (Screen 5). Die visuelle Variant-A-Vorschau gibt's also erst nach der KI-Generierung.
>
> Click **„Continue"** to see the Variant B you'd select in Figma.

---

### 7.3 Schritt 3/6 — Variant B in Figma

**Plugin-Box:**

```
┌──────────────────────────────────┐
│  ← Back   Variant B in Figma 3/6 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                  │
│  Click any layer in Figma that   │
│  represents Variant B — a single │
│  button, heading, or section.    │
│                                  │
│  Layer selected                  │
│  ┌──────────────────────────────┐│
│  │  BUTTON "Start free trial"   ││
│  │  Frame: hero > cta-section   ││
│  └──────────────────────────────┘│
│  [Reselect] (disabled in demo)   │
│                                  │
│  ┌──────────────────────────┐    │
│  │  Continue to Goal →       │    │
│  └──────────────────────────┘    │
│                                  │
└──────────────────────────────────┘
```

- Header: „Variant B in Figma" + Step 3/6.
- Progress Bar: 3 von 6 Dots gefüllt.
- Card mit vorausgefülltem Layer: `BUTTON "Start free trial"` mit Pfad `hero > cta-section`.
- „Reselect"-Button vorhanden aber disabled mit Tooltip „(pre-selected for demo)".
- Footer: „Continue to Goal →" → Schritt 4.

**Erklärungs-Panel:**

> ### 🖼️ Select Variant B
>
> This is where the Figma integration shines: you **click any layer in your Figma file** that represents the new version — a redesigned button, a new headline, a different hero image.
>
> Variante reads colors, typography, spacing, and effects directly from your Figma layer. The AI uses this as the design reference for Variant B.
>
> **Was, wenn du das falsche Objekt anklickst?** Kein Problem — im echten Plugin klickst du einfach „Reselect" und wählst ein anderes Layer aus. Die Vorschau aktualisiert sich sofort. Du kannst beliebig oft neu auswählen, bevor du generierst.
>
> **In dieser Demo** ist der Layer vorausgewählt und gesperrt. Da wir die KI-Generierung im Playground überspringen, gibt es kein „falsches" Objekt — der Layer dient nur zur Veranschaulichung des Workflows. Im echten Plugin klickst du dein tatsächliches Figma-Layer.
>
> Click **„Continue"** to set the conversion goal.

---

### 7.4 Schritt 4/6 — Conversion Goal

**Plugin-Box:**

```
┌──────────────────────────────────┐
│  ← Back     Conversion Goal  4/6 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                  │
│  What should we measure?         │
│                                  │
│  ◉ Click on the tested element  │
│    When a visitor clicks the     │
│    BUTTON "Get Started"          │
│                                  │
│  ▶ Advanced settings             │
│                                  │
│  ┌──────────────────────────┐    │
│  │  Generate HTML →          │    │
│  └──────────────────────────┘    │
│                                  │
└──────────────────────────────────┘
```

- Header: „Conversion Goal" + Step 4/6.
- Default-Metrik ausgewählt: „Click on the tested element" mit Radio-Button.
- Beschreibung: „When a visitor clicks the BUTTON „Get Started"".
- Advanced Settings collapsed (kein Effekt im Playground).
- Footer: „Generate HTML →" → **überspringt Generate**, geht direkt zu Schritt 5 (Snippet).
  - ponytail: Im Playground wird kein echtes HTML generiert — wir springen direkt zum Snippet-Screen mit Mock-Daten.

**Erklärungs-Panel:**

> ### 🎯 Define the goal
>
> What counts as a „conversion"? The default is **a click on the element you're testing** — simple and usually what you want.
>
> In the real plugin, you can also pick a different element on the page (e.g. a „Buy now" button elsewhere), use a CSS selector, or track page views.
>
> **In this demo**, the goal is pre-set to „click on the Get Started button". We'll skip the AI generation step and go straight to shipping.
>
> Click **„Generate HTML"** to continue.

---

### 7.5 Schritt 5/6 — Install Snippet

**Plugin-Box:**

```
┌──────────────────────────────────┐
│  ← Back    Install Snippet   5/6 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                  │
│  ┌──────────────────────────────┐│
│  │ ✓ One snippet — every page   ││
│  │ Add it once in <head>.       ││
│  └──────────────────────────────┘│
│                                  │
│  ┌──────────────────────────┐    │
│  │  ✨ Copy prompt            │    │
│  └──────────────────────────┘    │
│  Copies a ready-made prompt for  │
│  Cursor, Copilot, ChatGPT or     │
│  Claude.                         │
│                                  │
│  ┌──────────────────────────┐    │
│  │  Copy snippet manually     │    │
│  └──────────────────────────┘    │
│  ▶ Show snippet code             │
│                                  │
│          ─────────────────       │
│                                  │
│  ┌──────────────────────────┐    │
│  │  View Results →           │    │
│  └──────────────────────────┘    │
│                                  │
└──────────────────────────────────┘
```

- Header: „Install Snippet" + Step 5/6.
- Grüne Notice: „One snippet — every page."
- „✨ Copy prompt"-Button → kopiert einen vorgefertigten Prompt in die Zwischenablage.
- „Copy snippet manually"-Button → kopiert das Demo-Snippet.
- „▶ Show snippet code" → Details-Element mit dem Code.
- **„View Results →"** → Schritt 6 (das animierte Dashboard!).

**Demo-Snippet (nicht funktional):**

```html
<script src="https://cdn.getvariante.com/ab.js"
        data-test="demo-abc123">
</script>
```

**Erklärungs-Panel:**

> ### 🚀 One snippet, done
>
> Add **one `<script>` tag** to your site's `<head>` — that's the entire integration. No deploy pipeline, no dev.
>
> The snippet splits traffic 50/50, serves the right variant, and tracks conversions. Everything else (element, variant, goal) is configured server-side.
>
> **In this demo**, the snippet is a placeholder (`data-test="demo-abc123"`). In the real plugin, you get your actual test token.
>
> Click **„View Results"** — this is where it gets fun. 👇

---

### 7.6 Schritt 6/6 — Dashboard ✨ (animiert)

**Das ist der Star des Playgrounds.** Die Dashboard-Zahlen laufen in ~4 Sekunden von 0 auf die finalen Demo-Werte hoch. Der Nutzer sieht live, wie Besucher reinkommen und sich ein signifikanter Winner abzeichnet.

#### Animations-Sequenz

| Zeit | Was passiert |
|---|---|
| **0.0s** | Dashboard erscheint. Status: „● Running". Alle Zahlen auf 0. |
| **0.3s** | Visitors A + B starten hochzuzählen (schnell, ~20/Sekunde). |
| **0.5s** | Erste Conversions erscheinen (langsamer, ~3/Sekunde). |
| **1.0s** | ~120 Visitors, ~15 Conversions. CR-Prozente berechnen sich. |
| **2.0s** | ~300 Visitors. CR-Unterschied wird sichtbar (A ~12%, B ~18%). |
| **3.0s** | ~500 Visitors. Lift-Zeile erscheint: „▲ +48% lift". |
| **3.5s** | ~700 Visitors. p-Wert fällt unter 0.05. |
| **4.0s** | **Finale Werte.** Winner-Banner erscheint: „🎉 Variant B is winning! Significant at 95%". Status wechselt zu „● Done". |

#### Plugin-Box im Endzustand (nach Animation):

```
┌──────────────────────────────────┐
│  ← Back          Results         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Button "Get Started"            │
│  herocta · getvariante.com       │
│  ─────────────────────────────── │
│  ● Running · 847 visitors        │
│                                  │
│  ┌──────────────────────────────┐│
│  │  🎉 Variant B is winning!    ││
│  │  Significant at 95%          ││
│  └──────────────────────────────┘│
│                                  │
│        A              B          │
│  ────────────  ────────────────  │
│  Visitors       Visitors         │
│    423            424            │
│                                  │
│  Conversions    Conversions      │
│    53             79             │
│                                  │
│  CR             CR         ✨    │
│    12.5%          18.6%          │
│                                  │
│  ─────────────────────────────── │
│  ▲ +50.8% lift (p = 0.02)       │
│  Significant at 95%              │
│                                  │
│  ↻ Refreshes every 30s           │
│                                  │
│  ┌──────────────────────────┐    │
│  │  🎨 Try it yourself →     │    │
│  └──────────────────────────┘    │
│                                  │
└──────────────────────────────────┘
```

- **Winner-Banner** (grün): „🎉 Variant B is winning! Significant at 95%"
- **A/B-Tabelle** mit finalen Werten.
- **Significance-Zeile:** „▲ +50.8% lift (p = 0.02) · Significant at 95%"
- **CTA-Button in der Box (neu):** „🎨 Try it yourself →" — Link zur Figma-Plugin-Seite (oder `/#notify`).

#### Animations-Daten (Tick-Werte)

```
Visitors A:  0 → 30 → 85 → 160 → 250 → 340 → 400 → 423
Visitors B:  0 → 28 → 82 → 158 → 248 → 338 → 400 → 424
Conv A:      0 →  3 →  9 →  18 →  28 →  38 →  48 →  53
Conv B:      0 →  4 → 13 →  26 →  42 →  56 →  70 →  79
CR A:        — → 10% → 11% → 11.3% → 11.2% → 11.2% → 12.0% → 12.5%
CR B:        — → 14% → 16% → 16.5% → 16.9% → 16.6% → 17.5% → 18.6%
Lift:        — → — → — → — → — → +44% → +48% → +50.8%
p-Wert:      — → — → — → 0.31 → 0.12 → 0.06 → 0.03 → 0.02
Signifikanz: — → — → — → — → — → — → „Significant at 95%" erscheint
Winner:      — → — → — → — → — → — → „🎉 Variant B is winning!" erscheint
```

**Erklärungs-Panel (während der Animation):**

> ### 📊 Live Results — watch the numbers
>
> This is what you'd see in the real plugin dashboard, **sped up ~1000×**.
>
> Watch as visitors flow in, conversions accumulate, and statistical significance builds — all in seconds instead of days.
>
> - **Visitors** are split evenly (50/50) between A and B
> - **Conversions** accumulate faster on B — the orange button converts better
> - After enough data, Variante declares **Variant B the winner** at 95% confidence
>
> In reality, this would take hours or days depending on your traffic. The dashboard refreshes every 30 seconds in the Free tier, every 10 seconds in Pro.
>
> ---
>
> ### 🎉 That's the full workflow!
>
> Connect → Pick → Variant B → Goal → Snippet → Measure.
>
> All from Figma. No dev required.
>
> **Ready to try it on your own site?**

---

## 8. CTA-Sektion (unter der Box, immer sichtbar)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   [🎨 Install Figma Plugin →]    [✨ Create free account →]  │
│                                                              │
│   Free tier: 1 experiment · No credit card · 2 min setup    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- Primär-Button: „🎨 Install Figma Plugin →" → Figma Community Page oder `/#notify`.
- Sekundär-Button: „✨ Create free account →" → `/signup`.
- Subline: „Free tier: 1 experiment · No credit card · 2 min setup"

---

## 9. Zustandsautomat

```
WELCOME ──[Try the demo]──→ ELEMENT ──[Continue]──→ VARIANT_B
                                                        │
                                                  [Continue to Goal]
                                                        │
                                                        ▼
                                                       GOAL
                                                        │
                                                  [Generate HTML]
                                             (überspringt Generate)
                                                        │
                                                        ▼
                                                      SNIPPET
                                                        │
                                                  [View Results]
                                                        │
                                                        ▼
                                                   DASHBOARD
                                                   (Animation
                                                     startet
                                                     automatisch)
```

### Zustände

```ts
type Step = 'welcome' | 'element' | 'variant' | 'goal' | 'snippet' | 'dashboard'

type DashboardPhase = 'counting' | 'done'

type PlaygroundState = {
  step: Step
  dashboardPhase: DashboardPhase
  // Animierte Dashboard-Werte
  visitorsA: number
  visitorsB: number
  convA: number
  convB: number
  copied: boolean
}
```

### Events

| Trigger | Von | Nach |
|---|---|---|
| „Try the demo" | welcome | element |
| „Continue to Variant B" | element | variant |
| „Continue to Goal" | variant | goal |
| „Generate HTML" | goal | snippet |
| „View Results" | snippet | dashboard |
| Animation-Loop (8 Ticks) | dashboard | dashboard |
| „Start over" | beliebig | welcome |

### Dashboard-Animation

```ts
// 8 Ticks über ~4 Sekunden (500ms pro Tick)
const TICK_DATA = [
  { va: 30,  vb: 28,  ca: 3,  cb: 4  },
  { va: 85,  vb: 82,  ca: 9,  cb: 13 },
  { va: 160, vb: 158, ca: 18, cb: 26 },
  { va: 250, vb: 248, ca: 28, cb: 42 },
  { va: 340, vb: 338, ca: 38, cb: 56 },
  { va: 400, vb: 400, ca: 48, cb: 70 },
  { va: 410, vb: 415, ca: 51, cb: 76 },
  { va: 423, vb: 424, ca: 53, cb: 79 },
]

function startDashboardAnimation() {
  let tick = 0
  const interval = setInterval(() => {
    if (tick >= TICK_DATA.length) {
      clearInterval(interval)
      setDashboardPhase('done')
      return
    }
    const d = TICK_DATA[tick]
    setVisitorsA(d.va)
    setVisitorsB(d.vb)
    setConvA(d.ca)
    setConvB(d.cb)
    tick++
  }, 500)
}
```

CR, Lift, p-Wert und Significance sind **abgeleitete Werte** und werden aus den Tick-Daten berechnet:

```ts
function derived(d: TickData) {
  const cra = d.ca / d.va || 0
  const crb = d.cb / d.vb || 0
  const lift = cra > 0 ? ((crb - cra) / cra) * 100 : 0
  // p-Wert: vereinfachte Annäherung basierend auf Stichprobengröße + Differenz
  const p = approximateP(d.va + d.vb, cra, crb)
  const significant = p < 0.05
  const winner = significant && crb > cra ? 'B' : significant && cra > crb ? 'A' : null
  return { cra, crb, lift, p, significant, winner }
}
```

---

## 10. Mock-Daten

### 9.1 Demo-Test

| Feld | Wert |
|---|---|
| **Test-Name** | `Button "Get Started"` |
| **Website** | `getvariante.com` |
| **Element** | `BUTTON "Get Started"` |
| **Element-CSS** | `.herocta` |
| **Variant B Figma-Layer** | `BUTTON "Start free trial"` |
| **Layer-Pfad** | `hero > cta-section` |
| **Goal** | `Click on the tested element` |
| **Snippet-Token** | `demo-abc123` |

### 9.2 Demo-Results (Endwerte)

| Metrik | Wert |
|---|---|
| **Status** | Done |
| **Visitors A** | 423 |
| **Visitors B** | 424 |
| **Conversions A** | 53 |
| **Conversions B** | 79 |
| **CR A** | 12.5% |
| **CR B** | 18.6% |
| **Lift** | +50.8% |
| **p-Wert** | 0.02 |
| **Signifikanz** | Significant at 95% |
| **Winner** | Variant B |

---

## 11. Visuelles Design

### 10.1 Plugin-Box (Figma-Plugin-Design, NICHT Landingpage-Design)

- **Breite:** 360px (fix)
- **Höhe:** 560px (fix)
- **Hintergrund:** `#ffffff`
- **Border:** `border-2 border-gray-200 rounded-xl shadow-xl`
- **Schrift:** 11–13px Inter
- **Primary-Farbe:** `#0D99FF` (Figma Blue)
- **Font-Stack:** `Inter, -apple-system, BlinkMacSystemFont, sans-serif`

### 10.2 Sandbox-Banner

```
bg-amber-50 border-2 border-amber-200 rounded-xl
px-4 py-2.5 text-sm text-amber-800 font-medium
```

Mit 🏖️ Emoji links.

### 10.3 Erklärungs-Panel

```
bg-white border-2 border-violet-100 rounded-2xl shadow-sm
p-6
```

- Titel: `text-lg font-bold text-violet-800`
- Body: `text-sm text-gray-600 leading-relaxed`
- Step-Dots: aktiv `bg-violet-600`, inaktiv `bg-gray-200`

### 10.4 CTA-Sektion

```
bg-violet-50 rounded-2xl border-2 border-violet-100
p-6 text-center
```

- Buttons: `bg-violet-600` (Landingpage-Violett für CTAs außerhalb der Box)
- Subline: `text-sm text-gray-500`

---

## 12. Sämtliche Texte

### 11.1 Erklärungs-Panel pro Schritt

**Schritt 1 — Welcome:**
```
👋 Welcome to Variante

This is a sandboxed demo of the Variante Figma plugin —
pixel-identical to what you'd see in Figma's sidebar.

We've prepared a demo website and a pre-selected element so
you can walk through the full workflow without installing anything.

In the real plugin, you'd connect your account here. For this
demo, just click "Try the demo".
```

**Schritt 2 — Element:**
```
🎯 Pick what to test

In the real plugin, you open your website and use the Variante
browser extension to click on any element — a button, a headline,
a hero section. It captures the HTML, CSS, and page context automatically.

In this demo, we've pre-selected a "Get Started" button on
getvariante.com. No extension needed.

Click "Continue" to see the Variant B you'd select in Figma.
```

**Schritt 3 — Variant B:**
```
🖼️ Select Variant B

This is where the Figma integration shines: you click any layer in
your Figma file that represents the new version — a redesigned
button, a new headline, a different hero image.

Variante reads colors, typography, spacing, and effects directly
from Figma. The AI uses this as the design reference for Variant B.

In this demo, we've pre-selected an alternative CTA button. In
the real plugin, you'd literally click your Figma layer.

Click "Continue" to set the conversion goal.
```

**Schritt 4 — Goal:**
```
🎯 Define the goal

What counts as a "conversion"? The default is a click on the
element you're testing — simple and usually what you want.

In the real plugin, you can also pick a different element on the
page, use a CSS selector, or track page views.

In this demo, the goal is pre-set to "click on the Get Started
button". We'll skip the AI generation step and go straight to
shipping.

Click "Generate HTML" to continue.
```

**Schritt 5 — Snippet:**
```
🚀 One snippet, done

Add one <script> tag to your site's <head> — that's the entire
integration. No deploy pipeline, no dev.

The snippet splits traffic 50/50, serves the right variant, and
tracks conversions. Everything else is configured server-side.

In this demo, the snippet is a placeholder. In the real plugin,
you'd get your actual test token.

Click "View Results" — this is where it gets fun. 👇
```

**Schritt 6 — Dashboard:**
```
📊 Live Results — watch the numbers

This is what you'd see in the real plugin dashboard, sped up
~1000×.

Watch as visitors flow in, conversions accumulate, and statistical
significance builds — all in seconds instead of days.

• Visitors are split evenly (50/50) between A and B
• Conversions accumulate faster on B — the orange button converts
  better
• After enough data, Variante declares Variant B the winner at
  95% confidence

In reality, this would take hours or days depending on your
traffic. The dashboard refreshes every 30 seconds in the Free
tier, every 10 seconds in Pro.

---

🎉 That's the full workflow!

Connect → Pick → Variant B → Goal → Snippet → Measure.
All from Figma. No dev required.

Ready to try it on your own site?
```

### 11.2 CTA-Texte

| Position | Text |
|---|---|
| Top-Nav links | `← Back to home` |
| Top-Nav rechts | `[Install Figma Plugin]` |
| Sandbox-Banner | `🏖️ You're in the sandbox — this is a demo, not a real test.` |
| CTA primär | `🎨 Install Figma Plugin →` |
| CTA sekundär | `✨ Create free account →` |
| CTA-Subline | `Free tier: 1 experiment · No credit card · 2 min setup` |
| Reset | `↺ Start over` |
| Dashboard-CTA | `🎨 Try it yourself →` |

### 11.3 Meta-Tags

- **Title:** `Variante Playground — Try the Figma Plugin in Your Browser`
- **Description:** `Walk through the full Variante workflow — pick an element, set a goal, ship a snippet, watch live results. No Figma account needed.`

---

## 13. Zu erstellende Dateien

```
ab-tool/app/
  playground/
    page.tsx               ← Playground-Seite (Client Component, ~400 Zeilen)
                            ponytail: Eine Datei — Demo-Walkthrough, kein komplexer State.
```

**Aufteilung (intern):** Eine Datei mit:
- `PlaygroundShell` — Layout: Sandbox-Banner + Box + Panel + CTAs
- `PluginBox` — Die 360×560-Box mit Screen-Rendering
- `ExplainPanel` — Erklärungen + Step-Dots
- Screens als Inline-Komponenten oder Render-Funktionen
- `useDashboardAnimation` — Hook für die animierten Zahlen

---

## 14. Implementierungs-Checkliste

- [ ] `app/playground/page.tsx` — Client Component mit Zustandsautomat
- [ ] Layout: Sandbox-Banner + Box (360×560) + Erklärungs-Panel + CTAs
- [ ] 6 Screens: welcome, element, variant, goal, snippet, dashboard
- [ ] Dashboard-Animation: 8 Ticks über 4 Sekunden
- [ ] Winner-Banner erscheint nach Animation
- [ ] Snippet-Copy-Funktionalität („Copy prompt" + „Copy snippet manually")
- [ ] Reset-Button („Start over")
- [ ] Responsive: Mobile-Stack
- [ ] Meta-Tags
- [ ] Link in Landingpage-Nav: „Playground" neben „Log in"
- [ ] `force-static` (keine API-Abhängigkeit)

---

## 15. Offene Fragen

1. **Plugin schon im Figma Store?** → Falls nein: Install-Button → `/#notify`. Falls ja: Direkter Link.
2. **Dashboard-CTA in der Box oder nur unten?** → Beides: Ein Button im Dashboard („Try it yourself") + die globalen CTAs unter der Box.
3. **Animationstempo anpassbar?** → 500ms/Tick fühlt sich gut an. Bei Bedarf auf 400ms beschleunigen.
4. **Winner-Banner-Animation?** → Einfaches `opacity`-Fade-in + leichter Scale-Effekt. Kein übertriebenes Bouncing.

---

*Spezifikation v2 Ende — bereit für Implementierung.*

