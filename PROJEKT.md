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
| **Stand** | 29.06.2026 |
| **Leitziel** | 500–1.000 €/Mo passives Asset. Hebel = Distribution (Figma Community PLG), nicht Produkt. |

## §2 Stack

| Komponente | Technologie | Zweck |
|---|---|---|
| API + Dashboard | Next.js 16 (App Router) | Backend + Web-UI |
| Hosting | Vercel (2 Projekte) | Deployment |
| Datenbank | Supabase (Postgres) | Tests, Events, User |
| Auth | Supabase Auth (JWT) | Login + API-Gate |
| Billing | Stripe | Abos + Checkout |
| KI-Generierung | DeepSeek API | HTML-Varianten (~0,3 ct/Call) |
| Snippet | `ab.js` (Vanilla JS) | Läuft auf Kundenseite |
| Chrome-Extension | MV3 (Vanilla JS) | Element + Goal Picker |
| Figma-Plugin | TypeScript + HTML | Plugin-UI (8 Screens) |

## §3 Repository-Struktur

```
c:\dev\variante/
├── CLAUDE.md              # Meta-Anweisungen + Prüfregeln
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
│   └── public/ab.js        # Das Snippet
│
├── ab-spike/               # Demo-Client-Site (E2E-Tests)
│   └── app/                # layout.tsx + page.tsx
│
├── chrome-extension/       # Chrome-Extension (MV3)
│   ├── manifest.json
│   ├── content.js / background.js / popup.js / popup.html
│   ├── welcome.html
│   └── icons/
│
├── figma-plugin/           # Figma-Plugin
│   ├── manifest.json
│   └── src/ (code.ts + ui.html — Screen 1: Welcome statt Token-Eingabe)
│
└── db/migrations/          # Supabase SQL (001–005)
```

## §4 Deployment

| Projekt | URL | Vercel-Name | Deploy-Methode |
|---|---|---|---|
| ab-tool | `ab-tool-pied.vercel.app` → **`www.getvariante.com`** | `ab-tool` | `vercel deploy` (CLI) |
| ab-spike | `ab-spike.vercel.app` | — | `vercel deploy` (CLI) |

**Git-Remote:** `origin` → `github.com/Volllieb/variante.git` (`master`)  
**CI/CD:** Keine automatische Pipeline (kein Vercel-Git-Import eingerichtet).  
**Auto-Push:** `post-commit`-Hook pusht automatisch nach jedem Commit (siehe `.githooks/post-commit`).

## §5 Pricing

| Tier | Preis | Inhalt | Zweck |
|---|---|---|---|
| **Free** | 0 € | 1 aktives Experiment, Badge **an** | Figma-Discovery + viraler Loop |
| **Pro** | 35€/Monat | Unbegrenzt, Badge **aus**, volle Statistik | Solo-Monetarisierung |
| **Agency** | 99€/Monat | Multi-Site, White-Label, Team-Seats | **Hauptumsatz** |

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

> **Stand 29.06.2026 — Plan basiert auf Codebase-Analyse.**
> **Empfehlung:** Phase A (Quick Wins) + Phase B (UX) zuerst — User-sichtbare Verbesserungen vor Big Features.

### Abhängigkeiten

```
#14 manuelles HTML    ──── unabhängig
#13 Brand Guide       ──── unabhängig
#4  Auto-Complete     ──── unabhängig
#6  Pause-Button      ──── unabhängig (PATCH status existiert)
#11 Lift anzeigen     ──── unabhängig (1 Zeile Dashboard)
#8  Auto-Winner       ──── unabhängig (Logik da, Test/Polish)
#1  CSS in Preview    ──── unabhängig (Figma-Plugin only)
#2  KI-Prompt-Feld    ──── unabhängig (#13 optional kombinierbar)
#9  Winner-Kriterien  ──── baut auf #8
#7  Gesamt-Übersicht  ──── unabhängig
#12 Refresh+Polling   ──── unabhängig
#5  Polling-Intervall ──── unabhängig

#10 Multi-Metric      ──── GROSS: DB + ab.js + Event + Dashboard + Extension
#3  Inline→global CSS ──── nur falls #1 iframe-Lösung nicht reicht
```

### Phase A — Quick Wins (Free, ~5h)

| # | Item | Tier | Aufwand | Umsetzung |
|---|---|---|---|---|
| 11 | **Lift prominenter zeigen** | Free | ~0,5h | 1 Relativ-Berechnung + Badge in ResultsClient |
| 6 | **Pause-Button im Dashboard** | Free | ~1h | `PATCH status:'paused'` via Button, Pause-/Resume-Icon |
| 12 | **Refresh-Button + konfigurierbares Polling** | Free/Pro | ~1h | Manueller Refresh-Button + konfigurierbares Intervall (UI-Setting) |
| 5 | **Polling-Intervall gaten** | Free/Pro | ~1h | Aktuell 5s für alle → Free 30s / Pro 10s. Geringer Code-Aufwand. |
| 8 | **Auto-Winner verifizieren + Edge-Cases** | Pro | ~2h | Tests für Edge-Cases (0-Conversions, gleichstand, etc.) + ggf. Fix |

### Phase B — UX-Komplettierung (Free, ~12h)

| # | Item | Tier | Aufwand | Umsetzung |
|---|---|---|---|---|
| 14 | **Manuelles HTML für Variante B** | Free | ~4h | `PATCH variant_b_html` in Route + einfacher HTML-Editor im Dashboard (textarea + Vorschau) |
| 1 | **CSS in Figma-Preview** | Free | ~4h | `<iframe srcdoc="">` statt `innerHTML` im Figma-Plugin + `site_css` einbetten → Style-Isolation |
| 4 | **Auto-Complete letzter Eingaben** | Free | ~2h | `localStorage`-Cache für zuletzt eingegebene URLs/Selektoren im Figma-Plugin |
| 2 | **KI-Prompt-Feld + variable Übertragungs-Genauigkeit** | Free | ~6h | Input-Feld für User-Instruktionen → in Generate-Prompt einspielen; Scope-Steuerung (accuracy/speed-Slider ↔ Temperature) |

### Phase C — Monetarisierung & Erweiterung (gemischt, ~18h)

| # | Item | Tier | Aufwand | Umsetzung |
|---|---|---|---|---|
| 13 | **Brand Guide in KI-Generierung** | Pro | ~8h | DB-Feld `brand_guide` (jsonb mit colors, fonts, logos, etc.) + UI zum Hochladen/Edit + Prompt-Injection |
| 7 | **Gesamt-Übersicht (kumuliert)** | Free | ~6h | Neue Dashboard-Sektion: aggregate stats über alle Tests (total visitors, avg improvement, active tests) |
| 9 | **Konfigurierbare Gewinn-Kriterien** | Pro | ~3h | Erweitert existierende `min_visitors`/`min_uplift`-Config um Significance-Schwelle, Zeitfenster, A-Sieg möglich |
| 3 | **Inline → globales CSS bei Variante B** | Free | ~4h | Backup-Plan falls iframe-Lösung in #1 nicht reicht: extrahiere `<style>` aus variant_b_html bei Generate |

### Phase D — Multi-Metric (Free/Pro, ~20h+)

| # | Item | Tier | Aufwand | Umsetzung |
|---|---|---|---|---|
| 10 | **Mehrere Metriken parallel** | Free/Pro | 20h+ | DB: `goals`-Tabelle (test_id, name, selector, type) + per-goal Counters; ab.js: Goal-Array + goalId in Conversion; Event-Route: goal-disambiguiertes Counting; Dashboard: per-Metric-Statistiken. **Auf Launch warten — kein User-Bedarf vorher.** |

### Nächste Schritte

Phase A als erstes: **#11 → #6 → #12 → #5 → #8.** Kein externes Feedback nötig, alle Änderungen isoliert im `ab-tool/`-Verzeichnis. Nach Phase A: erneute Priorisierung mit User-Feedback.

## §9 Historie

| Datum | Eintrag |
|---|---|
| 26.06.2026 | **Figma-Plugin Inspector-Patterns übernommen** (aus Analyse von Figmas eigenem Properties-Panel): (A) Inputs jetzt Figma-nativ — grauer `bg-secondary`-Fill, **kein** Ruhe-Border, Border erst bei Fokus. (B) Icon-Prefix links im Feld: Globe im URL-Feld, `< >`-Code-Icon im Custom-Selector (`.input-icon-left` + `.has-prefix`). (E) `.card`/`.testid-row` Border entfernt → ruhige Property-Rows. (F) Scope-`<select>` → Segmented Control (`.seg`/`.seg-btn`, `data-scope`-State, `setScope()`); `getScope()` liest jetzt `data-scope` statt `.value`. (Token) Hardcoded Hex in `.notice-*`/Badges/`.upgrade-banner`/`.err`/`.ok` → halbtransparente Status-Tokens (`--ok*`, `--warn*`) + `--figma-color-text-success/-warning/-danger` mit Fallback → Dark-Mode-safe. Bewusst NICHT: Sektions-Header mit Action-Icons (D). |
| 26.06.2026 | **Figma-Plugin Results-Screen überarbeitet:** Header zeigt Testnamen (`state.name`) + Status-Badge (`bs-*`) statt statischem „Results". A/B-Stats von 6er-Kachel-Grid auf zweispaltige Tabelle (`1fr 1fr` mit mittiger Trennlinie, Spalten-Header „Variant A/B", Labels 10px uppercase, Werte 16px bold). Significance als einzelne Zeile (`Significance: X% — not/significant`) statt Box+Balken. Winner-Banner im nativen `--figma-color-bg-success`-Stil, Variantenname fett, oben nach Header. Upgrade-Banner kompakt (Titel + Button einzeilig) im Figma-Warning-Stil (`--figma-color-bg-warning`). „No data" → „Waiting for first visitors." + Link-Button „→ Snippet-Anleitung". Preview ohne Dark-Variante, skaliert (`scale(0.8)`, max-height 64px, kein Scroll), eine Vorschau pro Variante. „Refreshes every 30s" als zentrierter Footer-Hinweis. Plugin-Titel `code.ts`: „AB Figma" → „Variante". Tote CSS (`.stats-grid`, `.stat*`, `.sig-*`, `.frame-sm*`) entfernt. |
| 26.06.2026 | **Figma-Plugin UI-Redesign:** Figma-natives Design System (Inter, #0D99FF, Figma CSS-Tokens). Fester Footer mit primärem CTA (disabled bis Voraussetzung erfüllt). Back-Button als reines Chevron-Icon. 6-Screen-Progress-Bar. URL-Feld: nur Checkmark-Icon bei Valid, kein Text. Element-Screen: lesbares Label `[Typ]: [Beschriftung]` statt CSS-Selektor, Test-ID sichtbar. Screen 3 CTA umbenannt zu „Weiter zur Metrik →". Metrik-Screen: Standard-Metrik prominent als Radio-Option, Advanced Settings (Chrome-Picker + Custom Selector) ausklappbar, keine rohe HTML-Struktur. |
| 26.06.2026 | **Figma-Plugin AI-Generierung:** Vier-Fenster-Layout statt drei — Figma auf weiß + schwarz, Variant B auf weiß + schwarz. `gen-ref-dark` neu, `gen-preview` entfernt (war doppelt auf weiß). |
| 26.06.2026 | **brandguidelines.md erstellt:** Design.md + ui-ux-pro-max-skill (67 Styles, 79 Paletten, 72 Fonts, 59 UX-Regeln) + Plugin-Codeanalyse in ein umfassendes Design-Dokument für KI-gestütztes Figma-Plugin-Design synthetisiert. 14 Sektionen, alle Design-Tokens, Komponenten-Patterns, Screen-Flow, Anti-Patterns. |
| 26.06.2026 | **Ponytail-Review:** `'use client'` aus VariantPreview entfernt (Server Component). Leere Grid-Spalte gefixt (jede Vorschau einzeln bedingt rendern). PROJEKT.md §3 aktualisiert. |
| 26.06.2026 | **Variant-Preview im Dashboard:** Results-Seite zeigt jetzt Preview-Ansicht beider Varianten (Original + B) als Miniatur-iframe nebeneinander unter den Statistiken. `getExperimentStats` liefert `originalHtml`/`variantBHtml`/`siteCss`. Neue Komponente `VariantPreview.tsx`. |
| 26.06.2026 | **Anti-Flicker fix:** 3 Probleme — (1) 3000ms-Fallback zu kurz für langsame Netze → 10000ms. (2) Kein early Connection-Hint → `preconnect` ins Snippet. (3) Blindes Timeout revealed bevor ab.js fertig → **Polling auf `window.__ab_pending_resolve`**: Inline-Script wartet auf reveal()-Signal von ab.js, 10s-Hard-Ceiling als Netz. Alle Snippet-Templates (Dashboard, Figma-Plugin, ab-spike) aktualisiert. |
| 25.06.2026 | Landingpage für getvariante.com gebaut (5 Sektionen: Hero, How It Works, Use Cases, Pricing, Notify/Waitlist). Privacy-/Imprint-Seiten, Waitlist-API, SQL-Migration 006. `lib/supabase.ts` auf Proxy umgestellt (lazy init für Build ohne Env-Vars). Domain-Verweis auf www.getvariante.com vereinheitlicht. |
| 25.06.2026 | **Deployment** — Landingpage auf `www.getvariante.com` deployed (Vercel `vercel deploy --prod`). Root `getvariante.com` redirectet auf `www`. Landingpage, Privacy, Imprint alle 200. |
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
| 29.06.2026 | **v4-Backlog priorisiert** — 14 Items in 4 Phasen eingeteilt (Quick Wins → UX → Monetarisierung → Multi-Metric). Codebase-Analyse für Abhängigkeiten. Empfehlung: Phase A zuerst (Lift, Pause, Refresh, Polling, Auto-Winner). Multi-Metric (#10) auf Post-Launch verschoben. Plan in §8 dokumentiert. |
| 19.06.2026 | Phase 0 bestanden — Markt validiert. |
| — | MVP gebaut (Auth-Lücke). v3 Launch-Vorbereitung gestartet. |

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
- [ ] Sind die DeepSeek-Calls günstig? → Kosten < 1 ct/Generierung

---

*DSO — zuletzt geprüft: 29.06.2026 (v4-Backlog priorisiert, Plan steht)*

---

## §11 Fazit

**variante ist startklar.** Der komplette Loop steht: Figma → KI → Snippet → Conversion-Tracking. Auth, Billing und Multi-Tenancy sind implementiert. Die Domain ist gesichert, das Pricing steht, die Steuerfragen sind geklärt.

**Was jetzt zählt, ist Distribution, nicht das Produkt.** Der GTM-Fahrplan in `GOTOMARKET.md` ist der Nordstern: Figma-Community-Plugin als PLG-Engine, viraler Loop über das Badge, Phase-1-Design-Partner für Case-Studies.

**Drei Dinge, die den Unterschied machen:**
1. **Figma-Plugin + Chrome-Extension in die Stores bringen** — das ist der Engpass (Review-Zeiten!)
2. **Phase 1: 3–5 Design-Partner gewinnen** — echte Installs + Case-Studies vor Public-Launch
3. **Dogfooding: variante auf getvariante.com laufen lassen** — erster Proof + Demo-Material

**Währungsentscheidung:** Abrechnung in **EUR**. Begründung: Sitz in DE, Kosten in EUR, erste Kunden aus DACH. USD-Komplexität (Wechselkurs-Doku, Stripe-Tax-Gebühr) spart man sich. Bei US-Dominanz (>60 % Kunden) später wechseln — reines Stripe-Setting, kein Produkt-Entscheid.

**Bis Mitte August 2026** sollte der öffentliche Launch stehen. Danach: Conversion-Funnel optimieren, Free→Pro und vor allem Free→Agency (White-Label = wo das Geld sitzt).

> **Ein Satz:** Gebaut ist es — jetzt muss es raus zu den Leuten.
