# PROJEKT.md — variante

> Single Source of Truth. Fakten, Entscheidungen, Richtung. Kein Chat-Verlauf.
> Arbeitsanweisungen: `AGENTS.md` · Strategie: `GOTOMARKET.md` · Schnellstart: `README.md`

---

## §1 Identität

| Feld | Wert |
|---|---|
| **Produkt** | variante — Designer-natives A/B-Testing aus Figma, kein Dev nötig |
| **ICP** | Designer & kleine Agenturen auf Plattformen **ohne** natives A/B (Custom HTML, WordPress, Next/React, Shopify) |
| **Rechtsform** | Einzelunternehmen (Bayern/DE) |
| **Phase** | Post-MVP → Go-to-Market |
| **Stand** | 06.07.2026 — Security-Hardening: SRI, max_tokens, Security-Headers, CORS-Doku, Upstash pending |
| **Ziel** | 500–1.000 €/Mo passives Asset. Hebel = Distribution (Figma Community), nicht Produkt. |

## §2 Stack

| Komponente | Technologie |
|---|---|
| API + Dashboard | Next.js 16 (App Router) auf Vercel |
| Datenbank + Auth | Supabase (Postgres + JWT) |
| Billing | Stripe (Checkout, Portal, Webhooks) |
| Rate-Limiting | Upstash Redis (@upstash/redis, Free Tier) |
| KI-Generierung | OpenAI API (~0,3 ct/Call) |
| Snippet | `ab.js` (Vanilla JS, <5 KB, kein Build-Step) |
| Chrome-Extension | MV3 (Vanilla JS, on-demand injection) |
| Figma-Plugin | TypeScript + HTML (360×560px, Figma-native Tokens) |
| KI-Agenten | Cline (DeepSeek V4 Pro) + GitHub Copilot · Config: `.github/agents/`, `.agents/skills/` |

## §3 Struktur

```
ab-tool/                # Next.js — API, Dashboard, Landingpage
├── app/api/            # analytics, assign, billing, capture, cron, domains, event, events, generate, profile, resolve, results, stripe, tests, token, variant
├── app/dashboard/ login/ onboarding/ signup/ results/ imprint/ privacy/
├── lib/                # auth, cors, stats, significance, stripe, supabase, rateLimit, sanitize, safeLog
├── public/ab.js        # Snippet
└── __tests__/
chrome-extension/       # MV3 — content-picker.js, background.js, popup.*, welcome.html
figma-plugin/           # code.ts + ui.html (6 Screens, Creation only)
db/migrations/          # Supabase SQL (001–010)
z.future-features/      # ⚠️ Anfassen verboten — Post-Launch
```

## §4 Deployment

| Projekt | URL | Methode |
|---|---|---|
| ab-tool | `www.getvariante.com` | GitHub Action → `vercel deploy --prod` (automatisch bei Push auf master) |

**Git:** `github.com/Volllieb/variante.git` (master) · **Auto-Push:** `post-commit`-Hook → **Auto-Deploy:** `.github/workflows/deploy.yml`

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
| 06.07.2026 | **Dogfood-Tests pausiert.** Beide aktiven Tests auf getvariante.com / www.getvariante.com auf paused gesetzt. Hardcoded Landingpage-Badge bleibt — kein doppelter Badge mehr via ab.js. |
| 06.07.2026 | **CI-Fix: Vercel-Deploy in GitHub Actions repariert.** `--yes`-Flag für non-interactive CI (kein TTY). Node 20 → 22 (deprecated). `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID` als env vars (`.vercel/` ist gitignored → GitHub Actions fand kein Projekt). |
| 06.07.2026 | **Security-Hardening.** SRI-Hash für ab.js generiert + in allen Snippet-Beispielen ergänzt. max_tokens: 4096 in /api/generate gesetzt. CORS-Doku (Access-Control-Max-Age 600s). Security-Headers: X-Frame-Options: SAMEORIGIN + HSTS für Pages. Upstash Redis-Code ready, Env-Vars noch zu setzen. |
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
- Chrome-Extension LIVE im CWS · Figma-Plugin-Review läuft (eingereicht 29.06.)
- Dogfooding: variante testet eigene Landingpage
- **Auth-Guard:** Results nur für Besitzer sichtbar
- **Nächster Schritt:** E2E auf echter Fremd-Site

### Meilensteine

1. **M1: Fremd-Site-Test** — Snippet → Traffic → Conversions → Winner. Blockiert alles.
2. **M2: Store-Freigaben + Design-Partner** (Ziel: August) — 3–5 Partner, 1–2 Case-Studies.
3. **M3: Erster Pro-Kunde** (Ziel: September) — Checkout → Webhook → Badge-aus.

### Nordstern

- **Distribution > Produkt.** Figma Community = Burggraben.
- **Badge = Wachstumsmotor.** Viral > bezahlt.
- **Plugin = Creation, Web = Analysis.** Keine Results ins Plugin.
- **Keine Features ohne Revenue-Signal.**

### Anti-Roadmap

| Nicht bauen | Warum |
|---|---|
| Agency-Tier | Kein Revenue-Signal |
| Mehrere Metriken parallel | 6–10h, alle Schichten |
| A/B-Editor im Web | Creation = Plugin |
| Analytics-Dashboard | Fokus auf A/B-Testing |

### Technische Leitplanken

- **Monolith** (`ab-tool/`). Kein Microservice-Split bis >1000 Tests/Tag.
- **Eine Produktions-URL** (`www.getvariante.com`). Kein Staging bis >10 Kunden.
- **Supabase only.** Kein Redis, Kafka, TimescaleDB.
- **ab.js bleibt Vanilla JS.** Kein npm, kein Build. Das ist der USP.

## §11 Offene Baustellen

| # | Thema | Status | Aktion |
|---|---|---|---|
| 1 | Upstash Redis Env-Vars | 🔴 Offen | Free-Tier-DB auf [upstash.com](https://upstash.com) erstellen, `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` als Vercel Env-Vars setzen. Code in `rateLimit.ts` ready. |
| 2 | SRI-Hash bei ab.js-Update | 🟡 Prozess | Bei jedem `ab.js`-Release: `sha384`-Hash neu generieren und in `README.md` + `DashboardClient.tsx` aktualisieren. |
| 3 | OpenAI-Kosten-Tracking | 🟡 Monitoring | `max_tokens: 4096` begrenzt pro Call, aber kein globales Spend-Limit. OpenAI Usage Limits setzen. |