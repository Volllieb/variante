# 🚀 Roadmap to Production Launch — variante

**Status:** 15.07.2026 · MVP → Soft-Launch Ready (Hard-Launch: +2–3 Wochen)  
**Autor:** Claude Code Analysis  
**Zielgruppe:** KI-Agenten, Dev-Team, Leadership  
**Format:** KI-optimiert mit Verlinkungen und Code-Referenzen

---

## 📋 Inhaltsverzeichnis

- [Executive Summary](#executive-summary)
- [1. Stabilität & Performance](#1-stabilität--performance)
- [2. Sicherheit](#2-sicherheit)
- [3. Skalierbarkeit](#3-skalierbarkeit)
- [4. UX/Design](#4-uxdesign)
- [5. Testing](#5-testing)
- [6. DevOps/Deployment](#6-devopsdeployment)
- [7. Dokumentation](#7-dokumentation)
- [8. Support & Feedback](#8-support--feedback)
- [Deployment Checklist](#deployment-checklist)
- [Risiko-Matrix](#risiko-matrix)

---

## Executive Summary

**Aktuelle Reife:** 75% Production-Ready  
**MVP-Status:** ✅ Figma-Plugin LIVE · ✅ Snippet funktioniert · ✅ First organic user  
**Soft-Launch-Blockiert:** Nein  
**Hard-Launch-Blockiert:** Ja (Error-Tracking, Loadtests, Mobile-Opt, Incident-Runbooks)

### Critical Path (nächste 2 Wochen)
1. [Sentry Error-Tracking](#error-tracking-fehlend) integrieren
2. [Mobile E2E-Tests](#mobile-responsiveness) ausführen
3. [k6 Loadtest](#lasttest-nicht-dokumentiert) gegen 10k concurrent users
4. [Incident-Runbook](#incident-response-plan) schreiben
5. [Database Scaling-Plan](#datenbank) dokumentieren

### Soft-Launch (nächste Woche, mit Product Hunt)
- Sentry live + 1h Response-Time SLA
- Mobile Tests grün
- Loadtest >80 RPS ohne Fehler
- Public Health-Status

---

## 1. Stabilität & Performance

**Aktuelle Note:** 🟡 80% | **Ziel:** 90%

### 1.1 Lasttest — ❌ NICHT VORHANDEN

**Impact:** Keine Garantie, dass App unter Last funktioniert. Product Hunt wird 500+ gleichzeitige User bringen.

#### Was ist zu tun
- **k6 Loadtest schreiben** (`ab-tool/__tests__/load/main.k6.js`)
  - VU: 100 → 1000 → 10000 über 5 Minuten
  - Szenarios: Signup → Login → New Test → View Results
  - Akzeptanzkriterien: 95%-Latenz <2s, Error-Rate <1%
  - Ziel-Durchsatz: 100 RPS (wenn <50 RPS → Scaling-Plan triggern)

- **Durchführung:**
  ```bash
  npm run loadtest  # k6 run __tests__/load/main.k6.js
  ```

- **Vergleich-Baseline:** [Vercel Analytics](#performance-monitoring) vor + nach (Core Web Vitals)

#### Relevante Dateien
- `ab-tool/playwright.config.ts` — E2E-Struktur (Vorbild)
- `ab-tool/__tests__/e2e/` — 4 Existing E2E Specs
- `.github/workflows/e2e.yml` — CI-Integration

#### Timeline
- **Tag 1–2:** k6-Test schreiben + lokal ausführen
- **Tag 2:** CI-Integration (`.github/workflows/loadtest.yml`)
- **Tag 3:** Baseline dokumentieren, Result-Vergleich mit Prod

#### Owner
- `@performance-optimizer` Agent (gibt Insights)
- Entwickler: Manuelle k6-Setup

---

### 1.2 Fehlerbehandlung — ✅ STRUKTURIERT (aber Monitoring fehlend)

**Aktueller Status:** `safeLog.ts` + Context-Wrapper vorhanden. PII-Scanning in `/api/generate` DSGVO-sicher.

#### Was funktioniert
- [safeLog.ts:1–19](../../ab-tool/lib/safeLog.ts) — Production-sichere Error-Ausgabe (kein Stack, kein DB-Details)
- PII-Scanning: [/api/generate:14–35](../../ab-tool/app/api/generate/route.ts) — 15 Patterns (Kreditkarte, Telefon, Sozialversicherung)
- Zod-Validierung: Alle 13 API-Routes nutzen Schemas ([/api/tests:19](../../ab-tool/app/api/tests/route.ts), [/api/domains:24](../../ab-tool/app/api/domains/route.ts), etc.)

#### Was ist zu tun
- **Sentry Integration** (Error-Tracking + Error-Budgets)
  ```bash
  npm install @sentry/nextjs
  ```
  - Konfiguration in `ab-tool/next.config.ts`:
    ```ts
    import * as Sentry from "@sentry/nextjs";
    
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1, // 10% in Production
      integrations: [new Sentry.Replay({ maskAllText: true })],
    });
    ```
  - Umgebungsvariablen in Vercel setzen: `SENTRY_DSN`

- **Error-Budgets definieren** (per Route)
  | Route | SLA | Budget |
  |---|---|---|
  | `/api/event` | 99.9% | 1 Error pro 1000 Requests |
  | `/api/resolve` | 99.5% | 5 Errors pro 1000 Requests |
  | `/api/generate` | 99% | 10 Errors pro 1000 Requests (OpenAI instabil) |

#### Relevante Dateien
- [ab-tool/lib/safeLog.ts](../../ab-tool/lib/safeLog.ts) — Error-Ausgabe
- [ab-tool/lib/pii.ts](../../ab-tool/lib/pii.ts) — PII-Patterns (15 Muster)
- [ab-tool/lib/sanitize.ts](../../ab-tool/lib/sanitize.ts) — Input-Sanitization

#### Timeline
- **Tag 1:** Sentry Project anlegen + DSN generieren
- **Tag 1–2:** Integration in `next.config.ts`
- **Tag 2:** Error-Budgets in PROJEKT.md §11 dokumentieren
- **Laufend:** Sentry Dashboard monitoren

#### Owner
- `@deployment-expert` (Infra)
- Entwickler: Integration

---

### 1.3 Caching — 🟡 TEILWEISE (nur 4 Stellen)

**Problem:** Nur `React.cache()` an 4 Stellen. Meiste Datenbank-Queries nicht gecacht → redundante DB-Hits.

#### Aktueller Status
- ✅ `React.cache()` in 4 Routes: `/api/stripe/webhook/`, `/api/tests/`, `/api/domains/`, `/api/tests/[id]/`
- ✅ Static Assets: 1 Jahr Cache (fingerprinted via Build)
- ✅ ab.js: 1h Cache + `must-revalidate`
- ❌ Fehlend: Page-Level-Caching, Query-Deduplication

#### Was ist zu tun
- **Page-Cache aktivieren** (für Dashboard + Results)
  ```ts
  // ab-tool/app/dashboard/page.tsx
  import { unstable_cache } from 'next/cache';
  
  const getCachedProfile = unstable_cache(
    async (userId: string) => supabase.from('profiles').eq('id', userId).single(),
    ['profile'], // Tag für Revalidierung
    { revalidate: 60 } // 60s
  );
  ```

- **Revalidation Trigger** — Cache invalidieren wenn Daten sich ändern
  ```ts
  // Nach Test-Erstellung in /api/tests/route.ts
  revalidateTag('profile'); // Invalidiert alle Caches mit Tag 'profile'
  ```

- **Query-Deduplication** — Duplikate in Dashboard eliminieren
  - Audit: [ab-tool/app/dashboard/page.tsx](../../ab-tool/app/dashboard/page.tsx) + [TestsClient.tsx](../../ab-tool/app/components/TestsClient.tsx)
  - Ziel: 3 parallele Queries statt 6

#### Relevante Dateien
- [ab-tool/app/dashboard/page.tsx](../../ab-tool/app/dashboard/page.tsx) — Main Dashboard (mehrere Queries)
- [ab-tool/app/components/TestsClient.tsx](../../ab-tool/app/components/TestsClient.tsx) — Tests-Liste
- [ab-tool/lib/supabaseServer.ts](../../ab-tool/lib/supabaseServer.ts) — Server-Side Queries

#### Timeline
- **Tag 1–2:** Audit durchführen (welche Queries am teuersten?)
- **Tag 2–3:** `unstable_cache` auf top-5-Queries anwenden
- **Tag 3:** Revalidation-Tags dokumentieren
- **Laufend:** Vercel Analytics überwachen (DB-Hit-Ratio sollte von ~40% auf ~70% steigen)

#### Owner
- `@performance-optimizer` Agent
- Entwickler: Implementation

#### Success-Metric
- Vercel Analytics: Database Query Latency < 100ms (p95)
- Seite Reload-Zeit: <800ms statt 1200ms

---

### 1.4 Datenbank-Optimierung — 🟡 MINIMAL

**Status:** 20 Migrationen live (001–020). Index-Abdeckung nicht dokumentiert.

#### Was funktioniert
- ✅ 20 SQL-Migrationen: [db/migrations/](../../db/migrations) (001_schema.sql bis 020_test_health.sql)
- ✅ Daily Stats Snapshot: Migration 010 (`snapshot_daily_stats()` RPC)
- ✅ RLS-Policies auf allen Tabellen (Supabase-native)

#### Was ist zu tun
- **Index-Audit** durchführen
  ```sql
  -- Ziel-Indices für Production
  CREATE INDEX idx_events_snippet_key ON events(snippet_key);
  CREATE INDEX idx_events_created_at ON events(created_at DESC);
  CREATE INDEX idx_tests_user_id_status ON tests(user_id, status);
  CREATE INDEX idx_domains_user_id_verified ON domains(user_id, verified_at);
  CREATE INDEX idx_daily_stats_test_id_date ON daily_stats(test_id, snapshot_date DESC);
  ```
  - Neue Migration: `db/migrations/021_indexes.sql`

- **Query-Performance dokumentieren**
  - Slow-Query-Log aktivieren (Supabase Dashboard → Logs)
  - Queries >100ms identifizieren
  - EXPLAIN-Plans für Top-5-Queries

- **Connection-Pool konfigurieren** (wichtig für Scaling)
  - Supabase Pooler: [supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
  - Pool-Size: 10–20 (für 100 concurrent users)
  - Konfiguration in Supabase Dashboard → Project Settings

#### Relevante Dateien
- [db/migrations/](../../db/migrations) — Alle SQL-Migrationen
- [ab-tool/lib/supabaseServer.ts](../../ab-tool/lib/supabaseServer.ts) — Server-Side Queries
- [PROJEKT.md §8](../../PROJEKT.md#§8-historie-letzte-einträge) — Migration-History

#### Timeline
- **Tag 1:** Index-Audit + Migration schreiben
- **Tag 1–2:** Connection-Pool in Supabase konfigurieren
- **Tag 2:** Slow-Query-Log aktivieren + Top-5 analysieren
- **Laufend:** Vercel Logs überwachen (Query-Latenz)

#### Owner
- `@supabase` Agent
- DBA/Entwickler: Manual Execution

---

### 1.5 Monitoring — 🟡 BASIC

**Status:** Vercel Analytics live (Core Web Vitals). Keine Custom-Dashboards, kein APM.

#### Was funktioniert
- ✅ Vercel Analytics integriert (dashboard.vercel.com)
  - Core Web Vitals (LCP, CLS, FID)
  - Fehler-Rate (nur gekapselte Fehler)
  - User-Sessions

#### Was ist zu tun
- **Prometheus + Grafana Setup** (Alternative: DataDog, New Relic)
  - Vercel: Keine native Prometheus-Integration
  - Lösung: Custom Metrics via Vercel Analytics API exportieren
  ```ts
  // ab-tool/lib/metrics.ts (neu)
  export function recordMetric(name: string, value: number, tags?: Record<string, string>) {
    if (typeof window !== 'undefined') {
      // Client-Side: Beacon-API für Vercel Analytics
      navigator.sendBeacon('/api/metrics', JSON.stringify({ name, value, tags }));
    }
  }
  
  // ab-tool/app/api/metrics/route.ts (neu)
  export async function POST(req: Request) {
    const { name, value, tags } = await req.json();
    // Speichern in Supabase: metrics-Tabelle
    await supabase.from('metrics').insert({ name, value, tags, created_at: new Date() });
    return Response.json({ ok: true });
  }
  ```

- **Custom-Dashboards erstellen** (in Vercel oder externer Grafana)
  - Request-Latency (p50, p95, p99)
  - Error-Rate pro Route
  - Database-Query-Latency
  - API-Response-Time Distribution

#### Relevante Dateien
- Vercel Analytics: `https://vercel.com/dashboard` → Project `ab-tool`
- [PROJEKT.md §7](../../PROJEKT.md#§7-security-figma-publish-dialog) — Hosting & Monitoring

#### Timeline
- **Tag 1:** Custom-Metrics-API bauen (`lib/metrics.ts` + `api/metrics/route.ts`)
- **Tag 2:** Metrics in Production testen
- **Tag 3:** Grafana-Dashboard oder Vercel-Dashboard konfigurieren
- **Laufend:** Threshold-Alerts setzen (wenn Error-Rate >1%, wenn Latency >2s)

#### Owner
- `@deployment-expert`
- Entwickler: Metrics-Implementation

---

## 2. Sicherheit

**Aktuelle Note:** 🟢 85% | **Ziel:** 90%

### 2.1 Authentifizierung & Autorisierung — ✅ SOLIDE

**Status:** Supabase JWT + HTTP-only Cookies. OAuth, Magic Link, Passwort-Reset vorhanden.

#### Was funktioniert
- ✅ Supabase Auth: OAuth (Google), Magic Link, Passwort-Reset
  - Implementierung: [ab-tool/lib/auth.ts](../../ab-tool/lib/auth.ts)
  - Routes: `/api/auth/*` (Supabase-native via `@supabase/ssr`)
  - Cookies: `HTTP-only`, `Secure`, `SameSite=Lax`

- ✅ RLS-Policies auf allen Tabellen
  - Beispiel: `/api/results/[id]/route.ts` — prüft `test.user_id === session.user.id`
  - Alle Queries nutzen `supabase.auth.getUser()` → Session-Context

#### Was ist zu tun
- **Rate-Limiting auf Auth-Routes** (Brute-Force-Protection)
  ```ts
  // ab-tool/app/api/auth/callback/route.ts (neu)
  import { rateLimit } from '@/lib/rateLimit';
  
  export async function POST(req: Request) {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const limit = await rateLimit(ip, 'auth-callback', 5, 900); // 5 pro 15min
    if (!limit.success) return new Response('Too many attempts', { status: 429 });
    // ... rest
  }
  ```

- **Session-Timeout konfigurieren** (Security Best-Practice)
  - `SUPABASE_JWT_EXPIRY`: 1h (standard)
  - Refresh-Token: 7d
  - Dokumentieren in [PROJEKT.md §7](../../PROJEKT.md#§7-security-figma-publish-dialog)

- **Login-Audit-Log aktivieren**
  ```sql
  -- db/migrations/021_auth_audit.sql
  CREATE TABLE auth_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    event_type TEXT, -- 'login', 'logout', 'password_reset', 'oauth'
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  
  CREATE INDEX idx_auth_events_user_id ON auth_events(user_id);
  CREATE INDEX idx_auth_events_created_at ON auth_events(created_at DESC);
  ```

#### Timeline
- **Tag 1:** Rate-Limiting-Logic schreiben
- **Tag 1:** Session-Timeout + JWT-Expiry dokumentieren
- **Tag 2:** Auth-Audit-Log Migration anlegen
- **Laufend:** Supabase Dashboard → Logs → Auth-Events überwachen

#### Owner
- Entwickler
- `@supabase` Agent (Verification)

---

### 2.2 Datenschutz (DSGVO) — ✅ STARK

**Status:** PII-Scanner in `/api/generate` vorhanden (15 Patterns). Daten nicht an OpenAI gesendet.

#### Was funktioniert
- ✅ PII-Scanning in [/api/generate:14–35](../../ab-tool/app/api/generate/route.ts)
  - 15 Patterns: Telefon, Kreditkarte, Email, Sozialversicherung, Passport, Bankkonten, Steuernummern, etc.
  - Blocking: Wenn PII erkannt → Error 400, Anfrage wird nicht an OpenAI gesendet
  - Audit: [ab-tool/lib/pii.ts](../../ab-tool/lib/pii.ts)

- ✅ Daten-Minimierung
  - Nur `selected_element_json` (Figma-Element) wird an OpenAI gesendet, nicht ganze Page
  - Transient: Nicht im Supabase gespeichert
  - Dokumentation: [PROJEKT.md §7](../../PROJEKT.md#§7-security-figma-publish-dialog) — „Daten: Nur selektiertes Figma-Element transient an OpenAI API."

- ✅ Datenextraktions-API (`/api/profile/export`)
  - User können ihre Daten als JSON exportieren (DSGVO Recht 15)
  - Implementierung: [ab-tool/app/api/profile/export/route.ts](../../ab-tool/app/api/profile/export/route.ts)

#### Was ist zu tun
- **Privacy-Policy aktualisieren** (DSGVO-compliant)
  - Prüfe: [ab-tool/app/privacy/page.tsx](../../ab-tool/app/privacy/page.tsx)
  - Fehlendes Kapitel: Datenverarbeitung bei OpenAI, PII-Scanning, Retention-Policy
  - Neu: 30-Tage Retention für `daily_stats`, 90-Tage für `events`, Dauer-Speicherung von `tests`

- **Datenlöschung auf Anfrage** (`PATCH /api/profile` mit `delete_account=true`)
  ```ts
  // ab-tool/app/api/profile/route.ts (erweitern)
  export async function PATCH(req: Request) {
    const { delete_account } = await req.json();
    if (delete_account) {
      // Cascade-Delete: tests → events → daily_stats
      // Cascade-Delete: domains
      // Cascade-Delete: profiles-Eintrag
      // Final: Delete auth.users
    }
  }
  ```

- **Data-Retention-Policy definieren**
  | Tabelle | Retention | Löschung |
  |---|---|---|
  | `events` | 90 Tage | Auto-Cron (täglich) |
  | `daily_stats` | 2 Jahre | Auto-Archive zu S3 (optional) |
  | `tests` | Solange Account aktiv | Cascade bei Account-Löschung |
  | `profiles` | Solange Account aktiv | Manual Löschung |

#### Relevante Dateien
- [ab-tool/lib/pii.ts](../../ab-tool/lib/pii.ts) — PII-Patterns (15 Muster)
- [ab-tool/app/privacy/page.tsx](../../ab-tool/app/privacy/page.tsx) — Privacy-Policy
- [ab-tool/app/api/profile/export/route.ts](../../ab-tool/app/api/profile/export/route.ts) — DSGVO-Export
- [PROJEKT.md §7](../../PROJEKT.md#§7-security-figma-publish-dialog) — Compliance-Statement

#### Timeline
- **Tag 1:** Privacy-Policy Review + Update
- **Tag 1–2:** Account-Deletion-Route implementieren
- **Tag 2:** Data-Retention-Cron schreiben
- **Tag 3:** Dokumentation in README + Privacy

#### Owner
- Legal/Compliance (Policy)
- Entwickler (Implementation)

---

### 2.3 Input-Validierung — ✅ ZOD-BASIERT

**Status:** Alle 13 POST-Routes nutzen Zod-Schemas.

#### Was funktioniert
- ✅ Zod-Schemas auf allen API-Routes
  - [/api/tests:19](../../ab-tool/app/api/tests/route.ts): `testCreateSchema` validiert `name`, `page_url`, `goal`, etc.
  - [/api/domains:24](../../ab-tool/app/api/domains/route.ts): `domainSchema` validiert URL-Format
  - Pattern: `const parsed = schema.safeParse(body); if (!parsed.success) return 400`

#### Was ist zu tun
- **Zod-Schemas dokumentieren** (OpenAPI-Export für Frontend-Integrierer)
  ```ts
  // ab-tool/lib/schemas.ts (neu)
  export const apiSchemas = {
    createTest: testCreateSchema,
    createDomain: domainSchema,
    createAgent: agentRunSchema,
    // ... alle 13 Schemas
  };
  
  // Konvertierung zu OpenAPI: zod-to-openapi (npm-Paket)
  // Output: /public/openapi.json
  ```

- **Sanitization-Regeln testen**
  - Bestehend: [ab-tool/lib/sanitize.ts](../../ab-tool/lib/sanitize.ts)
  - Tests: XSS-Payloads, SQL-Injection, Path-Traversal
  - Neue Test-Suite: [ab-tool/__tests__/unit/sanitize.test.ts](../../ab-tool/__tests__/unit/sanitize.test.ts) (manuell schreiben)

#### Relevante Dateien
- [ab-tool/lib/sanitize.ts](../../ab-tool/lib/sanitize.ts) — Sanitization-Logik
- Alle `/api/*/route.ts` — Zod-Usage

#### Timeline
- **Tag 1:** OpenAPI-Schema generieren (zod-to-openapi)
- **Tag 2:** Sanitization-Tests schreiben
- **Tag 3:** OpenAPI-Docs in `/public/openapi.json` veröffentlichen

#### Owner
- Entwickler

---

### 2.4 API-Security — ✅ HEADERS GESETZT

**Status:** X-Content-Type-Options, X-Frame-Options, HSTS, Permissions-Policy aktiv.

#### Was funktioniert
- ✅ Security-Headers in [next.config.ts:21–66](../../ab-tool/next.config.ts)
  - API-Routes: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
  - Pages: `X-Frame-Options: SAMEORIGIN`, `HSTS: max-age=63072000`
  - `Permissions-Policy`: camera, microphone, geolocation disabled

#### Was ist zu tun
- **CSP (Content-Security-Policy) schärfen**
  ```ts
  // next.config.ts → headers()
  {
    source: '/api/:path*',
    headers: [
      {
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.vercel-analytics.com; frame-ancestors 'none';",
      },
    ],
  }
  ```

- **CORS-Konfiguration audit**
  - Bestehend: [ab-tool/lib/cors.ts](../../ab-tool/lib/cors.ts)
  - Prüfe: Welche Routes erlauben Cross-Origin? (sollte nur `/api/resolve` + `/api/event` sein)
  - Verify: Kein Wildcard `*` in CORS-Origin

#### Relevante Dateien
- [ab-tool/next.config.ts](../../ab-tool/next.config.ts) — Security-Headers
- [ab-tool/lib/cors.ts](../../ab-tool/lib/cors.ts) — CORS-Config

#### Timeline
- **Tag 1:** CSP-Header hinzufügen
- **Tag 1:** CORS-Audit durchführen
- **Tag 2:** Headers in Production testen (curl mit `-v`)

#### Owner
- Entwickler

---

### 2.5 SSRF-Protection — ✅ ZENTRAL

**Status:** `lib/ssrf.ts` mit BLOCKED_HOSTS/BLOCKED_HOSTNAMES, 5–10s Timeout.

#### Was funktioniert
- ✅ SSRF-Protection in [ab-tool/lib/ssrf.ts](../../ab-tool/lib/ssrf.ts)
  - Blocked: localhost, 127.0.0.1, 192.168.*, 10.*, 172.*, metadata endpoints (AWS, GCP, Azure)
  - Verwendet in: `/api/snippet-check`, `/api/agent/route.ts` (`fetchSite`)
  - Timeout: 5–10 Sekunden

#### Was ist zu tun
- **SSRF-Tests erweitern**
  - Bestehend: Kurz in `/api/snippet-check`
  - Neu: E2E-Test mit absichtlich-blockierten IPs
  - Scenarios: localhost, private IPs, AWS-metadata-endpoint

#### Timeline
- **Tag 1:** SSRF-Tests schreiben
- **Tag 2:** Code-Review für `/api/agent/route.ts` (`fetchSite`)

#### Owner
- Entwickler

---

### 2.6 Webhooks — ✅ SIGNATUR-CHECK

**Status:** Stripe Webhook mit `crypto.timingSafeEqual()`. Idempotency-Key in Migration 008.

#### Was funktioniert
- ✅ Webhook-Signature-Validation
  - [ab-tool/app/api/stripe/webhook/route.ts](../../ab-tool/app/api/stripe/webhook/route.ts)
  - `crypto.timingSafeEqual()` gegen Timing-Attacks
  - Idempotency via `idempotency_key`

#### Was ist zu tun
- **Webhook-Retry-Logic**
  - Derzeit: Stripe retried automatisch. Gut.
  - Neu: Aufzeichnung fehlgeschlagener Webhooks → Monitoring-Alert

- **Webhook-Testing**
  - Stripe CLI lokal testen: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
  - E2E-Test: Figma → Test-Creation → Webhook-Auslösung testen

#### Relevante Dateien
- [ab-tool/app/api/stripe/webhook/route.ts](../../ab-tool/app/api/stripe/webhook/route.ts) — Webhook-Handler
- [db/migrations/008_webhook_idempotency.sql](../../db/migrations/008_webhook_idempotency.sql) — Idempotency-Key

#### Timeline
- **Tag 1:** Webhook-Retry-Audit
- **Tag 2:** Stripe CLI Testing

#### Owner
- `@stripe` Agent
- Entwickler

---

## 3. Skalierbarkeit

**Aktuelle Note:** 🟡 65% | **Ziel:** 85%

### 3.1 Architektur — ✅ MONOLITH

**Status:** Next.js 16 auf Vercel (Fluid Compute). Keine Microservices bis >1000 Tests/Day.

#### Was funktioniert
- ✅ Monolith-Setup: [ab-tool/](../../ab-tool)
  - Routing: App Router (Next.js 16)
  - Deploy: Vercel Fluid Compute (~10–50 cold starts/Tag)
  - Skalierung: Vercel managed (auto-scaling nach Anfragen)

#### Was ist zu tun
- **Micro-Frontend-Plan erstellen** (für >10k Tests/Day)
  - Figma Plugin: Standalone (bleibt wie ist)
  - Web Dashboard: Bleibt Monolith bis >5k Tests/Day
  - Snippet (`ab.js`): Bleibt statische Datei (20KB), serviert von Vercel CDN

- **Skalierungs-Trigger dokumentieren**
  | Metrik | Schwellenwert | Aktion |
  |---|---|---|
  | Tests/Tag | >500 | Read-Replica für DB |
  | Requests/Sec | >100 | Caching-Strategie review |
  | Cold-Start-Latency | >2s | App Router Optimierung |
  | Database-Latency (p95) | >500ms | Query-Optimization |

#### Timeline
- **Tag 1:** Skalierungs-Trigger in [PROJEKT.md §11](../../PROJEKT.md#§11-offene-baustellen) dokumentieren
- **Tag 2:** Monitoring-Alerts setzen (wenn >100 Req/Sec)

#### Owner
- `@performance-optimizer` Agent
- Leadership: Strategic Planning

---

### 3.2 Infrastruktur — ✅ MANAGED

**Status:** Vercel (US-East), Supabase Frankfurt, Stripe, Upstash Redis (Free-Tier).

#### Was funktioniert
- ✅ Vercel: Automatisches Scaling
- ✅ Supabase: Frankfurt Region (DSGVO-compliant)
- ✅ Upstash Redis: Free-Tier (1GB Memory, us-east-1)

#### Was ist zu tun
- **Redis-Upgrade-Plan** (wenn >50 RPS)
  - Free-Tier: 1GB Memory, 1000 concurrent connections
  - Pro-Tier: 100GB, 10k concurrent, 1M Ops/Sec
  - Trigger: Wenn `REDIS_PING` >200ms

- **Database-Failover** dokumentieren (Supabase)
  - Supabase hat native Backups (daily)
  - Restore-Prozess: Supabase Dashboard → Backups → Restore
  - Dokumentation: Neue Sektion in [PROJEKT.md §11](../../PROJEKT.md#§11-offene-baustellen)

#### Timeline
- **Tag 1:** Upgrade-Plan dokumentieren
- **Tag 1–2:** Failover-Runbook schreiben

#### Owner
- `@deployment-expert`
- Entwickler: Dokumentation

---

### 3.3 CDN & Caching — 🟡 TEILWEISE

**Status:** Vercel CDN läuft. `ab.js` cacht 1h. Build-Assets: 1 Jahr.

#### Was funktioniert
- ✅ Vercel CDN: Automatisch für alle Routes
- ✅ Static Assets: 1 Jahr (fingerprinted)
- ✅ ab.js: 1h Cache mit `must-revalidate`

#### Was ist zu tun
- **ab.js-Release-Strategie**
  - Problem: 1h Propagation-Delay für Updates
  - Lösung: Versioniertes ab.js (`ab.v2.js`, `ab.v3.js`)
  - Client-Side Update-Check: Ist newer Version verfügbar? Warnung anzeigen.

- **Image-Optimization** (for OG, Icons)
  - Bestehend: [ab-tool/app/og/route.ts](../../ab-tool/app/og/route.ts) generiert OG-Images dynamisch
  - Neu: OG-Images cachen (über CDN mit 24h TTL)

#### Timeline
- **Tag 1:** ab.js-Versionierung dokumentieren
- **Tag 2:** Version-Check im Snippet-Code

#### Owner
- Entwickler

---

### 3.4 Database — 🟡 SINGLE-REGION

**Status:** Supabase Frankfurt (kein Replica). Free-Plan: 500 Verbindungen.

#### Was funktioniert
- ✅ Supabase Frankfurt (DSGVO-compliant)
- ✅ Connection-Pooling (built-in, aber nicht konfiguriert)

#### Was ist zu tun
- **Connection-Pool Konfiguration**
  - Supabase Dashboard → Project Settings → Database → Connection Pooler
  - Pool Mode: `transaction` (Standard)
  - Pool Size: 10–20 (für 100 concurrent users)
  - Dokumentation in Supabase-Agent Skill: `/skill vercel:database-pooling`

- **Read-Replica-Plan** (ab >500 Tests/Day)
  - Supabase bietet Read-Replica in gleicher/anderer Region
  - Für Analytics-Queries: Router zu Replica
  - Implementation: `supabaseReplica.from('daily_stats').select(...)`

#### Scaling-Limits
| Metrik | Free-Limit | Impact | Aktion |
|---|---|---|---|
| Connections | 500 | App kann nicht hochfahren wenn >500 | Upgrade zu Pro |
| Storage | 1GB | Tests-Daten (tests, events, daily_stats) | Archive zu S3 |
| Query-Time | 30s Timeout | Long-Running-Queries abgebrochen | Optimize queries |

#### Timeline
- **Tag 1:** Connection-Pool konfigurieren
- **Tag 2–3:** Read-Replica-Plan schreiben
- **Laufend:** Monitoring auf Connection-Count (wenn >400 → Alert)

#### Owner
- `@supabase` Agent
- Entwickler

---

### 3.5 WebSockets vs Polling — 🟡 POLLING OPTIMAL

**Status:** Polling (3s) im Dashboard. Production-ready aber nicht optimiert.

#### Was funktioniert
- ✅ Polling in Dashboard: `GET /api/tests` alle 3s → Client-State vergleichen
- ✅ Keine WebSocket-Overhead

#### Entscheidung: POLLING BLEIBT
- Begründung: Vercel hat native WebSocket-Unterstützung (über Fluid Compute), aber bei <100 concurrent users ist Polling effizienter (weniger Verbindungen)
- Dokumentierung: [PROJEKT.md §12.2](../../PROJEKT.md#122-„new-test"-flow) — „Polling statt WebSockets. Kein SSE/WS nötig für Plugin↔Dashboard-Sync. 3s-Poll reicht."

#### Was ist zu tun
- **Polling-Latency monitoren**
  - Aktuell: Dashboard erkennt neuen Test in ~3s
  - Akzeptabel bis >1000 Tests/Day

---

## 4. UX/Design

**Aktuelle Note:** 🟢 80% | **Ziel:** 90%

### 4.1 Responsive Design — 🟡 GETESTET (aber Mobile-Optimization fehlt)

**Status:** E2E-Tests auf Desktop Chrome. Mobile-Test manuell. Keine Tailwind-Responsive-Breakpoints in Critical-Path dokumentiert.

#### Was funktioniert
- ✅ Tailwind CSS v4: Responsive Prefixes (`sm:`, `md:`, `lg:`)
- ✅ Desktop-Tests in CI ([.github/workflows/e2e.yml:36–39](../../.github/workflows/e2e.yml#L36))

#### Was ist zu tun
- **Mobile E2E-Tests hinzufügen**
  ```ts
  // ab-tool/playwright.config.ts → projects
  {
    name: 'mobile',
    use: {
      ...devices['Pixel 5'], // 393×851
    },
  }
  ```

- **Responsive-Design Audit** (iPhone 12 + iPad)
  - Dashboard Layout: 2-Column auf Desktop → 1-Column auf Mobile
  - Test-Cards: Grid 3 → 1 auf Mobile
  - Setup-Checklist: Horizontal → Vertical auf Mobile

- **Touch-Interactions optimieren**
  - Button-Größe: ≥44×44px (WCAG)
  - Spacing zwischen Buttons: ≥8px
  - Hover-States: Sollten auf Touch-Geräten auch `active` sein

#### Relevante Dateien
- [ab-tool/app/dashboard/page.tsx](../../ab-tool/app/dashboard/page.tsx) — Dashboard Layout
- [ab-tool/tailwind.config.ts](../../ab-tool/tailwind.config.ts) — Tailwind-Konfiguration
- [ab-tool/app/components/TestCard.tsx](../../ab-tool/app/components/TestCard.tsx) — Test-Card Grid

#### Timeline
- **Tag 1:** Mobile-Device testen (manuell: iPhone + iPad)
- **Tag 1–2:** Responsive-Issues sammeln
- **Tag 2:** Mobile E2E-Tests schreiben
- **Tag 2–3:** CSS-Fixes applizieren
- **Tag 3:** Mobile-Tests in CI integrieren

#### Owner
- Entwickler
- `@ui-ux-pro-max` Agent (für Design-Feedback)

---

### 4.2 Accessibility (A11y) — 🟡 BASIS

**Status:** `:focus-visible` auf interaktiven Elementen. ARIA-Labels teilweise. Keine axe-audit in CI.

#### Was funktioniert
- ✅ `:focus-visible` auf Buttons + Inputs
- ✅ Semantic HTML: `<button>`, `<form>`, `<nav>`
- ✅ Alt-Text auf Icons (via Figma-Design)

#### Was ist zu tun
- **axe-core in CI integrieren**
  ```bash
  npm install --save-dev @axe-core/playwright
  ```
  ```ts
  // ab-tool/__tests__/a11y/accessibility.spec.ts (neu)
  import { injectAxe, checkA11y } from 'axe-playwright';
  
  test('Dashboard A11y', async ({ page }) => {
    await page.goto('/dashboard');
    await injectAxe(page);
    await checkA11y(page);
  });
  ```

- **ARIA-Labels audit**
  - `aria-label` auf Icon-Buttons (Three-Dot-Menu, Close, etc.)
  - `aria-live="polite"` auf Error-Messages
  - `aria-disabled` statt `disabled`-Attribut auf Custom-Buttons

- **Color-Contrast audit**
  - Text-on-Background: ≥4.5:1 (WCAG AA)
  - Prüfe: Grau-Text auf Weiß, Dark-Mode Kontraste
  - Tool: [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

- **Keyboard-Navigation testen**
  - `Tab` durch Dashboard → alle focusable Elements erreichbar
  - `Enter` auf Buttons, `Space` auf Checkboxes
  - `Escape` schließt Dialoge

#### Timeline
- **Tag 1:** axe-core Setup + Tests schreiben
- **Tag 1–2:** ARIA-Labels audit + fixes
- **Tag 2:** Color-Contrast audit
- **Tag 2–3:** Keyboard-Navigation testen (manuell)
- **Tag 3:** axe-Tests in CI-Workflow integrieren

#### Owner
- Entwickler
- `@ui-ux-pro-max` Agent (für Accessibility-Guidelines)

---

### 4.3 Error-Handling (UX) — ✅ DIALOG-BASIERT

**Status:** 402-Errors mit Upgrade-Button. Domain-Gate zeigt `not-found`-State.

#### Was funktioniert
- ✅ 402-Paywall: Locked-Card mit Upgrade-Button
- ✅ Domain-Gate: 5-State-Machine (input→saving→checking→not-found→verified)
- ✅ Empty States mit Clear CTAs

#### Was ist zu tun
- **Error-Message Konsistenz**
  - Audit: Alle API-Fehler werden konsistent angezeigt? (Toast vs Dialog vs Page)
  - Standard: Toast für <3s Errors, Dialog für >3s Errors

- **Retry-Logic in UI**
  - Domain-Verify fehlgeschlagen? "Retry"-Button anzeigen
  - Snippet-Check timeout? "Try again"-Button
  - Agent-Run failed? "Start new run"-Button

#### Timeline
- **Tag 1:** Error-Message Audit
- **Tag 2:** Retry-Logic in Components

#### Owner
- Entwickler
- `@ui-ux-pro-max` Agent

---

## 5. Testing

**Aktuelle Note:** 🟡 70% | **Ziel:** 85%

### 5.1 E2E-Tests — ✅ CI-GEBUNDEN

**Status:** 4 Suites im CI (auth, smoke, dashboard, conversion). 2-Retries in CI. Video/Screenshot on-failure.

#### Was funktioniert
- ✅ Playwright Config: [ab-tool/playwright.config.ts](../../ab-tool/playwright.config.ts)
- ✅ 4 E2E Specs: [ab-tool/__tests__/e2e/](../../ab-tool/__tests__/e2e)
  - auth.spec.ts: Signup, Login, Passwort-Reset
  - smoke.spec.ts: Page-Load, 404-Handling
  - dashboard.spec.ts: Dashboard-Navigation, Test-Creation
  - conversion.spec.ts: Conversion-Tracking

- ✅ CI-Integration: [.github/workflows/e2e.yml](../../.github/workflows/e2e.yml)
  - Triggerung: Bei Push auf `main` + Pull-Request
  - Artifacts: Playwright-Report (30 Tage), Test-Results (7 Tage)

#### Was ist zu tun
- **Coverage erweitern** — Kritische Flows nicht getestet
  | Flow | Test-Status | Aktion |
  |---|---|---|
  | Domain-Verification | ❌ | Neue Spec: `domain-verification.spec.ts` |
  | Agent-Run (CRO) | ❌ | Neue Spec: `agent-run.spec.ts` |
  | Stripe-Checkout | ❌ | Neue Spec: `billing.spec.ts` (mit Stripe Test-Mode) |
  | Figma-Plugin Integration | ❌ | Keine Playwright-Tests (Plugin ist Desktop-App) |
  | Multi-Domain | ❌ | Erweitere `dashboard.spec.ts` |

- **Performance-Testing in E2E**
  ```ts
  // ab-tool/__tests__/e2e/performance.spec.ts (neu)
  test('Dashboard Load-Time', async ({ page }) => {
    const start = Date.now();
    await page.goto('/dashboard');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000); // 2s Limit
  });
  ```

- **Visual-Regression Testing** (optional)
  - Tool: Playwright `toHaveScreenshot()`
  - Nur für kritische Components (Overview-Card, TestCard, AgentPanel)

#### Timeline
- **Tag 1–2:** Missing-Tests schreiben (Domain, Agent, Billing)
- **Tag 2:** Performance-Tests schreiben
- **Tag 3:** CI-Workflow erweitern
- **Laufend:** Visual-Regression (später, Priority P3)

#### Owner
- Entwickler
- `@performance-optimizer` (für Performance-Tests)

---

### 5.2 Unit & Integration Tests — 🟡 BASIS

**Status:** `conversion-goal-click.mjs` (11 Tests: Unit + Integration). Keine Jest-Suite für lib/.

#### Was funktioniert
- ✅ Node-Tests: [ab-tool/__tests__/conversion-goal-click.mjs](../../ab-tool/__tests__/conversion-goal-click.mjs)
  - 5 Unit Tests (sendBeacon-Payload, sessionStorage, Key-Isolation, Fetch-Fallback, Error-Grace)
  - 4 Integration Tests (400-Validierung, CORS)
  - 2 CORS-Tests
- ✅ Significance-Test: [ab-tool/__tests__/significance-auto.mjs](../../ab-tool/__tests__/significance-auto.mjs)

#### Was ist zu tun
- **Jest-Suite für lib/** erstellen
  ```bash
  npm install --save-dev jest @types/jest
  ```
  ```ts
  // ab-tool/__tests__/unit/sanitize.test.ts
  import { sanitize, scanPII } from '@/lib/sanitize';
  
  describe('Sanitization', () => {
    test('Removes XSS-Payload', () => {
      expect(sanitize('<img src=x onerror=alert("xss")>')).not.toContain('onerror');
    });
    
    test('Blocks Credit-Card PII', () => {
      const pii = scanPII('4532-1488-0343-6467');
      expect(pii.findings.length).toBeGreaterThan(0);
    });
  });
  ```

- **Coverage-Targets setzen**
  - Ziel: 80% Coverage für `lib/`
  - Tool: Istanbul (`npm run test:coverage`)

- **Integration-Tests für API-Routes**
  ```ts
  // ab-tool/__tests__/integration/api.test.ts
  describe('/api/tests', () => {
    test('POST /api/tests creates test', async () => {
      const res = await fetch('http://localhost:3000/api/tests', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: 'Test', page_url: 'https://example.com' }),
      });
      expect(res.status).toBe(201);
    });
  });
  ```

#### Timeline
- **Tag 1–2:** Jest-Setup + Unit-Tests schreiben (sanitize, pii, auth)
- **Tag 2–3:** Integration-Tests für top-5 API-Routes
- **Tag 3:** Coverage-Report aktivieren
- **Laufend:** Coverage ≥80% vor jedem Merge

#### Owner
- Entwickler

---

### 5.3 Load-Tests — ❌ NICHT VORHANDEN

**[Siehe Stabilität & Performance § 1.1](#11-lasttest---nicht-vorhanden)**

---

## 6. DevOps/Deployment

**Aktuelle Note:** 🟡 75% | **Ziel:** 85%

### 6.1 CI/CD-Pipeline — ✅ MINIMAL

**Status:** `.github/workflows/e2e.yml` — Build + E2E-Tests auf Push/PR. Kein Auto-Deploy (manual `vercel deploy --prod`).

#### Was funktioniert
- ✅ GitHub Actions Workflow: [.github/workflows/e2e.yml](../../.github/workflows/e2e.yml)
  - Triggerung: `push` (main), `pull_request`, `workflow_dispatch`
  - Steps: Checkout → Node Setup → npm ci → Build → E2E Tests → Artifacts Upload

#### Was ist zu tun
- **Auto-Deploy aktivieren** (optional, mit Gating)
  ```yaml
  # .github/workflows/deploy.yml (neu)
  name: Deploy to Production
  on:
    push:
      branches: [main]
      paths:
        - 'ab-tool/**'
        - '!ab-tool/__tests__/**' # Dont deploy on test changes
  
  jobs:
    deploy:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: vercel/action@v5
          with:
            vercel-token: ${{ secrets.VERCEL_TOKEN }}
            vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
            vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
            production: true
  ```

- **Branch-Protection aktivieren** (GitHub)
  - Settings → Branches → main → Protect
  - Require: Status checks (E2E Tests müssen grün sein)
  - Require: Code review (1 Approval vor Merge)

- **Pre-Deployment Checks**
  ```yaml
  - name: Check Build
    run: npm run build
  
  - name: Check Tests
    run: npm run test:ci
  
  - name: Lighthouse Performance
    run: npm install -g @lhci/cli@0.8.x && lhci autorun
  ```

#### Timeline
- **Tag 1:** Deploy-Workflow schreiben
- **Tag 1:** Branch-Protection aktivieren
- **Tag 2:** Pre-Deployment Checks hinzufügen

#### Owner
- `@deployment-expert`
- Entwickler: Configuration

---

### 6.2 Monitoring & Logging — 🟡 BASIC

**[Siehe Stabilität & Performance § 1.2 & 1.5](#12-fehlerbehandlung---strukturiert-aber-monitoring-fehlend)**

---

### 6.3 Disaster Recovery — ❌ NICHT DOKUMENTIERT

**Status:** Kein Backup-Plan, kein Rollback-Strategie dokumentiert.

#### Was ist zu tun
- **Incident-Runbook schreiben** (für häufige Szenarien)
  ```markdown
  # Incident Runbook — variante
  
  ## Szenario: Database-Outage
  - Symptom: `500 Internal Server Error` auf allen Routes
  - Diagnose: Supabase Dashboard → Health Check
  - Recovery: Supabase Backups → Restore to Point-in-Time
  - Kommunikation: Status-Page Update + Email an Pro-Users
  - RTO (Recovery Time Objective): 15 min
  - RPO (Recovery Point Objective): 1 hour
  
  ## Szenario: Code-Deployment-Failure
  - Symptom: Build failed, Deploy rolled back automatically
  - Diagnose: GitHub Actions → Logs oder Vercel Deployments
  - Recovery: `vercel rollback --prod` (manual)
  - Prevention: Pre-Deployment Tests + Code Review
  
  ## Szenario: API-Rate-Limiting
  - Symptom: Requests blockt mit 429 Too Many Requests
  - Diagnose: Upstash Redis Dashboard
  - Recovery: Manuell Rate-Limit erhöhen (temporär)
  - Prevention: Capacity-Planning + Load-Tests
  ```

- **Backup-Strategy**
  - Database: Supabase daily backup (built-in, 30-Tage Retention)
  - Code: GitHub (full repository history)
  - Assets: Vercel CDN + GitHub (redundant)
  - Test-Data: Supabase backup (recoverable)

- **Rollback-Prozess**
  ```bash
  # Vercel Rollback (Production)
  vercel deployments list --prod
  vercel rollback <deployment-id> --prod
  
  # Database Rollback (Point-in-Time)
  # Supabase Dashboard → Backups → Restore
  ```

- **Status-Page** (optional, für Pro-Users)
  - Hosting: `status.getvariante.com` (via Statuspage.io oder Self-Hosted)
  - Updates: Automatisch beim Incident via API

#### Timeline
- **Tag 1:** Incident-Runbook schreiben
- **Tag 1–2:** Backup-Strategy dokumentieren
- **Tag 2:** Rollback-Process testen (manuell)
- **Tag 3:** Status-Page Setup (optional)

#### Owner
- `@deployment-expert`
- Entwickler: Testing

---

### 6.4 Environment Management — ✅ VERCEL-NATIVE

**Status:** Env-Vars in Vercel Dashboard. `vercel env pull` dokumentiert.

#### Was funktioniert
- ✅ Vercel Environment Variables
  - Production: Database-URL, API-Keys (OpenAI, Stripe, Resend)
  - Preview: Same (für E2E-Tests)
  - Local: `.env.local` (gitignored)

#### Was ist zu tun
- **Secrets Rotation-Plan** (für API-Keys)
  - OpenAI: Quarterly rotation
  - Stripe: Auto-rotated by Stripe
  - Resend: Quarterly rotation
  - Supabase: Annual rotation (Service Role Key)
  - Dokumentation: [PROJEKT.md §11](../../PROJEKT.md#§11-offene-baustellen) → Neue Zeile

- **Environment-Parity prüfen**
  - Lokale `.env.local` vs Vercel Production → sollten identisch sein
  - Tool: `vercel env pull` nach `env.local` schreiben, dann `diff` mit Vercel

#### Timeline
- **Tag 1:** Secrets Rotation-Plan dokumentieren
- **Laufend:** Quarterly Audits

#### Owner
- `@deployment-expert`
- Entwickler: Key-Rotation

---

## 7. Dokumentation

**Aktuelle Note:** 🟢 85% | **Ziel:** 90%

### 7.1 PROJEKT.md — ✅ AKTUELL

**Status:** Single Source of Truth. §1–12 komplett. Letzter Update 15.07.2026.

#### Was funktioniert
- ✅ §1 Identität (Produkt, ICP, Phase, Stack)
- ✅ §2 Stack (Next.js, Supabase, Stripe, OpenAI)
- ✅ §3 Struktur (API-Routes, Components, Migrations)
- ✅ §4 Deployment (Vercel, Supabase, Git)
- ✅ §5 Pricing (Free, Pro, Agency)
- ✅ §6 Plattform-Support
- ✅ §7 Security
- ✅ §8 Historie (Letzte 50 Einträge)
- ✅ §9 Selbstprüfung (Checklist vor Push)
- ✅ §10 Roadmap (Meilensteine, Nordstern)
- ✅ §11 Offene Baustellen (3 Items)
- ✅ §12 Dashboard-Architektur

#### Was ist zu tun
- **§11 aktualisieren** — Nach Roadmap-Completion
  - Neue Zeilen hinzufügen, wenn neue Baustellen entstehen

---

### 7.2 GOTOMARKET.md — ✅ STRATEGISCH

**Status:** Channels, CTAs, Cold-DM-Template, Outreach-Phase live.

#### Was funktioniert
- ✅ Strategie zusammengefasst (Figma-Community = Burggraben)
- ✅ First-10-User-Playbook
- ✅ Cold-DM-Template (Loom-basiert)
- ✅ Distribution-Channels (6 Kanäle, Dual-Track)
- ✅ Phasen (Phase 0–4 dokumentiert)

#### Was ist zu tun
- **Phasen-Updates** — Nach Launch
  - Phase 1 (Pre-Launch) → Phase 2 (Soft-Launch) → Phase 3 (Hard-Launch)
  - Nach Product Hunt: Gewonnene Insights dokumentieren

---

### 7.3 API-Dokumentation — 🟡 INLINE

**Status:** Zod-Schemas in Code. Keine OpenAPI/Swagger.

#### Was ist zu tun
- **OpenAPI-Schema generieren** (siehe [Sicherheit § 2.3](#23-input-validierung---✅-zod-basiert))
  ```bash
  npm install zod-to-openapi
  ```
  - Output: `/public/openapi.json`
  - Integration-Partner können Schema konsumieren
  - API-Docs live auf `/api-docs` (via Swagger UI)

#### Timeline
- **Tag 1–2:** OpenAPI-Generation (siehe § 2.3)

---

### 7.4 Database-Schema — ✅ MIGRATIONEN

**Status:** 20 SQL-Files (001–020) mit klarem Intent.

#### Was funktioniert
- ✅ Migrations: [db/migrations/](../../db/migrations)
  - 001_schema.sql: Initial setup
  - 002–020: Features, Compliance, Optimization

#### Was ist zu tun
- **Schema-Dokumentation** (ER-Diagram)
  - Tool: dbdiagram.io oder Mermaid
  - Output: `docs/DATABASE_SCHEMA.md` mit Diagram

- **Migration-Testing**
  - Jede neue Migration: Lokal testen auf fresh DB
  - Idempotency-Check: Migration 2×ausführen sollte gleich sein

#### Timeline
- **Tag 1–2:** ER-Diagram erstellen
- **Laufend:** Vor jeder neuen Migration: Testing

---

### 7.5 Runbooks — ❌ FEHLEND

**[Siehe DevOps § 6.3](#63-disaster-recovery---nicht-dokumentiert)**

---

## 8. Support & Feedback

**Aktuelle Note:** 🟡 60% | **Ziel:** 75%

### 8.1 Error-Tracking — ❌ FEHLEND

**[Siehe Stabilität & Performance § 1.2](#12-fehlerbehandlung---strukturiert-aber-monitoring-fehlend)**

---

### 8.2 User-Support — ❌ MINIMAL

**Status:** Email: `hello@getvariante.com`. Kein Ticketing (Zendesk/Intercom).

#### Was ist zu tun
- **Intercom oder Zendesk Setup** (für In-App Chat + Ticketing)
  - Empfehlung: Intercom (Startup-Plan $99/Monat)
  - Features: In-App-Chat, Email-Ticketing, Knowledge-Base, Automation

  ```ts
  // ab-tool/app/layout.tsx (Root-Layout)
  <script>
    window.intercomSettings = {{
      api_base: "https://api-iam.intercom.io",
      app_id: process.env.NEXT_PUBLIC_INTERCOM_APP_ID,
      user_id: userId,
      email: userEmail,
    }};
  </script>
  <script async src="https://widget.intercom.io/widget/XXXXX"></script>
  ```

- **Email-Support-Workflow**
  - Alle Support-Emails @ `hello@getvariante.com`
  - Zu beantwortet innerhalb 24h
  - Prozess: Email → Reply + Ticket-Nummer → Follow-Up in Intercom

#### Timeline
- **Tag 1:** Intercom/Zendesk Plan auswählen
- **Tag 1–2:** Integration in Root-Layout
- **Tag 2:** Support-Email-Forwarding zu Intercom
- **Laufend:** Response-Time SLA: 24h

#### Owner
- Leadership (Tool-Auswahl)
- Entwickler: Integration

---

### 8.3 Analytics — 🟡 VERCEL-BASIC

**Status:** Core Web Vitals + Sessions. Kein Custom-Events.

#### Was funktioniert
- ✅ Vercel Analytics: `https://vercel.com/dashboard` → Project Analytics
  - Core Web Vitals (LCP, CLS, FID)
  - User Sessions, Bounce-Rate
  - Page Load Performance

#### Was ist zu tun
- **Custom-Events für Product Insights**
  - Events zu tracken:
    | Event | Trigger | Ziel |
    |---|---|---|
    | `signup` | New user registered | Signup-Funnel |
    | `first_test_created` | User erstellt ersten Test | Activation |
    | `test_paused` | Test paused | Churn-Signal |
    | `upgrade_to_pro` | Checkout complete | Revenue |
    | `domain_verified` | Domain verification success | Onboarding-Success |
    | `agent_run_started` | CRO-Agent startet | Feature-Adoption |

  ```ts
  // ab-tool/lib/analytics.ts (neu)
  export function trackEvent(eventName: string, data?: Record<string, any>) {
    if (typeof window !== 'undefined') {
      navigator.sendBeacon('/api/analytics', JSON.stringify({ event: eventName, data }));
    }
  }
  
  // ab-tool/app/api/analytics/route.ts (neu)
  export async function POST(req: Request) {
    const { event, data } = await req.json();
    await supabase.from('analytics_events').insert({ event, data });
    return Response.json({ ok: true });
  }
  ```

- **Dashboard für Product Metrics** (in Grafana oder Metabase)
  - DAU/MAU Trends
  - Signup-Funnel
  - Upgrade-Conversion-Rate
  - Feature-Adoption (Agent-Runs, Domain-Verifications)

#### Timeline
- **Tag 1–2:** Custom-Analytics-API bauen
- **Tag 2:** Events in kritischen User-Flows triggern
- **Tag 3:** Grafana-Dashboard Setup (oder external analytics tool)

#### Owner
- Entwickler
- Product/Analytics Lead

---

### 8.4 Community & Feedback — 🟡 EARLY

**Status:** 1 organischer User. 1 Design-Partner angefragt. Kein systematisches Feedback-Tool.

#### Was ist zu tun
- **Feedback-Loop etablieren**
  - Intercom: "How are we doing?" Surveys (quarterly)
  - Figma Community: Plugin-Reviews beantworten (weekly)
  - Design-Partner: Monthly Sync-Call + Feedback-Form

- **Feature-Request-Board**
  - Tool: GitHub Discussions oder Canny
  - Prozess: User submits idea → Community votes → Decide

#### Timeline
- **Tag 1:** Intercom-Surveys Setup
- **Tag 1:** Figma-Community-Monitoring starten
- **Tag 2–3:** Feature-Board Setup

#### Owner
- Product Manager
- Entwickler: Integration

---

## Deployment Checklist

**Vor Product Hunt Launch (Soft-Launch mit 500–1000 Users)**

### Pre-Launch (Tag 1–3)
- [ ] **Sentry Error-Tracking** live (§ 1.2)
  - [ ] Sentry Project angelegt
  - [ ] `SENTRY_DSN` in Vercel Production
  - [ ] Error-Budgets definiert
  - [ ] 1h Response-SLA dokumentiert

- [ ] **Mobile E2E-Tests** grün (§ 4.1)
  - [ ] `playwright test --project=mobile` läuft lokal
  - [ ] Critical Issues fixed (Responsive Layout)
  - [ ] Tests in CI-Workflow integriert

- [ ] **k6 Loadtest** durchgeführt (§ 1.1)
  - [ ] k6 Script geschrieben
  - [ ] 10k concurrent users getestet
  - [ ] >80 RPS ohne Fehler
  - [ ] Baseline in PROJEKT.md dokumentiert

- [ ] **Database Connection-Pool** konfiguriert (§ 3.4)
  - [ ] Supabase Pooler aktiviert
  - [ ] Pool-Size: 10–20
  - [ ] Test: 100 concurrent connections

- [ ] **Incident-Runbook** geschrieben (§ 6.3)
  - [ ] 3 Szenarien dokumentiert (DB, Code, Rate-Limit)
  - [ ] Rollback-Prozess getestet
  - [ ] Responder-Kontakte notiert

### Launch-Tag (Tag 3–4)
- [ ] **Sentry Dashboard** monitoren
  - [ ] Alerts > 5% Error-Rate ✅
  - [ ] Alert-Channels: Slack + Email ✅

- [ ] **Performance Monitor** aktiv
  - [ ] Core Web Vitals in Vercel Analytics
  - [ ] p95 Latency < 2s
  - [ ] Database Query Latency < 100ms

- [ ] **Uptime Monitoring** aktiviert
  - [ ] Uptime-Monitor für `getvariante.com` (UptimeRobot oder ähnlich)
  - [ ] Alerts auf Slack/Email

- [ ] **Public Status-Page** (optional)
  - [ ] Status-Page URL: `status.getvariante.com`
  - [ ] Automatische Incident-Updates

### Post-Launch (Tag 5–14)
- [ ] **Error-Budget Review**
  - [ ] Sentry Dashboard: Pro-Tier Errors-Check
  - [ ] Action Items: Top-5 Errors analysieren + beheben

- [ ] **User-Support System** live (§ 8.2)
  - [ ] Intercom oder Zendesk angelegt
  - [ ] Support-Email-Forwarding aktiv
  - [ ] Response-SLA: 24h dokumentiert

- [ ] **Analytics-Events** verifizieren (§ 8.3)
  - [ ] `signup`, `first_test_created`, `upgrade_to_pro` Events tracked
  - [ ] Grafana-Dashboard zeigt Trends

- [ ] **First Design-Partner Onboarding** (§ 10 GOTOMARKET)
  - [ ] Design-Partner assigned
  - [ ] Loom-DM + erster kostenloser Test Setup
  - [ ] Weekly Sync-Calls geplant

---

## Risiko-Matrix

### Kritische Risiken (müssen vor Launch gelöst sein)

| Risiko | Szenario | Wahrscheinlichkeit | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| **Database-Outage** | Supabase-Region offline, 1000 Tests ❌ | Mittel (5%) | Kritisch (400k€ Umsatz-Ausfallrisiko) | Daily Backups, Failover-Plan, RTO 15min | `@supabase` |
| **OpenAI API-Quota** | API-Limit überschritten, `/api/generate` 429 | Hoch (20%) | Hoch (User können nicht generieren) | OpenAI-Quota erhöhen (Tag 1), Cost-Tracking aktiviert | Entwickler |
| **Mobile-Crash** | iOS/Android-Nutzer sehen leeres Dashboard | Mittel (10%) | Hoch (Product Hunt-Downvotes) | Mobile E2E-Tests in CI, Device-Testing | Entwickler |
| **Stripe-Webhook-Failure** | Pro-Upgrade hängt fest, User zahlt aber ist noch Free | Niedrig (2%) | Mittel (Refund-Requests) | Webhook-Retry-Logic + Monitoring | `@stripe` |

### Mittlere Risiken (sollten bis Launch gelöst sein)

| Risiko | Szenario | Wahrscheinlichkeit | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| **Error-Rate >5%** | 50+ User-Fehler pro Stunde, Reputation-Schaden | Mittel (15%) | Mittel (Bad Reviews) | Sentry + Error-Budgets + 1h Response-SLA | Entwickler |
| **Slow API-Responses** | Dashboard lädt >3s, User verliert Geduld | Hoch (25%) | Mittel (Low Session-Duration) | Caching + Database-Optimization + Loadtests | `@performance-optimizer` |
| **DDoS/Spam-Bots** | `/api/resolve` überlastet durch Bots | Niedrig (3%) | Mittel (Legitimate-Requests blockiert) | Rate-Limiting + WAF (Vercel DDoS-Protection) | `@deployment-expert` |

### Niedrige Risiken (können post-Launch gelöst werden)

| Risiko | Szenario | Wahrscheinlichkeit | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| **Accessibility-Failures** | WCAG-Audit zeigt 20+ Issues | Niedrig (5%) | Niedrig (Spätere Fixes) | axe-core in CI, Quarterly Audits | Entwickler |
| **Documentation-Gaps** | New Dev kann Codebase nicht verstehen | Mittel (20%) | Niedrig (Später onboarden) | PROJEKT.md + Inline-Comments | Entwickler |

---

## Timeline Übersicht

```
                   JETZT              TAG 3              TAG 14
                   ↓                   ↓                  ↓
                 15.07          Soft-Launch       Post-Launch
                 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    Kritisch:    [Sentry]  [Mobile]  [Loadtest]  [Incident-Plan]
    
    Wichtig:     [Caching] [axe-core]  [API-Docs]   [Analytics]
                 [API-Validation]   [User-Support]
    
    Optional:    [Runbook] [ER-Diagram]  [Status-Page]
```

---

## Kontakt & Eskalation

| Thema | Verantwortlich | Kontakt | SLA |
|---|---|---|---|
| **Kritische Bugs** | Entwickler-On-Call | Slack #incidents | 1h |
| **Performance-Issues** | `@performance-optimizer` | Slack #perf | 2h |
| **Database-Issues** | `@supabase` Agent | Supabase Dashboard | 2h |
| **Deployment-Failures** | `@deployment-expert` | GitHub Actions | 1h |
| **User-Support** | Support-Team (Intercom) | Intercom | 24h |
| **Security-Vulns** | Entwickler + Leadership | Email `security@` | 1h |

---

## Glossar & Akronyme

| Akronym | Erklärung | Referenz |
|---|---|---|
| **RTO** | Recovery Time Objective | Ziel-Wiederherstellungszeit |
| **RPO** | Recovery Point Objective | Ziel-Datenverlustzeitpunkt |
| **SLA** | Service Level Agreement | Uptime/Response-Time-Versprechen |
| **P95** | 95. Perzentile Latenz | 95% der Requests schneller als Wert |
| **RPS** | Requests Per Second | Durchsatz-Metrik |
| **PII** | Personally Identifiable Information | Datenschutz-kritische Daten |
| **SSRF** | Server-Side Request Forgery | Sicherheits-Attacke-Typ |
| **DSGVO/GDPR** | Datenschutz-Grundverordnung | EU-Compliance |
| **WCAG** | Web Content Accessibility Guidelines | A11y-Standard |
| **CSP** | Content Security Policy | Security-Header |
| **CORS** | Cross-Origin Resource Sharing | Browser-Security |
| **JWT** | JSON Web Token | Auth-Mechanismus |
| **RLS** | Row-Level Security | Datenbank-Zugriffsschutz |

---

**Letzte Aktualisierung:** 15.07.2026 · **Nächste Review:** Nach Product Hunt Launch  
**Status:** KI-optimiert für Agent-Nutzung · **Format:** Markdown mit Code-Referenzen

