# Future Features — variante

> **Anfassen verboten.** Dieser Ordner dokumentiert, was sicher kommt — aber erst nach Launch & Stabilisierung.
> Kein Code dafür schreiben, keine Vorbereitungen treffen. Nur Denkarbeit parken.
>
> **Stand: 06.07.2026** — Auf aktuellen Code-Stand abgeglichen.

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

## 🤖 Agency-Agent (KI-Agent für Agenturen)

**Status:** Idee, kein Scope definiert.

Ein KI-Agent (`@agency`), der Agentur-Kunden self-service bedient — ohne dass die Agentur selbst das Dashboard öffnen muss. Der Agent sitzt zwischen Agentur und variante und macht das operative Geschäft.

**Kern-Ideen:**

| Feature | Beschreibung |
|---|---|
| **Test-Erstellung** | „Erstelle einen A/B-Test für meinen Kunden example.com: Variant A = blauer CTA, Variant B = grüner CTA" → Agent legt Test an, generiert HTML, gibt Snippet aus |
| **Kunden-Onboarding** | Agent richtet neue Kundenseite ein (Domain verifizieren, Snippet-Code ausgeben, ersten Test vorschlagen) |
| **Status-Reports** | „Wie laufen die Tests für Kunde X?" → Agent aggregated Stats, Signifikanz, Winner |
| **Auto-Archive** | Agent erkennt Tests ohne Traffic seit >14 Tagen → schlägt Pause/Archivierung vor |
| **Multi-Kunden-Übersicht** | „Zeig mir alle aktiven Tests über alle meine Kunden" → agenturweite Aggregation |
| **White-Label-Konfiguration** | Agent setzt Branding, Domain, Badge-aus pro Kunde |

**Technische Basis:** Nutzt die bestehende REST-API (Token-basiert). Agent hat Agentur-Token mit erweiterten Scopes (mehrere Domains, Kunden-Management).

**Warum:** Agenturen sind der ideale Multiplikator — ein Agentur-Account bringt 10+ Endkunden. Aber Agenturen haben keine Zeit für Tool-Admin. Ein Agent, der das operative Geschäft abnimmt, senkt die Hürde massiv. Außerdem: „KI-Agent managed deine A/B-Tests" ist ein starkes Marketing-Versprechen.

**Abhängigkeit:** Agency-Tier muss stehen (Multi-Site, Team-Seats, Shared Dashboard). Erst dann macht der Agent Sinn.

---

## 📊 Mehrere Metriken parallel (#10)

**Status:** Zurückgestellt (~6–10h Aufwand, alle Schichten betroffen).

Heute: 1 Conversion-Goal pro Test („Click auf Element X").
Ziel: Beliebig viele Goals parallel („Click auf Button A" + „Click auf Button B" + „Page View /pricing").

**Wichtige Unterscheidung — Goal-Typen, nicht nur Goal-Anzahl:**
Nicht jeder Test optimiert auf einen Klick. Die zwei wichtigsten Hebel im CRO:

| Hebel | Metrik | Goal-Typ |
|---|---|---|
| **CVR** (Conversion Rate) | „Kauft der Besucher?" | Klick-Goal (CTA, Button, Link) |
| **AOV** (Average Order Value) | „Wie viel gibt er aus?" | Revenue-Goal (€-Wert aus Checkout) |
| **RPV** (Revenue per Visitor) | CVR × AOV — der kombinierte Hebel | Beide Goals parallel |

Praktisches Beispiel: Variante B zeigt höhere Preise aber weniger Käufe → CVR sinkt, AOV steigt. Ob das mehr Geld bringt, sagt nur RPV. Heute kann variante das nicht abbilden — nur „wurde geklickt? ja/nein".

**Revenue-Goals brauchen:** Event-Payload mit `value` (z. B. `{ goal: "purchase", value: 49.90 }`), `ab.js` muss numerische Werte durchreichen, Stats müssen Mean/Variance pro Goal-Typ rechnen (nicht nur Binomial).

**Betroffene Schichten:**
- `db/migrations/` — `goals` aus JSONB mit `type: "click" | "revenue" | "pageview"` statt einzelner Spalte
- `ab.js` — mehrere `data-goal`-Attribute auswerten, `value`-Prop supporten
- `POST /api/event` — Goal-Matching gegen Array, numerische Values validieren
- `getExperimentStats` — Stats pro Goal, t-Test für Revenue (nicht nur χ² für Clicks)
- `significance.ts` — pro Goal rechnen, Goal-Typ-abhängiger Test
- `ResultsClient.tsx` — Goal-Selector + Multi-Tabelle, RPV-Spalte

**Ansatz:** `goals JSONB` in `tests`-Tabelle, RPC `get_experiment_stats` gibt Goal-Array zurück.

---

## 📧 E-Mail-Benachrichtigungen

**Status:** Teilweise live (Winner-Mails), Rest zurückgestellt.

- ✅ „Dein Test hat einen signifikanten Winner" — Resend API + Cron-Job (`/api/cron/check-winners`) live seit 03.07.
- ⬜ Weekly Digest: „Deine Tests diese Woche"
- ⬜ „Dein Test hat 100/500/1000 Visitors erreicht"

**Technik:** Resend (`RESEND_API_KEY` Env-Var). Winner-Mail wird bei Signifikanz-Erkennung im Cron-Job versendet.

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

## 🤖 MCP-Server für Coding-Agents

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

## 🔐 Figma OAuth Login

**Status:** Evaluierung abgeschlossen, zurückgestellt.

Figma-Login als dritter Auth-Weg neben Email/Passwort und Google OAuth. Designer loggen sich direkt mit ihrem Figma-Account ein — der natürlichste Flow für die Zielgruppe.

**Herausforderung:** Figma ist kein nativer Supabase-Provider. Kein `signInWithOAuth({ provider: 'figma' })`. Der Flow muss komplett manuell gebaut werden:

| Schritt | Beschreibung |
|---|---|
| **Figma OAuth App** | In Figma Developer Console registrieren (`https://www.figma.com/developers/apps`) |
| **`/api/auth/figma`** | Eigene Route für Redirect zu Figmas `authorize`-Endpoint |
| **Figma Callback** | `code` → `access_token` tauschen via `POST https://www.figma.com/api/oauth/token` |
| **User-Info** | `GET /v1/me` für `user_id`, `email`, `handle` |
| **Supabase-Link** | Figma-User mit Supabase-User verknüpfen (entweder via `auth.identities`-Provider oder eigenes `figma_user_id`-Feld in `profiles`) |

**Aufwand:** ~4h (Custom-OAuth ohne Supabase-Adapter).

**Entscheidung:** Google OAuth reicht für jetzt. Figma-User haben fast immer ein Google-Konto. Figma OAuth kommt, wenn Nutzer-Feedback es fordert.

---

## 🌐 Distribution & Wachstum

**Status:** SEO-Programm gestartet, Rest offen.

| Feature | Beschreibung |
|---|---|
| 🟡 **SEO-Programm** | Landingpage-Audit + 4 Fixes live (06.07.): `robots.ts`, `sitemap.ts`, JSON-LD Organization, Meta-Tags. Offen: echtes OG-Image, Content-Programm. |
| ⬜ **Framework-spezifische Guides** | WordPress, Shopify, Next.js — je ein Blogpost + Video |
| ⬜ **Case-Study-Template** | Struktur für Before/After-Lift-Stories (aus Phase 1 Design-Partnern) |
| ⬜ **Product Hunt Launch** | Vorbereitet in GOTOMARKET.md Phase 2 |

---

## 🧪 Testing & Qualität

| Feature | Beschreibung |
|---|---|
| **E2E-Test-Suite** | Playwright: Signup → Plugin → Capture → Snippet → Conversions → Winner |
| **Load-Testing** | `ab.js` unter 10k+ Requests, `/api/assign` unter Last |
| **Error-Tracking** | Sentry oder ähnlich für API + ab.js |

---

## 🤖 Autopilot — KI-gesteuerte Test-Iteration

**Status:** Konzept, kein Scope definiert.

User gibt eine URL ein, die KI analysiert die Seite, schlägt Varianten vor, generiert sie, deployed sie und iteriert automatisch — bis ein signifikanter Winner feststeht. Kein manuelles Test-Design mehr.

**Flow:**

```
URL eingeben → KI analysiert Seite → schlägt Varianten vor → generiert HTML/CSS → deployed
→ misst Conversions → wertet aus → nächste Iteration → ... → „Test XYZ: Variante B gewinnt mit +23%"
```

**Kern-Features:**

| Feature | Beschreibung |
|---|---|
| **URL-Scan** | KI crawlt die eingegebene URL, extrahiert DOM-Struktur, identifiziert testbare Elemente (CTAs, Headlines, Hero-Sections, Pricing-Tables, Formulare) |
| **Varianten-Vorschläge** | KI schlägt 3–5 Varianten vor — begründet mit CRO-Best-Practices („Headline emotionaler", „CTA-Kontrast erhöht", „Social Proof näher an den CTA") |
| **Auto-Generierung** | Varianten werden als echtes HTML/CSS generiert, nicht nur als Diff-Patch — direkt deploybar via Snippet |
| **Auto-Iteration** | Nach jeder Signifikanz-Phase: Winner wird neue Baseline, KI generiert nächste Variante. Loop bis kein signifikanter Lift mehr oder User-Limit erreicht. |
| **Brand-Guideline-Concierge** | User hinterlegt Brand Guidelines (Farben, Typografie, Tonalität, Logo). Die KI hält alle Varianten brand-compliant — keine generischen Templates, sondern on-brand Iterationen. Guidelines können als Text, URL zu einer Brand-Seite, oder strukturiertes JSON eingereicht werden. |
| **Iteration-Log** | Jede Iteration mit Diff-Vorschau, Begründung, und Ergebnis — volle Transparenz, kein Black-Box-Autopilot |
| **Guardrails** | User setzt Limits: max. Iterationen, max. Traffic-Anteil pro Variante, Brand-Regeln („niemals Preis ändern", „Logo nicht anfassen") |

**Brand Guidelines — Warum das der Schlüssel ist:**
Jeder KI-generierte Vorschlag scheitert im echten Einsatz an einer Sache: Er respektiert die Marke nicht. Eine generische „bessere" Variante, die nicht zur Brand-Identität passt, wird vom Team abgelehnt — selbst wenn sie +30% konvertiert. Der Brand-Guideline-Concierge macht aus „KI-generiert" → „KI-generiert, on-brand".

**Guideline-Eingabe — drei Wege:**

| Weg | Beschreibung | Aufwand |
|---|---|---|
| **Freitext** | User beschreibt die Brand in natürlicher Sprache: „Wir sind ein B2B-SaaS, Farben Blau/Weiß, Ton sachlich-vertrauensvoll, nie reißerisch" | Gering |
| **URL-Scan** | KI liest die Brand-Seite des Users (z. B. `/brand` oder About-Page) und extrahiert automatisch Farbpalette, Typografie, Tonalität | Mittel |
| **Strukturiert** | User lädt JSON/YAML mit Design Tokens hoch (Farben, Fonts, Spacing, Logo-URL, Tone-of-Voice-Regeln) | Mittel |

**Brand-Constraints, die die KI beachtet:**
- **Farbpalette:** Nur freigegebene Colors, keine Eigenkreationen
- **Typografie:** Font-Families, -Größen, -Hierarchien
- **Tonalität:** Formell vs. locker, Duzend vs. Siezend, humorvoll vs. sachlich
- **No-Go-Zonen:** Elemente die nie geändert werden dürfen (Logo, Footer-Links, Preisangaben)
- **Layout-Grid:** Bevorzugte Spalten, Maximalbreiten, Abstände

**Technische Basis:**
- Vercel AI SDK für strukturierte LLM-Outputs (Varianten-HTML, Diff-Patches, Begründungen)
- Vision-Modell für URL-Scan (Screenshot + DOM-Struktur kombinieren)
- Brand Guidelines als System-Prompt-Injection in den Generation-Loop
- `ab.js`-Snippet deployed die Varianten wie gehabt — Autopilot ist nur die Creation-Schicht, nicht die Runtime

**Monetarisierung:**
- Pro-Plan: 1 aktiver Autopilot-Test
- Agency/Autopilot-Addon: 5 aktive Autopilot-Tests parallel
- Brand-Guideline-Concierge im Pro-Plan enthalten (Differenzierung zu Free)

**Warum das der Gamechanger ist:**
A/B-Testing hat heute drei Probleme: (1) Man muss wissen was man testen will, (2) man muss Varianten bauen können, (3) man muss Statistiken verstehen. Autopilot löst alle drei. User gibt URL ein → Variante kommt raus. Das ist die „Stripe-Level"-Abstraktion für CRO.

**Risiken:**
- KI-Halluzinationen im DOM (falsche Selektoren, kaputtes CSS) → braucht Validation-Layer vor Deployment
- Brand-Verletzungen trotz Guidelines → User-Feedback-Loop in Iteration-Log einbauen („Diese Variante hat Brand-Regel X verletzt — korrigiert in nächster Iteration")
- User vertrauen blind → Iteration-Log mit Diff-Vorschau ist Pflicht, nicht optional

---

## ✂️ Text-Test vs. Element-Test — Zwei Test-Modi

**Status:** Konzept, kein Code. Strategische Denkarbeit 07.07.2026.

Variante bietet heute nur **Element-Tests**: Designer wählt ein ganzes DOM-Element, KI generiert alternatives HTML/CSS, `ab.js` tauscht das Element komplett aus. Das ist der USP („in Figma designen → live testen"). Aber nicht jeder Test braucht ein Redesign. Manchmal reicht ein anderer Text.

Die Unterscheidung ist fundamental — beide nutzen dieselbe Chrome Extension zur Selektion, unterscheiden sich aber darin, *was* variiert wird und *wie* die Variante entsteht.

### Option A: Text/Copy-Test

Extension selektiert einen Text-Knoten → Variante ist ein anderer Text-String → `ab.js` tauscht nur `innerText`/`textContent`.

| Pro | Contra |
|---|---|
| Triviales Varianten-Management — ein String, kein DOM | Deckt nur Copy ab, keine visuellen Änderungen |
| Figma-Input perfekt — Designer schreibt Copy in Figma, Plugin exportiert reinen Text | Kein CSS-Reset nötig, aber auch kein CSS-Gestalten möglich |
| `ab.js` extrem simpel — `el.textContent = variant` | Testet nicht das, was Designer eigentlich designen (Layout, Farbe, Struktur) |
| Keine Styling-Konflikte — Variante erbt automatisch alle Styles des Originals | „Nur Text testen" fühlt sich für Designer nach halbem Produkt an |
| KI-Generierung einfach — Prompt: „Schreib 3 alternative Headlines für X" | Geringere Differenzierung zu ChatGPT & Co. |
| Schnellster Time-to-Test — 2 Klicks | — |

### Option B: Element-Test (Status Quo)

Extension selektiert ganzes DOM-Element → erfasst `outerHTML` + CSS + Framework → Variante ist komplett neues HTML/CSS → `ab.js` ersetzt das gesamte Element.

| Pro | Contra |
|---|---|
| Testet was Designer designen — Farbe, Layout, Struktur, alles | `ab.js` muss DOM austauschen, Event-Listener können verloren gehen |
| Figma→Code-Pipeline als USP — Designer designen Variante visuell, nicht textuell | KI muss HTML/CSS generieren — fehleranfälliger als reiner Text |
| Höhere Differenzierung — kein anderes Tool macht „Design in Figma → live testen" | Varianten-Input nur via Figma sinnvoll (manuelles HTML schreibt kein Designer) |
| Ganzheitlicher Test — CTA-Buttons, Hero-Sections, Formulare als Ganzes | CSS-Isolation nötig — Styles der Variante dürfen nicht nach außen leaken |
| Höherer wahrgenommener Wert — „Ich designe eine bessere Variante" > „Ich schreibe anderen Text" | Komplexeres `ab.js`, mehr Edge Cases (JS-Frameworks, Shadow DOM) |

### Architektonische Implikationen

```
                    Text-Test              Element-Test
─────────────────────────────────────────────────────────
Selektion           Extension (Text-Node)  Extension (DOM-Node)  ✅ beide gleich
Input-Quelle        Figma + manuell        Figma (primär)
KI-Generierung      String → String        Design-Tokens → HTML/CSS
ab.js Komplexität   ~10 Zeilen             ~50+ Zeilen
Flashing            Kein (gleiches CSS)    Möglich (CSS lädt nach)
A/B-Pfad            replaceText()          replaceElement()
Event-Listener      Bleiben erhalten       Müssen neu gebunden werden
Shadow DOM          Nicht relevant         Problemfall
```

### Empfehlung

**Beide anbieten, aber Element-Test zuerst als Aha-Moment, Text-Test als Quick-Win.**

1. **Element-Test ist der USP.** „In Figma designen → live testen" kann sonst keiner. Text tauschen kann jeder Headline-Optimizer.
2. **Text-Test ist der logische Next-Step.** Sobald der Element-Flow steht, ist Text ein trivialer Spezialfall davon (gleiche Extension, gleicher `ab.js`-Pfad, nur ohne HTML-Generierung).
3. **Designer denken in Elementen, nicht in Strings.** Das Produkt holt sie da ab, wo sie arbeiten.

Der Text-Test ist im Kern ein Element-Test, bei dem die Variante zufällig nur ein Text-Knoten ist — kein neuer Architekturpfad, nur ein reduzierter.

---

## 💡 Ideen (noch nicht entschieden)

- **Multivariate Tests** (A/B/C/D statt nur A/B)
- **Visuelle Vorschau im Dashboard** (Side-by-Side iframe)
- **Slack-Integration** („Test X ist significant")
- **Public Test Gallery** (User veröffentlichen anonymisierte Test-Ergebnisse → Social Proof)
- **AI Copy-Variationen** (Nicht nur Design, auch Text alternieren → Schlüssel für Stufe 2 der Plattform-Evolution)
- **Auto-Stop** (Test stoppt automatisch bei Significance)

---

## 🔮 Produkt-Evolution — vom Figma-Plugin zur CRO-Plattform

**Status:** Strategische Denkarbeit, kein Scope.

Das Figma-Plugin ist nicht das Produkt — es ist die Tür. Langfristige Evolution in drei Stufen:

### Stufe 1: Designer-natives A/B-Testing (heute)
Figma → KI-generierte HTML-Variante → Snippet. Der Designer-Workflow ist USP und Burggraben.

### Stufe 2: Vom Design-Tool zur CRO-Plattform
Die Features aus dieser Datei machen den Shift:
- **Revenue-Goals & Multi-Metriken** → Nicht nur „wurde geklickt", sondern Revenue, AOV, RPV — vollwertiges CRO
- **AI Copy-Variationen** → Headlines, Pricing-Text, CTAs variieren ohne Figma
- **Auto-Stop bei Significance** → Automatisierung à la Enterprise-Tools
- **Public Test Gallery** → Social Proof + Benchmarking (Netzwerkeffekt jenseits von Figma)

### Stufe 3: Plattform für jeden Website-Betreiber ohne Dev
Wenn Varianten auch ohne Figma erstellbar sind (Upload, AI-only, Copy-Variation), ist die Zielgruppe nicht mehr nur Designer — sondern **jeder Shop-Betreiber, Gründer, Marketer ohne Dev-Team**. Figma bleibt der PLG-Kanal, aber das Produkt wird breiter.

**Die Kernfrage (nicht jetzt entscheiden):** Lifestyle-Business (50 Pro-Kunden, 500–1.000 €/Mo passiv) oder Venture-Path (Plattform-Skalierung)? Die Features in diesem Dokument funktionieren für beide Pfade — aber ab Stufe 2 divergieren die Anforderungen an Team, Funding und Go-to-Market.

---

*Stand: 06.07.2026 — Nichts davon anfassen bis nach Launch + stabilem Pro-Umsatz.*
