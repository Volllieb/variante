# PROJEKT.md — variante

> Single Source of Truth. Fakten, Entscheidungen, Richtung. Kein Chat-Verlauf.
> Arbeitsanweisungen: `AGENTS.md` · Strategie: `docs/GOTOMARKET.md` · Schnellstart: `README.md`

---

## §1 Identität

| Feld | Wert |
|---|---|
| **Produkt** | variante — Designer-natives A/B-Testing aus Figma, kein Dev nötig |
| **ICP** | Designer & kleine Agenturen auf Plattformen **ohne** natives A/B (Custom HTML, WordPress, Next/React, Shopify) |
| **Rechtsform** | Einzelunternehmen (Bayern/DE) |
| **Phase** | Post-MVP → Go-to-Market |
| **Stand** | 15.07.2026 — 🌐 **Multi-Domain-Support** — Plan-basierte Domain-Limits (Free=1, Pro=5, Agency=100). 🎉 Erster organischer User. 🤖 **"What to test next" AI-Suggestions** + 🧠 **Autonomer CRO-Agent** live. 🚀 **Onboarding v2: Choice-Screen** — User wählt nach ab.js-Installation zwischen "Start with Figma" (Plugin) und "Start with Auto-Optimize" (AI scannt Site, erstellt Tests). Kein Figma-Plugin-Gate mehr für Free. 🧪 **E2E-Test-Suite mit Playwright** — 4 Specs. 📧 **Weekly Digest Cron**. 🎨 **Onboarding-Illustrationen** — Inline-SVG-Animationen (ConnectChecking, ConnectVerified) im EmptyState-Dashboard, 5-State-Machine ConnectWebsite statt totem DomainGate. |
| **Ziel** | 500–1.000 €/Mo passives Asset. Hebel = Distribution (Figma Community), nicht Produkt. |

## §2 Stack

| Komponente | Technologie |
|---|---|
| API + Dashboard | Next.js 16 (App Router) auf Vercel |
| Datenbank + Auth | Supabase (Postgres + JWT) |
| Billing | Stripe (Checkout, Portal, Webhooks) |
| KI-Generierung | OpenAI API (~0,3 ct/Call) |
| Snippet | `ab.js` (Vanilla JS, ~14 KB, kein Build-Step, eingebauter Element-Picker) |
| Figma-Plugin | TypeScript + HTML (360×560px, Figma-native Tokens) · [Community](https://www.figma.com/community/plugin/1653734891132085565) |
| **KI-Agenten** | Cline (DeepSeek V4 Pro) + GitHub Copilot · 9 Custom Agents: `@ponytail`, `@redesign`, `@supabase`, `@stripe`, `@deployment-expert`, `@performance-optimizer`, `@ai-architect`, `@seo`, `@wrapup` · Config: `.github/agents/`, `.agents/skills/` · **VS Code Settings:** `github.copilot.chat.agent.bypassApproval` = `true` (default) |

## §3 Struktur

```
ab-tool/                # Next.js — API, Dashboard, Landingpage
├── app/api/            # analytics, assign, billing, capture, cron, domains, event, events, generate, profile, resolve, results, snippet-check, stripe, suggestions, tests, token
├── app/dashboard/ tests/ login/ signup/ results/ imprint/ privacy/ docs/
├── components/         # LandingIcons, PandaLogo
├── emails/             # Supabase Auth Templates (Confirmation, Magic Link, Reset, Invite, Change)
├── lib/                # auth, cors, getExperimentStats, rateLimit, safeLog, sanitize, significance, ssrf, stripe, supabase, supabaseBrowser, supabaseServer
├── public/ab.js        # Snippet (inkl. eingebautem Element-Picker)
├── __tests__/          # E2E: Playwright (smoke, auth, dashboard, conversion) + Node (significance, conversion-goal-click)
├── playwright.config.ts
figma-plugin/           # code.ts + ui.html (6 Screens, Creation only)
db/migrations/          # Supabase SQL (001–017)
.github/workflows/      # CI: e2e.yml (Playwright bei Push/PR auf main)
docs/                   # Doku — Brand, GTM, Leads, Marktrecherche, E2E, Future-Features
```

## §4 Deployment

| Projekt | URL | Methode |
|---|---|---|
| ab-tool | `www.getvariante.com` | Manuell via `vercel deploy --prod` |

**Vercel-Link:** Repo-Root via `vercel link` auf `ab-tool` gelinkt. Vercel-Projekt-Einstellung: **Root Directory = `ab-tool`**. Deploy aus Repo-Root: `vercel deploy --prod`. `.vercel/` ist gitignored, jeder neue Dev muss einmalig `vercel link` im Root ausführen.

**Git:** `github.com/Volllieb/variante.git` (master) · **Auto-Push:** `post-commit`-Hook

## §5 Pricing

| Tier | Preis | Inhalt |
|---|---|---|
| **Free** | 0 € | 1 aktives Experiment, Badge **an** |
| **Pro** | 35 €/Monat | Unbegrenzt, Badge **aus**, Signifikanz, Auto-Winner |
| **Agency** | 99 €/Monat | ❄️ Auf Eis — erst bei 5+ Pro-Kunden |

**KI-Kosten:** ~0,3 ct/Call → Marge ~100 %. AI-Gen auch im Free-Tier (Aha-Moment > Kosten).
**Währung:** EUR (Sitz DE, Kunden DACH).

## §6 Plattform-Support & Steuer

| Plattform | Snippet |
|---|---|
| Custom HTML, WordPress, Next.js/React, Shopify | ✅ `<head>` |
| Webflow | ⚠️ nur Paid |
| Framer, Wix, Squarespace | ❌ Kein `<head>`-Zugriff |

**Steuer:** Kleinunternehmer (§19 UStG). Stripe Tax aktivieren (0,5 %/Transaktion). Berater erst bei >15.000 €/Jahr.

## §7 Security (Figma Publish-Dialog)

- Hosting: Vercel us-east (DPA + SCCs). DB: Supabase Frankfurt.
- Auth: Supabase JWT, bcrypt, HTTP-only Cookies, API-Key UUID v4.
- Daten: Nur selektiertes Figma-Element transient an OpenAI API. Kein Storage.
- Reporting: `hello@getvariante.com`, 24h-Bestätigung, 30d-Fix.
- Kein CDN/Analytics-Drittanbieter. Keine Kreditkarten auf eigenem Server.

## §8 Historie (letzte Einträge)

| Datum | Eintrag |
|---|---|
| 15.07.2026 | **DomainGate.tsx gelöscht, ConnectWebsite inline im EmptyDashboard.** DomainGate war toter Code (nie importiert, nie genutzt). Ersetzt durch `ConnectWebsite.tsx`-Komponente: 5-State-Upload-Maschine (input → saving → checking → not-found → verified) mit 4 Inline-SVG-Illustrationen (`OnboardingIllustrations.tsx`), animiertem ConnectChecking-Spinner, und Copy-Prompt für ab.js-Installation. EmptyDashboard zeigt Demo-Card + ConnectWebsite (ohne verified domain) oder Quick-Start-Guide. `recharts`-Dependency zu `package.json` hinzugefügt (wurde bereits in `ResultsClient.tsx` verwendet, fehlte im Lockfile → Vercel-Build brach ab). `ab-tool/vercel.json` gelöscht (Cron-Jobs jetzt im Root-`vercel.json`). | NewTestFlow umgebaut: Statt nur Figma-Plugin-Instruktionen jetzt Choice-Screen mit zwei klaren Pfaden — "Start with Figma" (Plugin, bestehender Flow) und "Start with Auto-Optimize" (AI-Agent, kein Plugin nötig). AgentPanel: Free-Gating entfernt — Auto-Optimize jetzt für alle Tiers verfügbar (Aha-Moment > API-Kosten). PROJEKT.md §10: Vision "ab.js → Auto-Scan → 1-Klick" dokumentiert. | Neue `lib/planLimits.ts` als Single Source of Truth. `POST /api/domains`: prüft `count(*)` gegen `getDomainLimit(plan)` statt `limit(2).length >= 1`. `POST /api/tests` + `lib/agentTools.ts`: Domain-Gate matched `site_url`-Host jetzt gegen ALLE verified Domains (nicht nur `.limit(1)` primary). `DomainGate.tsx`: 402-Error parst API-Nachricht dynamisch. `/api/resolve` + `ab.js`: keine Änderung nötig — Host-basiertes Matching funktioniert out-of-the-box für Multi-Domain. |
| 14.07.2026 | **Autonomer CRO-Agent live (Ansatz B, Vercel AI SDK).** `POST /api/agent` — `streamText()` (AI SDK v7, gpt-4o-mini) mit 4 Tools: `fetchSite` (SSRF-geschützt, 10s Timeout), `analyzeCRO` (nutzt `lib/croAnalyze.ts`), `generateVariant` (`lib/generateVariantText.ts`, text/color/css/layout), `createTest` (Domain-Gate + Free-Gating, Insert mit `variant_b_html`/`variant_b_css`). Tools als Factory `makeAgentTools(user)` — user_id ist kein LLM-Parameter (Injection-sicher). Kostenkontrolle: $0.03 upfront via `increment_gen_cost`-RPC, max 10 Steps (`stepCountIs`). CRO-Logik aus `/api/suggestions` nach `lib/croAnalyze.ts` extrahiert (Route refactored, +`type`/`selector` im Schema). UI: `AgentPanel.tsx` mit `useChat` — Live-Tool-Status-Zeilen, Free-Paywall analog WhatToTestNext, `router.refresh()` nach Run. Migration 019: `agent_runs` (Audit) + `site_insights` (Learning-Loop-v2-Schema) ausgeführt + deployt. Neue Packages: `ai@7`, `@ai-sdk/openai`, `@ai-sdk/react`, `zod`. Build grün. Konzept: `docs/future-features/autonomous-ab-agent.md`. |
| 14.07.2026 | **🎉 Erster organischer User!** unnoorain Masroor (css.edu.apps@gmail.com) — Google OAuth Signup am 13.07.2026 08:42 UTC. Kein Outreach, kein Design-Partner — jemand hat variante von selbst gefunden und sich registriert. Validierung dass die Landingpage funktioniert. |
| 13.07.2026 | **"What to test next" — AI-gestützte CRO-Vorschläge live.** `/api/suggestions` (POST, Pro-gated) fetched die Live-Seite, analysiert sie per GPT-4o-mini nach 7 CRO-Kriterien (Headlines, CTAs, Social Proof, Friction, Urgency, Trust, Above-the-Fold) und gibt 4 page-spezifische A/B-Test-Vorschläge zurück. `WhatToTestNext.tsx`-Komponente: 3 Zustände — versteckt (Setup nicht komplett), geblurrter Teaser + Paywall (Free), AI-Vorschläge mit Regenerate-Button (Pro). Ersetzt die alten statischen 4 Tipps in `DashboardClient.tsx`. Kosten: ~$0.005/Call, gleicher `increment_gen_cost`-RPC wie `/api/generate`. |
| 13.07.2026 | **Lead-Recherche: 44 IH-Produkte gescreent.** 17 qualified leads (7 Top-Fit, 10 Good-Fit) aus IndieHackers Products DB. `docs/leads.md` angelegt mit Outreach-Strategie (Website→Kontakt→Loom-DM). Top-Picks: IbexAI (#1 voted) + PostFox (Marketing-SaaS). Nächster Schritt: Website-URLs + X/LinkedIn-Kontakte recherchieren. |
| 10.07.2026 | **Feature-Design: Self-Improving Site Engine.** `docs/future-features/self-improving-site-engine.md` erstellt. Vision: variante scanned die echte Site, analysiert DOM + Copy per KI, schlägt Top-3-Tests vor, lernt aus abgeschlossenen Tests dazu. 3 Phasen: v1 Rule-Based Heuristics (10 Heuristiken, DOM-Parse, ~0 Kosten), v2 AI-Powered Audit (GPT-4o, ~$0.003/Call), v3 Learning Loop (Feedback aus Testergebnissen → kontextuell schlauere Vorschläge). Gating: Free = 1 Scan, Pro = 10/Monat + AI, Agency = 50/Monat. UI: Dashboard Overview-Card + /tests Suggestions-Tab + Figma Plugin-Panel. Geschlossener Loop: Scan → Test → Winner → nächster Scan. Das ist der Burggraben — kein anderes A/B-Tool macht das. || 10.07.2026 | **GTM-Insights: Niche-Fokus, kalte Loom-DMs, gratis erster Test, "What to test next"-Checkliste.** docs/GOTOMARKET.md: Erste-10-User-Strategie ergänzt (enge Nische = Glaubwürdigkeit, 10–20 kalte Loom-DMs mit individueller Site-Analyse, gratis erster Test als Design-Partner-Onboarding, Case-Studies als Grundlage für alles Weitere). "What to test next"-Checkliste im Plugin als kultureller Translator (Designer → Conversion-Denken), basierend auf Page-Goal (Signups/Purchases/Engagement). docs/MARKET-RESEARCH.md: Nische-Fokus in §1.2, Opinionated Guidance als Unfair Advantage in §3.2/§3.3, Loom-DMs in Week-1-Plan (§5.2) + Quick-Wins (§9.1). PROJEKT.md §1 Stand aktualisiert. || 10.07.2026 | **Outreach-Strategie: Dual-Track + X-Pain-Finder deprecated.** X-Pain-Finder-Script funktioniert nicht mehr (X-DOM-Änderungen), ersetzt durch 5 manuelle Bookmark-Queries in `docs/GOTOMARKET.md`. Outreach jetzt Dual-Track: Track A (Pain-Replies auf X/Reddit, langfristig Glaubwürdigkeit) + Track B (Direkt-Angebote in Design-/Startup-Communities, kurzfristig User-Akquise). Begründung: Live-Produkt + Live-Plugin rechtfertigt direkte Angebote, Designer-Communities ticken anders als Dev-Communities. YouTube-Erklärvideo-Entscheidung: Nein, erst bei 5+ Pro-Kunden + Case-Studies. Falscher Kanal, falscher Zeitpunkt. `GOTOMARKET.md` komplett aktualisiert. || 10.07.2026 | **Market Research: Wie komme ich zu meinem ersten User?** `MARKET-RESEARCH.md` erstellt. Enthält: Markt-Landschaft (Oligopol mit toter Mitte, 0 echte Figma-Konkurrenten, AI-Builder-Explosion, Google-Optimize-Lücke), ICP-Deep-Dive (3 Persona-Cluster), Wettbewerber-Schwäche-Analyse, 6-Channel-Analyse mit CAC-Schätzung, 4-Wochen-Akquisitionsplan, Psychologie des ersten Users, Metriken, Risiken, Sofort-Maßnahmen. Kern-Erkenntnis: variante ist kategorieerschaffend, nicht kategorieeintretend. User #1 ist AI-Builder-Designer auf X.
| 10.07.2026 | **Wasim-11-Punkte-Evaluation + X-Strategie.** variante gegen @WasimShips' "viral $10k MRR"-Framework evaluiert: 3/11 grün, 3/11 gelb, 5/11 rot. Kernproblem: Produkt vor Validierung gebaut, Features vor Gesprächen. X-Outreach-Strategie definiert: 14-Tage-Plan (Pain-First, kein Pitch), 5 Distribution-Channels priorisiert (X → Reddit → LinkedIn), Tampermonkey-Script `scripts/x-pain-finder.user.js` zum automatischen Highlighten von Pain-Posts. docs/GOTOMARKET.md um Channels + X-Playbook ergänzt. |
| 10.07.2026 | **Domain-First Architecture.** User müssen eine verified Domain haben bevor Tests laufen. Neue `domains`-Tabelle (initial: Free/Pro: 1, Agency: unlimited). `DomainGate.tsx`: Post-Login-Gate mit URL-Eingabe + Snippet-Check + Auto-Verify. `POST /api/tests` validiert gegen verified domains. Account-Settings: Domain-Sektion (Anzeige, Re-Verify, Löschen, Hinzufügen). Dashboard: EmptyState zeigt Domain-Hinweis, Health-Card zeigt Website-Status. Figma-Plugin: `fetchVerifiedDomain()` nach Token-Load. Migration 015: `count_verified_domains`/`count_domains` RPCs. (15.07.: Auf Multi-Domain mit Plan-Limits Free=1/Pro=5/Agency=100 umgestellt.) |
| 09.07.2026 | **First-Touch Source-Tracking.** Migration 014: `profiles.signup_source` + `signup_plan`. Auth-Callback parst `next`-Param und speichert source/plan per `ensureProfile()` first-touch (nur wenn row neu oder signup_source null). Deckt alle 3 Auth-Flows ab (OAuth, Email-Token, Token-Hash). |
| 09.07.2026 | **Conversion-Testsuite + event/route.ts 404-Fix.** `conversion-goal-click.mjs` (11 Tests): 5 Unit (sendBeacon-Payload, sessionStorage-Dedup, Key-Isolation, Fetch-Fallback, Storage-Fehler-Grace), 4 Integration (400-Validierung), 2 CORS. Bugfix: `.single()`→`.maybeSingle()` + 404 statt 500 bei nicht-existenter snippet_key in `/api/event`. |
| 28.03. | **Onboarding entfernt** — /dashboard/setup (Health-Check) deckt Setup-Flow komplett ab, separates onboarding-Gate ist redundant. Signup/Login routen direkt auf /dashboard. |
| 08.07.2026 | **🎉 Figma-Plugin LIVE im Community Store!** [Plugin #1653734891132085565](https://www.figma.com/community/plugin/1653734891132085565) freigegeben nach 9 Tagen Review. Der Burggraben steht. Erster Design-Partner angefragt. |
| 08.07.2026 | **Dashboard Overview-Redesign: 30/70-Layout, Metric-Cards, Pie-Chart-TestCards.** Overview-Seite komplett umgebaut: Zweispaltig (30% Metric-Cards / 70% Test-Grid). Linke Spalte: Overview-Card (Active Tests, Total Visitors, Overall CR, Overall Uplift — Icon+Name+Wert pro Zeile, getrennt durch subtile Linien) + Health/Setup-Card (Snippet/Plugin/Extension-Status, verlinkt auf `/dashboard/setup`). Rechte Spalte: Tests-Überschrift + Toolbar (Suchleiste, Sort-Icon, New-Test-Button) + TestCard-Grid (3 pro Zeile). Stats-Bar, CRO-Snapshot, Winner-Alert, Overview-Tabelle, HealthBanner entfernt. TestCard neu designt: Row 1 (Favicon, Name+URL, Significance-Pie-Chart mit Visitor-Count im Zentrum), Row 2 (Status-Dot, Dauer d/h/m/s, Variant-Leader A/B). Build grün, deployed. |
| 07.07.2026 | **Chrome-Extension deprecated — Picker jetzt direkt im Snippet.** `content-picker.js` in `ab.js` integriert: Element-Picker läuft ohne Extension direkt auf der Kundenseite. `chrome-extension/` auf Read-only-Archiv gesetzt (DEPRECATED.md). `ab.js` von ~8 KB auf ~14 KB gewachsen. Build grün. |
| 07.07.2026 | **Dogfooding: ab.js in layout.tsx integriert.** `ab.js`-Snippet lädt jetzt im Root-Layout der eigenen Landingpage (www.getvariante.com). Ermöglicht echte Dogfood-Tests auf der eigenen Site. |
| 07.07.2026 | **Dashboard-Restrukturierung: Setup-Health-Check, Overview-Bereinigung.** `/dashboard/setup` als dedizierte Health-Check-Seite mit 3 expandable CheckCards (Snippet auto-check via `/api/snippet-check`, Plugin via `has_figma_plugin`-Flag, Extension always-ok). Snippet-Code, Plugin-Token, Extension-CTA komplett aus Overview entfernt. Overview zeigt nur kompakten HealthBanner (Link zu `/dashboard/setup`). EmptyState für 0-Test-Nutzer mit kontextuellem CTA. Sidebar: Setup-Link mit HeartPulse-Icon statt alter Anchor-Links. Build grün, deployed. |
| 07.07.2026 | **Sprint 2: Test-Cards + Overview-Tabelle.** Shared `TestCard`-Komponente mit Favicon-Thumbnail, Test-Dauer („Running for 3d"), Signifikanz-Mini-Donut (24×24 SVG), Three-Dot-Menü (Pause/Resume/Delete). `OverviewTable` im Dashboard: kompakte Tabelle aller Tests mit Status, Visitors, Conversions, Signifikanz, Lift. `TestsClient` nutzt jetzt dieselbe Shared-Komponente. Code-Deduplizierung: ~120 Zeilen entfernt. Build grün, deployed. |
| 07.07.2026 | **Sprint 1: Setup-Checkliste + Snippet-Check-API.** `POST /api/snippet-check` — server-seitiger Fetch (SSRF-geschützt, 5s Timeout) prüft ob `ab.js`/`__ab_hide` auf externer Site lebt. `SetupChecklist`-Komponente ersetzt Empty-State im Dashboard (0-Test-Nutzer): 3 anklickbare Steps (Snippet→Figma→Erster Test) mit visuellem Done-Tracking. Dashboard-Brainstorming abgeschlossen, Roadmap in Sprint-Reihenfolge priorisiert. Build grün, deployed. |
| 07.07.2026 | **Docs-Seite erstellt.** `/docs` mit 8 Sektionen (Overview, How it works, Installation, Figma Plugin, Chrome Extension, Experiments, Pricing, FAQ). Footer-Link auf Landingpage, Sitemap-Eintrag, JSON-LD. SEO: canonical, OG, Twitter-Card. |
| 07.07.2026 | **Supabase-Agent erstellt.** `@supabase` als 9. Custom Agent — DB, Auth, Migrationen (idempotent), RLS-Policies (Defense-in-Depth), RPCs, Query-Performance. Doku: 3-Client-Architektur, Auth-Flow, 13-Migrationen-Übersicht. |
| 07.07.2026 | **Email-Templates designed.** 5 Supabase-Auth-Templates (Confirmation, Magic Link, Reset, Invite, Change) in `ab-tool/emails/`. Brand-konform: Monochrom, schwarzer Header + Panda-Logo als inline SVG, kein Gradient/Schatten, 480px Card-Layout. Anleitung in `emails/README.md`. Templates sind copy-paste-ready für Supabase Dashboard. |
| 08.07.2026 | **Picker: Success-Overlay redesigned + Reselect-Button.** Nach erfolgreichem Element-Pick: kompaktes Overlay mit Element-Name, Reselect-Button statt nur Erfolgsmeldung. Bessere UX für Korrekturen ohne Page-Reload. |
| 08.07.2026 | **Fix: onDelete-Handler auf /dashboard/tests nachgerüstet.** Delete-Button in TestCard auf der Tests-Seite war ohne Handler — jetzt mit Bestätigungsdialog und API-Call. |
| 08.07.2026 | **Figma-Plugin: Draft-Persistenz + Token-Validierung + Health-Check-Fix.** `clientStorage` speichert Wizard-Draft (SAVE_DRAFT/CLEAR_DRAFT), `pendingDraft`-Puffer gegen Race-Conditions. `saveToken()` validiert via `/api/profile`-Preflight vor Navigation. Token-Regeneration setzt `has_figma_plugin: false` zurück. |
| 08.07.2026 | **Figma-Plugin: Design auf Figma-Tokens umgestellt.** Alle `rgba(15,23,42,.XX)` Borders/Shadows/Backgrounds durch `var(--figma-color-*)` Tokens ersetzt. Neue Tokens: `--danger-border`, `--danger-hover`. Elevation-System bleibt als `--elev-*`. Netto −5 Zeilen CSS. |
| 07.07.2026 | **P2-Fixes nach Architektur-Audit.** `lib/ssrf.ts` extrahiert — BLOCKED_HOSTS/BLOCKED_HOSTNAMES zentral, nicht mehr dupliziert. Tests aus Root-`__tests__/` nach `ab-tool/__tests__/` konsolidiert. `.env.example`: `RESEND_FROM` ergänzt. `api/token/route.ts` als Info-Endpoint angelegt. Build + 15 Tests grün. |
| 07.07.2026 | **Lighthouse R4: 3 Perf-Fixes deployed.** (1) Analytics/SpeedInsights: React-Komponenten → plain `<script defer>`-Tags (kein `'use client'` im Root-Layout, keine Hydration-Erzwingung). (2) `manifest.webmanifest`-Link entfernt (404, bfcache-Blocker). (3) Landingpage: `next/link`→`<a>`, lucide-react→Inline-SVGs (kein Client-Router, keine Icon-Bundles). `.browserslist` verworfen (Next.js 16/Turbopack ignoriert sie, `experimental.legacyBrowsers` wurde entfernt — 14KB Polyfills bleiben known issue). Score von 72 auf ~75–80 erwartet. |
| 07.07.2026 | **Lighthouse R1-R3: 7 Perf-Fixes deployed.** `getSessionUser` mit `React.cache()` (Request-Dedup), `Promise.all` in Dashboard-Pages (parallele Queries), `adjustFontFallback` in Inter-Font (CLS-Reduktion), `next/image` für PandaLogo, `ab.js` aus Root-Layout entfernt, Caching-Headers für Static-Assets, `__ab_pending`-Regel aus `globals.css` gelöscht. |
| 07.07.2026 | **P0/P1-Fixes nach Architektur-Audit.** Analytics-Pakete von Root nach `ab-tool/` verschoben. SRI-Hash aktualisiert (war stale). PROJEKT.md §7: Vercel Analytics dokumentiert. OG-Image-Route `/og` + SSRF-Timeout waren schon drin. Build grün. |
| 06.07.2026 | **Round-3 Cleanup: Doku-Sync nach Revert.** PROJEKT.md §3: `emailAgent` aus lib-Listing entfernt, Migration-Nummern auf 001–013 korrigiert. §4: Deployment-Methode auf manuell aktualisiert (CI-Workflow wurde gelöscht). §8: Revert- + CI-Deletion-Einträge nachgetragen. Kein Code geändert. |
| 06.07.2026 | **SEO: Landingpage-Audit + 4 kritische Fixes.** `robots.ts` (allow /, disallow auth/dashboard/api), `sitemap.ts` (5 URLs), JSON-LD Organization in `layout.tsx`, `og:image` + `twitter:card` in `layout.tsx` + `page.tsx`, Title-Optimierung (Keyword first, ~140 Zeichen). Offen: echtes OG-Image (128×128 SVG zu klein), strukturierte Daten für Subpages ausbauen. |
| 06.07.2026 | **Email-Agent rückgängig.** Cold-Outreach Reverse-Funnel komplett entfernt (Auto-Reply, OpenAI-Klassifikation, Resend Inbound). Migration 014, `emailAgent.ts`, `/api/email/inbound` gelöscht. Bleibt manuell. |
| 06.07.2026 | **CI-Workflow gelöscht.** `.github/workflows/deploy.yml` entfernt. Deploy wieder manuell via `vercel deploy --prod`. |
| 06.07.2026 | **Round-2 Cleanup.** Build-Fix: `force-static` + `cacheComponents` inkompatibel → entfernt. Dead Code: `/api/variant` (32 Zeilen, ersetzt durch `/api/resolve`), `proxy.ts` (55 Zeilen, kein middleware.ts). AGENTS.md: Agent-Liste vervollständigt. PROJEKT.md §3: API-Listing + Migration-Nummern korrigiert. |
| 06.07.2026 | **Root-Cleanup.** `dashboard-source.html` (HTML-Dump), `test.md` (Duplikat von `docs/E2E-CHECKLIST.md`) gelöscht. `dashboard-redesign-plan.md` → `docs/future-features/` (abgeschlossenes Redesign). Später (13.07.2026): Insights in `docs/brandguidelines.md` überführt, Plan gelöscht. |
| 06.07.2026 | **Dashboard: Tab-System entfernt, Overview/Tests als separate Seiten.** Sidebar: Tests-Link → `/dashboard/tests`, Billing+Account nach unten gruppiert, Setup-Tools in eigener Sektion. `TestsClient.tsx` extrahiert. Build grün, deployed. |
| 06.07.2026 | **Dashboard-Redesign umgesetzt.** Tab-System (Overview/Tests), Stats-Bar (Active/Visitors/Conversions/Plan), Winner-Alert, Sidebar mit Account-Link, NewTestFlow mit Polling+Zustandsmaschine (idle→awaiting_figma→test_received/timeout/error), Test-Card Highlight-Animation. `PATCH /api/profile` akzeptiert jetzt `onboarded`. `POST /api/tests` setzt `has_figma_plugin`. Migration 013 für `has_figma_plugin`-Flag. Build grün, deployed. |
| 06.07.2026 | **E2E auf Fremd-Site durchgeführt.** Snippet → Traffic → Conversions → Winner kompletter Loop getestet. **OpenAI Usage-Limit:** `OPENAI_MAX_MONTHLY_COST` Env-Var + `profiles.monthly_gen_cost` + Check in /api/generate (Migration 012). |
| 06.07.2026 | **Dogfood-Tests pausiert.** Beide aktiven Tests auf getvariante.com / www.getvariante.com auf paused gesetzt. Hardcoded Landingpage-Badge bleibt — kein doppelter Badge mehr via ab.js. |
| 06.07.2026 | **CI-Fix: Vercel-Deploy in GitHub Actions repariert.** `--yes`-Flag für non-interactive CI (kein TTY). Node 20 → 22 (deprecated). `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID` als env vars (`.vercel/` ist gitignored → GitHub Actions fand kein Projekt). |
| 06.07.2026 | **Upstash Redis live.** DB `amazing-mudfish-98038` (Free Tier, us-east-1), Env-Vars in Vercel Production + Preview gesetzt. Rate-Limiter zählt jetzt global über alle Serverless-Instanzen. |
| 06.07.2026 | **Auth-Guard Results + Decoupling + Loading/Error States.** Results-Page prüft Session-User gegen `test.user_id` (fremde UUIDs → 404). Winner-Logik aus `getExperimentStats` entfernt (GET read-only, Cron + Event-Route setzen Winner). `loading.tsx` + `error.tsx` für `results/[id]` und `dashboard`. Build grün. |
| 06.07.2026 | **Migrationen 009 + 010 in Production ausgeführt.** `profiles.onboarded`, `events`, `daily_stats`, `domains` Tabellen + `log_event()`, `snapshot_daily_stats()` RPCs jetzt live. Onboarding-Gate kann wieder aktiviert werden. Alle API-Routen funktionsfähig. |
| 03.07.2026 | **Cron-Fix: console.error → safeError.** check-winners verwendet jetzt safeError statt rohem console.error für E-Mail-Fehlschläge. |
| 03.07.2026 | **.env.example + Env-Doku.** CRON_SECRET (Pflicht für Cron-Jobs), RESEND_API_KEY (optional für Winner-Mails), Upstash (optional für Rate-Limiting). |
| 03.07.2026 | **shadcn/ui + cn()-Utility entfernt.** 5 Dependencies (`@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `tailwind-merge`), 4 UI-Komponenten (badge, button, card, input), `components.json` und `lib/utils.ts` gelöscht. Keine Rest-Referenzen. Build grün. |
| 03.07.2026 | **Auto-Deploy: Commit → Push → Deploy.** GitHub Action `.github/workflows/deploy.yml` deployed bei jedem Push auf master automatisch auf Vercel. Build-Schutz: roter Build = kein Deploy. |
| 03.07.2026 | **Backend-Features: Events, Analytics, Domains, Cron, Profile, Export.** Event-Logging (created/started/paused/winner_detected/done) via log_event RPC. Analytics-API (Pro-gated, daily_stats Zeitreihe). Cron-Jobs: stündlicher Winner-Check + Resend Mails, täglicher Stats-Snapshot. Domain-Management (CRUD + Verification). Profile-API (GET/PATCH, notify_on_winner). CSV-Export. Token-Regeneration. vercel.json, migration 010_features.sql. Build grün. |
| 03.07.2026 | **Plugin/Web-Split: Results, Stats & Upgrade-Banner aus Figma-Plugin entfernt.** s-results gelöscht, JS-Funktionen (startResults/stopResultsPoll/setResBg/pct) entfernt, dash-stats + upgrade-banner → plan-chip, Snippet → Open in Dashboard. Web-Backlog offen (Stats-Bar, zentrales Upgrade-Banner). Build grün. |
| 03.07.2026 | Landingpage Panda-Redesign, UX-Audit (10 Fixes), Doku-Update, Roadmap §10 angelegt |
| 02.07.2026 | Auth: Passwort-Reset, Google OAuth, Signup-Bestehende-Mail-Detection |
| 01.07.2026 | Stripe-Webhook gehärtet (payment_status, Idempotenz, Subscription-Status) |
| 30.06.2026 | Chrome Extension: content_scripts entfernt, Figma + Chrome Store eingereicht |
| 03.07.2026 | Chrome Extension LIVE im Chrome Web Store |
| 29.06.2026 | Phase A+B+C: Polling-Gating, Pause/Resume, HTML-Editor, KI-Prompt, Winner-Logik, Dashboard |

## §9 Selbstprüfung

> Bei JEDER Änderung. Erst reviewen, dann pushen:

- [ ] `git diff` — was hat sich geändert? Sinnvoll? Kein Debug-Code?
- [ ] `git status` — kein `node_modules/`, `.next/`, `dist/` im Index
- [ ] `npm run build` in `ab-tool/` — grün
- [ ] Geändertes committed + gepusht?
- [ ] PROJEKT.md §1 (Stand), §8 (Historie), §3 (Struktur) aktuell?
- [ ] Neue Entscheidungen dokumentiert?

## §10 Roadmap & Nordstern

### Aktueller Stand
- 🎉 **Figma-Plugin LIVE** — [Community Store](https://www.figma.com/community/plugin/1653734891132085565)
- 🎉 **Erster organischer User!** — Google OAuth Signup 13.07.2026 (kein Outreach)
- Built-in-Picker: Element-Picker direkt im `ab.js`-Snippet (Extension gelöscht 13.07.2026)
- **Design-Partner:** 1 von 5 angefragt
- Dogfooding: variante testet eigene Landingpage (ab.js im Root-Layout)
- **E2E:** ✅ M1 abgeschlossen
- **Nächster Schritt:** §9.1 Quick-Wins (Figma-SEO, X-Profil, Pain-Suchen) → Week-1 X-Outreach → Pain-Interviews

### Meilensteine

1. ~~**M1: Fremd-Site-Test**~~ ✅ — Snippet → Traffic → Conversions → Winner funktioniert.
2. ~~**M2: Store-Freigaben**~~ 🎉 — Figma-Plugin LIVE. Jetzt: Design-Partner-Onboarding (1/5 angefragt).
3. **M3: Product Hunt Launch** (Ziel: nächste Woche, Dienstag) — Demo-GIF + Case-Studies.
4. **M4: Erster Pro-Kunde** (Ziel: September) — Checkout → Webhook → Badge-aus.
5. **M5: Self-Improving Site Engine v1** (Ziel: nach 3 Design-Partnern) — Rule-Based Site-Analyse mit Top-3-Chancen. Der Aha-Moment, der Designer converted.

### Nordstern

- **Distribution > Produkt.** Figma Community = Burggraben.
- **Badge = Wachstumsmotor.** Viral > bezahlt.
- **Plugin = Creation, Web = Analysis.** Keine Results ins Plugin.
- **Self-Improving Site Engine = Moat.** Kein anderes A/B-Tool analysiert deine Site und sagt dir, was du als nächstes testen sollst — geschweige denn, dass es aus deinen Ergebnissen lernt.
- **Keine Features ohne Revenue-Signal.**

### Vision: ab.js → Auto-Scan → 1-Klick

Der Happy Path für neue User:
1. **ab.js installieren** — DomainGate führt durch Snippet-Installation + Verify
2. **Auto-Scan** — Sobald ab.js lebt, scannt variante die Site automatisch
3. **1-Klick "Optimize my site"** — User klickt einen Button, der CRO-Agent analysiert die Seite, generiert 3 Varianten und legt A/B-Tests an

**Onboarding-Wahl:** Nach der Domain-Verifikation bekommt der User zwei klare Pfade:
- 🎨 **Start with Figma** — Designer-native: Plugin installieren, Varianten in Figma bauen, syncen
- 🤖 **Start with Auto-Optimize** — AI-native: Site wird gescannt, Varianten automatisch generiert, Tests in 30s live

**Kein Figma-Plugin-Gate mehr für Free.** Der Auto-Pfad funktioniert ohne Figma — ab.js + AI reichen. Der Figma-Pfad bleibt für Designer, die visuell arbeiten wollen. Beide Pfade führen zum gleichen Ergebnis: aktive A/B-Tests auf der Site.

### Anti-Roadmap

| Nicht bauen | Warum |
|---|---|
| Agency-Tier | Kein Revenue-Signal |
| Mehrere Metriken parallel | 6–10h, alle Schichten |
| A/B-Editor im Web | Creation = Plugin |
| Analytics-Dashboard | Fokus auf A/B-Testing |
| ⬇️ Self-Improving Site Engine | **Ausnahme — bauen wir.** Start v1 sofort nach ersten 3 Design-Partnern. |

### Technische Leitplanken

- **Monolith** (`ab-tool/`). Kein Microservice-Split bis >1000 Tests/Tag.
- **Eine Produktions-URL** (`www.getvariante.com`). Kein Staging bis >10 Kunden.
- **Supabase + Upstash Redis.** Kein Kafka, TimescaleDB. Redis nur für Rate-Limiting (Free Tier).
- **ab.js bleibt Vanilla JS.** Kein npm, kein Build. Das ist der USP.

## §11 Offene Baustellen

| # | Thema | Status | Aktion |
|---|---|---|---|
| 1 | Upstash Redis Env-Vars | ✅ Erledigt | `amazing-mudfish-98038.upstash.io`, Free Tier, beide Env-Vars in Vercel gesetzt (Production + Preview). |
| 2 | SRI-Hash bei ab.js-Update | 🟡 Prozess | Bei jedem `ab.js`-Release: `sha384`-Hash neu generieren und in `README.md` + `DashboardClient.tsx` aktualisieren. |
| 3 | OpenAI-Kosten-Tracking | ✅ Erledigt | `OPENAI_MAX_MONTHLY_COST` Env-Var (default $20) + `profiles.monthly_gen_cost` + Check in /api/generate. Migration 012. |

## §12 Dashboard-Architektur

> Erkenntnisse aus der Brainstorming-Session vom 06.07.2026.
> Design-Patterns (Stats-Bar, Winner-Alert, Empty State, Anchor-Navigation) sind in `docs/brandguidelines.md` §5.8–5.10 dokumentiert.

### 12.1 Produkt-Ebenen

| Ebene | Ort | Zweck |
|---|---|---|
| **Setup** | `/dashboard/setup` | Health-Check: Snippet, Figma Plugin — permanenter Check, kein One-Time-Gate. |
| **Dashboard** | `/dashboard` | Täglicher Arbeitsplatz: Tests verwalten, Results checken, Billing. Kein Setup-Cruft. |
| **Creation** | Figma Plugin | Wizard zum Erstellen von Varianten. Browser wartet per Polling auf neue Tests. |

### 12.2 „New test"-Flow

**Prinzip:** Dashboard = Hub, Figma = Creation. Kein Web-Editor (Anti-Roadmap).

```
User klickt [+ New test]
         │
         ├─ has_figma_plugin === true
         │    → "Open Figma" → Polling startet
         │
         └─ has_figma_plugin === false
              → "Install Figma Plugin first" → Link zu `/dashboard/setup` (Health-Check)
```

**Polling-Zustandsmaschine:** `idle → awaiting_figma → test_received | timeout | cancelled`

- `GET /api/tests` alle 3s, vergleicht `tests.length` mit Snapshot
- Neuer Test gefunden → Highlight-Animation in Test-Liste
- Timeout nach 5 Minuten → „No test received" mit Retry/Cancel
- Cancel jederzeit möglich — kein Gefängnis. Figma kann auch ohne vorherigen Klick Tests pushen.

**Flag `profiles.has_figma_plugin`:** Wird bei erstem erfolgreichen Figma-Token-Austausch gesetzt (Migration 013). Steuert den „New test"-Flow.

### 12.3 Dashboard-Layout

- **Sidebar:** Overview, Tests (separate Page), Setup (Health Check), Billing, Account
- **Overview (`/dashboard`):** Zweispaltig — 30% Metric-Cards + 70% Test-Grid.
  - Linke Spalte (30%): **Overview-Card** (Active Tests, Total Visitors, Overall CR, Overall Uplift — Icon/Name/Wert-Zeilen mit Trennlinien) + **Health/Setup-Card** (Snippet/Plugin-Status, verlinkt auf `/dashboard/setup`).
  - Rechte Spalte (70%): **Tests-Überschrift** + Toolbar (Suchleiste breit, Sort-Icon, Filter-Dropdown für Status/Zeitraum/Winner, New-Test-Button) + **TestCard-Grid** (3 pro Zeile).
- **TestCard (neu):** Row 1: Favicon | Name+URL | Significance-Pie-Chart (Visitor-Count im Zentrum, Arc-Füllung = Signifikanz-Fortschritt). Row 2: Status-Dot (grün/orange/grau) | Dauer (d/h/m/s granular) | Variant-Leader (A/B-Pill).
- **Setup:** `/dashboard/setup` — Health-Check-Seite mit 2 expandable CheckCards (Snippet auto-check via API, Plugin via Server-Flag).
- **Tests:** `/dashboard/tests` — Grid mit Search, Filter-Dropdown (Status/Zeitraum/Winner), NewTestFlow-Trigger.

### 12.4 Gateway-Architektur

| Gateway | Trigger | Ziel |
|---|---|---|
| Landingpage → Signup | CTA | `/signup` |
| Signup → Dashboard | Registrierung | `/dashboard` (direkt, kein Onboarding-Gate) |
| Dashboard → Setup | Health-Check-Card | `/dashboard/setup` (Snippet/Plugin-Status) |
| Dashboard → Figma | „+ New test" | Figma Plugin (später: `figma://` Deep Link) |
| Figma → Dashboard | Plugin pusht Test via API | Dashboard erkennt neuen Test per Polling |

### 12.5 Design-Prinzipien

- **Free/Pro sichtbar, nie versteckt.** Eingeschränkte Features bleiben ausgegraut mit Upgrade-Pfad.
- **Empty States als Guide.** Kein leeres Dashboard — immer eine Handlungsaufforderung.
- **Polling statt WebSockets.** Kein SSE/WS nötig für Plugin↔Dashboard-Sync. 3s-Poll reicht.
- **Setup-Tools persistent sichtbar.** Plugin-Token und Extension-Link bleiben im Dashboard (Sidebar/Footer), auch nach Onboarding — für Teammates oder Gerätewechsel.

### 12.6 Dashboard-Roadmap (Brainstorming 07.07.2026)

**Entscheidungen aus Fragebogen (8 Kategorien, 23 Entscheidungen):**

| Sprint | Inhalt | Status |
|---|---|---|
| **Sprint 1** | Setup-Checkliste (0-Test-Nutzer) + Snippet-Check-API | ✅ Deployed |
| **Sprint 2** | Test-Cards aufwerten (Thumbnail, Dauer, Signifikanz-Pie, Three-Dot-Menü) + Overview-Tabelle | ✅ Deployed |
| **Sprint 3** | Results-Detailseite (Hero-Zahl + Sparkline + Signifikanz-Donut + Raw-Data-Tabelle) | ✅ Deployed |
| **Sprint 4** | Overview restrukturieren (CRO-Snapshot, Top-3 Tests, Link zu /tests) | ✅ Deployed |
| **Sprint 5** | Account-Seite (/dashboard/account: Email/PW ändern, Danger Zone) | ✅ Deployed |
| **Sprint 6** | Inline-Billing (Plan, Rechnungen, Stripe-Portal-Link) | ✅ Deployed |

**In docs/future-features geparkt:** Mobile-Optimierung, Text-Tests, Bulk-Actions, ROI-Rechner, Badge-Vorschau, Referral-System, Public Share-Link.

**Key-Design-Entscheidungen:**
- Layout: Quick-Actions im Content-Bereich, Sidebar = reine Navigation
- Overview = Stats + Tests + Setup-Checkliste + CRO-Snapshot. `/dashboard/tests` = dedizierte Test-Seite (Redundanz ok)
- Charts nur auf Detailseite, keine Avg-Lift-Stat in Overview
- Snippet-Check proaktiv: Badge-Klick führt durch alle Setup-Schritte
- Signifikanz für Free-User sichtbar (Platzhalter-Card mit Upgrade-Pfad)
- Free-Gate via Best-Practice (402-UI / Locked-Card, kein harter Block)