# Future Features — variante

> **Anfassen verboten.** Dieser Ordner dokumentiert, was sicher kommt — aber erst nach Launch & Stabilisierung.
> Kein Code dafür schreiben, keine Vorbereitungen treffen. Nur Denkarbeit parken.

---

## 🏗️ Agency-Tier (99€/Monat)

**Status:** Zurückgestellt bis erste Pro-Nachfrage sichtbar.

| Feature | Beschreibung |
|---|---|
| **Multi-Site** | Ein Account verwaltet Tests auf mehreren Domains |
| **White-Label** | Kein „powered by variante"-Badge, eigenes Branding im Snippet, die Möglichkeit das Dashboard unter eigenem Logo zu teilen |
| **Team-Seats** | Mehrere Logins pro Account, Rollen (Admin/Viewer) |
| **Shared Dashboard** | Agentur sieht alle Kunden-Tests auf einen Blick |

**Trigger:** 5+ Pro-Kunden fragen danach.

---

## 📊 Mehrere Metriken parallel (#10)

**Status:** Zurückgestellt (~6–10h Aufwand, alle Schichten betroffen).

Heute: 1 Conversion-Goal pro Test („Click auf Element X").
Ziel: Beliebig viele Goals parallel („Click auf Button A" + „Click auf Button B" + „Page View /pricing").

**Betroffene Schichten:**
- `db/migrations/` — `goals` aus JSONB statt einzelner Spalte
- `ab.js` — mehrere `data-goal`-Attribute auswerten
- `POST /api/event` — Goal-Matching gegen Array
- `getExperimentStats` — Stats pro Goal
- `significance.ts` — pro Goal rechnen
- `ResultsClient.tsx` — Goal-Selector + Multi-Tabelle

**Ansatz:** `goals JSONB` in `tests`-Tabelle, RPC `get_experiment_stats` gibt Goal-Array zurück.

---

## 📧 E-Mail-Benachrichtigungen

**Status:** Zurückgestellt.

- „Dein Test hat einen signifikanten Winner"
- Weekly Digest: „Deine Tests diese Woche"
- „Dein Test hat 100/500/1000 Visitors erreicht"

**Technik:** Supabase Edge Function oder Resend. Nicht vorher anfassen.

---

## � Token-Transfer-Bug — Onboarding-Friction

**Status:** Zurückgestellt, aber hohe Priorität für Activation.

**Problem:** Neue User erstellen ihren Account im Browser (Dashboard), müssen dann aber den API-Token **manuell kopieren und im Figma-Plugin einfügen**. Das ist der größte Drop-off-Punkt im Onboarding — Copy-Paste zwischen zwei Apps ist einer der häufigsten Abbrecher.

**Ziel:** User, die im Browser signuppen, sollen den Token **nie sehen oder pasten müssen**. Der Transfer passiert automatisch.

**Mögliche Ansätze (nicht entschieden):**

| Ansatz | Beschreibung | Aufwand |
|---|---|---|
| **Chrome Extension als Brücke** | Extension liest Token aus Dashboard (cookie/storage) und injected ihn ins Figma-Plugin via `postMessage` oder gemeinsamen `storage.local`-Key | Mittel (~3h) |
| **Magic-Link / Callback** | Figma-Plugin öffnet Browser-Tab mit Token in URL-Hash → Plugin liest via Extension oder `window.location` | Gering (~1h), aber fragile |
| **OAuth / PKCE-Flow** | Figma-Plugin macht echten OAuth-Login — Token kommt direkt vom Server, nie durch User-Hände | Hoch (~8h), aber sauberste Lösung |
| **QR-Code** | Dashboard zeigt QR-Code → Plugin scannt via Figma-Camera-API | Mittel, aber Figma-API-Limits unklar |

**Warum später:** Aktuell ist Copy-Paste „gut genug" für Design-Partner & Early Adopter. Aber vor Public Launch sollte das weg — sonst killt es die Activation-Rate.

---


**Status:** Idee, kein Scope definiert.

Variante als MCP-Server für Coding-Agents (Copilot, Cursor, Claude Code):
- Agent fragt: „Welche A/B-Tests laufen auf dieser Site?"
- Agent bekommt: Test-ID, Varianten-HTML, Stats
- Agent kann: Variant B HTML patchen, Test pausieren, neuen Test anlegen

**Warum:** Designer nutzen immer mehr KI-Coding-Tools. Wenn der Agent Variante-Daten lesen/schreiben kann, wird Variante Teil des KI-Workflows.

---

## 🎨 Figma-Plugin — Quality of Life

| Feature | Beschreibung |
|---|---|
| **Preview live-rendern** | Statt statischem Screenshot: echtes iframe mit generiertem HTML |
| **Batch-Generierung** | Mehrere Varianten auf einmal generieren (A/B/C/D) |
| **Design-Tokens export** | Colors, Spacing, Typography aus Figma als CSS-Variablen |
| **Plugin-Analytics** | Wie viele Nutzer brechen an welchem Screen ab? |

---

## 🌐 Distribution & Wachstum

| Feature | Beschreibung |
|---|---|
| **SEO-Programm** | Content: „A/B test from Figma", „A/B testing for AI-generated websites" |
| **Framework-spezifische Guides** | WordPress, Shopify, Next.js — je ein Blogpost + Video |
| **Case-Study-Template** | Struktur für Before/After-Lift-Stories (aus Phase 1 Design-Partnern) |
| **Product Hunt Launch** | Vorbereitet in GOTOMARKET.md Phase 2 |

---

## 🧪 Testing & Qualität

| Feature | Beschreibung |
|---|---|
| **E2E-Test-Suite** | Playwright: Signup → Plugin → Capture → Snippet → Conversions → Winner |
| **Load-Testing** | `ab.js` unter 10k+ Requests, `/api/assign` unter Last |
| **Error-Tracking** | Sentry oder ähnlich für API + ab.js |

---

## 💡 Ideen (noch nicht entschieden)

- **Multivariate Tests** (A/B/C/D statt nur A/B)
- **Visuelle Vorschau im Dashboard** (Side-by-Side iframe)
- **Slack-Integration** („Test X ist significant")
- **Public Test Gallery** (User veröffentlichen anonymisierte Test-Ergebnisse → Social Proof)
- **AI Copy-Variationen** (Nicht nur Design, auch Text alternieren)
- **Auto-Stop** (Test stoppt automatisch bei Significance)

---

*Stand: 01.07.2026 — Nichts davon anfassen bis nach Launch + stabilem Pro-Umsatz.*
