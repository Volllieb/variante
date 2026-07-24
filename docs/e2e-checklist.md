# E2E-Test-Checkliste — variante

> Stand: 24.07.2026. Kompletten Loop testen: Landing → Account → Figma → Snippet (inkl. Picker) → Traffic → Conversions → Billing → Winner.
>
> **Vor dem Start:** `npm run test:smoke` (Playwright) oder Smoke-Tests unten manuell.
>
> **Automatisierte E2E-Tests:** `ab-tool/__tests__/e2e/` (Playwright, 89 Tests über 9 Specs) + `ab-tool/__tests__/` (Node).
> CI: `.github/workflows/e2e.yml` läuft bei Push/PR auf `master` (seit 23.07.2026).

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

> 🤖 **Automatisiert via Playwright** — `npm run test:smoke` / `__tests__/e2e/smoke.spec.ts`

- [x] **Pricing** — Free (0 €, 1 Experiment, Badge an) vs Pro (35 €/mo, unbegrenzt, kein Badge), "Most popular"-Badge auf Pro
- [x] **Footer** — "Made in Bavaria", Privacy, Imprint, © 2026
- [x] **Badge-Demo** — "A/B by Variante"-Floating-Badge unten rechts, klickbar → `/signup`
- [x] **CTA-Buttons** — Mindestens 1 Link auf `/signup`
- [x] **Security-Header** — API: X-Content-Type-Options, Pages: X-Frame-Options
- [x] **Assets** — /ab.js (200 + text/javascript), /sitemap.xml, /robots.txt
- [x] **API CORS** — OPTIONS /api/resolve → CORS-Header


## Phase 2: Auth

> 🤖 **Automatisiert via Playwright** — `npm run test:auth` / `__tests__/e2e/auth.spec.ts`

### Signup
- [x] **Formular-Validierung** — Leeres Formular → Fehler (HTML5 + Server)
- [x] **email===password-Check** asymmetrisch → jetzt `norm(email) === norm(password)` (09.07.2026)
- [x] **Source-Tracking persistiert** — Migration 014: `profiles.signup_source` + `signup_plan`, Auth-Callback speichert first-touch (09.07.2026)
- [x] **Google OAuth-Button** sichtbar auf Signup- und Login-Seite
- [x] **"Forgot password?"-Link** sichtbar auf Login-Seite → preserved source/plan in URL
- [x] **Redirect Guards** — /dashboard, /results/<id> ohne Auth → /login
- [ ] "Forgot password?" → Email eingeben → Reset-Link per Email (manuell, braucht E2E_TEST_EMAIL)
- [ ] Reset-Link klicken → `/update-password` → Neues Passwort setzen → Redirect `/dashboard` (manuell)

### Auth-Bugs gefixt (09.07.2026)
| Bug | File | Fix |
|---|---|---|
| `source`/`plan` gingen bei Resend-Confirmation verloren | `signup/page.tsx` | `qsR` wird jetzt an `emailRedirectTo` gehängt |
| `source`/`plan` gingen bei Google OAuth Signup/Login verloren | `signup/page.tsx`, `login/page.tsx` | `qsG` wird jetzt an `redirectTo` gehängt |
| `source`/`plan` gingen beim Forgot-Password verloren | `login/page.tsx` | Source/Plan werden jetzt in `resetPasswordForEmail` redirectTo preserved |
| `source`/`plan`-Forwarding nach Password-Reset | `update-password/page.tsx` | Liest `useSearchParams()` und forwarded source/plan zum Dashboard |
| `email===password`-Check nur halb normalisiert | `signup/page.tsx` | `norm(email) === norm(password)` statt `norm(email) === password` |




---

## Phase 9: Conversions

> 🤖 **Automatisiert getestet via Node + Playwright**
> `node __tests__/conversion-goal-click.mjs` + `npm run test:conversion` / `__tests__/e2e/conversion.spec.ts`

- [x] **Goal klicken** — Klick auf Goal-Element → `sendBeacon` zu `/api/event` (Unit-Test A1)
- [x] **`/api/event` 200** — POST mit `testId`, `variant`, `event=conversion` (Unit-Test A1)
- [x] **sessionStorage-Dedup** — Zweiter Klick: `ab_conv_<test_id>` verhindert Doppel-Call (Unit-Test A2)
- [x] **Validation** — 400 bei fehlender testId, falschem event, ungültiger UUID, variant=C
- [x] **CORS** — OPTIONS /api/event → 204, POST-Antwort hat CORS-Header
- [x] **Pausierter Test** — `status=paused`: `/api/event` → 409, kein Counter (Server-Guard geprüft)
- [x] **Blob-Payload** — text/plain (CORS-safelisted), korrektes JSON-Format
- [x] **Fallback fetch()** — Wenn sendBeacon nicht verfügbar
- [x] **Storage-Error-Graceful** — setItem wirft → fängt, sendet trotzdem
- [ ] **Dashboard aktualisieren** — Reload → Conversions gestiegen (manuell / braucht echten Test)

## Phase 10: Results & Analyse

> 🤖 **Teilautomatisiert via Playwright** — `npm run test:dashboard` / `__tests__/e2e/dashboard.spec.ts`

- [x] **Dashboard-Seite lädt** — Auth-Guard funktioniert, redirect ohne Login
- [x] **Test-Kachel vorhanden** — ODER Empty-State wenn keine Tests
- [x] **Kachel klicken** → `/results/<id>` (wenn Tests vorhanden)
- [x] **API-Endpunkte Auth-Guards** — /api/events, /api/analytics, /api/domains, /api/profile, /api/results/export, /api/token/regenerate alle → 401 ohne Auth
- [x] **Cron-Guards** — /api/cron/check-winners + /api/cron/snapshot-stats → 401 ohne Secret
- [x] **Logout funktioniert** — Redirect zu / oder /login
- [ ] **Preview-iframes** — A + B nebeneinander mit Site-CSS (braucht echten Test)
- [ ] **Auto-Refresh** — Pollt alle 5s, Zahlen aktualisieren sich live (manuell)


## Phase 12: Winner-Mechanismus


## Phase 13: Neue Features

> 🤖 **Auth-Guards automatisiert** — `npm run test:dashboard` / `__tests__/e2e/dashboard.spec.ts`

- [x] **Activity Log** (`/api/events`) — GET → 401 ohne Auth (Guard geprüft)
- [x] **Analytics-API** (`/api/analytics/[testId]`) — GET → 401 ohne Auth (Guard geprüft)
- [x] **Domain-Management** (`/api/domains`) — GET → 401 ohne Auth (Guard geprüft)
- [x] **Profile-API** (`/api/profile`) — GET → 401 ohne Auth (Guard geprüft)
- [x] **CSV-Export** (`/api/results/export`) — GET → 401 ohne Auth (Guard geprüft)
- [x] **Token-Regeneration** (`/api/token/regenerate`) — POST → 401 ohne Auth (Guard geprüft)
- [x] **Cron: Winner-Check** (`/api/cron/check-winners`) — POST ohne Secret → 401
- [x] **Cron: Stats-Snapshot** (`/api/cron/snapshot-stats`) — POST ohne Secret → 401
- [ ] **Activity Log Content** — GET liefert Event-Historie (manuell, braucht Login + Test)
- [ ] **Analytics-API Content** — GET liefert Daily-Stats-Zeitreihe (manuell)
- [ ] **Domain CRUD** — Create/Update/Delete + Verification (manuell)
- [ ] **Profile PATCH** — `notify_on_winner`-Flag setzen (manuell)
- [ ] **CSV-Export Content** — Korrektes CSV-Format (manuell)
- [ ] **Token-Regeneration** — POST erzeugt neuen Token (manuell)
- [ ] **Cron: Winner Erkennung** — Winner-Erkennung + Resend-Email (manuell)
- [ ] **Cron: Stats Snapshot** — Täglicher Stats-Snapshot (manuell)

---

## Phase 14: Privacy & DSGVO

> 🤖 **Teilautomatisiert via Playwright** — `npm run test:smoke`

- [x] **Imprint** — `/imprint` lädt (Page-Test) (automatisiert)
- [x] **Privacy** — `/privacy` lädt (Page-Test) (automatisiert)
- [ ] **Kein CDN/Drittanbieter** — Network-Tab auf Landing Page: Nur `getvariante.com` + `supabase.co` + `openai.com` (bei Gen) (manuell)
