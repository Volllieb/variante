# E2E-Test-Checkliste — variante

> Stand: 06.07.2026. Kompletten Loop testen: Landing → Account → Extension → Figma → Snippet → Traffic → Conversions → Billing → Winner.
>
> **Vor dem Start:** Smoke-Tests unten ausführen.

---

## ✅ Erledigte Blocker

| ID | Was | Status |
|---|---|---|
| MIG-009 | `profiles.onboarded` Spalte in Production | ✅ 06.07.2026 |
| MIG-010 | `events`, `daily_stats`, `domains` Tabellen + `log_event()`, `snapshot_daily_stats()` RPCs | ✅ 06.07.2026 |

---

## 🚦 Smoke-Tests (vor jedem Durchlauf)

```bash
# Landing Page erreichbar
curl -sI https://www.getvariante.com | head -1       # → HTTP/2 200

# API CORS-Header vorhanden
curl -sI -X OPTIONS https://www.getvariante.com/api/resolve 2>&1 | grep -i "access-control"

# ab.js lieferbar
curl -sI https://www.getvariante.com/ab.js | head -1  # → HTTP/2 200
```

---

## Phase 1: Landing Page


- [ ] **Footer** — "Made in Bavaria", Privacy, Imprint, © 2026
- [ ] **Badge-Demo** — "A/B by Variante"-Floating-Badge unten rechts, klickbar → `/signup`

---

## Phase 2: Auth

### Signup
- [ ] `/signup` lädt — Email + Passwort (min 6 Zeichen) + "Create account"
- [ ] **Google OAuth** — "Continue with Google" sichtbar, Klick öffnet Google-Login
- [ ] **Email-Signup** — Account erstellen → Email-Bestätigung (Supabase-Email) → Redirect `/onboarding`
- [ ] **Bereits registriert** — Gleiche Email nochmal → "An account with this email already exists"-Hinweis
- [ ] **Source-Tracking** — `/signup?source=figma-plugin` → Onboarding zeigt Figma-spezifische Nachricht

### Login
- [ ] `/login` lädt — Email + Passwort + "Sign in"
- [ ] **Google OAuth** — "Continue with Google" sichtbar
- [ ] **Email-Login** — Einloggen → Redirect `/dashboard`
- [ ] **Bereits eingeloggt** — `/login` aufrufen während Session aktiv → Auto-Redirect `/dashboard`

### Passwort-Reset
- [ ] "Forgot password?" → Email eingeben → Reset-Link per Email
- [ ] Reset-Link klicken → `/update-password` → Neues Passwort setzen → Redirect `/dashboard`

### Logout
- [ ] Dashboard → Logout-Button → zurück zu Landing Page
- [ ] Erneut `/dashboard` aufrufen → Redirect `/login`

---

## Phase 3: Onboarding

- [ ] `/onboarding` lädt (aurora-Hintergrund, zentrierte Card)
- [ ] **Hero** — Zap-Icon + "You're all set!" + kontextabhängiger Text
- [ ] **Plugin Token** — Token sichtbar + Copy-Button funktioniert
- [ ] **Upgrade Card** (Free-User) — Free vs Pro Vergleich + "Upgrade to Pro"-Button + "Skip, start Free"-Button
- [ ] **Browser Extension Card** — Chrome Web Store Link + manuelle ZIP-Install-Anleitung (aufklappbar)
- [ ] **"Go to Dashboard"** — Button führt zu `/dashboard`

### Nach Upgrade (upgraded=1)
- [ ] `/onboarding?upgraded=1` → Grüner Banner "You're now on Pro"

---

## Phase 4: Dashboard (leer)

- [ ] `/dashboard` lädt — benutzerspezifisch
- [ ] **Top Bar** — PandaLogo, Plan-Badge (FREE/PRO), User-Email, Logout
- [ ] **Sidebar** — Navigation: Tests (aktiv), Results (Soon), Activity log (Soon), Analytics (🔒/Pro), Domains (Soon), Plugin token, Integrations (Soon), Team (🔒), Usage, Extension
- [ ] **Usage Card** — Letzte 30 Tage: Aktive Experiments, Total, Visitors, Conversions, Avg Lift
- [ ] **Plan Card** — "Plan: FREE" + Beschreibung + "Upgrade →" oder "Manage →" (Pro)
- [ ] **Significance Card** — Free: 🔒 "Significance is a Pro feature" + Upgrade-CTA / Pro: grün "Enabled"
- [ ] **Recent Activity** — Letzte 3 Tests mit Status-Dots, Links zu `/results/[id]`
- [ ] **Testliste** — Such-Input + Filter-Toggle (all/active/draft/done), "No tests yet"-Leerzustand
- [ ] **Browser Extension** (unten) — CWS-Link
- [ ] **Plugin Token** (unten) — Token + Copy-Button
- [ ] **Snippet** (unten) — Code-Block + Copy-Button, alle 4 Frameworks aufklappbar (Next.js App, Pages, Plain HTML, Vue/Svelte/Astro), Privacy-Hinweis

---

## Phase 5: Chrome Extension

- [ ] **CWS-Install** — [Chrome Web Store](https://chromewebstore.google.com) → "variante — A/B Test Element Picker" installieren
- [ ] **Popup öffnen** — Extension-Icon → Popup 280px zeigt Test-ID-Input + Datalist + "Pick element on page"
- [ ] **Test-Seite öffnen** — Beliebige Webseite (oder lokale Testseite)

### Element-Picker
- [ ] **Hover** — Blaues Highlight über Elementen beim Hovern
- [ ] **Klick** — Element klicken → Banner "✅ Element captured ✓" + "Close tab → back to Figma"
- [ ] **API-Call** — Network-Tab: POST `/api/capture` mit `selector`, `outerHTML`, `siteCss`, `framework`, `goal_candidates`

### URL-Hash-Modi
- [ ] `#ab_pick=<testId>` — Startet Picker automatisch (kein Popup nötig)
- [ ] `#ab_goal=<testId>` — Startet Goal-Modus, klickbares Element = Goal

### Goal-Picker (via Popup)
- [ ] Goal-Modus aktivieren (Test-ID mit Goal-Flag) → Klick auf Button/Link → Goal gespeichert

---

## Phase 6: Figma Plugin

- [ ] **Plugin öffnen** — Figma → Plugins → Variante (oder via Community, sobald approved)

### Screen -1: Connect
- [ ] **Welcome** — "Create free account →" + "I have an account — connect"
- [ ] **Token verbinden** — Token aus Dashboard pasten → gespeichert (`figma.clientStorage`)

### Screen 0: Dashboard
- [ ] **Test-Liste** — Karten mit Name, Domain, Status-Badges, Stats, Play/Pause/Delete
- [ ] **+New Test** — Button startet Creation-Flow
- [ ] **Refresh** — Button lädt Tests neu

### Screen 1: Test Details
- [ ] **Name + URL** — Test-Name + Site-URL eingeben, Checkmark bei gültiger URL
- [ ] **"Continue →"** — Geht zu Screen 2

### Screen 2: Pick Element
- [ ] **Test-ID** — Angezeigt + kopierbar
- [ ] **Browser Extension Hinweis** — Download-Link
- [ ] **Warten auf Capture** — Lade-Animation bis Element gepickt
- [ ] **Element-Chip** — Gepicktes Element: Typ + Beschriftung

### Screen 3: Variant B in Figma
- [ ] **Layer auswählen** — "Click your variant B layer in Figma → Use selection"-Button
- [ ] **Selection-Anzeige** — Ausgewähltes Element wird angezeigt (Name + Typ)
- [ ] **"Continue to Goal →"** — Geht zu Screen 4

### Screen 4: Conversion Goal
- [ ] **Metrik-Auswahl** — Radio: "Click on tested element" (default) oder "Another element on the page"
- [ ] **Advanced Settings** — Aufklappbar
- [ ] **"Create Experiment →"** — API-Call, Test wird erstellt
- [ ] **Zurück-Navigation** — Pfeil-Icon geht einen Screen zurück, behält Daten

---

## Phase 7: Snippet installieren

- [ ] **Snippet kopieren** — Aus Dashboard → Copy-Button
- [ ] **In `<head>` einbauen** — Auf Testseite/Template
- [ ] **Anti-Flicker** — Seite lädt: kurz opacity=0 (nur bei B-Varianten), dann reveal
- [ ] **`ab.js` geladen** — Network-Tab: GET `ab.js` → 200
- [ ] **`/api/resolve`** — Network-Tab: GET `resolve` → 200, liefert `tests[]` + Badge-Info
- [ ] **`/api/assign`** — GET `assign` → 200, gibt `"A"` oder `"B"` zurück

---

## Phase 8: Traffic & Varianten

- [ ] **Variante A** — Original-Element sichtbar (keine Änderung)
- [ ] **Variante B** — Nach mehrmaligem Laden: B erscheint mit KI-generiertem HTML
- [ ] **DOM-Ersatz** — `.ab-v`-Container + Style-Block im DOM
- [ ] **Sticky Assignment** — `localStorage`: `ab_<test_id>` → Wiederkehrender Besucher kriegt gleiche Variante
- [ ] **Badge Free** — Free-Tier: "A/B by Variante"-Badge unten rechts (anklickbar)
- [ ] **Badge Pro** — Pro-Tier: Kein Badge
- [ ] **SPA-Navigation** — `popstate` + `MutationObserver` triggern Re-Evaluation (Next.js, React Router)

---

## Phase 9: Conversions

- [ ] **Goal klicken** — Klick auf Goal-Element → `sendBeacon` zu `/api/event`
- [ ] **`/api/event` 200** — POST mit `testId`, `variant`, `event=conversion`
- [ ] **sessionStorage-Dedup** — Zweiter Klick: `ab_conv_<test_id>` verhindert Doppel-Call
- [ ] **Dashboard aktualisieren** — Reload → Conversions gestiegen
- [ ] **Pausierter Test** — `status=paused`: `/api/event` → 409, kein Counter

---

## Phase 10: Results & Analyse

- [ ] **Dashboard → Test-Kachel** — Name, Status, Uplift %, Visitors, Conversions
- [ ] **Kachel klicken** → `/results/<id>`
- [ ] **Results-Seite** — CR % pro Variante, Visitors, Conversions
- [ ] **Preview** — Miniatur-iframe A + B nebeneinander mit Site-CSS
- [ ] **Auto-Refresh** — Pollt alle 5s, Zahlen aktualisieren sich live

### Signifikanz
- [ ] **Pro** — "Significance: X%" sichtbar
- [ ] **Free** — 🔒 "Significance & auto-winner are Pro features" + Upgrade-Link → `/dashboard`

### Auto-Winner (Pro)
- [ ] **Panel** — Min Visitors + Min Uplift-Inputs, Save-Button, Fortschrittsbalken
- [ ] **Winner-Banner** — `winner=B`: Grüner Rahmen um B, "Winner: Variant B"

---

## Phase 11: Billing

- [ ] **Upgrade →** — Dashboard → "Upgrade →" → Stripe Checkout
- [ ] **Stripe Checkout** — Kreditkartenzahlung, Email vorausgefüllt
- [ ] **Redirect** — Nach Zahlung → `/onboarding?upgraded=1`
- [ ] **"You're now on Pro"** — Grüner Banner sichtbar
- [ ] **Plan-Anzeige** — Dashboard: "Plan: PRO", "Manage →"-Button
- [ ] **Kein Badge** — Testseite: Kein "A/B by Variante"
- [ ] **Free-Gating** — Zweiten Test via API: Free → 402, Pro → 200
- [ ] **Manage →** — Stripe Customer Portal → Abo kündigen → Plan zurück auf Free (via Webhook)

---

## Phase 12: Winner-Mechanismus

- [ ] **Threshold erreicht** — Visitors ≥ minVisitors, Uplift ≥ minUplift, Significance ≥ 95%
- [ ] **`status=done`** — Test automatisch auf `done`
- [ ] **`winner=B`** — Korrekt gesetzt
- [ ] **Winner Forcing** — `/api/resolve` → `force: "B"`
- [ ] **Alle kriegen B** — Neue Besucher ohne assign-Call → Variante B
- [ ] **Kein Tracking mehr** — Force-B-Test: kein assign, kein conversion-tracking

---

## Phase 13: Neue Features

- [ ] **Activity Log** (`/api/events`) — GET liefert Event-Historie (created, started, paused, winner_detected, done)
- [ ] **Analytics-API** (`/api/analytics/[testId]`) — GET liefert Daily-Stats-Zeitreihe, Pro-gated
- [ ] **Domain-Management** (`/api/domains`) — CRUD + Verification (`/api/domains/verify`)
- [ ] **Profile-API** (`/api/profile`) — GET/PATCH, `notify_on_winner`-Flag
- [ ] **CSV-Export** (`/api/results/export`) — GET liefert CSV
- [ ] **Token-Regeneration** (`/api/token/regenerate`) — POST erzeugt neuen Token
- [ ] **Cron: Winner-Check** (`/api/cron/check-winners`) — POST mit `CRON_SECRET`, Winner-Erkennung + Resend-Email
- [ ] **Cron: Stats-Snapshot** (`/api/cron/snapshot-stats`) — POST mit `CRON_SECRET`, täglicher Stats-Snapshot

---

## Phase 14: Privacy & DSGVO

- [ ] **Privacy Page** — `/privacy` lädt, enthält Resend + Upstash in Sub-Processor-Tabelle, `ab_conv_<test_id>` dokumentiert
- [ ] **Imprint** — `/imprint` lädt, Impressum-Daten korrekt
- [ ] **Kein CDN/Drittanbieter** — Network-Tab auf Landing Page: Nur `getvariante.com` + `supabase.co` + `openai.com` (bei Gen)
