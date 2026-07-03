# PROJEKT.md — variante (DSO)

> **DSO = Documentation Structure Overview.** Lebendes Projektdokument. Bei jeder Änderung fortschreiben, nicht ersetzen. Enthält Selbstprüfung (siehe §Prüfung).

---

## §1 Identität

| Feld | Wert |
|---|---|
| **Produktname** | variante |
| **Mission** | Designer-natives A/B-Testing — Element in Figma auswählen → KI generiert Variante B → Snippet trackt Conversions. Kein Dev nötig. |
| **ICP** | Designer & kleine Agenturen, die eigenes Design per KI in Websites übertragen — auf Plattformen **ohne** natives A/B-Testing (Custom HTML, WordPress, Next/React, Shopify). |
| **Nicht-Zielgruppe** | Webflow/Framer/Wix — haben A/B eingebaut + sperren `<head>`. |
| **Rechtsform** | Einzelunternehmen (Bayern/DE) |
| **Phase** | Post-MVP → Go-to-Market |
| **Stand** | 02.07.2026 |
| **Leitziel** | 500–1.000 €/Mo passives Asset. Hebel = Distribution (Figma Community PLG), nicht Produkt. |

## §2 Stack

| Komponente | Technologie | Zweck |
|---|---|---|
| API + Dashboard | Next.js 16 (App Router) | Backend + Web-UI |
| Hosting | Vercel (1 aktives Produkt-Projekt) | Deployment |
| Datenbank | Supabase (Postgres) | Tests, Events, User |
| Auth | Supabase Auth (JWT) | Login + API-Gate |
| Billing | Stripe | Abos + Checkout |
| KI-Generierung | OpenAI API | HTML-Varianten (~0,3 ct/Call) |
| Coding-Agent | Cline (VS Code + CLI) via DeepSeek V4 Pro | Autonomes Coden, Testen, Iterieren |
| Snippet | `ab.js` (Vanilla JS) | Läuft auf Kundenseite |
| Chrome-Extension | MV3 (Vanilla JS) | Element + Goal Picker |
| Figma-Plugin | TypeScript + HTML | Plugin-UI (8 Screens) |

## §3 Repository-Struktur

```
c:\dev\variante/
├── AGENTS.md              # Meta-Anweisungen + Prüfregeln
├── GOTOMARKET.md           # GTM-Strategie & Phasen
├── PROJEKT.md              # ← DSO (diese Datei)
├── README.md               # Kurzübersicht + Schnellstart
├── package.json            # Root-Scripts
├── .gitignore              # Ignorier-Regeln
│
├── ab-tool/                # Kernprodukt — Next.js API + Dashboard
│   ├── app/
│   │   ├── api/            # API-Routen (assign, billing, capture, event, generate, resolve, results, stripe, tests, variant, waitlist)
│   │   ├── dashboard/      # Dashboard-UI
│   │   ├── login/          # Login-Seite
│   │   ├── onboarding/     # Post-Signup-Onboarding (Token, Upgrade, Extension)
│   │   ├── signup/         # Signup-Seite
│   │   ├── results/[id]/   # Ergebnisse
│   │   ├── imprint/        # Impressum
│   │   ├── privacy/        # Privacy Policy
│   │   ├── layout.tsx      # Root-Layout
│   │   └── page.tsx        # Landing-Page (5 Sektionen: Hero, How It Works, Use Cases, Pricing, Notify)
│   ├── lib/                # Server-Logik (auth, cors, stats, significance, stripe, supabase)
│   ├── __tests__/          # Lightweight Self-Checks (kein Test-Framework)
│   └── public/ab.js        # Das Snippet
│
├── .agents/                # Lokale Agent-/Skill-Setup für VS Code/Copilot
├── .github/agents/         # Custom Agents (stripe, redesign, ponytail)
├── chrome-extension/       # Chrome-Extension (MV3)
│   ├── manifest.json
│   ├── content-picker.js (on-demand, kein content_scripts) / background.js / popup.js / popup.html
│   ├── welcome.html
│   └── icons/
│
├── figma-plugin/           # Figma-Plugin
│   ├── manifest.json
│   └── src/ (code.ts + ui.html — Screen 1: Welcome statt Token-Eingabe)
│
├── z.future-features/      # ⚠️ Anfassen verboten — kommt nach Launch
│   └── README.md
│
└── db/migrations/          # Supabase SQL (001–008)
```

## §4 Deployment

| Projekt | URL | Vercel-Name | Deploy-Methode |
|---|---|---|---|
| ab-tool | `www.getvariante.com` | `ab-tool` | `vercel deploy` (CLI) |

**Git-Remote:** `origin` → `github.com/Volllieb/variante.git` (`master`)  
**CI/CD:** Keine automatische Pipeline (kein Vercel-Git-Import eingerichtet).  
**Auto-Push:** `post-commit`-Hook pusht automatisch nach jedem Commit (siehe `.githooks/post-commit`).

## §5 Pricing

| Tier | Preis | Inhalt | Zweck |
|---|---|---|---|
| **Free** | 0 € | 1 aktives Experiment, Badge **an** | Figma-Discovery + viraler Loop |
| **Pro** | 35€/Monat | Unbegrenzt, Badge **aus**, volle Statistik | Solo-Monetarisierung |
| **Agency** | 99€/Monat (Coming Soon) | Multi-Site, White-Label, Team-Seats | **Später — aktuell auf Eis** |

**KI-Kosten:** ~0,3 ct/Call → Marge praktisch 100 %.  
**Free-Tier AI-Gen:** ✅ **Entschieden — ja.** AI-Gen auch im Free-Tier (1 Experiment). Begründung: Aha-Moment > Kosten; Kosten vernachlässigbar. Monetarisierung über *unbegrenzt + Badge-aus*, nicht über das KI-Feature selbst.

## §6 Plattform-Support

| Plattform | Snippet | Hürde |
|---|---|---|
| Custom HTML | ✅ `<head>` | — |
| WordPress | ✅ Code-Snippet-Plugin | — |
| Next.js/React | ✅ `layout.tsx` | — |
| Shopify | ✅ `theme.liquid` | — |
| Webflow | ⚠️ nur Paid | `<head>`-Zugriff |
| Framer | ❌ | Kein `<head>`-Zugriff |
| Wix/Squarespace | ❌ | Kein Custom-Script |

### Steuerklärung — Entscheidungen & Status

| Frage | Antwort | Status |
|---|---|---|
| **Kleinunternehmer-Regelung (§19 UStG)** | Grenze in **EUR** (EZB-Tageskurs bei USD). Aktuell weit drunter (~0 €). Monitoring ab >15.000 €/Jahr nötig. | ✅ Geklärt |
| **Reverse-Charge / OSS** | Kleinunternehmer-Regelung gilt auch für EU-Kunden. OSS erst bei >50.000 € + B2C nötig. | ✅ Geklärt |
| **USD-Preise** | EUR-Pflichtangabe auf Rechnung. Stripe Tax rechnet automatisch um + weist beide Beträge aus. | ✅ Stripe Tax aktivieren |
| **Stripe Tax** | Deckt Berechnung + Abführung. **Nicht** die Steuererklärung — aber solange Kleinunternehmer, entfällt UStVA. | ✅ Geklärt |
| **Plattform-Umsätze** | Betriebseinnahmen (keine sonstigen Einkünfte). | ✅ Geklärt |

**Fazit:** Kein Steuerberater-Gespräch vor Launch nötig. Stripe Tax aktivieren (0,5 %/Transaktion). Berater erst bei >15.000 €/Jahr oder Wechsel zur Regelbesteuerung einplanen.

- [x] Domain gesichert: `getvariante.com`
- [x] Free-Tier AI-Gen: **ja** (entschieden)
- [x] GitHub-Remote eingerichtet: `github.com/Volllieb/variante.git`
- [x] Steuerfragen geklärt (siehe Tabelle oben)
- [ ] MVP E2E auf echter Fremd-Site getestet?

## §8 v4-Backlog — Umsetzungsplan

### ✅ Phase A — Quick Wins (implementiert 29.06.2026)

| # | Item | Tier | Änderungen |
|---|---|---|---|
| 11 | **Lift prominenter zeigen** | Free | `ResultsClient.tsx`: relative Verbesserung B vs. A in % unter B-Wert |
| 6 | **Pause/Resume-Button** | Free | `ResultsClient.tsx`: `[Pause]` bei active, `[Resume]` bei paused |
| 12 | **Refresh-Button + Polling** | Free | ↻-Button neben Titel, `refresh()` extrahiert aus useEffect |
| 5 | **Polling-Intervall gaten** | Free/Pro | Free 30s, Pro 10s (vorher 5s für alle) |
| 8 | **Auto-Winner verifizieren** | Pro | `determineWinner` gibt `'A'` bei A-Sieg; Self-Check `__tests__/significance-check.mjs` |

### ✅ Phase B — UX-Komplettierung (implementiert 29.06.2026)

| # | Item | Tier | Änderungen |
|---|---|---|---|
| 14 | **Manual HTML-Editor für Variant B** | Free | `PATCH /api/tests/[id]` erlaubt `variant_b_html`; `ResultsClient.tsx` mit Textarea + Save/Cancel + „Edit HTML"-Button + „+ Add HTML"-Fallback |
| 1 | **Globales CSS in Figma-Preview (iframe)** | Free | `fillPreviews()` in Plugin: `innerHTML` → `iframe srcdoc` mit `<style>`-Block aus `siteCss`. Results-Preview ebenfalls iframe-basiert. Generate-Route gibt `siteCss` im Response zurück. Plugin-State speichert `siteCss`. |
| 2 | **KI-Prompt-Feld** | Free | Plugin-Generate-Screen: `gen-instructions`-Textarea → wird als `userInstructions` an Generate-Route gesendet → in `buildPrompt`/`buildRefinePrompt` als „Nutzer-Vorgabe" injiziert |
| 4 | **Auto-Complete (localStorage)** | Free | Plugin speichert/setzt `gen-instructions` via `saveInputHistory('instructions')` / `loadInputHistory`. URL-History bereits über `dl-url`-Datalist + `populateDatalist` vorhanden. |
| 3 | **Inline→global CSS extrahieren** | Free | **Entfällt** — Phase-B #1 (iframe+Css) macht Explizites Extract obsolet: `<style>` im HTML-Fragment wird via `srcdoc` korrekt isoliert gerendert. |

### ✅ Phase C — Gesamt-Übersicht (implementiert 30.06.2026)

#7 ist implementiert, #9 war bereits in Phase A erledigt, #10 zurückgestellt.

| # | Item | Tier | Änderungen | Status |
|---|---|---|---|---|
| 7 | **Gesamt-Übersicht** | Free | `DashboardClient.tsx`: Running-/Won-/Ended-Badges + avg Lift + winner aus API geladen. `page.tsx`: winner in Select ergänzt. | ✅ Heute |
| 9 | **Konfigurierbare Gewinn-Kriterien** | Pro | Bereits in Phase A (#8) mitimplementiert: min_visitors/min_uplift Inputs in ResultsClient, determineWinner-Parameter, PATCH-Route, Event-Route. | ✅ Phase A |
| 10 | **Mehrere Metriken parallel** | Free/Pro | Zurückgestellt — Invasion aller Schichten (Schema, RPC, ab.js, event, significance, UI). JSONB wäre sauberster Weg (~6-10h). | ⏳ Post-Launch |

### ⏳ Phase D — Post-Launch (zurückgestellt)

- #10 Mehrere Metriken parallel
- Agency-Tier (White-Label, Multi-Site, Team-Seats)
- E-Mail-Benachrichtigung bei Winner

### Testplan Phase A

| Was | Wie | Erwartung |
|---|---|---|
| **Winner-Logik** | `node __tests__/significance-check.mjs` | 10/10 Tests green |
| **Winner-Logik** | Branch-Analyse: `resolve/route.ts` filtert `done+A` | Keine forced-A-Auslieferung |
| **Winner-Logik** | Edge-Case: A-Sieg wird persistiert + Dashboard zeigt Winner A | Test via Supabase Row-Insert |
| **Lift-Anzeige** | Dashboard mit Testdaten laden | Prozentwert unter B, Vorzeichen+Farbe korrekt |
| **Pause/Resume** | Button-Klick → PATCH → Status-Wechsel sichtbar | UI-Switch active↔paused ohne Reload |
| **Refresh-Button** | Klick → Daten-Update ohne full Reload | ↻-Button löst Poll aus |
| **Polling-Intervall** | Dashboard laden, Network-Tab checken | Free: 30s, Pro: 10s |

### Testplan Phase B

| Was | Wie | Erwartung |
|---|---|---|
| **HTML-Editor** | Results-Seite öffnen, "Edit HTML" klicken | Textarea erscheint mit aktuellem HTML, Save schreibt via PATCH, Preview refreshed |
| **HTML-Editor — Add** | Test ohne variantBHtml → "+ Add Variant B HTML" | Button sichtbar, Klick öffnet Editor |
| **HTML-Editor — Cancel** | Editor öffnen, Cancel klicken | Editor schließt ohne Änderung |
| **CSS in Figma-Preview** | Plugin Generate-Screen nach Generation | Preview zeigt iframe statt innerHTML, siteCss eingebettet |
| **CSS in Figma-Results** | Plugin Results-Screen | Preview zeigt iframe mit siteCss |
| **KI-Prompt-Feld** | Instructions eingeben → Generate | Prompt enthält "Nutzer-Vorgabe: ..." |
| **KI-Prompt — History** | Instructions speichern → neuen Test → Generate | Letzte Instructions wiederhergestellt |

## §9 Historie

| Datum | Eintrag |
|---|---|
| 03.07.2026 | **Cline + DeepSeek als Coding-Agent eingerichtet.** Cline VS Code Extension + CLI (`npm i -g cline`, v3.0.34) installiert. Provider: `openai-compatible` via `https://api.deepseek.com`, Model: `deepseek-v4-pro`. Ermöglicht autonome Test-Loops (branch → test → fail → fix → repeat) + Multi-Agent-Teams (`--team-name`) + Kanban (`npx kanban`). |
| 03.07.2026 | **Design-Pivot: Web-Dashboard auf monochromes „Panda"-System umgebaut.** Kompletter Wechsel weg von Dark-Aurora/Glassmorphism (Violet/Fuchsia-Gradients) hin zu Schwarz/Weiß + 3 Funktionsfarben (ok/pro/err), Struktur 1:1 vom Vercel-Dashboard übersetzt: feste Sidebar-Navigation (Tests aktiv · Activity log/Domains „Soon" · Analytics/Team gesperrt mit Lock-Icon bzw. Agency-Tag · Plugin token/Usage als Anchor-Links), Top-Bar mit Plan-Badge, Live-Suche über die Testliste. Bewusst keine erfundenen Kontingente (z. B. Visitor-Caps) — nur das real gegatete Limit „1 aktives Experiment" (Free) wird angezeigt. `brandguidelines.md` auf v2 aktualisiert (gilt jetzt für alle vier Oberflächen: Dashboard, Landingpage, Login, Figma-Plugin). Landingpage/Login/Figma-Plugin-Umsetzung folgt in separaten Schritten. |
| 02.07.2026 | **Auth-Fix: Passwort-Reset & Signup-Bestehende-Mail.** (1) Passwort-Reset: `resetPasswordForEmail` redirectet jetzt auf `/auth/callback` → `verifyOtp` → `/update-password` (neue Seite). `PASSWORD_RECOVERY`-Listener auf `/login` als Fallback für alte Reset-Mails. (2) Signup mit bestehender Mail: Drei Fallbacks statt nur `identities.length === 0` — auch `error.message`-Patterns (`already`/`exists`/`registered`) und `email_confirmed_at`-Check. Message verbessert: „Achtung — bereits registriert. Direkt einloggen." |---|
| 02.07.2026 | **Google OAuth eingebaut.** Login + Signup haben jetzt „Continue with Google"-Button. `/auth/callback` verarbeitet jetzt beide Flows: OAuth (`code` → `exchangeCodeForSession`) und Email (`token_hash` → `verifyOtp`). Signup leitet Google-User mit `?source=` via `next`-Param sauber ins Onboarding. **Noch zu tun:** Supabase Dashboard → Google Provider aktivieren (Client-ID + Secret aus Google Cloud Console). |---|
| 02.07.2026 | **Figma-Plugin UI-Redesign „Figma+":** Kompletter CSS/HTML-Neuaufbau. Größere Spacing-Scale (4–32px), 3 Elevation-Level, Toggle-Switches statt Segmented Controls für A/B + Light/Dark. Refine-Overlay (Bottom-Sheet). Zentrierte Dots-Animation für Waiting-States. Dashboard: Site-URL-gruppierte Testkarten mit Section-Headern. Step 2: Zentrierte Waiting-Animation. Step 3: Prominente "Click a layer"-Card. Step 4: Default-unavailable → automatisch "Another element" selected + highlighted. Step 5: Preview iframe ohne Scroll, Code-Drawer, kein Figma-Referenz-Screenshot mehr. Step 6: Zwei saubere Buttons (Copy Prompt/Copy Snippet). JS-Logik unangetastet bis auf `openRefine/closeRefine/submitRefine`. |
| 01.07.2026 | **Stripe-Webhook gehärtet:** (1) `checkout.session.completed` prüft jetzt `payment_status` — nur `paid`/`no_payment_required` setzen `plan = 'pro'`. (2) `customer.subscription.created` als Handler ergänzt (Abos außerhalb Checkout). (3) `customer.subscription.updated` degradiert nur noch bei `canceled`/`unpaid` auf `free` — `past_due`/`incomplete`/`paused` behalten `pro`. (4) Idempotenz via `stripe_webhook_events`-Tabelle (Migration 008). Agent-Doku aktualisiert. |
| 30.06.2026 | **Auth-Fix: E-Mail-Bestätigung ging auf localhost:3000.** Ursache: Supabase Site URL stand auf localhost statt `www.getvariante.com`. Fix: (1) Supabase Dashboard → Site URL auf `https://www.getvariante.com` ändern, Redirect URLs ergänzen. (2) `signup/page.tsx`: `emailRedirectTo` explizit auf `${origin}/login` gesetzt. |---|
| 29.06.2026 | **Chrome Extension CWS-ready gemacht:** Store-Listing (`store-listing.md`) finalisiert mit Permission-Justifications, Data-Usage, Single-Purpose. `cws-assets/` als Ablage für Screenshots. `.gitignore` erweitert (ZIP + Assets raus). ZIP-Package (`variante-chrome-extension.zip`, 13 KB) erstellt. |
| 29.06.2026 | **Chrome Extension Refactoring (Host Permissions Review):** `content.js` (~300 Zeilen) aufgeteilt in `content-hash.js` (~30 Zeilen, läuft permanent auf allen Seiten) + `content-picker.js` (~270 Zeilen, on-demand per `chrome.scripting.executeScript` injiziert). Manifest: `scripting`-Permission hinzugefügt, `activeTab` bleibt. Background: `AUTO_INJECT`-Handler für Auto-Flow aus Figma. Popup: injectet erst content-picker.js, dann sendMessage. Userflow unverändert. Grund: Chrome-Review-"erweiterte Hostberechtigungen"-Prüfung entschärfen. |
| 30.06.2026 | **Chrome Extension: content_scripts komplett entfernt.** Kein Content Script läuft mehr automatisch auf irgendeiner Seite. `content-hash.js` gelöscht, Hash-Parsing in den Service Worker (`chrome.tabs.onUpdated`) verlagert. Auto-Flow: SW erkennt `#ab_pick=` beim Seiten-Laden, speichert Payload in `storage.local`, injectet `content-picker.js` via `scripting.executeScript`. `host_permissions` bleiben als Fallback für den Auto-Flow (Figma öffnet unbekannte Domain). Review-Position: „kein content_scripts = null automatischer Code auf irgendeiner Seite". |
| 30.06.2026 | **Figma Plugin + Chrome Extension eingereicht.** Figma Community Store + Chrome Web Store — Reviews laufen (1–14 Tage). E2E-Test + Dogfooding parallel. |
| 29.06.2026 | **Phase B UX-Komplettierung implementiert:** #14 Manual HTML-Editor für Variant B (Textarea + Preview in ResultsClient.tsx), #1 iframe-basierte CSS-Preview im Figma-Plugin (siteCss via srcdoc), #2 KI-Prompt-Feld (userInstructions → buildPrompt/buildRefinePrompt), #4 Auto-Complete für Instructions-Feld. #3 entfällt (durch #1 obsolet). |
| 29.06.2026 | **Phase A Quick Wins implementiert:** #5 Polling-Gating (Free 30s/Pro 10s), #6 Pause/Resume-Button im Dashboard, #8 determineWinner gibt `'A'` bei statistisch klarem A-Sieg zurück + Self-Check (10 Tests), #11 Lift-Anzeige (relative Verbesserung in %), #12 Refresh-Button. Siehe Testplan in §8. |
| 26.06.2026 | **Figma-Plugin Inspector-Patterns übernommen** (aus Analyse von Figmas eigenem Properties-Panel): (A) Inputs jetzt Figma-nativ — grauer `bg-secondary`-Fill, **kein** Ruhe-Border, Border erst bei Fokus. (B) Icon-Prefix links im Feld: Globe im URL-Feld, `< >`-Code-Icon im Custom-Selector (`.input-icon-left` + `.has-prefix`). (E) `.card`/`.testid-row` Border entfernt → ruhige Property-Rows. (F) Scope-`<select>` → Segmented Control (`.seg`/`.seg-btn`, `data-scope`-State, `setScope()`); `getScope()` liest jetzt `data-scope` statt `.value`. (Token) Hardcoded Hex in `.notice-*`/Badges/`.upgrade-banner`/`.err`/`.ok` → halbtransparente Status-Tokens (`--ok*`, `--warn*`) + `--figma-color-text-success/-warning/-danger` mit Fallback → Dark-Mode-safe. Bewusst NICHT: Sektions-Header mit Action-Icons (D). |
| 26.06.2026 | **Figma-Plugin Results-Screen überarbeitet:** Header zeigt Testnamen (`state.name`) + Status-Badge (`bs-*`) statt statischem „Results". A/B-Stats von 6er-Kachel-Grid auf zweispaltige Tabelle (`1fr 1fr` mit mittiger Trennlinie, Spalten-Header „Variant A/B", Labels 10px uppercase, Werte 16px bold). Significance als einzelne Zeile (`Significance: X% — not/significant`) statt Box+Balken. Winner-Banner im nativen `--figma-color-bg-success`-Stil, Variantenname fett, oben nach Header. Upgrade-Banner kompakt (Titel + Button einzeilig) im Figma-Warning-Stil (`--figma-color-bg-warning`). „No data" → „Waiting for first visitors." + Link-Button „→ Snippet-Anleitung". Preview ohne Dark-Variante, skaliert (`scale(0.8)`, max-height 64px, kein Scroll), eine Vorschau pro Variante. „Refreshes every 30s" als zentrierter Footer-Hinweis. Plugin-Titel `code.ts`: „AB Figma" → „Variante". Tote CSS (`.stats-grid`, `.stat*`, `.sig-*`, `.frame-sm*`) entfernt. |
| 29.06.2026 | **Dashboard-Redesign (Projekt-Übersicht im Figma-Plugin):** Status-Punkt (Figma-Layer-Dot-Stil: draft=grau, active=blau, done=grün, paused=orange) vor Testnamen statt Badge-only — visuelle Hierarchie auf einen Blick. Metriken (Visitors, Conversions, Winner) als Icon+Text-Row gruppiert, nicht mehr als Text-Soup in einer Zeile. Winner mit Trophy-Icon + grüner Hervorhebung in der Metrik-Zeile. Gruppen-Header mit Globe-Icon statt nacktem URL-Text. Aktionen (Pause/Delete) in separater Footer-Zeile, nicht mehr im Top-Header (weniger visuelles Rauschen). Gelöscht: `tc-meta` (Text-Soup), `tc-bar`/`tc-fill` (Progress-Balken — selten actionable in der List-Ansicht), `filter:grayscale` bei paused (opacity reicht). Alle Icons 10×10px via `currentColor`, Figma-Stroke-Stil. Build grün. |
| 26.06.2026 | **Figma-Plugin UI-Redesign:** Figma-natives Design System (Inter, #0D99FF, Figma CSS-Tokens). Fester Footer mit primärem CTA (disabled bis Voraussetzung erfüllt). Back-Button als reines Chevron-Icon. 6-Screen-Progress-Bar. URL-Feld: nur Checkmark-Icon bei Valid, kein Text. Element-Screen: lesbares Label `[Typ]: [Beschriftung]` statt CSS-Selektor, Test-ID sichtbar. Screen 3 CTA umbenannt zu „Weiter zur Metrik →". Metrik-Screen: Standard-Metrik prominent als Radio-Option, Advanced Settings (Chrome-Picker + Custom Selector) ausklappbar, keine rohe HTML-Struktur. |
| 26.06.2026 | **Figma-Plugin AI-Generierung:** Vier-Fenster-Layout statt drei — Figma auf weiß + schwarz, Variant B auf weiß + schwarz. `gen-ref-dark` neu, `gen-preview` entfernt (war doppelt auf weiß). |
| 26.06.2026 | **brandguidelines.md erstellt:** Design.md + ui-ux-pro-max-skill (67 Styles, 79 Paletten, 72 Fonts, 59 UX-Regeln) + Plugin-Codeanalyse in ein umfassendes Design-Dokument für KI-gestütztes Figma-Plugin-Design synthetisiert. 14 Sektionen, alle Design-Tokens, Komponenten-Patterns, Screen-Flow, Anti-Patterns. |
| 26.06.2026 | **Ponytail-Review:** `'use client'` aus VariantPreview entfernt (Server Component). Leere Grid-Spalte gefixt (jede Vorschau einzeln bedingt rendern). PROJEKT.md §3 aktualisiert. |
| 26.06.2026 | **Variant-Preview im Dashboard:** Results-Seite zeigt jetzt Preview-Ansicht beider Varianten (Original + B) als Miniatur-iframe nebeneinander unter den Statistiken. `getExperimentStats` liefert `originalHtml`/`variantBHtml`/`siteCss`. Neue Komponente `VariantPreview.tsx`. |
| 26.06.2026 | **Anti-Flicker fix:** 3 Probleme — (1) 3000ms-Fallback zu kurz für langsame Netze → 10000ms. (2) Kein early Connection-Hint → `preconnect` ins Snippet. (3) Blindes Timeout revealed bevor ab.js fertig → **Polling auf `window.__ab_pending_resolve`**: Inline-Script wartet auf reveal()-Signal von ab.js, 10s-Hard-Ceiling als Netz. Alle Snippet-Templates (Dashboard, Figma-Plugin) aktualisiert. |
| 25.06.2026 | Landingpage für getvariante.com gebaut (5 Sektionen: Hero, How It Works, Use Cases, Pricing, Notify/Waitlist). Privacy-/Imprint-Seiten, Waitlist-API, SQL-Migration 006. `lib/supabase.ts` auf Proxy umgestellt (lazy init für Build ohne Env-Vars). Domain-Verweis auf www.getvariante.com vereinheitlicht. |
| 25.06.2026 | **Deployment** — Landingpage auf `www.getvariante.com` deployed (Vercel `vercel deploy --prod`). Root `getvariante.com` redirectet auf `www`. Landingpage, Privacy, Imprint alle 200. |
| 30.06.2026 | **Deployment** — Landingpage-Redesign deployed. Health-Check 200 auf `/`, `/login`, `/signup`. |
| 02.07.2026 | **Deployment** — Auth-Infrastruktur live: Google OAuth (Web), Password-Reset-Flow (`/update-password` + `/auth/callback`), Signup-Existing-Email-Detection, Google-Button prominent oben auf Login/Signup. |
| 25.06.2026 | Figma-Plugin "Failed to Fetch" final fix: `Authorization` fehlte in CORS-Allow-Headers → Preflight blockte alle authentifizierten Requests. + openDashboard URL auf www.getvariante.com vereinheitlicht. |
| 25.06.2026 | Figma-Plugin "Failed to Fetch" fix: API URL in `ui.html` (src+dist) von `ab-tool-pied.vercel.app` auf `getvariante.com` geändert — mismatch mit `manifest.json` allowedDomains. |
| 25.06.2026 | Figma-Plugin: Build fix — `dist/` war nicht gebaut (fehlende `node_modules/`). `npm install` + Build als Voraussetzung dokumentiert. Manifest auf `getvariante.com` aktualisiert. |
| 25.06.2026 | **User-Onboarding-Flow (Plan A):** Figma-Plugin Screen 1 zeigt jetzt „Create free account →" statt Token-Feld. Neue `/onboarding`-Seite nach Signup (Token, Upgrade, Chrome-Extension). Signup redirect → `/onboarding` statt `/dashboard`. |
| 25.06.2026 | Cleanup: tote Dateien, Build-Artefakte, Boilerplate entfernt. DSO-Struktur eingeführt. Auto-Post-Commit-Hook + Selbstprüfung. |
| 25.06.2026 | Produktname-Korrektur: „variantt" → „variante". GitHub-Remote eingerichtet (`Volllieb/variante`). Domain `getvariante.com` eingetragen. Free-Tier AI-Gen entschieden (ja). Steuerfragen präzisiert. |
| 25.06.2026 | Steuerfragen beantwortet und §7 aufgeräumt. Ergebnis: Kein Berater vor Launch nötig, Stripe Tax aktivieren, Kleinunternehmer-Regelung bleibt erstmal. |
| 25.06.2026 | Währungsentscheidung: EUR statt USD. Fazit in §11 ergänzt. |
| 25.06.2026 | **Bugfix (ab.js):** 0 Conversions für Variante B — MutationObserver-Trigger löschte `active` nach `applyDom()` → `finish()` erneut → applyDom fehlschlagend → goalSel fiel auf original CSS-Selektor zurück → matched nie auf B-HTML. Fix: `data-ab-el`-Selektor immer für B, nicht nur bei erfolgreichem applyDom. |
| 25.06.2026 | **Phase A (Bugfixes):** Goal-Selector-Migration fix, SPA-Support, Anti-Flicker 3000ms. **Phase B (English):** Alle UI-Seiten, API-Fehlermeldungen, Extension, Figma-Plugin, ab.js-Header übersetzt. **Phase C:** Snippet-Installations-Sektion im Dashboard. |
| 24.06.2026 | GTM-Strategie dokumentiert (GOTOMARKET.md). |
| 19.06.2026 | Phase 0 bestanden — Markt validiert. |
| — | MVP gebaut (Auth-Lücke). v3 Launch-Vorbereitung gestartet. |

## §7 Security Disclosure (Figma Plugin — Publish Dialog)

> Finale Antworten — eingetragen am 30.06.2026.

| Frage | Antwort |
|---|---|
| **1. Backend-Hosting?** | Yes, and data derived from Figma Plugins API is sent to this backend. — `www.getvariante.com` auf Vercel (us-east, USA). DPA + SCCs (EU-US DPF) vorhanden. |
| **2. Fremde Network-Requests?** | My plugin makes requests not captured by the above. — Keine CDN/Statics/ Analytics-Drittanbieter. Einzige Ausnahme: OpenAI API (AI-Gen, kein Storage). |
| **3. User Authentication?** | Yes, handled via a site that I host. — Supabase Auth auf `getvariante.com`. |
| **4. Storage of Figma-Read Data?** | No — Auth-Token in `figma.clientStorage` is user input, not derived from Figma Plugin API. Selection data is transient (RAM only). |
| **5. Vulnerability-Management?** | Report per Email an `hello@getvariante.com`, 24h-Eingangsbestätigung, 30d-Fix-Ziel. Keine formellen Zertifikate (SOC2 etc.) als Solo-Projekt; Infrastruktur (Supabase, Stripe, Vercel) ist auditiert. |
| **6. Credential-Security?** | Passwörter bcrypt (Supabase Auth). HTTP-only Secure Cookies. API-Token (UUID v4) in `clientStorage`. Stripe direkt (keine Kreditkarten auf eigenem Server). |
| **7. Data Flow (Elaboration)?** | Nur selektiertes Figma-Element → `api.getvariante.com/generate` → OpenAI API (kein Storage). Kein Full-File-Scan. Kein Analytics. Kein Third-Party-Sharing außer OpenAI. |
| **Zugriffskontrolle?** | Supabase Row-Level Security (RLS) — jeder User sieht nur eigene Tests. Plugin-Token ist ein UUID-API-Key mit eingeschränkten Rechten. |
| **Datenspeicherung?** | Test-Konfiguration + Conversion-Events → Supabase Postgres (Frankfurt, DE). Hosting-Logs → Vercel (us-east, 7 Tage). Kein dauerhafter Storage außerhalb dieser Pfade. |
| **Support-Kontakt?** | `hello@getvariante.com` — auch in der Privacy Policy unter §7. |

---

## §10 Selbstprüfung

> **Bei JEDER Änderung an diesem Projekt prüfen:**

### 10.1 Struktur-Check
- [ ] Gibt es `node_modules/`, `.next/`, `dist/` im Git-Index? → `.gitignore` prüfen, `git rm --cached`
- [ ] Sind alle Dateien im Projekt funktional notwendig? → Unnötiges löschen
- [ ] Ist die Ordnerstruktur in §3 dieser Datei aktuell? → Sonst aktualisieren
- [ ] Entspricht der Code dem Stack in §2? → Keine vergessenen Abhängigkeiten

### 10.2 Git-Health
- [ ] Wurde diese Änderung committed? → `git status` prüfen
- [ ] Ist ein Remote vorhanden? → `git remote -v`
- [ ] Wurde gepusht? → `git log --oneline origin/master..HEAD` (nur bei Remote)
- [ ] Gibt es unversionierte Dateien, die versioniert gehören? → `git status --short`

### 10.3 Dokumentations-Health
- [ ] Ist diese Datei (PROJEKT.md) auf dem neuesten Stand? → Status, Entscheidungen, Historie
- [ ] Ist GOTOMARKET.md aktuell? → Bei Strategie-Änderungen
- [ ] Ist README.md konsistent mit der tatsächlichen Struktur? → Bei Struktur-Änderungen
- [ ] Sind Entscheidungen und Begründungen dokumentiert? → Sonst in §9 oder §7 ergänzen

### 10.4 Deployment-Health
- [ ] Funktionieren die Vercel-Deployments? → `curl`-Test auf beide URLs
- [ ] Sind Environment-Vars auf Vercel gesetzt? → Bei neuen API-Keys
- [ ] Wurden Migrationen aus `db/migrations/` ausgeführt? → Bei Schema-Änderungen

### 10.5 Produkt-Health
- [ ] Läuft der komplette Loop? → Extension → Plugin → API → Snippet → Event-Tracking
- [ ] Ist der Badge-Mechanismus intakt? → Free-Tier zeigt Badge, Pro nicht
- [ ] Funktionieren Auth + Gating? → Login, Trial, Paywall
- [ ] Sind die OpenAI-Calls günstig? → Kosten < 1 ct/Generierung

---

*DSO — zuletzt geprüft: 02.07.2026 (Auth: Passwort-Reset-Flow + Signup-Bestehende-Mail-Fix)*

---

## §11 Fazit

**variante ist startklar.** Der komplette Loop steht: Figma → KI → Snippet → Conversion-Tracking. Auth, Billing und Multi-Tenancy sind implementiert. Die Domain ist gesichert, das Pricing steht, die Steuerfragen sind geklärt.

**Was jetzt zählt, ist Distribution, nicht das Produkt.** Der GTM-Fahrplan in `GOTOMARKET.md` ist der Nordstern: Figma-Community-Plugin als PLG-Engine, viraler Loop über das Badge, Phase-1-Design-Partner für Case-Studies.

**Drei Dinge, die den Unterschied machen:**
1. **Figma-Plugin + Chrome-Extension in die Stores bringen** — das ist der Engpass (Review-Zeiten!)
2. **Phase 1: 3–5 Design-Partner gewinnen** — echte Installs + Case-Studies vor Public-Launch
3. **Dogfooding: variante auf getvariante.com laufen lassen** — erster Proof + Demo-Material

**Währungsentscheidung:** Abrechnung in **EUR**. Begründung: Sitz in DE, Kosten in EUR, erste Kunden aus DACH. USD-Komplexität (Wechselkurs-Doku, Stripe-Tax-Gebühr) spart man sich. Bei US-Dominanz (>60 % Kunden) später wechseln — reines Stripe-Setting, kein Produkt-Entscheid.

**Bis Mitte August 2026** sollte der öffentliche Launch stehen. Danach: Conversion-Funnel optimieren, Free→Pro. Das Agency-Tier (White-Label, Multi-Site, Team-Seats) ist zurückgestellt — kommt später, wenn sich erste Nachfrage abzeichnet.

> **Ein Satz:** Gebaut ist es — jetzt muss es raus zu den Leuten.
