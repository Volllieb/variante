# Hybrid-Onboarding-Plan — Screenshot-in, Value-out, Snippet später

> Stand: 17.07.2026 · Status: Planung · Aufwand: Mittel (ca. 3-4 Tage Fullstack)

## Kernidee

User gibt URL ein → Screenshot der echten Seite + AI-generierte Variant-Vorschläge → sofortiger Aha-Moment. Sign-up + Snippet erst wenn User sagt: "Will ich live haben."

**NICHT: Snippet vor Value. SONDERN: Value vor Snippet.**

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
Welcome → Setup (Name+URL) → Screenshot-Preview (AI-generiert) → [optional: Refine] → Gate: Sign-up → Snippet-Install → Live
```

### §1.3 Screens im Detail

#### Screen -2: Welcome (bleibt weitgehend)
- Text ändern: "See your site transformed — no setup required" statt "install the snippet"
- Button: "Try it now →" (startet Temp-Session + Screenshot-Flow)

#### Screen 0: Setup (vereinfacht)
- Test-Name + Website-URL (wie bisher)
- Snippet-Feld ENTFÄLLT hier — wandert hinter Sign-up-Gate
- Button: "Show me a variant →"
- **Server-Aktion bei Submit:**
  1. `POST /api/temp-session` → Token
  2. `POST /api/preview` → { url, testName } → Server macht Screenshot + AI-Gen
  3. Response: { previewHtml, previewCss, screenshotUrl, testId }

#### Screen 1: Preview (NEU — der Aha-Moment)
- **Oben:** Toggle A/B (Original-Screenshot vs. Variant-Screenshot overlaid)
- **Mitte:** AI-generierte Variant als gerenderte Vorschau (iframe mit injected CSS/HTML)
- **Unten:** "Refine with AI" (wie bisheriger Refine-Overlay)
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
| `ui.html` | Neuer Screen `s-preview` (Screenshot+Variant), neuer Screen `s-gate` (Sign-up), Snippet-Screen aus Onboarding-Flow entfernt (nur noch post-signup). Neue JS-Funktionen: `startHybridOnboarding()`, `renderPreview()`, `goToGate()`, `handleSnippetVerify()`. |
| `code.ts` | Keine Änderungen nötig — Temp-Token-Handling existiert bereits. |

### §1.5 Neue API-Endpoints

| Endpoint | Methode | Zweck |
|---|---|---|
| `/api/preview` | POST | Nimmt URL + testName, gibt { previewHtml, screenshotUrl, testId } zurück. Server-seitiger Puppeteer-Screenshot + AI-Gen. Rate-limited auf 5/Temp-Session. |
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
Landing → "See your site transformed" (URL-Eingabe) → Screenshot-Preview → Refine → Gate: Sign-up → Snippet → Dashboard
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

#### URL-Input → Preview (NEU — Client Component)

```tsx
// app/components/HybridDemo.tsx
'use client'

// States: idle → screenshotting → preview → refining → gate
// 1. User gibt URL ein
// 2. POST /api/preview → Server screenshottet + AI generiert
// 3. Preview wird gerendert: Screenshot mit CSS-Overlay der Variant
// 4. Toggle A/B, Refine-Button
// 5. "Go live" → Sign-up-Gate (Modal oder Redirect)
```

**Preview-Darstellung:**
- Zwei Tabs: "Original" | "Variant B"
- Gerendert als iframe oder Bild-overlay
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
| `app/components/HybridDemo.tsx` | **NEU** — URL-Eingabe, Preview, Refine, Gate. Client Component. |
| `app/signup/page.tsx` | Query-Param `testId` verarbeiten → nach Sign-up zu Claim-Tests |
| `app/dashboard/DashboardClient.tsx` | Empty-State für "Test ready, install snippet" (Test existiert aber Domain unverified) |
| `app/dashboard/components/ConnectWebsite.tsx` | Unverändert — wird jetzt im Post-Signup-Kontext genutzt |
| `app/api/preview/route.ts` | **NEU** — Screenshot + AI-Gen für nicht-eingeloggte User |
| `app/api/preview/refine/route.ts` | **NEU** — Refine-Schleife auf bestehendem Preview |
| `lib/screenshot.ts` | **NEU** — Puppeteer/Playwright-Screenshot-Funktion |

### §2.5 Screenshot-Implementierung

```typescript
// lib/screenshot.ts
// Option A: Vercel Edge Function mit Puppeteer (teuer, langsam)
// Option B: Drittanbieter-Screenshot-API (simpel, schnell)
// → Empfehlung: urlbox.io oder screenshots.api (Headless Browser as a Service)
//   Kosten: ~$0.001/Screenshot bei 1000+ Volumen
//   Latenz: ~3-8 Sekunden

export async function takeScreenshot(url: string): Promise<{ imageUrl: string; pageInfo: PageInfo }> {
  // 1. Screenshot machen
  // 2. CSS extrahieren (für spätere Variant-Renderings)
  // 3. Viewport-Info (width, height)
}
```

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
  previewId: string,        // UUID für spätere Refines
  testId: string,           // Draft-Test in DB
  screenshotUrl: string,    // URL zum Screenshot (gespeichert in Supabase Storage)
  variantHtml: string,      // AI-generierte Variante
  variantCss: string,       // CSS-Only Änderungen
  diffDescription: string,  // "Changed button color, increased font size..."
}

Response 429: Rate limit
Response 402: Keine Temp-Sessions mehr (signup_url)
```

**Ablauf Server-seitig:**
1. URL validieren (SSRF-Schutz via `lib/ssrf.ts`)
2. Screenshot machen (urlbox.io API oder Puppeteer)
3. Screenshot + page info an OpenAI API senden
4. Prompt: "Analyze this page screenshot. Suggest 3 specific UI improvements. Generate HTML/CSS for the best variant."
5. Variant HTML/CSS in DB speichern (Temp-Session-Scope)
6. Screenshot in Supabase Storage hochladen
7. Response zurückgeben

### §3.2 Neuer API-Endpoint: `/api/preview/refine`

```
POST /api/preview/refine
Body: { previewId: string, feedback: string }
Auth: Optional (Temp-Token oder JWT)

Response 200:
{
  variantHtml: string,      // Verfeinerte Variante
  variantCss: string,
}
```

### §3.3 Anpassung `/api/claim-tests`

Existiert bereits. Muss um Preview-Tests erweitert werden:
- Claim soll auch Tests mit `status='preview'` übernehmen
- Nach Claim: Status auf `draft` setzen, `user_id` vom Temp-User zum echten User

### §3.4 DB-Migration

```sql
-- 023_hybrid_onboarding.sql
ALTER TABLE tests ADD COLUMN IF NOT EXISTS preview_screenshot_url text;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS preview_variant_html text;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS preview_variant_css text;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';
-- status kann sein: 'preview' (vor Sign-up), 'draft' (nach Claim, vor Snippet), 'active', 'paused', 'done'
```

---

## §4 UX-Vergleich: Vorher ↔ Nachher

### Figma Plugin

| Schritt | Vorher | Nachher |
|---|---|---|
| 1 | Welcome — "Install snippet" | Welcome — "See your site transformed" |
| 2 | Setup (Name+URL) | Setup (Name+URL) |
| 3 | **SNIPPET-WAND** ⛔ | **PREVIEW** ✅ (Aha-Moment) |
| 4 | Element-Picker (geht nicht ohne Snippet) | Refine (optional) |
| 5 | Design in Figma | **GATE: Sign-up** |
| 6 | Generate | Snippet-Install |
| 7 | Goal | Live |

**Time-to-value:** von ~10 Min (mit Snippet-Install) auf ~30 Sekunden (URL eingeben → Screenshot sehen).

### Website

| Schritt | Vorher | Nachher |
|---|---|---|
| 1 | Landingpage → /signup | Landingpage → URL-Input (same page) |
| 2 | Sign-up-Form | Screenshot-Preview (noch auf Landingpage) |
| 3 | Email bestätigen | Refine (optional) |
| 4 | Dashboard (leer) | **GATE: Sign-up** (Modal oder /signup) |
| 5 | ConnectWebsite (Domain) | Email bestätigen |
| 6 | Snippet-Check (fehlgeschlagen) | Dashboard → Snippet-Install |
| 7 | Snippet kopieren + warten | Verify → Live |

**Time-to-value:** von "nie" (User bounced vor Schritt 5) auf ~30 Sekunden.

---

## §5 Risiken & Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|---|---|
| Screenshot-Latenz (3-8s) | Loading-Animation mit Status-Schritten ("Screenshotting your site…", "AI analyzing…", "Generating variant…") — fühlt sich wie Fortschritt an, nicht wie Warten |
| Screenshot-Kosten ($0.001/Call) | Rate-Limit 5/Minute, Free-Tier-Limit 10 Previews/Tag → ~$0.30/Monat bei 300 Previews |
| AI-Kosten (~$0.003/Call) | Wie oben — akzeptabel für Aha-Moment. Marge > 100x bei Conversion zu Pro |
| User gibt Unsinn-URL ein | SSR-Filter (`lib/ssrf.ts`), URL-Validierung, "Seems like this page doesn't exist. Check the URL." |
| Snippet wird nie installiert | Post-Signup-Empty-State pusht Snippet-Install prominent. "Your test won't go live without this." |
| Preview sieht anders aus als echtes Snippet | Preview-Note "Rendered with your site's CSS — close approximation, not pixel-perfect" (existiert schon im Generate-Screen) |

---

## §6 Phasen & Prioritäten

### Phase 1: Website Hybrid Demo (Kritisch — Landingpage-Conversion)
1. `lib/screenshot.ts` — Screenshot-Funktion
2. `app/api/preview/route.ts` — Preview-Endpoint
3. `app/components/HybridDemo.tsx` — URL-Input → Preview → Gate
4. `app/page.tsx` — Hero-CTA ändern, HybridDemo einbauen
5. `app/signup/page.tsx` — testId-Param verarbeiten
6. `app/dashboard/DashboardClient.tsx` — Empty-State für "Test ready, install snippet"

### Phase 2: Figma Plugin (Conversion im Plugin)
1. `ui.html` — Neue Screens: Preview + Gate, Onboarding-Flow umbauen
2. Keine neuen API-Endpoints nötig (teilt sich `/api/preview` mit Website)

### Phase 3: Refine & Polish
1. `app/api/preview/refine/route.ts` — Refine-Schleife
2. Animierte Übergänge zwischen States
3. A/B-Testing des Hybrid-Flows gegen alten Flow (Meta-AB-Testing mit variante selbst)

---

## §7 Offene Fragen

1. **Screenshot-Provider:** urlbox.io (~$19/Monat für 5000 Screenshots) vs. Puppeteer auf Vercel (Edge-kompatibel?) vs. einfache `html2canvas`-Alternative?
   → Tendenz: urlbox.io für MVP (kein Infra-Aufwand), später Puppeteer auf Vercel Serverless wenn Volumen wächst.

2. **Preview-Speicher:** Screenshots in Supabase Storage oder nur temporär (signierte URL mit Ablauf)?
   → Tendenz: Supabase Storage Bucket `previews` mit 24h TTL.

3. **Demo ohne Temp-Session?** Soll der erste Preview OHNE Temp-Session laufen (reines Frontend + API)?
   → Tendenz: Temp-Session erst bei "Go live" erstellen. Preview ist stateless bis Gate.
