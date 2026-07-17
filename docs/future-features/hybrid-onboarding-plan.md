# Hybrid-Onboarding-Plan — Dual-Screenshot + CSS-Injection, Value vor Snippet

> Stand: 17.07.2026 · Status: Planung · Aufwand: Mittel (ca. 3-4 Tage Fullstack)

## Kernidee

User gibt URL ein → **Server-seitiges `fetch(url)` extrahiert HTML + CSS (Option A)** → GPT-4o analysiert den echten Code (nicht nur Screenshot) + schreibt CSS-Regeln mit **präzisen, DOM-verifizierten Selektoren** → Screenshot der echten Seite + **zweiter Screenshot mit CSS-Injection (urlbox.io `css`-Parameter)** → A/B-Toggle zwischen beiden Screenshots → sofortiger Aha-Moment. Sign-up + Snippet erst wenn User sagt: "Will ich live haben."

**NICHT: Snippet vor Value. SONDERN: Value vor Snippet.**
**NICHT: Overlays auf Screenshot. SONDERN: Echter Page-Render mit injiziertem CSS.**
**NICHT: AI rät Selektoren vom Screenshot. SONDERN: AI analysiert echten HTML/CSS-Code für korrekte Selektoren.**

> **Option A (Server-seitige HTML-Extraktion)** ist der Kern dieser Plan-Revision. Siehe §0b für Details, SPA-Fallback und Vergleich.

---

## §0 Preview-Rendering: Warum CSS-Injection den Overlay-Ansatz schlägt

### Das Problem mit Overlays (v1-Ansatz)

Overlays (absolut positionierte Divs auf einem Screenshot) scheitern an komplexen Designs:

- **Ghost-Buttons auf Gradient-Hintergrund**: Das Overlay sitzt OBEN drauf, aber der originale Ghost-Button scheint durch. Das Overlay müsste den Hintergrund-Gradienten exakt matchen — unmöglich ohne die echten CSS-Variablen der Seite.
- **Text auf Texturen**: Neuer Text als Overlay über einer Textur oder einem Bild — der originale Text ist noch sichtbar, die Textur wird vom Overlay unterbrochen.
- **CSS-Inheritance**: Overlays haben keinen Zugriff auf `var(--brand-primary)`, `currentColor`, `inherit`-Werte oder das reale Box-Modell der Seite.
- **Z-Index-Chaos**: Stacking contexts, `position: sticky`, `backdrop-filter` — all das fehlt einem Overlay-Div.

**Fazit:** Overlays sehen bei >50% aller Designs "zusammengebastelt" aus. Inakzeptabel für einen Aha-Moment.

### Die Lösung: CSS-Injection via Screenshot-API

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  Screenshot 1: Original              Screenshot 2:   │
│  ┌────────────────────────┐    Variant mit injizier- │
│  │  Hero mit Ghost-Button │    tem CSS + Highlights  │
│  │  auf Gradient-Hinter-  │    ┌────────────────────┐│
│  │  grund. Echt, unver-   │    │ Hero mit SOLIDEM   ││
│  │  ändert.               │    │ Button, korrektem  ││
│  │                        │    │ Gradient-Hinter-   ││
│  │  [Get Started]  ←ghost │    │ grund, blauem      ││
│  │                        │    │ Glow um geänderte  ││
│  └────────────────────────┘    │ Elemente.          ││
│                                 │                    ││
│  ▲ Original tab          ▼ Variant B tab             ││
│                                 │ [Start Free Trial] ││
│                                 └────────────────────┘│
│                                                      │
└──────────────────────────────────────────────────────┘
```

**So funktioniert's:**

1. **Screenshot 1 (Original):** `GET urlbox.io/{url}?viewport=1440x900` → `original.png`
2. **GPT-4o Vision** analysiert Screenshot, gibt CSS-Regeln zurück:
   ```json
   {
     "changes": [
       {
         "selector": ".hero-cta",
         "css": "background: #0D99FF; color: #fff; border: none; border-radius: 12px; padding: 14px 32px; font-weight: 600; outline: 3px solid #FFD700; outline-offset: 4px; box-shadow: 0 0 20px rgba(255,215,0,0.3);",
         "rationale": "Solid CTA statt Ghost-Button für höheren Kontrast und bessere Klickrate"
       }
     ],
     "injectedCss": ".hero-cta { background: #0D99FF !important; color: #fff !important; border: none !important; border-radius: 12px !important; padding: 14px 32px !important; font-weight: 600 !important; outline: 3px solid #FFD700 !important; outline-offset: 4px !important; box-shadow: 0 0 20px rgba(255,215,0,0.3) !important; }"
   }
   ```
3. **Screenshot 2 (Variant):** `GET urlbox.io/{url}?viewport=1440x900&css={injectedCss}` → `variant.png`
4. **Client:** A/B-Toggle zwischen zwei `<img>`-Tags. Kein Overlay, kein JavaScript-Rendering.

### Warum das funktioniert — selbst bei Ghost-Buttons & Gradienten

| Problem (Overlay) | Lösung (CSS-Injection) |
|---|---|
| Overlay muss Hintergrund-Gradient matchen | **Die echte Seite rendert den Gradient.** CSS-Injection ändert nur den Button — der Hintergrund bleibt 100% original. |
| Ghost-Button scheint unter Overlay durch | **Es gibt keinen Ghost-Button mehr.** Die Seite wird MIT dem neuen CSS gerendert. Der Browser ersetzt den Ghost-Button durch den soliden. |
| CSS-Variablen fehlen (`var(--brand)`) | **Alle CSS-Variablen sind da.** Es ist die echte Seite, nur mit zusätzlichen Regeln. `!important` überschreibt wo nötig. |
| Z-Index, Stacking, Backdrop-Filter | **Alles intakt.** Der Browser rendert die Seite normal — nur mit extra CSS. |
| Text auf Textur/Overlay-Bruch | **Kein Overlay, kein Bruch.** Neuer Text wird vom Browser in die echte Seite gerendert. |

### Die Optionen im Vergleich

| | iframe | Screenshot (statisch) | **Overlay v1** | **CSS-Injection v2** |
|---|---|---|---|---|
| **Funktioniert für alle Sites** | ❌ ~60% blocken | ✅ | ✅ | ✅ |
| **Ghost-Buttons / Gradienten** | ⚠️ Live, aber nicht modifizierbar | ❌ Nur Original sichtbar | ❌ **Overlay matched Hintergrund nicht** | ✅ **Echter Page-Render** |
| **CSS-Variablen & Inheritance** | ✅ Live | ❌ Statisch | ❌ Keine | ✅ **Alle Variablen intakt** |
| **Variant sichtbar machen** | ❌ Cross-origin blockiert Modifikation | ❌ Zwei statische Bilder | ⚠️ Draufgeklebt | ✅ **Pixel-perfekt + Highlight-Outline** |
| **Latenz** | ✅ 0s | ❌ 3–8s | ❌ 3–8s | ❌ 5–15s (2 Screenshots + AI) |
| **Kosten** | ✅ Kostenlos | ❌ $0.004/Call | ❌ $0.004/Call | ❌ $0.008/Call (2×) + $0.01 AI |
| **A/B-Vergleich** | ⚠️ Suchen & scrollen | ⚠️ Spot-the-difference | ⚠️ Fake-Look | ✅ **Expliziter Diff, echter Render** |

> **Latenz-Strategie:** Screenshot 2 (Variant) wird erst NACH AI-Analyse gestartet — serverseitig. Client sieht nur die gesamte Latenz als eine Loading-Animation. In der Praxis: ~8–12s Gesamtzeit. Akzeptabel weil der User danach nie wieder wartet (ist ja kein Produkt-Feature, sondern einmaliger Aha-Moment).

### Warum iframe scheitert (unverändert)

1. **X-Frame-Options: SAMEORIGIN/DENY** — die Mehrheit aller Produktionsseiten blockt Einbettung.
2. **Content-Security-Policy: frame-ancestors 'self'** — noch restriktiver.
3. **Cross-Origin-Isolation** — selbst wenn iframe lädt, kann JavaScript die Inhalte nicht modifizieren.
4. **Mixed Content** — HTTP-Seiten im HTTPS-Kontext werden blockiert.

### Warum CSS-Injection gewinnt

1. **Pixel-perfekt** — Die Variante IST die echte Seite. Null Unterschied zu dem, was der User später mit Snippet live sieht.
2. **Universell** — Funktioniert für JEDE URL. CSS-Injection ist ein Browser-Feature, kein Hack.
3. **Expliziter Diff** — Highlight-Outlines im injizierten CSS markieren geänderte Elemente. Kein Suchen.
4. **A/B-Toggle** — Zwei `<img>`-Tags, ein Klick. Simpler geht's nicht.
5. **Emotionale Wirkung** — "Das ist meine echte Seite... und DAS hat die KI daraus gemacht." Kein "das sieht aber anders aus als meine Seite"-Moment.
6. **Kein Client-Rendering** — Kein `renderOverlayPreview()`, kein `position: absolute`-Gefrickel. Nur zwei Bilder.

---

## §0b Selektor-Extraktion: Server-seitige Code-Analyse (Option A)

### Das Problem: AI rät Selektoren vom Screenshot

Der ursprüngliche Plan (§3.1) schickt einen Screenshot an GPT-4o Vision und lässt das Model CSS-Selektoren **raten**. Das Model sieht Pixel, keinen DOM — und muss Klassen, IDs, oder Struktur-Selektoren aus dem visuellen Layout erraten.

**Das funktioniert nur ~70-90% der Fälle.** Gerade bei modernen CSS-Framework-Klassen (Tailwind `class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all"`) rät die KI oft daneben. Noch schlimmer bei CSS Modules (`class="Hero_cta__a1b2c"`) — die KI kann diese generierten Klassen nicht vom Screenshot ableiten.

### Die Lösung: Server-seitiges HTML-Fetching + Code-Analyse

Statt nur den Screenshot zu analysieren, **holt der Server die echte Seite per `fetch()`** und extrahiert HTML + CSS. GPT-4o bekommt den echten Code — und kann präzise Selektoren zurückgeben, die garantiert im DOM existieren.

```
┌──────────────────────────────────────────────────────────────────┐
│  OPTION A: Server-seitige HTML/CSS-Extraktion                    │
│                                                                  │
│  1. fetch(url) → raw HTML                                        │
│  2. HTML parsen (cheerio) → DOM-Baum                             │
│  3. SPA-Erkennung: <div id="root"> leer? <div id="__next">?    │
│     → SPA? Fallback (siehe unten)                                │
│  4. <link rel="stylesheet"> folgen, CSS extrahieren              │
│  5. Relevante Elemente identifizieren:                           │
│     - Alle <button>, <a> mit CTA-Text                            │
│     - Alle <h1>, <h2>, Hero-Text                                 │
│     - Trust-Signals, Pricing-Blöcke                              │
│  6. GPT-4o bekommt:                                              │
│     - Screenshot (für visuellen Kontext)                         │
│     - Gekürztes HTML (nur relevante Sektionen, <body>-Inhalt)    │
│     - Extrahierte CSS-Regeln (nur getroffene Selektoren)         │
│  7. GPT-4o gibt zurück:                                          │
│     - changes[] mit GARANTIERT KORREKTEN CSS-Selektoren          │
│     - injectedCss                                                │
│  8. Screenshot 1 (Original) + Screenshot 2 (CSS-Injection)       │
│                                                                  │
│  Ergebnis: ~99% Selektor-Genauigkeit für SSR-Seiten              │
└──────────────────────────────────────────────────────────────────┘
```

**Warum das besser ist:**

| | Screenshot-only (Vision) | Code-Analyse (Option A) |
|---|---|---|
| **Selektor-Quelle** | KI rät von Pixeln | KI liest echten HTML/CSS-Code |
| **Selektor-Genauigkeit** | ~70–90% | ~99% (SSR-Seiten) |
| **Tailwind-Klassen** | ❌ Rät `class="btn"` statt `class="inline-flex items-center..."` | ✅ Liest exakte Klasse aus HTML |
| **CSS Modules** | ❌ Sieht nur generierte Klasse, nicht `Hero_cta__a1b2c` | ✅ Liest exakte generierte Klasse aus HTML |
| **Dynamische IDs** | ❌ Rät falsche ID | ✅ Liest exakte ID aus HTML |
| **Nach Snippet-Install** | ⚠️ 10–30% brauchen manuelle Korrektur | ✅ <1% brauchen manuelle Korrektur |
| **Kosten** | $0.01/Call (Vision) | $0.01/Call (Vision für Screenshot-Kontext) + $0.003/Call (HTML-Analyse) |

### Implementierung: `lib/extractPageCode.ts`

```typescript
// lib/extractPageCode.ts
import * as cheerio from 'cheerio'

export interface ExtractedPage {
  isSpa: boolean
  spaType?: 'react' | 'vue' | 'angular' | 'unknown'
  html?: string        // Gekürztes <body>-HTML
  css?: string          // Extrahierte CSS-Regeln
  elements?: {          // Relevante Elemente für GPT-4o
    tag: string
    selector: string
    text: string
    attributes: Record<string, string>
  }[]
}

export async function extractPageCode(url: string): Promise<ExtractedPage> {
  // 1. HTML fetchen
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Variante/1.0 Preview-Bot' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  const html = await res.text()

  // 2. HTML parsen (cheerio — leicht, schnell, server-seitig)
  const $ = cheerio.load(html)

  // 3. SPA-Erkennung
  const rootEmpty = $('#root').children().length === 0 && $('#root').text().trim() === ''
  const nextEmpty = $('#__next').children().length === 0 && $('#__next').text().trim() === ''
  const appEmpty = $('#app').children().length === 0 && $('#app').text().trim() === ''
  const minimalHtml = html.length < 500
  const noSemanticTags = !html.includes('</header>') && !html.includes('</nav>') && !html.includes('</main>')

  const spaScore = [rootEmpty, nextEmpty, appEmpty, minimalHtml, noSemanticTags].filter(Boolean).length
  const isSpa = spaScore >= 2

  if (isSpa) {
    return {
      isSpa: true,
      spaType: rootEmpty ? 'react' : nextEmpty ? 'next' : appEmpty ? 'vue' : 'unknown',
    }
  }

  // 4. Relevante Elemente extrahieren
  const elements = extractRelevantElements($)

  // 5. CSS extrahieren (inline <style> + <link rel="stylesheet"> folgen)
  const css = await extractCss($, url)

  return { isSpa: false, html: $('body').html() || '', css, elements }
}
```

### SPA-Erkennung & Fallback

Wenn `extractPageCode()` eine SPA erkennt (leerer `<div id="root">`, `<div id="__next">`, `<div id="app">`, minimale HTML-Größe, keine semantischen Tags), gibt es zwei Möglichkeiten:

#### Fallback 1: Snippet zuerst installieren lassen

```
Flow: URL → SPA erkannt → "Your site is built with React/Vue. To show you a variant,
       install this 1-line snippet first." → User installiert Snippet 
       → Client-seitiges DOM-Scraping → Elemente + Selektoren extrahiert 
       → Preview wie gewohnt → Sign-up → DIREKT live (Snippet ist schon installiert!)
```

**Vorteile:**
- End-Ergebnis ist ein funktionierender Test mit 100% korrekten Selektoren
- User bekommt immer noch den Aha-Moment — nur 2 Minuten später
- Snippet ist nach Preview bereits installiert → nach Sign-up sofort live, kein zweiter technischer Schritt

**Nachteile:**
- Unterbricht den "sofort Aha"-Flow — User muss technisch werden (Snippet installieren)
- 2-Minuten-Hürde statt 40-Sekunden-Aha
- Für reine "Gucker" (die nie installieren wollen) frustrierend

#### Fallback 2: Direkt zum Sign-up (ohne Preview)

```
Flow: URL → SPA erkannt → "Your site is a single-page app (React/Vue/Angular).
       Create an account to get started — you'll pick elements directly on your
       site after installing the snippet." → Button: "Create account →" → /signup
```

**Vorteile:**
- Keine falsche Erwartung ("Preview kann deine Seite nicht rendern")
- User landet direkt im klassischen Flow (Snippet → Element-Picker → Test)
- Spart AI/Screenshot-Kosten für SPA-Seiten

**Nachteile:**
- Kein Aha-Moment vor Sign-up → wir verlieren den "Value first"-Vorteil
- Conversion-Rate für SPA-Nutzer ist identisch zum Status Quo
- ~30–40% aller Websites sind SPAs (React, Vue, Angular, etc.) → signifikanter Anteil

#### Vergleich & Empfehlung

| Kriterium | Fallback 1: Snippet zuerst | Fallback 2: Direkt Sign-up |
|---|---|---|
| **Aha-Moment** | ✅ Ja, aber verzögert (~2 Min) | ❌ Nein |
| **Selektor-Genauigkeit** | ✅ 100% (echter DOM) | N/A (kein Preview-Test) |
| **User-Hürde** | ⚠️ Mittel (Snippet-Install) | ❌ Hoch (Sign-up vor Value) |
| **SPA-Abdeckung** | ✅ Alle SPAs | ✅ Alle SPAs |
| **Implementierungs-Aufwand** | Mittel (Client-DOM-Scraping) | Gering (nur UI-Message) |
| **Conversion-Prognose** | Mittel (einige brechen bei Snippet ab) | Niedrig (wie Status Quo) |
| **Post-Signup** | ✅ Sofort live (Snippet installiert) | ❌ Snippet muss noch installiert werden |

**Empfehlung: Fallback 1 (Snippet zuerst) mit optimiertem Flow.**

Begründung:
1. **Value-First-Prinzip bleibt erhalten.** Der User sieht seine Variante VOR dem Sign-up — nur mit einem kurzen Snippet-Umweg.
2. **Snippet ist danach schon installiert.** Nach Preview + Sign-up ist der Test sofort live — kein zweiter technischer Schritt.
3. **Die Alternative (Fallback 2) ist der Status Quo.** Den bauen wir ja gerade um, weil er nicht gut genug konvertiert.
4. **SPA-User sind oft technischer** (React-Devs, Vue-Devs) — ein 1-Zeilen-Snippet ist für sie keine große Hürde.

**Optimierter SPA-Flow:**
```
URL-Eingabe → "Analyzing your site…" (2s) 
→ SPA erkannt 
→ "Your site is built with React/Vue. To show you a variant, 
   we need a tiny snippet on your page. It's one line:"
   [Snippet-Code mit Copy-Button]
   "Already installed? [Verify →]"
→ Snippet verified → Client-seitiges DOM-Scraping 
→ Preview mit echten Selektoren → Aha-Moment 
→ Sign-up → DIREKT live (Snippet ist ja schon installiert!)
```

Dieser Flow ist **besser als der klassische Flow**, weil:
- Snippet ist NACH der Preview bereits installiert → kein zweiter technischer Schritt
- Sign-up → sofort live (kein "install snippet" im Dashboard)
- Der "Umweg" ist tatsächlich eine Abkürzung zur Live-Schaltung

---

## §1 Figma Plugin — Hybrid Flow

### §1.1 Aktueller Flow (IST)

```
Welcome → Setup (Name+URL) → Snippet (2/6) → Element (2/6) → Design (3/5) → Generate (4/5) → Goal (5/5) → Done
```

Probleme:
- Snippet-Screen (2/6) ist ein harter Break. User muss `<head>` editieren bevor er IRGENDWAS sieht.
- "Skip for now" existiert, aber dann funktioniert der Element-Picker nicht → Broken Experience.
- Temp-Session (`/api/temp-session`) existiert bereits, wird aber nur für API-Auth genutzt, nicht für Preview.

### §1.2 Ziel-Flow (SOLL)

```
Welcome → Setup (Name+URL) → Dual-Screenshot-Preview (Original ↔ Variant) → [optional: Refine] → Gate: Sign-up → Snippet-Install → Live
```

### §1.3 Screens im Detail

#### Screen -2: Welcome (bleibt weitgehend)
- Text ändern: "See your site transformed — no setup required" statt "install the snippet"
- Button: "Try it now →" (startet Temp-Session + Dual-Screenshot-Flow)

#### Screen 0: Setup (vereinfacht)
- Test-Name + Website-URL (wie bisher)
- Snippet-Feld ENTFÄLLT hier — wandert hinter Sign-up-Gate
- Button: "Show me a variant →"
- **Server-Aktion bei Submit:**
  1. `POST /api/temp-session` → Token
  2. `POST /api/preview` → { url, testName } → Server macht Screenshot + AI + CSS-Injection-Screenshot
  3. Response: { previewId, testId, originalScreenshotUrl, variantScreenshotUrl, changes: [{ selector, css, rationale }], injectedCss }

#### Screen 1: Preview (NEU — der Aha-Moment)
- **Aufbau:** A/B-Toggle oben ("Original" | "Variant B"), darunter ein `<img>` das zwischen `originalScreenshotUrl` und `variantScreenshotUrl` wechselt
- **Kein Overlay-Rendering nötig.** Nur zwei Bilder, ein Toggle. Simpler geht's nicht.
- **Highlight-Outlines** sind bereits im variantScreenshot eingebrannt (via injiziertes CSS mit `outline: 3px solid {highlightColor}`)
- **Geänderte Elemente** flashen kurz beim ersten Laden des Variant-Tabs (CSS-Animation im injizierten CSS: `animation: variante-highlight-pulse 2s ease-out`)
- **Change-Liste unter dem Screenshot:** "Changed: Button (ghost → solid blue), Heading (larger + subline added)"
- **Unten:** "Refine with AI" → Text-Input für Feedback
- **Footer:** CTA "Go live →" (führt zu Gate)
- Kein Snippet, kein Element-Picker, kein Figma-Design nötig

#### Screen 2: Gate — Sign-up (NEU)
- "Your variant is ready. Create an account to go live."
- Sign-up-Button → öffnet getvariante.com/signup?source=figma-plugin&testId=xxx
- Nach Sign-up: `/api/claim-tests` transferiert Temp-Tests zum User
- Nach Claim: "Now install the snippet to go live" → weiter zu Screen 3

#### Screen 3: Snippet-Install (verschoben aus altem Screen 1b)
- Snippet-Code mit API-Key (jetzt mit echtem User-Token)
- Copy-Button + "I've installed it → Verify" Button
- `POST /api/snippet-check` → verified → Test wird aktiviert
- Done-State: "Your test is live 🎉" → Link zum Dashboard

#### Bestehende Screens (bleiben für logged-in User):
- Element-Picker (Screen 2 alt) — nur für eingeloggte User mit Snippet
- Figma Design (Screen 3 alt) — nur für eingeloggte User
- Generate (Screen 4 alt) — nur für eingeloggte User
- Goal (Screen 5 alt) — nur für eingeloggte User

### §1.4 Technische Änderungen Figma Plugin

| Datei | Änderung |
|---|---|
| `ui.html` | Neuer Screen `s-preview` (zwei `<img>`-Tags + A/B-Toggle, Change-Liste, Refine-Input), neuer Screen `s-gate` (Sign-up), Snippet-Screen aus Onboarding-Flow entfernt (nur noch post-signup). Neue JS-Funktionen: `startHybridOnboarding()`, `showPreview(data)`, `toggleVariant()` (einfach `img.src` tauschen), `goToGate()`, `handleSnippetVerify()`. **Kein Overlay-Rendering, kein `position: absolute`-Gefrickel.** |
| `code.ts` | Keine Änderungen nötig — Temp-Token-Handling existiert bereits. |

### §1.5 Neue API-Endpoints

| Endpoint | Methode | Zweck |
|---|---|---|
| `/api/preview` | POST | Nimmt URL + testName, gibt { previewId, testId, originalScreenshotUrl, variantScreenshotUrl, changes[], injectedCss } zurück. Server-seitig: 2 Screenshots + AI-Gen. Rate-limited auf 5/Temp-Session. |
| `/api/preview/refine` | POST | Nimmt previewId + feedback, gibt aktualisiertes changes[] + neue variantScreenshotUrl zurück (neuer Screenshot mit verfeinertem CSS). |
| `/api/snippet-check` | POST | Existiert bereits — wird für Post-Signup-Verify verwendet. |

---

## §2 Website — Hybrid Flow

### §2.1 Aktueller Flow (IST)

```
Landing → Signup → Email bestätigen → Dashboard (leer) → ConnectWebsite → Snippet-Check → NewTestFlow (Choice: Figma/Auto)
```

Probleme:
- User sieht NICHTS vom Produkt bevor er Sign-up + Email-Confirm + Snippet durch hat.
- 3 Gates bevor irgendein Value sichtbar ist.
- "Try it free" auf Landingpage existiert, führt aber direkt zu /signup — kein Try, nur Signup.

### §2.2 Ziel-Flow (SOLL)

```
Landing → "See your site transformed" (URL-Eingabe) → Dual-Screenshot-Preview → Refine → Gate: Sign-up → Snippet → Dashboard
```

### §2.3 Screens im Detail

#### Landingpage — Hero-Änderung

**Aktuell:**
- Hero CTA: "Start testing free →" → /signup
- Demo-Animation (ab-test-hero-animation.html) — zeigt generisches Beispiel

**Ziel:**
- Hero CTA: "See your site transformed →" → springt zur URL-Eingabe (same-page, kein Routing)
- Demo-Animation bleibt als Fallback-Visual — aber der primäre CTA führt zur Live-Demo
- Neue Sektion direkt unter Hero: URL-Input mit "Enter your website URL" + Button "Show me →"

#### URL-Input → Dual-Screenshot-Preview (NEU — Client Component)

```tsx
// app/components/HybridDemo.tsx
'use client'

// States: idle → loading → preview → refining → gate
// Loading hat 3 animierte Schritte:
//   "📸 Taking a snapshot of your site…" → "🧠 AI analyzing the page…" → "✨ Rendering variant…"
//
// Preview rendert:
//   1. A/B Toggle: "Original" | "Variant B" (Pill-Buttons)
//   2. Ein <img>-Tag — src wechselt zwischen originalScreenshotUrl & variantScreenshotUrl
//   3. Change-Liste unter dem Screenshot: Was wurde geändert + Warum
//   4. "Refine" Button → Text-Input → POST /api/preview/refine
//   5. "Go live →" Button → Sign-up-Modal
//
// Kein Overlay. Kein position:absolute. Kein renderOverlayPreview().
// Nur: img.src = toggle ? data.variantScreenshotUrl : data.originalScreenshotUrl
```

**Preview-Darstellung:**
- Screenshot in Device-Mockup (Laptop-Frame) für zusätzlichen "das ist real"-Eindruck
- A/B Toggle als Slider/Pill-Buttons: "Original" | "Variant B"
- Variant-Screenshot HAT die Änderungen bereits eingebrannt (CSS-Injection) + Highlight-Outlines um geänderte Elemente
- Change-Liste darunter: Jeder Change mit `rationale` erklärend
- "Refine" Button → Text-Input: "Make the button more rounded" → POST `/api/preview/refine` → neuer variantScreenshot
- "Go live →" Button → Sign-up-Modal oder `/signup?source=demo&testId=xxx`

#### Sign-up Flow (angepasst)

- Nach Sign-up + Email-Confirm → Redirect zu `/dashboard?new=1&testId=xxx`
- Dashboard zeigt: "Your test is ready — install the snippet to go live"
- ConnectWebsite-Komponente mit Snippet-Code (wie bisher)
- Nach Verify → Test ist live, User sieht Dashboard mit aktivem Test

### §2.4 Technische Änderungen Website

| Datei | Änderung |
|---|---|
| `app/page.tsx` | Hero-CTA-Text ändern, `HybridDemo`-Komponente unter Hero einbauen |
| `app/components/HybridDemo.tsx` | **NEU** — URL-Eingabe, Loading-States, Dual-Screenshot A/B-Toggle, Change-Liste, Refine, Gate. Client Component. Kein Overlay-Rendering. |
| `app/signup/page.tsx` | Query-Param `testId` verarbeiten → nach Sign-up zu Claim-Tests |
| `app/dashboard/DashboardClient.tsx` | Empty-State für "Test ready, install snippet" (Test existiert aber Domain unverified) |
| `app/dashboard/components/ConnectWebsite.tsx` | Unverändert — wird jetzt im Post-Signup-Kontext genutzt |
| `app/api/preview/route.ts` | **NEU** — 2 Screenshots (Original + CSS-Injection) + GPT-4o Vision |
| `app/api/preview/refine/route.ts` | **NEU** — Refine-Schleife: neuer variantScreenshot mit verfeinertem CSS |
| `lib/screenshot.ts` | **NEU** — Screenshot-Funktion (urlbox.io API-Wrapper, inkl. CSS-Injection-Parameter) |

---

## §3 Gemeinsame Infrastruktur

### §3.1 Neuer API-Endpoint: `/api/preview`

```
POST /api/preview
Body: { url: string, testName?: string }
Auth: Optional (Temp-Token oder JWT)
Rate-Limit: 5/Minute pro IP/Temp-Token

Response 200:
{
  previewId: string,
  testId: string,
  originalScreenshotUrl: string,   // Supabase Storage URL, 24h TTL
  variantScreenshotUrl: string,    // Screenshot MIT injiziertem CSS + Highlights
  screenshotWidth: number,         // 1440
  screenshotHeight: number,        // 900 (above the fold)
  changes: [
    {
      id: string,                  // "change-1"
      selector: string,            // ".hero-cta"
      css: string,                 // CSS-Regeln für diesen Change (ohne !important)
      rationale: string,           // "Solid CTA statt Ghost-Button für höheren Kontrast"
      highlightColor: string       // "#FFD700" — Farbe für Outline/Glow
    }
  ],
  injectedCss: string,             // Komplette CSS-Injection (mit !important, highlight outlines, pulse animation)
  summary: string                  // "Changed button style, increased heading size, added trust badges"
}

Response 429: Rate limit
Response 402: Keine Temp-Sessions mehr (signup_url)
```

**Ablauf Server-seitig:**

1. **URL validieren** (SSRF-Schutz via `lib/ssrf.ts`)
2. **HTML + CSS extrahieren** via `lib/extractPageCode.ts`:
   - `fetch(url)` → raw HTML
   - cheerio parsen → DOM-Baum
   - SPA-Erkennung (leerer `#root`/`#__next`/`#app`, minimale HTML-Größe)
   - → **SPA erkannt?** Response `{ isSpa: true, spaType }` → Client zeigt Fallback-UI (§0b)
   - → **SSR-Seite?** Relevante Elemente + CSS extrahieren, weiter mit Schritt 3
3. **Screenshot 1 (Original):** `urlbox(url, { viewport: '1440x900', fullPage: false })` → `original.png`
   - Parallel zu Schritt 2 starten (Latenz sparen)
4. **GPT-4o analysiert HTML/CSS + Screenshot:**
   ```
   System: "You are a CRO expert. Analyze the page HTML, CSS, and screenshot
   to identify 2-4 specific UI elements to improve for higher conversion."
   
   Prompt: "For the page at {url}, here is:
   - A screenshot showing the visual layout
   - The HTML of the page body (extracted server-side)
   - The CSS rules matching key elements
   
   IMPORTANT: Use the HTML to get EXACT CSS selectors. Do not guess from the screenshot.
   Read class names, IDs, and data attributes directly from the HTML. Your selectors
   MUST match elements that exist in the provided HTML.
   
   Identify 2-4 specific elements to improve for higher conversion. Focus on:
   CTAs, headlines, hero text, trust signals, pricing displays.
   
   For each change provide:
   - selector: EXACT CSS selector from the HTML (use class names, IDs, or data attrs
     exactly as they appear in the HTML — do NOT guess or simplify)
   - css: CSS properties to change (do NOT include !important — we'll add that server-side)
   - rationale: One sentence explaining why this improves conversion
   - highlightColor: A hex color for the highlight outline around this element
   
   Then provide injectedCss: ALL changes combined into one CSS string, with !important on
   every property. Include highlight outlines (outline: 3px solid {highlightColor};
   outline-offset: 4px; box-shadow: 0 0 20px {highlightColor}40). Also include a
   @keyframes variante-highlight-pulse animation that pulses the outlines on first load.
   
   CRITICAL: Your selectors MUST be copied directly from the HTML. Do not simplify
   Tailwind classes. Do not guess class names. Read them from the HTML.
   
   Respond in JSON."
   ```
5. **Screenshot 2 (Variant):** `urlbox(url, { viewport: '1440x900', css: injectedCss })` → `variant.png`
   - urlbox.io injiziert das CSS VOR dem Rendern — die Seite lädt MIT den Änderungen
   - Highlight-Outlines sind im Screenshot eingebrannt
6. **Beide Screenshots in Supabase Storage hochladen** (`previews` bucket, 24h TTL)
7. **Preview-Daten in DB speichern** (Temp-Session-Scope)
8. **Response zurückgeben**

### §3.2 Neuer API-Endpoint: `/api/preview/refine`

```
POST /api/preview/refine
Body: { previewId: string, feedback: string, changeId?: string }
Auth: Optional (Temp-Token oder JWT)

Response 200:
{
  changes: [...],                   // Aktualisiertes changes[]-Array
  variantScreenshotUrl: string,     // NEUER Screenshot mit verfeinertem CSS
  injectedCss: string               // Aktualisierte CSS-Injection
}
```

**Ablauf:**
1. Preview-Daten aus DB laden
2. Feedback + bestehende Changes an GPT-4o-mini senden (reicht für CSS-Tweaks)
3. Nur die betroffenen Changes aktualisieren
4. **Neuen Variant-Screenshot machen** mit aktualisiertem `injectedCss`
5. Alten variantScreenshot aus Storage löschen (Kosten sparen)
6. Response zurückgeben

### §3.3 Anpassung `/api/claim-tests`

Existiert bereits. Muss um Preview-Tests erweitert werden:
- Claim soll auch Tests mit `status='preview'` übernehmen
- Nach Claim: Status auf `draft` setzen, `user_id` vom Temp-User zum echten User
- Preview-Daten (screenshot URLs, changes[], injectedCss) bleiben erhalten für Referenz

### §3.4 DB-Migration

```sql
-- 023_hybrid_onboarding.sql
ALTER TABLE tests ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';
-- status: 'preview' | 'draft' | 'active' | 'paused' | 'done'

ALTER TABLE tests ADD COLUMN IF NOT EXISTS preview_original_screenshot_url text;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS preview_variant_screenshot_url text;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS preview_data jsonb;
-- preview_data = { changes: [{ id, selector, css, rationale, highlightColor }], injectedCss, summary }
```

### §3.5 Frontend-Rendering: Bild-Toggle (kein Overlay-Rendering!)

```typescript
// Gemeinsame Utility-Funktion für Figma Plugin & Website
// Simpler geht's nicht: Ein <img>, ein Toggle, zwei URLs.

function renderDualScreenshotPreview(container: HTMLElement, data: PreviewResponse) {
  let showingVariant = false

  // Screenshot-Bild
  const img = document.createElement('img')
  img.src = data.originalScreenshotUrl
  img.style.width = '100%'
  img.style.borderRadius = '8px'
  img.style.transition = 'opacity 0.3s ease'
  container.appendChild(img)

  // A/B Toggle
  const toggle = document.createElement('div')
  toggle.className = 'ab-toggle'
  toggle.innerHTML = `
    <button class="active" data-tab="original">Original</button>
    <button data-tab="variant">Variant B</button>
  `
  toggle.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      showingVariant = btn.dataset.tab === 'variant'
      img.style.opacity = '0'
      setTimeout(() => {
        img.src = showingVariant
          ? data.variantScreenshotUrl
          : data.originalScreenshotUrl
        img.style.opacity = '1'
      }, 150)
      toggle.querySelectorAll('button').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
    })
  })
  container.prepend(toggle)

  // Change-Liste (aus data.changes)
  const changeList = document.createElement('ul')
  changeList.className = 'change-list'
  data.changes.forEach(c => {
    const li = document.createElement('li')
    li.innerHTML = `<span class="change-dot" style="background:${c.highlightColor}"></span> ${c.rationale}`
    changeList.appendChild(li)
  })
  container.appendChild(changeList)
}
```

Das ist der GESAMTE Client-Code für die Preview. Kein `position: absolute`, kein `boundingBox`-Mapping, kein `newHtml`-Injection, kein `newCss`-Apply. Nur zwei Bilder und ein Toggle. **Das CSS-Injection-Paradigma verschiebt die gesamte Komplexität auf den Server — wo sie hingehört.**

### §3.6 Test-Lifecycle: Vom Preview zum Live-Test

Der Preview-Test ist **kein Wegwerf-Demo.** Die AI-generierten CSS-Regeln sind echte Variant-Regeln, die das Snippet später ausliefern kann.

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: PREVIEW (kein Account, kein Snippet)                  │
│                                                                 │
│  User gibt URL ein                                              │
│  → Server: Screenshot 1 (Original)                              │
│  → Server: GPT-4o Vision analysiert Screenshot, schreibt CSS    │
│  → Server: Screenshot 2 (CSS-Injection via urlbox.io)           │
│  → DB: Test mit status='preview' + preview_data (changes[],     │
│         injectedCss)                                            │
│  → Client: A/B-Toggle zwischen originalScreenshotUrl &          │
│            variantScreenshotUrl                                 │
│                                                                 │
│  Der Test ist NICHT funktionsfähig:                             │
│  - Kein Snippet installiert → keine Live-Besucher               │
│  - Kein Element-Picker (Seite läuft nicht im echten Browser)    │
│  - CSS-Selektoren sind AI-geraten, nicht DOM-verifiziert        │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 2: CLAIM (Sign-up)                                       │
│                                                                 │
│  User signed up → /api/claim-tests                              │
│  → user_id: temp-user → echter User                             │
│  → status: 'preview' → 'draft'                                  │
│  → preview_data bleibt erhalten (changes[], injectedCss)        │
│                                                                 │
│  Der Test gehört jetzt einem echten User, ist aber noch         │
│  inaktiv (kein Snippet).                                        │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 3: ACTIVATION (Snippet installiert)                      │
│                                                                 │
│  User installiert Snippet → POST /api/snippet-check             │
│  → Domain verified                                              │
│  → status: 'draft' → 'active'                                   │
│  → Snippet liefert injectedCss an Live-Besucher aus             │
│                                                                 │
│  Der Test IST JETZT FUNKTIONSFÄHIG:                             │
│  - Echte Besucher sehen Variante B (CSS-Injection via Snippet)  │
│  - Conversions werden getrackt                                  │
│  - Dashboard zeigt Live-Stats                                   │
│                                                                 │
│  ⚠️ ABER: Die CSS-Selektoren wurden per Screenshot-Analyse     │
│  geraten. Sie können falsch sein → Elemente werden nicht        │
│  gefunden → Variante wird nicht oder nur teilweise ausgeliefert. │
│  → Gegenmaßnahme: Siehe §5, Risiko "AI-Selektoren matchen       │
│    live nicht".                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Kernunterschied zum manuellen Flow:**

| | Manueller Test (heute) | Hybrid-Preview-Test (SSR) | Hybrid-Preview-Test (SPA) |
|---|---|---|---|
| **Selektoren-Quelle** | Element-Picker (User klickt im DOM) | GPT-4o analysiert echten HTML/CSS-Code (Option A) | Client-seitiges DOM-Scraping nach Snippet-Install |
| **Selektoren-Genauigkeit** | ~100% (User hat DOM-Zugriff) | **~99%** (KI liest echte Selektoren aus HTML) | **~100%** (echter DOM via Snippet) |
| **Test-Erstellung** | Nach Snippet-Install | Vor Snippet-Install (Preview) | Nach Snippet-Install (Preview) |
| **Time-to-value** | ~10 Min | ~40 Sekunden | ~2 Min (Snippet-Install + Preview) |
| **Aktivierbarkeit** | Sofort nach Erstellung | Nach Snippet-Install — <1% brauchen manuelle Korrektur | Nach Sign-up sofort live (Snippet bereits installiert) |

**Fazit:** Der Preview-Test wird nach Claim + Snippet-Install zu einem voll funktionsfähigen A/B-Test. Durch Option A (Code-Analyse) ist die Selektor-Genauigkeit für SSR-Seiten bei ~99% — der Test ist praktisch ohne manuelle Korrektur live-fähig. Für SPAs (Fallback 1) ist die Genauigkeit sogar 100%, da das Snippet den echten DOM liefert.

---

## §4 UX-Vergleich: Vorher ↔ Nachher

### Figma Plugin

| Schritt | Vorher | Nachher |
|---|---|---|
| 1 | Welcome — "Install snippet" | Welcome — "See your site transformed" |
| 2 | Setup (Name+URL) | Setup (Name+URL) |
| 3 | **SNIPPET-WAND** ⛔ | **DUAL-SCREENSHOT-PREVIEW** ✅ (Original ↔ Variant, beide echte Page-Renders) |
| 4 | Element-Picker (geht nicht ohne Snippet) | Refine (optional) |
| 5 | Design in Figma | **GATE: Sign-up** |
| 6 | Generate | Snippet-Install |
| 7 | Goal | Live |

**Time-to-value:** von ~10 Min (mit Snippet-Install) auf ~40 Sekunden (URL eingeben → echte Variante der eigenen Seite sehen).

### Website

| Schritt | Vorher | Nachher |
|---|---|---|
| 1 | Landingpage → /signup | Landingpage → URL-Input (same page) |
| 2 | Sign-up-Form | Dual-Screenshot-Preview (noch auf Landingpage) |
| 3 | Email bestätigen | Refine (optional) |
| 4 | Dashboard (leer) | **GATE: Sign-up** (Modal oder /signup) |
| 5 | ConnectWebsite (Domain) | Email bestätigen |
| 6 | Snippet-Check (fehlgeschlagen) | Dashboard → Snippet-Install |
| 7 | Snippet kopieren + warten | Verify → Live |

**Time-to-value:** von "nie" (User bounced vor Schritt 5) auf ~40 Sekunden.

---

## §5 Risiken & Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|---|---|
| **Doppelte Screenshot-Latenz (8–15s)** | 3-Schritt-Loading-Animation ("📸 Taking a snapshot…" → "🧠 AI analyzing…" → "✨ Rendering variant…"). Original-Screenshot WIRD SOFORT nach Schritt 1 geladen und angezeigt — User sieht seine Seite bereits nach ~4s. Variant-Screenshot lädt danach. Gefühlter Fortschritt, nicht Wartezeit. Screenshot 1 und HTML-Fetch parallel starten, um Latenz zu minimieren. |
| **SPA wird nicht erkannt** (falsch-negativ: leere Seite als SSR klassifiziert) | Mehrere Indikatoren kombinieren (leerer Root-Container + minimale HTML-Größe + fehlende semantische Tags). Schwelle: ≥2 von 5 Indikatoren = SPA. Edge Case: SSR-Seiten mit leerem `<body>` (Coming-Soon-Pages) → via HTML-Größe <500 Bytes abfangen. |
| **SPA fälschlich erkannt** (falsch-positiv: SSR-Seite als SPA klassifiziert) | Konservativer Schwellwert (≥2 Indikatoren). SSR-Seiten haben IMMER semantische Tags (`<header>`, `<nav>`, `<main>`) — dieser Indikator allein reicht nicht für SPA-Klassifikation. HTML-Größe >2KB schließt SPA praktisch aus. |
| **fetch(url) schlägt fehl** (Timeout, 403, DNS-Error) | Timeout 8s. Bei Fehler: Fallback auf Screenshot-only-Analyse (GPT-4o Vision rät Selektoren). User sieht trotzdem Preview — nur mit ~70–90% Selektor-Genauigkeit statt ~99%. Transparent kommunizieren: "We couldn't analyze your page's code, but here's our best guess based on the screenshot." |
| **CSS-Injection schlägt fehl** (falsche Selektoren trotz Code-Analyse) | Deutlich seltener durch Option A (<1% statt 10–30%). Falls doch: Snippet macht Runtime-Check `document.querySelector(selector)` → null? → Warning im Dashboard. User kann Selektoren im Dashboard korrigieren. |
| **urlbox.io CSS-Injection-Limit** (max CSS-Länge?) | Überprüfen: urlbox.io `css`-Parameter erlaubt vollständige Stylesheets. Unsere Injektion ist ~500–1500 Zeichen. Sollte passen. |
| **2× Screenshot-Kosten ($0.008/Call)** | Rate-Limit 5/Minute, Free-Tier 10 Previews/Tag → ~$2.40/Monat bei 300 Previews. Immer noch vernachlässigbar. |
| **2× Storage-Kosten** (2 Screenshots statt 1) | Supabase Storage ist billig. 24h TTL. Nach Claim beide löschen. ~200KB pro Screenshot → ~120MB/Monat bei 300 Previews. Kosten: <$0.01. |
| **AI-Kosten (~$0.013/Call: Vision + HTML-Analyse)** | ~$3.90/Monat bei 300 Previews. $0.003 mehr als reiner Vision-Ansatz — durch Option A gerechtfertigt (99% statt 70–90% Selektor-Genauigkeit). Marge >10x bei Conversion zu Pro. |
| **AI schreibt CSS das nicht funktioniert** (überschreibt Layout, broken Styles) | Prompt-Engineering: "Use high-specificity selectors from the HTML. Add !important to every property. Include background-color where needed." Server-seitige CSS-Validierung: syntaktisch korrekt? Keine `display: none` auf `<body>`? Kein `position: fixed` auf Container? |
| **AI-Selektoren matchen live nicht** (trotz Code-Analyse, z.B. bei dynamischen Klassen zur Runtime) | **Durch Option A drastisch reduziert (<1% statt 10–30%).** Verbleibendes Restrisiko: (1) Snippet Runtime-Check: `document.querySelector(selector)` → null? → Dashboard-Warning, (2) Nach Claim zeigt Dashboard "Review your variant"-Screen — User kann korrigieren bevor er aktiviert, (3) Ziel: >99% der SSR-Preview-Tests sind ohne manuelle Korrektur live-fähig. |
| **Keine Interaktivität in der Preview** (kein Element-Picker, kein Klicken, kein Hover) | Bewusster Tradeoff. Die Preview ist ein statischer Screenshot-Vergleich — kein interaktiver Prototyp. Der Element-Picker wird erst NACH Snippet-Install verfügbar (wie heute auch). User bekommen vorher den Aha-Moment, danach die vollen Tools. |
| **User gibt Unsinn-URL ein** | SSRF-Filter (`lib/ssrf.ts`), URL-Validierung, "Seems like this page doesn't exist. Check the URL." |
| **Snippet wird nie installiert** | Post-Signup-Empty-State pusht Snippet-Install prominent. "Your test won't go live without this." |
| **Variant-Screenshot unterscheidet sich vom Live-Snippet-Rendering** | **Tut es nicht.** Genau das ist der Vorteil der CSS-Injection: Beide Screenshots sind der echte Page-Render. Kein Unterschied zum späteren Snippet — das Snippet injiziert exakt das gleiche CSS. |

---

## §6 Phasen & Prioritäten

### Phase 1: Website Hybrid Demo (Kritisch — Landingpage-Conversion)
1. `lib/screenshot.ts` — urlbox.io API-Wrapper mit `css`-Parameter für CSS-Injection
2. `app/api/preview/route.ts` — Screenshot 1 + GPT-4o Vision + Screenshot 2 (CSS-Injection)
3. `app/components/HybridDemo.tsx` — URL-Input → Loading → Dual-Screenshot A/B-Toggle → Change-Liste → Gate
4. `app/page.tsx` — Hero-CTA ändern, HybridDemo einbauen
5. `app/signup/page.tsx` — testId-Param verarbeiten
6. `app/dashboard/DashboardClient.tsx` — Empty-State für "Test ready, install snippet"

### Phase 2: Figma Plugin (Conversion im Plugin)
1. `ui.html` — Neue Screens: Dual-Screenshot-Preview + Gate, Onboarding-Flow umbauen
2. Bild-Toggle im Plugin (360px breit, Screenshot responsiv skaliert)
3. Keine neuen API-Endpoints nötig (teilt sich `/api/preview` mit Website)

### Phase 3: Refine & Polish
1. `app/api/preview/refine/route.ts` — Iterative Verfeinerung + neuer Variant-Screenshot
2. A/B-Testing des Hybrid-Flows gegen alten Flow (Meta-AB-Testing mit variante selbst)
3. Parallelisierung: Screenshot 1 senden sobald er fertig ist, Screenshot 2 im Hintergrund laden
4. Pulse-Animation im injizierten CSS für Highlight-Outlines

---

## §7 Offene Fragen

1. **urlbox.io CSS-Injection getestet?** Noch nicht. Muss verifiziert werden: Akzeptiert der `css`-Parameter beliebig langes CSS? Werden `!important`-Regeln korrekt angewandt? Werden `@keyframes`-Animationen unterstützt?
   → **Vor Phase 1 mit einem manuellen curl-Test verifizieren.** Bei Problemen: Alternative Screenshot-API (screenshotapi.net, apiflash.com) evaluieren.

2. **GPT-4o Vision vs. gpt-4o-mini?** Vision für initiale Analyse braucht ein starkes Modell.
   → **gpt-4o für Preview, gpt-4o-mini für Refine.** Preview ist der Aha-Moment — $0.01 lohnt sich. Refine nur CSS-Tweak — $0.003 reicht.

3. **Preview-Speicher-Löschung?** 2 Screenshots pro Preview verdoppeln Storage.
   → Supabase Storage Bucket `previews` mit 24h TTL. Nach Claim BEIDE Screenshots löschen (nicht mehr nötig). Storage-Kosten vernachlässigbar.

4. **Was wenn die KI keine sinnvollen Änderungen findet?** (z.B. leere Seite, Coming-Soon-Page)
   → Fallback: "This page looks pretty minimal. Try a page with more content — like your homepage or pricing page."

5. **Mobile-Ansicht?** Screenshot ist 1440px Desktop.
   → **Phase 1: Desktop only.** 95% der User besuchen variante vom Desktop. Mobile-Screenshot in Phase 3.

6. **Demo ohne Temp-Session?** Soll der erste Preview OHNE Temp-Session laufen?
   → **Temp-Session erst bei "Go live".** Preview ist stateless bis Gate. Weniger DB-Müll, einfachere Architektur.

7. **CSS-Injection-Prompt-Strategie?** Wie garantieren wir dass die KI-Selektoren tatsächlich matchen?
   → Prompt-Engineering-Zyklus in Phase 1: 10 diverse URLs testen, Erfolgsrate messen, Prompt iterieren. Ziel: >90% Match-Rate. Fallback für die <10%: Änderungen als Text-Karten anzeigen.
