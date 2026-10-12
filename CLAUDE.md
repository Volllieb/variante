# CLAUDE.md — variante

A/B-Testing für beliebige Websites: Snippet `ab.js` einbinden → im Dashboard-Wizard Element per Built-in-Picker wählen → KI (OpenAI) baut Variante B → `ab.js` liefert A/B aus und zählt Conversions. Ein Figma-Plugin zeigt Live-Stats. Domain: www.getvariante.com.
**Phase:** GTM, Ziel = erster zahlender Pro-Kunde bis ~18.11.2026 (verbindlich: `docs/kursdefinition.md`).

## Regeln für Agenten (zuerst lesen)

- Diese Datei zuerst lesen, dann **gezielt** mit Grep/Glob suchen. Keine ganzen Ordner lesen; große Dateien (siehe unten) nur ausschnittweise (`offset`/`limit`).
- **Nie lesen:** `node_modules/`, `package-lock.json`, `.next/`, `figma-plugin/dist/`, `ab-tool/playwright-report/`, `ab-tool/test-results/`, `ab-tool/tsconfig.tsbuildinfo`, `ab-tool/public/gsap.min.js`, `db/migrations/archive/`, `docs/screenshots/`, `docs/leads*`.
- Branch heißt **`master`** (= Production, Vercel deployt automatisch). Riskantes → Feature-Branch → Preview → `vercel promote`.
- **Parallele Sessions** im selben Working Tree: nur explizite Pfade stagen, nie `git add -A`; vor `reset`/`rebase` `git log --oneline -1` prüfen.
- Hooks (`.githooks/`): pre-commit führt `npm run vercel-build` in `ab-tool/` aus, sobald `ab-tool/` geändert ist; post-commit pusht automatisch.
- Keine `any`, keine ungenutzten Variablen (ESLint = error). Zero-Confirmation-Policy und Arbeitsregeln: `AGENTS.md`.
- Struktur oder Konventionen geändert → diese Datei **im selben Commit** anpassen.

## Architektur

```
Kunden-Website ──<script ab.js>──► /api/resolve  (welche Tests gelten für diese URL, inkl. Variante-B-HTML/CSS)
                                   /api/assign   (sticky Bucket A/B + signiertes Token, lib/assignBucket + assignToken)
                                   /api/event    (Conversion, braucht Token; sendBeacon)
Dashboard (Next.js, same origin) ─► /api/tests, /api/test-wizard/*, /api/results/*, /api/billing/* …
   Wizard-Picker: öffnet Kundenseite mit ?ab_pick=<testId> → ab.js-Picker → POST /api/capture
                  → Rückweg zum Wizard über /picker-return + lib/pickerBridge.ts (window.opener)
Figma-Plugin: code.ts (Sandbox) ◄─postMessage─► ui.html (iframe)
   ui.html fetcht direkt /api/tests, /api/profile mit `Authorization: Bearer <api_token>`
   code.ts kann nur: Token in figma.clientStorage lesen/speichern (TOKEN/TOKEN_SAVE), OPEN_URL, CLOSE
API-Routen ─► Supabase Postgres über Service-Role-Client `lib/supabase.ts` (umgeht RLS → Ownership im Code prüfen!)
Stripe ─► /api/stripe/webhook setzt `profiles.plan` (einzige Quelle für den Plan)
Vercel Cron (ab-tool/vercel.json) ─► /api/cron/* (Auth via lib/cronAuth.ts, CRON_SECRET)
```

**Auth in API-Routen** (`lib/auth.ts` → `getApiUser(req)`), drei Wege in dieser Reihenfolge: Bearer-API-Token (Plugin, SHA-256 in `profiles.api_token`) → Supabase-Session-Cookie (Dashboard) → `X-Temp-Token` (anonyme `temp_sessions`, plan=`temp`). Seiten-Gate für `/dashboard` + Session-Refresh: `ab-tool/proxy.ts` (Next-16-Middleware).

## Verzeichnis-Map

| Pfad | Zweck |
|---|---|
| `ab-tool/` | Next.js-16-App (Vercel Root Dir): Landing, Dashboard, API |
| `ab-tool/app/api/<name>/route.ts` | API-Routen (App Router, je Ordner eine Route) |
| `ab-tool/app/dashboard/` | Dashboard: `DashboardClient.tsx`, `Sidebar.tsx`, Unterseiten `tests/`, `results/[id]/`, `account/`, `billing/` (je `page.tsx` server + `*Client.tsx`) |
| `ab-tool/app/dashboard/components/` | Dashboard-Komponenten; `NewTestDrawer.tsx` = Test-Wizard |
| `ab-tool/app/dashboard/components/new-test/` | Wizard-Steps (`StepUrlAndElement`, `StepGoal`, `StepChange`, `StepReview`), Editoren, `delta.ts` (CSS-Diff/Change-Modell), `types.ts` |
| `ab-tool/app/components/` | Geteilte UI-Primitives (Button, Card, Toast, Tooltip, Skeleton, `VariantPreview`) |
| `ab-tool/components/` | Nur Landing-/Logo-Grafiken (`PandaLogo`, `LandingIcons`, `TechLogos`) |
| `ab-tool/app/{page,LandingDemo,LandingTrySite}.tsx` | Landingpage; Copy in `lib/landingCopy.ts` |
| `ab-tool/app/{login,signup,update-password,onboarding,auth}/` | Auth- und Onboarding-Seiten |
| `ab-tool/app/results/[id]/` | Öffentliche Results-Seite (Share-Link) |
| `ab-tool/app/picker-return/` | Rücksprungseite des Element-Pickers |
| `ab-tool/lib/` | Server-Logik **und** Client-Hooks (`use*.ts`) gemischt |
| `ab-tool/public/ab.js` | Kunden-Snippet, ES5-IIFE, ohne Build, von ESLint ausgenommen |
| `ab-tool/public/test-page/` | Statische Testseite für Picker/Snippet |
| `ab-tool/__tests__/*.mjs` | Node-Unit-Tests (`test:node`), `unit/` = Vitest+jsdom, `e2e/` = Playwright, `load/` = k6 |
| `ab-tool/scripts/` | Ops-Skripte (Bot, Leadgen, Dashboard-Verify) |
| `ab-tool/emails/` | Supabase-Auth-Mail-Templates (HTML) |
| `figma-plugin/src/code.ts` / `ui.html` | Plugin-Sandbox / Plugin-UI (Vanilla JS inline, ~1080 Zeilen) |
| `db/migrations/NNN_*.sql` | Supabase-Schema, fortlaufend (aktuell bis 044), manuell angewendet |
| `docs/` | `architektur.md`, `runbook.md`, `Begriffe.md` (Glossar), `brandguidelines.md`, `kursdefinition.md`, `future-features/` |
| `PROJEKT.md`, `AGENTS.md` | Projektkontext / Arbeitsregeln |

## Wo finde ich …?

| Aufgabe | Ort |
|---|---|
| Test/Variante anlegen (UI) | `app/dashboard/components/NewTestDrawer.tsx` + `new-test/*` |
| Test/Variante anlegen (API) | `app/api/test-wizard/{scan,generate,create,draft}`, `app/api/tests/` |
| KI-Generierung | `lib/generateVariantText.ts`, `lib/generate{Prompts,Helpers,Constants}.ts`, `lib/croAnalyze.ts` (Seiten-Scan), `lib/previewAnalyze.ts` (Onboarding), `lib/agentTools.ts` (`/api/agent`) |
| Varianten-Vorschau (iframe srcDoc) | `lib/previewDoc.ts`, `app/components/VariantPreview.tsx` |
| Element-Picker | `public/ab.js` (Block `?ab_pick=`), `app/api/capture/`, `lib/pickerBridge.ts`, `app/picker-return/` |
| Tracking / Ausspielung | `public/ab.js`, `app/api/{resolve,assign,event}/`, `lib/assignBucket.ts`, `lib/assignToken.ts`, `lib/variantHash.ts` |
| Statistik / Gewinner | `lib/significance.ts`, `lib/getExperimentStats.ts`, `lib/forecast.ts`, `lib/decisions.ts`, `app/api/cron/check-winners/` |
| Results-Seite | `app/dashboard/results/[id]/ResultsClient.tsx`, `lib/resultsHelpers.ts` |
| Auth | `lib/auth.ts` (API), `lib/supabaseServer.ts` (Server Components), `lib/supabaseBrowser.ts` (Login/Signup), `proxy.ts` |
| Domain-Freigabe / Snippet-Check | `lib/domainGate.ts`, `app/api/domains/`, `lib/snippetCheck.ts`, `lib/snippetCode.ts`, `app/dashboard/components/SnippetStatusBadge.tsx` |
| Billing / Plan-Limits | `app/api/billing/{checkout,portal}`, `app/api/stripe/webhook`, `lib/stripe.ts`, `lib/planLimits.ts` |
| DB-Schema | `db/migrations/` (kein generierter TS-Typ; Spalten per Grep auf Tabellenname suchen) |
| Env-Variablen | `ab-tool/.env.example` (vollständig, Source of Truth = Vercel) |
| Request-Validierung | `lib/validation.ts` (Zod-Schemas) + `lib/apiHelpers.ts` (`parseBody`) |
| Security | `lib/{cors,rateLimit,ssrf,safeFetch,sanitize,sanitizeCssText,pii,safeLog}.ts`, Header in `next.config.ts` |
| E-Mail | `lib/email.ts` (Resend), `app/api/cron/weekly-digest/` |
| Figma-Plugin-API | `app/api/figma/stats/`, `app/api/tests/` |
| Styling / Tokens | `app/globals.css` (`@theme`), `docs/brandguidelines.md` |

## Konventionen

- **Dateinamen:** React-Komponenten `PascalCase.tsx`, Lib-Module `camelCase.ts`, Hooks `useX.ts` (in `lib/`), Route-Ordner `kebab-case`. Import-Alias `@/` = `ab-tool/`.
- **Seiten:** `page.tsx` (Server Component, lädt Daten) + `*Client.tsx` (`'use client'`) + `loading.tsx`/`error.tsx` daneben.
- **API-Route-Muster:** `export async function OPTIONS() { return preflight(methods) }` → `getApiUser(req)` / `unauthorized()` → `parseBody(req, zodSchema, methods)` → Supabase via `lib/supabase.ts` → `Response.json(..., { headers: corsHeaders(methods) })`. Plan-Gates mit `paymentRequired()`; Cron-Routen in `cronRoute()` wrappen.
- **Fehler:** API antwortet `{ error: '<kurz>' }` (+ optional `message`, `details`) mit passendem Status; Logging über `safeError`/`safeWarn` (`lib/safeLog.ts`, PII-redigiert) statt rohem `console.error`. Ausgehende Fetches auf Nutzer-URLs nur über `lib/safeFetch.ts`.
- **State:** kein globaler Store; React-`useState` lokal, Wizard-State in `NewTestDrawer`, Persistenz über `usePersistedValue`, Live-Updates über `useRealtime` (Supabase Realtime).
- **Styling:** Tailwind v4 (Konfig nur in `globals.css`, kein `tailwind.config.js`), Farb-Tokens `bg-bg-0..2`, `text-text/-2/-3`, `bg-ok` usw.; Dark-only, monochrom (Schwarz/Weiß + 3 Funktionsfarben). Icons: `lucide-react`, Charts: `recharts` (`app/components/ui/chart.tsx`, `chartTheme.ts`).
- **Sprache:** UI-Texte Englisch; Code-Kommentare und Docs überwiegend Deutsch. Kommentare erklären das *Warum* (oft mit Plan-ID wie `SEC-05`, `DATA-01`).
- **`ab.js`:** ES5, keine Abhängigkeiten, läuft auf Fremdseiten. Kein SRI (bewusst, siehe `README.md` §Security).
- **DB:** neue Migration = nächste Nummer in `db/migrations/`, idempotent; Anwendung wird in `schema_migrations` getrackt.

## Befehle

```bash
# Repo-Root
npm run dev:tool                  # Next dev, localhost:3000
npm run build:plugin              # Figma-Plugin (esbuild, Windows-`copy`)
# in ab-tool/
npm run lint                      # ESLint 9 flat config
npx tsc --noEmit                  # Typecheck (kein eigenes Script)
npm run vercel-build              # = next build, Pflicht vor Commit
npm run test:node                 # Node-Unit-Tests (__tests__/*.mjs)
npm run test:unit                 # Vitest + jsdom (__tests__/unit)
npm run test                      # Playwright E2E (chromium); test:smoke für @smoke
npm run loadtest                  # k6
vercel env pull .env.local --yes  # Envs syncen
vercel deploy / vercel promote <url>
```

Lokal ist kein Dashboard-Login möglich (`.env.local` hat Platzhalter) → UI-Zustände per Vitest+jsdom prüfen.

## Große Dateien (nur gezielt lesen)

`app/dashboard/results/[id]/ResultsClient.tsx` (~1700), `public/ab.js` (~1670), `figma-plugin/src/ui.html` (~1080), `app/dashboard/account/AccountClient.tsx` (~1000), `app/dashboard/components/NewTestDrawer.tsx` (~960), `lib/croAnalyze.ts` (~760), `new-test/delta.ts` (~720), `new-test/StepUrlAndElement.tsx` (~690), `SnippetStatusBadge.tsx` (~660), `app/onboarding/page.tsx` (~630).

## Stolperfallen

- `/api/picker-bridge` ist deaktiviert (SEC-01); `lib/pickerBridge.ts` ist etwas anderes (Client-Rückkanal des Pickers).
- `/api/event` = Conversion aus `ab.js`; `/api/events` = Activity-Log eines Tests (Dashboard).
- `lib/supabase.ts` nutzt den Service-Role-Key: jede Query muss selbst auf `user_id`/`temp_session_id` filtern.
- Plan nie aus `user_metadata` lesen, immer `getPlanForUser()` / `profiles.plan` (SEC-05).
