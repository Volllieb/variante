# Hybrid-Onboarding-Plan — Screenshot-Leinwand + Overlay, Value vor Snippet

> Stand: 17.07.2026 · Status: Planung · Aufwand: Mittel (ca. 3-4 Tage Fullstack)

## Kernidee

User gibt URL ein → Screenshot der echten Seite als Leinwand → AI-positionierte Variant-Elemente als Overlay → Varianten-Vergleich per A/B-Toggle → sofortiger Aha-Moment. Sign-up + Snippet erst wenn User sagt: "Will ich live haben."

**NICHT: Snippet vor Value. SONDERN: Value vor Snippet.**

---

## §0 Preview-Rendering: Warum Screenshot + Overlay alle Alternativen schlägt

### Die Optionen im Vergleich

| | iframe | Screenshot (statisch) | Server-Proxy | **Screenshot + Overlay** |
|---|---|---|---|---|
| **Funktioniert für alle Sites** | ❌ ~60% blocken (X-Frame-Options, CSP) | ✅ | ⚠️ JS/Cookie-Probleme | ✅ |
| **Interaktivität** | ✅ Live, Hover, Scroll | ❌ Statisches Bild | ✅ Eingeschränkt | ⚠️ Overlays interaktiv, Rest statisch |
| **Variant sichtbar machen** | ❌ Kann iframe-Inhalt nicht modifizieren (cross-origin) | ❌ Nur zwei Bilder nebeneinander | ✅ CSS/HTML injizierbar | ✅ **Highlighted Overlays auf der echten Seite** |
| **Latenz** | ✅ Instant (0s) | ❌ 3–8s | ❌ 5–15s | ❌ 3–8s |
| **Kosten** | ✅ Kostenlos | ❌ $0.001/Call | ❌ Server-Infra | ❌ $0.001/Call |
| **Vergleichbarkeit A/B** | ⚠️ Man muss scrollen & suchen | ⚠️ Spot-the-difference | ⚠️ Wie iframe | ✅ **Expliziter Diff — Änderungen leuchten** |
| **"Das ist MEINE Seite"-Effekt** | ✅ | ✅ | ✅ | ✅ + **"Und DAS hat die KI geändert"** |

### Warum iframe scheitert

1. **X-Frame-Options: SAMEORIGIN/DENY** — die Mehrheit aller Produktionsseiten blockt Einbettung. Shopify, Vercel, Netlify, WordPress (viele Themes) setzen das standardmäßig.
2. **Content-Security-Policy: frame-ancestors 'self'** — noch restriktiver, gleicher Effekt.
3. **Cross-Origin-Isolation** — selbst wenn iframe lädt, kann JavaScript die Inhalte nicht lesen oder modifizieren. Variant-Injection unmöglich.
4. **Mixed Content** — HTTP-Seiten im HTTPS-Kontext werden blockiert.
5. **UX-Problem** — User muss im iframe scrollen um die Änderung zu finden. Kein expliziter Before/After-Diff.

**Fazit iframe:** Klingt elegant, scheitert in der Praxis an der Realität des Webs. Für ~60% der User-Sites würde einfach gar nichts angezeigt. Inakzeptabel für einen Aha-Moment.

### Warum Screenshot + Overlay gewinnt

1. **Universell** — funktioniert für JEDE URL, null Ausnahmen.
2. **Expliziter Diff** — Variant-Änderungen werden als positionierte HTML/CSS-Overlays auf den Screenshot gerendert. Geänderte Bereiche bekommen einen subtilen Glow/Highlight. Der User sieht SOFORT was anders ist.
3. **A/B-Toggle** — Ein Klick: Original-Screenshot ↔ Screenshot + Overlays. Kein Scrollen, kein Suchen.
4. **Emotionale Wirkung** — "Das ist meine echte Seite... und DAS hat die KI daraus gemacht." Stärker als jedes generische Demo.
5. **Technisch simpel** — Screenshot als `<img>` mit `position: relative`, Variant-Elemente als `position: absolute`-Overlays mit CSS-Transforms. Kein iframe-Sandbox-Wahnsinn.

### Wie das Overlay-Rendering funktioniert

```
┌─────────────────────────────────┐
│  Screenshot (1440×900 PNG)      │  ← urlbox.io / Puppeteer
│                                  │
│  ┌──────────────────────────┐   │
│  │  Variant Overlay 1       │   │  ← AI-gelieferte Position + neues CSS
│  │  (Button: neuer Text,    │   │     {
│  │   blaue Farbe, 8px mehr  │   │       selector: ".cta-button",
│  │   Border-Radius)         │   │       rect: { x: 520, y: 380, w: 200, h: 48 },
│  └──────────────────────────┘   │       newHtml: "<button>...",
│                                  │       newCss: "...",
│  ┌──────────────────────────┐   │       highlightColor: "#0D99FF"
│  │  Variant Overlay 2       │   │     }
│  │  (Heading: größer,       │   │
│  │   neue Subline)          │   │
│  └──────────────────────────┘   │
│                                  │
└─────────────────────────────────┘
```

**AI-Prompt liefert nicht nur HTML/CSS, sondern auch bounding boxes:**
```json
{
  "changes": [
    {
      "selector": ".hero-cta",
      "boundingBox": { "x": 520, "y": 380, "width": 200, "height": 48 },
      "originalHtml": "<button class='hero-cta'>Get Started</button>",
      "newHtml": "<button class='hero-cta'>Start Free Trial</button>",
      "newCss": "background: #0D99FF; border-radius: 12px; padding: 14px 32px;",
      "rationale": "Action-oriented copy + higher contrast CTA color"
    }
  ]
}
```

Das ist der entscheidende Unterschied zum einfachen Screenshot: **Die KI sagt nicht nur WAS sie ändert, sondern WO auf der Seite.**

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
Welcome → Setup (Name+URL) → Overlay-Preview (AI-generiert) → [optional: Refine] → Gate: Sign-up → Snippet-Install → Live
```

### §1.3 Screens im Detail

#### Screen -2: Welcome (bleibt weitgehend)
- Text ändern: "See your site transformed — no setup required" statt "install the snippet"
- Button: "Try it now →" (startet Temp-Session + Overlay-Flow)

#### Screen 0: Setup (vereinfacht)
- Test-Name + Website-URL (wie bisher)
- Snippet-Feld ENTFÄLLT hier — wandert hinter Sign-up-Gate
- Button: "Show me a variant →"
- **Server-Aktion bei Submit:**
  1. `POST /api/temp-session` → Token
  2. `POST /api/preview` → { url, testName } → Server macht Screenshot + AI-Gen mit Bounding-Boxes
  3. Response: { previewId, testId, screenshotUrl, changes: [{ selector, boundingBox, newHtml, newCss, rationale }] }

#### Screen 1: Preview (NEU — der Aha-Moment)
- **Aufbau:** Screenshot als vollflächiger Hintergrund, Variant-Overlays absolut positioniert
- **A/B Toggle oben:** "Original" | "Variant B" — schaltet Overlays an/aus
- **Geänderte Bereiche** haben beim ersten Laden einen kurzen Glow-Pulse (2s), dann dezenten farbigen Rand
- **Klick auf Overlay** → Zoom auf diesen Bereich + Tooltip mit "Changed: button text, color, border-radius"
- **Unten:** "Refine with AI" (wie bisheriger Refine-Overlay, aber Feedback bezieht sich auf spezifische Changes)
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
| `ui.html` | Neuer Screen `s-preview` (Screenshot-Leinwand + positionierte Overlays), neuer Screen `s-gate` (Sign-up), Snippet-Screen aus Onboarding-Flow entfernt (nur noch post-signup). Neue JS-Funktionen: `startHybridOnboarding()`, `renderOverlayPreview(changes, screenshotUrl)`, `toggleVariant()`, `goToGate()`, `handleSnippetVerify()`. Overlay-Rendering: Screenshot als `<img>`, Overlays als `position:absolute`-Divs mit boundingBox-Koordinaten. |
| `code.ts` | Keine Änderungen nötig — Temp-Token-Handling existiert bereits. |

### §1.5 Neue API-Endpoints

| Endpoint | Methode | Zweck |
|---|---|---|
| `/api/preview` | POST | Nimmt URL + testName, gibt { previewId, testId, screenshotUrl, changes[] } zurück. Server-seitiger Screenshot + AI-Gen mit Bounding-Boxes. Rate-limited auf 5/Temp-Session. |
| `/api/preview/refine` | POST | Nimmt previewId + feedback, gibt aktualisiertes changes[] zurück. |
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
Landing → "See your site transformed" (URL-Eingabe) → Overlay-Preview → Refine → Gate: Sign-up → Snippet → Dashboard
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

#### URL-Input → Overlay-Preview (NEU — Client Component)

```tsx
// app/components/HybridDemo.tsx
'use client'

// States: idle → loading → preview → refining → gate
// Loading hat 3 animierte Schritte:
//   "📸 Screenshotting your site…" → "🧠 AI analyzing the page…" → "✨ Generating variant…"
//
// Preview rendert:
//   1. Screenshot als Hintergrund (<img> mit object-fit)
//   2. Overlay-Container (position:relative, gleiche Dimension wie Screenshot)
//   3. Pro Change: absolut positioniertes Div mit boundingBox + neuem CSS
//   4. A/B Toggle: Original (Overlays aus) ↔ Variant B (Overlays an)
//   5. Geänderte Bereiche pulsen beim ersten Render (attention-grabbing)
```

**Preview-Darstellung:**
- Screenshot in Device-Mockup (Laptop-Frame) für zusätzlichen "das ist real"-Eindruck
- A/B Toggle als Slider/Pill-Buttons: "Original" | "Variant B"
- Overlays rendern das NEUE CSS live — Button hat wirklich andere Farbe, Text ist wirklich geändert
- "Refine" Button → Text-Input: "Make the button more rounded" → POST `/api/preview/refine`
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
| `app/components/HybridDemo.tsx` | **NEU** — URL-Eingabe, Loading-States, Screenshot+Overlay-Preview, A/B-Toggle, Refine, Gate. Client Component. |
| `app/signup/page.tsx` | Query-Param `testId` verarbeiten → nach Sign-up zu Claim-Tests |
| `app/dashboard/DashboardClient.tsx` | Empty-State für "Test ready, install snippet" (Test existiert aber Domain unverified) |
| `app/dashboard/components/ConnectWebsite.tsx` | Unverändert — wird jetzt im Post-Signup-Kontext genutzt |
| `app/api/preview/route.ts` | **NEU** — Screenshot + AI-Gen mit Bounding-Boxes für nicht-eingeloggte User |
| `app/api/preview/refine/route.ts` | **NEU** — Refine-Schleife auf bestehendem Preview |
| `lib/screenshot.ts` | **NEU** — Screenshot-Funktion (urlbox.io API-Wrapper) |

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
  screenshotUrl: string,        // Supabase Storage URL, 24h TTL
  screenshotWidth: number,       // 1440
  screenshotHeight: number,      // 900 (above the fold)
  changes: [
    {
      id: string,                // "change-1"
      selector: string,          // ".hero-cta"
      boundingBox: {             // Position auf dem Screenshot
        x: number,               // 520 (px from left)
        y: number,               // 380 (px from top)
        width: number,           // 200
        height: number           // 48
      },
      originalHtml: string,      // Extrahiertes Original-HTML
      newHtml: string,           // AI-generierte Variante
      newCss: string,            // CSS-Änderungen
      rationale: string,         // "Action-oriented copy + higher contrast"
      highlightColor: string     // "#0D99FF" — Farbe für den Overlay-Rand/Glow
    }
  ],
  summary: string                // "Changed button text, increased CTA contrast, added urgency subline"
}

Response 429: Rate limit
Response 402: Keine Temp-Sessions mehr (signup_url)
```

**Ablauf Server-seitig:**
1. URL validieren (SSRF-Schutz via `lib/ssrf.ts`)
2. Screenshot machen (urlbox.io, 1440×900, above the fold)
3. Screenshot + URL an OpenAI Vision (gpt-4o) senden:
   ```
   Prompt: "Analyze this page screenshot. Identify 2-4 specific UI elements that could be 
   improved for higher conversion. For each element, provide:
   - CSS selector (best guess from visual position)
   - Bounding box (x, y, width, height in pixels relative to the 1440×900 screenshot)
   - Original HTML (reconstructed from visual)
   - Improved HTML (keep structure, change text/colors/spacing)
   - New CSS rules
   - One-sentence rationale
   - A highlight color for the overlay border
   
   Focus on: CTAs, headlines, hero text, trust signals, pricing displays.
   Respond in JSON."
   ```
4. Screenshot in Supabase Storage hochladen (`previews` bucket, 24h TTL)
5. Preview-Daten in DB speichern (Temp-Session-Scope)
6. Response zurückgeben

### §3.2 Neuer API-Endpoint: `/api/preview/refine`

```
POST /api/preview/refine
Body: { previewId: string, feedback: string, changeId?: string }
Auth: Optional (Temp-Token oder JWT)

Response 200:
{
  changes: [...]  // Aktualisiertes changes[]-Array
}
```

**Ablauf:**
1. Preview-Daten aus DB laden
2. Feedback + bestehende Changes an GPT-4o senden
3. Nur die betroffenen Changes aktualisieren (nicht alles neu generieren)
4. Aktualisiertes changes[] zurückgeben

### §3.3 Anpassung `/api/claim-tests`

Existiert bereits. Muss um Preview-Tests erweitert werden:
- Claim soll auch Tests mit `status='preview'` übernehmen
- Nach Claim: Status auf `draft` setzen, `user_id` vom Temp-User zum echten User
- Preview-Daten (screenshot_url, changes[]) bleiben erhalten für Referenz

### §3.4 DB-Migration

```sql
-- 023_hybrid_onboarding.sql
ALTER TABLE tests ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';
-- status: 'preview' | 'draft' | 'active' | 'paused' | 'done'

ALTER TABLE tests ADD COLUMN IF NOT EXISTS preview_screenshot_url text;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS preview_data jsonb;
-- preview_data = { changes: [...], summary: "...", screenshotWidth, screenshotHeight }
```

### §3.5 Frontend-Rendering: `renderOverlayPreview()`

```typescript
// Gemeinsame Utility-Funktion für Figma Plugin & Website
function renderOverlayPreview(container: HTMLElement, data: PreviewResponse) {
  // 1. Screenshot als <img> rendern
  const img = document.createElement('img')
  img.src = data.screenshotUrl
  img.style.width = '100%'
  img.style.borderRadius = '8px'
  container.appendChild(img)

  // 2. Overlay-Container (exakt über dem Screenshot)
  const overlay = document.createElement('div')
  overlay.style.position = 'absolute'
  overlay.style.top = '0'
  overlay.style.left = '0'
  overlay.style.width = '100%'
  overlay.style.height = '100%'
  overlay.style.pointerEvents = 'none'  // Klicks gehen durch zum Toggle
  container.appendChild(overlay)

  // 3. Pro Change: absolut positioniertes Overlay
  for (const change of data.changes) {
    const el = document.createElement('div')
    // Position relativ zum Screenshot (in Prozent der Screenshot-Dimension)
    el.style.position = 'absolute'
    el.style.left = `${(change.boundingBox.x / data.screenshotWidth) * 100}%`
    el.style.top = `${(change.boundingBox.y / data.screenshotHeight) * 100}%`
    el.style.width = `${(change.boundingBox.width / data.screenshotWidth) * 100}%`
    el.style.height = `${(change.boundingBox.height / data.screenshotHeight) * 100}%`
    // Varianten-CSS anwenden
    el.style.cssText += change.newCss
    // Highlight-Rahmen
    el.style.boxShadow = `0 0 0 2px ${change.highlightColor}, 0 0 20px ${change.highlightColor}40`
    el.style.borderRadius = '4px'
    el.style.transition = 'box-shadow 0.3s ease'
    el.innerHTML = change.newHtml
    overlay.appendChild(el)
  }
}
```

---

## §4 UX-Vergleich: Vorher ↔ Nachher

### Figma Plugin

| Schritt | Vorher | Nachher |
|---|---|---|
| 1 | Welcome — "Install snippet" | Welcome — "See your site transformed" |
| 2 | Setup (Name+URL) | Setup (Name+URL) |
| 3 | **SNIPPET-WAND** ⛔ | **OVERLAY-PREVIEW** ✅ (expliziter Diff, A/B-Toggle) |
| 4 | Element-Picker (geht nicht ohne Snippet) | Refine (optional) |
| 5 | Design in Figma | **GATE: Sign-up** |
| 6 | Generate | Snippet-Install |
| 7 | Goal | Live |

**Time-to-value:** von ~10 Min (mit Snippet-Install) auf ~35 Sekunden (URL eingeben → eigene Seite mit Änderungen sehen).

### Website

| Schritt | Vorher | Nachher |
|---|---|---|
| 1 | Landingpage → /signup | Landingpage → URL-Input (same page) |
| 2 | Sign-up-Form | Overlay-Preview (noch auf Landingpage) |
| 3 | Email bestätigen | Refine (optional) |
| 4 | Dashboard (leer) | **GATE: Sign-up** (Modal oder /signup) |
| 5 | ConnectWebsite (Domain) | Email bestätigen |
| 6 | Snippet-Check (fehlgeschlagen) | Dashboard → Snippet-Install |
| 7 | Snippet kopieren + warten | Verify → Live |

**Time-to-value:** von "nie" (User bounced vor Schritt 5) auf ~35 Sekunden.

---

## §5 Risiken & Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|---|---|
| Screenshot-Latenz (3–8s) | 3-Schritt-Loading-Animation ("📸 Screenshotting…" → "🧠 Analyzing…" → "✨ Generating…") — Fortschritt, nicht Wartezeit |
| Screenshot-Kosten ($0.001/Call) | Rate-Limit 5/Minute, Free-Tier 10 Previews/Tag → ~$0.30/Monat bei 300 Previews |
| AI-Kosten (~$0.01/Call mit gpt-4o Vision) | Höher als reiner Text ($0.003), aber Bounding-Boxes sind den Mehrwert wert. ~$3/Monat bei 300 Previews. Immer noch Marge > 10x bei Conversion zu Pro. |
| AI liefert falsche Bounding-Boxes | Validierung: Box muss innerhalb Screenshot-Dimension liegen. Overlays mit `overflow: hidden` clippen. Fallback: Änderung als Karte UNTER dem Screenshot anzeigen. |
| User gibt Unsinn-URL ein | SSRF-Filter (`lib/ssrf.ts`), URL-Validierung, "Seems like this page doesn't exist. Check the URL." |
| Snippet wird nie installiert | Post-Signup-Empty-State pusht Snippet-Install prominent. "Your test won't go live without this." |
| Overlay sieht anders aus als echtes Snippet | Note "Rendered with AI approximation — live version may differ slightly." (Ehrlichkeit > Perfektion) |

---

## §6 Phasen & Prioritäten

### Phase 1: Website Hybrid Demo (Kritisch — Landingpage-Conversion)
1. `lib/screenshot.ts` — urlbox.io API-Wrapper
2. `app/api/preview/route.ts` — Screenshot + GPT-4o Vision + Bounding-Boxes
3. `app/components/HybridDemo.tsx` — URL-Input → Loading → Overlay-Preview → A/B-Toggle → Gate
4. `app/page.tsx` — Hero-CTA ändern, HybridDemo einbauen
5. `app/signup/page.tsx` — testId-Param verarbeiten
6. `app/dashboard/DashboardClient.tsx` — Empty-State für "Test ready, install snippet"

### Phase 2: Figma Plugin (Conversion im Plugin)
1. `ui.html` — Neue Screens: Overlay-Preview + Gate, Onboarding-Flow umbauen
2. Overlay-Rendering im Plugin (360px breit, Screenshot skaliert)
3. Keine neuen API-Endpoints nötig (teilt sich `/api/preview` mit Website)

### Phase 3: Refine & Polish
1. `app/api/preview/refine/route.ts` — Iterative Verfeinerung
2. Change-Overlay-Interaktion: Klick auf Overlay → Zoom + Detail-Tooltip
3. Animierte Übergänge: Overlays pulesn beim ersten Laden
4. A/B-Testing des Hybrid-Flows gegen alten Flow (Meta-AB-Testing mit variante selbst)

---

## §7 Offene Fragen

1. **Screenshot-Provider:** urlbox.io (~$19/Monat für 5000 Screenshots) vs. Puppeteer auf Vercel?
   → **urlbox.io für MVP.** Kein Infra-Aufwand, 3–8s Latenz, $0.004/Screenshot. Wechsel zu Puppeteer auf Vercel Serverless wenn >5000/Monat.

2. **GPT-4o Vision vs. gpt-4o-mini?** Vision für Bounding-Boxes braucht ein starkes Modell.
   → **gpt-4o für Preview, gpt-4o-mini für Refine.** Preview ist der Aha-Moment — da lohnen sich $0.01. Refine ist günstiger ($0.003).

3. **Preview-Speicher:** Screenshots in Supabase Storage oder nur temporär?
   → Supabase Storage Bucket `previews` mit 24h TTL. Signierte URLs. Nach Claim werden Screenshots gelöscht (nicht mehr nötig).

4. **Was wenn die KI keine sinnvollen Änderungen findet?** (z.B. leere Seite, Coming-Soon-Page)
   → Fallback: "This page looks pretty minimal. Try a page with more content — like your homepage or pricing page."

5. **Mobile-Ansicht?** Screenshot ist 1440px Desktop. Sollten wir auch Mobile screenshotten?
   → **Phase 1: Desktop only.** 95% der User besuchen variante vom Desktop. Mobile-Screenshot in Phase 3.

6. **Demo ohne Temp-Session?** Soll der erste Preview OHNE Temp-Session laufen?
   → **Temp-Session erst bei "Go live".** Preview ist stateless bis Gate. Weniger DB-Müll, einfachere Architektur.
