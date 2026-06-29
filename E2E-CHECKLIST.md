# E2E-Test-Checkliste — variante

> Stand: 29.06.2026. Kompletten Loop testen: Landing → Account → Extension → Figma → Snippet → Traffic → Conversions → Billing → Winner.

---

## Phase 1: Landing & Account

- [ ] **Landing Page** — `www.getvariante.com` lädt, 5 Sektionen sichtbar (Hero, How It Works, Use Cases, Pricing, Notify/Waitlist)
- [ ] **Signup** — `/signup`: Account erstellen (Email + Passwort), Redirect zu `/onboarding`
- [ ] **Login** — `/login`: Ausloggen + wieder einloggen funktioniert
- [ ] **Onboarding** — Token sichtbar + kopierbar, Upgrade-CTA vorhanden, Chrome-Extension-Download-Link da, „Go to Dashboard →" führt zu `/dashboard`

## Phase 2: Dashboard (leer)

- [ ] **Dashboard lädt** — URL `/dashboard`, benutzer-spezifisch
- [ ] **Plan-Anzeige** — „Plan: FREE" + Beschreibung + „Upgrade to Pro"-Button
- [ ] **API-Token** — sichtbar + Copy-Button funktioniert
- [ ] **Snippet-Installation** — Code-Block sichtbar, Copy-Button, alle 4 Framework-Details aufklappbar
- [ ] **Stats Summary** — 0 experiments, 0 visitors, 0 conversions
- [ ] **No Tests** — „No tests yet — create them in the Figma plugin" sichtbar

## Phase 3: Chrome Extension — Element Picken

- [ ] **Extension installieren** — `chrome://extensions` → Developer mode → Load unpacked → `chrome-extension/`
- [ ] **Fake-Site öffnen** — `ab-spike.vercel.app` oder lokale Testseite
- [ ] **Picker via Popup** — Extension-Icon → Öffnen → Picker aktiv
- [ ] **Picker via URL-Hash** — `#ab_pick=<testId>` startet Picker automatisch
- [ ] **Element hovern** — Blaues Highlight über dem Element
- [ ] **Element klicken** — Banner zeigt Erfolg, Overlay „✅ Element captured ✓" + „Close tab → back to Figma"
- [ ] **API-Call** — Network-Tab: POST `/api/capture` mit selector, outerHTML, siteCss, framework, goal_candidates
- [ ] **Goal-Picker** — `#ab_goal=<testId>` startet Goal-Modus, klickbares Element wird als Goal gespeichert

## Phase 4: Figma Plugin — Test-Konfiguration

- [ ] **Plugin öffnen** — Figma → Plugins → Variante
- [ ] **Screen 1: Token Connect** — Token aus Dashboard pasten → gespeichert (clientStorage)
- [ ] **Screen 2: URL** — Testseiten-URL eingeben, Checkmark-Icon bei gültiger URL
- [ ] **Screen 3: Element** — Gepicktes Element angezeigt mit Typ + Beschriftung, Test-ID sichtbar
- [ ] **Screen 4: Metrik** — Standard-Metrik (Click) als Radio-Option, Advanced Settings ausklappbar
- [ ] **Screen 5: Figma-Design** — Element in Figma selektieren → „Use selection" → FrameContent + PNG exportiert
- [ ] **Screen 5: KI-Generierung** — API-Call läuft, Vorschau zeigt 4 Fenster (A weiß + schwarz, B weiß + schwarz)
- [ ] **Screen 6: Results** — Test-Name + Status-Badge, A/B-Tabelle mit CR/Visitors/Conversions, ggf. Significance
- [ ] **Back-Button** — Chevron-Icon, geht einen Screen zurück, Behält Daten

## Phase 5: Snippet Installieren

- [ ] **Snippet aus Dashboard kopieren** — Copy-Button kopiert alle 3 Zeilen
- [ ] **Snippet in `<head>` einbauen** — In Testseite (ab-spike oder eigene)
- [ ] **Anti-Flicker** — Seite lädt: kurz opacity=0, dann reveal
- [ ] **ab.js geladen** — Network-Tab: `ab.js` 200
- [ ] **`/api/resolve`** — Network-Tab: resolve-Call 200, liefert tests[] + badge

## Phase 6: Traffic & Varianten

- [ ] **`/api/assign`** — Wird aufgerufen, gibt „A" oder „B" zurück
- [ ] **Variante A** — Original-Element sichtbar
- [ ] **Variante B** — Mehrfach laden: irgendwann B mit KI-generiertem HTML
- [ ] **DOM-Ersatz** — B sichtbar: neues HTML mit `.ab-v`-Container + Style-Block
- [ ] **Sticky Assignment** — `localStorage` enthält `ab_<key>` → wiederkehrender Besucher kriegt gleiche Variante
- [ ] **Badge Free** — Free-Tier: „A/B by Variante"-Badge unten rechts
- [ ] **Badge Pro** — Pro-Tier: Kein Badge
- [ ] **SPA-Navigation** — `popstate` + MutationObserver triggern Re-Evaluation

## Phase 7: Conversions

- [ ] **Goal klicken** — Klick auf Goal-Element → `sendBeacon` zu `/api/event`
- [ ] **`/api/event` 200** — POST mit testId + variant + event=conversion
- [ ] **sessionStorage-Dedup** — Zweiter Klick auf gleiches Goal: kein weiterer Call
- [ ] **Counter steigen** — Dashboard zeigt erhöhte Conversions nach Reload
- [ ] **Pausierter Test** — `status=paused`: `/api/event` gibt 409, keine Counter-Erhöhung

## Phase 8: Dashboard & Results

- [ ] **Dashboard aktualisieren** — Manuelles Neuladen zeigt aktuelle Zahlen
- [ ] **Stats Summary** — „X experiments · Y visitors · Z conversions"
- [ ] **Test-Kachel** — Name, Status, Uplift (%), Visitors, Conversions, Site-URL
- [ ] **Klick auf Kachel** — Führt zu `/results/<id>`
- [ ] **Results-Seite** — CR % pro Variante, Visitors, Conversions
- [ ] **Preview** — Miniatur-iframe A + B nebeneinander mit Site-CSS
- [ ] **Auto-Refresh** — Results pollt alle 5s (Zahlen aktualisieren sich)
- [ ] **Signifikanz (Pro)** — „Significance: X%" sichtbar
- [ ] **Signifikanz (Free)** — 🔒 „Significance & auto-winner are Pro features"
- [ ] **Free: Upgrade-Link** — Klick führt zu `/dashboard`
- [ ] **Auto-Winner-Panel (Pro)** — Min Visitors + Min Uplift-Inputs, Save-Button, Fortschrittsbalken
- [ ] **Winner-Banner** — done + winner=B: grüner Rahmen um B, „Winner: Variant B"

## Phase 9: Billing & Plan-Limits

- [ ] **Upgrade to Pro** — Dashboard → „Upgrade to Pro" → Stripe Checkout
- [ ] **Stripe Checkout** — Kreditkartenformular, Zahlung erfolgreich
- [ ] **Redirect** — Nach Zahlung zu `/onboarding?upgraded=1`
- [ ] **Pro-Badge** — „🎉 You're now on Pro"
- [ ] **Pro-Status** — Dashboard zeigt „Plan: PRO"
- [ ] **Kein Badge** — Testseite: kein „A/B by Variante"-Badge mehr
- [ ] **Free-Gating** — Zweiten Test via API anlegen: Free → 402, Pro → 200
- [ ] **Manage Subscription** — Dashboard → „Manage subscription" → Stripe Customer Portal
- [ ] **Kündigung** — Portal: Abo kündigen → Plan zurück auf Free

## Phase 10: Winner-Mechanismus

- [ ] **Threshold erreicht** — Genug Visitors (≥ minVisitors) + Uplift ≥ minUplift + Significance ≥ 95%
- [ ] **status=done** — Test automatisch auf done gesetzt
- [ ] **winner=B** — winner-Feld auf „B" gesetzt
- [ ] **Winner Forcing** — `/api/resolve` liefert `force: "B"` für diesen Test
- [ ] **Alle kriegen B** — Auch neue Besucher ohne assign-Call bekommen Variante B
- [ ] **Kein Tracking** — force-B-Test: kein assign, kein conversion-tracking mehr aktiv

## Smoke-Tests (vor dem Durchlauf)

```bash
# Beide Vercel-Deployments antworten
curl -sI https://www.getvariante.com | head -1       # → 200
curl -sI https://ab-tool-pied.vercel.app | head -1    # → 200

# Landing Page enthält Kerninhalte
curl -s https://www.getvariante.com | grep -c "A/B testing from Figma"
# → 1

# API ist erreichbar + gibt CORS-Header
curl -sI -X OPTIONS https://ab-tool-pied.vercel.app/api/resolve 2>&1 | findstr "access-control"
# → access-control-allow-origin: *
```
