# E2E-Test-Checkliste — variante

> Stand: 06.07.2026 · Automatische Code-Analyse abgeschlossen.
> ✅ = per Code-Review verifiziert · 🔴 = manuell/visuell zu testen

---

## 1. Badge-Demo

| # | Testfall | Status |
|---|---|---|
| 1.1 | Dogfood-Test im Dashboard reaktivieren (Status → active) | 🔴 |
| 1.2 | Landingpage `getvariante.com` neu laden — Badge "A/B by Variante" erscheint unten rechts | 🔴 |
| 1.3 | Badge klicken → Weiterleitung auf `/signup` | 🔴 |

**Code verifiziert:** `ab.js` `showBadge()`, `resolve/route.ts` Badge-Logik, Hardcoded-Fallback ✅

---

## 2. Signup Edge Cases

| # | Testfall | Erwartung |
|---|---|---|
| 2.1 | E-Mail: `abc` (kein @) | Browser-native Validation blockiert |
| 2.2 | E-Mail: `a@b` (ungültig) | Browser-native Validation blockiert |
| 2.3 | Passwort: leer | Browser-native Validation (`required`) |
| 2.4 | Passwort: `< 6 Zeichen` | Browser-native Validation (`minLength=6`) |
| 2.5 | Passwort: identisch mit E-Mail | Client-Validierung: Fehlermeldung |
| 2.6 | Bereits registrierte E-Mail | Info-Box: "Bereits registriert" + Login-Link + Resend-Button |
| 2.7 | Neue E-Mail, korrektes Passwort | Info: "Almost there — confirm your email" |
| 2.8 | Resend Confirmation klicken | Erfolgsmeldung "Bestätigungslink erneut gesendet" |
| 2.9 | Google OAuth Signup | Weiterleitung zu Google → zurück zu `/onboarding` |
| 2.10 | Google-Account bereits verknüpft | Spezifische Fehlermeldung (Identity-Conflict) |
| 2.11 | Double-Click auf "Sign up" | Button disabled während `loading` |
| 2.12 | Bereits eingeloggt → `/signup` aufrufen | Redirect zu `/dashboard` |

**Code verifiziert:** `signup/page.tsx` alle Guards, Google-OAuth-Error-Mapping ✅

---

## 3. Source-Tracking

| # | Testfall | Erwartung |
|---|---|---|
| 3.1 | `/signup?source=figma-plugin` → Signup durchlaufen | Onboarding zeigt: "You came from Figma — you're in the right place." |
| 3.2 | `/signup?source=figma-plugin` → Google OAuth | `redirectTo` enthält `?source=figma-plugin` |
| 3.3 | `/signup` ohne Source | Onboarding zeigt generische Welcome-Message |

**Code verifiziert:** `signupSource()`, `nextPath`-Konstruktion, `OnboardingClient`-Conditional ✅

---

## 4. URL-Hash-Modi (Chrome Extension)

| # | Testfall | Erwartung |
|---|---|---|
| 4.1 | `https://fremdseite.de#ab_pick=<testId>` in Chrome öffnen | Element-Picker startet automatisch (kein Popup nötig) |
| 4.2 | `https://fremdseite.de#ab_goal=<testId>` in Chrome öffnen | Goal-Modus startet automatisch |
| 4.3 | `#ab_api=<url>&ab_token=<token>` als Zusatz-Parameter | Werden in `storage.local` gespeichert |
| 4.4 | Tab reload ohne Hash-Parameter | Kein erneuter Auto-Start (`__abInjectedTabs` Guard) |

**Code verifiziert:** `background.js` `parseAbParams()`, Auto-Injection, Tab-Dedup ✅

---

## 5. Goal-Picker (via Popup / Hash)

| # | Testfall | Erwartung |
|---|---|---|
| 5.1 | Popup öffnen → Test-ID eingeben → Start | Picker startet mit Banner "Click element" |
| 5.2 | Goal-Modus: `#ab_goal=<testId>` | Picker startet mit Banner "Click goal element" |
| 5.3 | Button/Link anklicken | Overlay "Goal saved" erscheint |
| 5.4 | Im Dashboard prüfen: Goal gespeichert? | `PATCH /api/tests/<id>` hat `goal` gesetzt |
| 5.5 | ESC drücken während Picker aktiv | Picker bricht ab, Highlight entfernt |

**Code verifiziert:** `content-picker.js` Goal-Mode-Flow, `PATCH`-Handler in `tests/[id]/route.ts` ✅

---

## 6. Conversions (Phase 9)

| # | Testfall | Erwartung |
|---|---|---|
| 6.1 | Test aktiv → Seite mit ab.js laden | Variante A oder B wird zugewiesen |
| 6.2 | Goal-Element klicken (Conversion auslösen) | `POST /api/event` wird gefeuert |
| 6.3 | Gleiches Element nochmal klicken | Kein zweites Event (`sessionStorage`-Dedup) |
| 6.4 | Conversions in DB prüfen | `conversions_a` oder `conversions_b` inkrementiert |
| 6.5 | Test pausieren → Conversion klicken | 409 "test is not active" |
| 6.6 | Test auf done setzen → Conversion klicken | 409 "test is not active" |

**Code verifiziert:** `event/route.ts`, `ab.js` Delegation + sendBeacon, sessionStorage-Dedup ✅

---

## 7. Winner-Mechanismus (Phase 12)

| # | Testfall | Erwartung |
|---|---|---|
| 7.1 | Conversions simulieren (A: 100/10, B: 100/20) | `calcSignificance` > 0.95, Uplift > 5% → `winner: 'B'` |
| 7.2 | Conversions simulieren (A: 100/20, B: 100/10) | `crB ≤ crA` → `winner: 'A'` |
| 7.3 | < 100 Visitors gesamt | Kein Winner (`null`) |
| 7.4 | `POST /api/cron/check-winners` mit `CRON_SECRET` | Winner wird erkannt + persistiert |
| 7.5 | `notify_on_winner: true` + `RESEND_API_KEY` gesetzt | E-Mail wird versendet |
| 7.6 | `POST /api/cron/snapshot-stats` mit `CRON_SECRET` | Daily-Stats werden gesnapshotet |

**Code verifiziert:** `significance.ts`, `event/route.ts` Winner-Detection, `cron/check-winners`, `cron/snapshot-stats` ✅

---

## 8. API-Endpoints (Phase 13) — curl-Tests

```bash
TOKEN="<dein-api-token>"
BASE="https://www.getvariante.com"

# Activity Log
curl -s "$BASE/api/events" -H "Authorization: Bearer $TOKEN" | jq

# Analytics (Pro-gated — erwartet 402 bei Free)
curl -s "$BASE/api/analytics/<testId>" -H "Authorization: Bearer $TOKEN" | jq

# Domains CRUD
curl -s "$BASE/api/domains" -H "Authorization: Bearer $TOKEN" | jq
curl -s -X POST "$BASE/api/domains" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"url":"example.com"}' | jq
curl -s -X DELETE "$BASE/api/domains?id=<domainId>" -H "Authorization: Bearer $TOKEN" | jq

# Domain Verification
curl -s -X POST "$BASE/api/domains/verify" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"domainId":"<domainId>"}' | jq

# Profile
curl -s "$BASE/api/profile" -H "Authorization: Bearer $TOKEN" | jq
curl -s -X PATCH "$BASE/api/profile" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"notify_on_winner":true}' | jq

# CSV Export
curl -s "$BASE/api/results/export?format=csv" -H "Authorization: Bearer $TOKEN"

# Token Regeneration
curl -s -X POST "$BASE/api/token/regenerate" -H "Authorization: Bearer $TOKEN" | jq

# Cron (mit Secret)
curl -s -X POST "$BASE/api/cron/check-winners" \
  -H "Authorization: Bearer $CRON_SECRET" | jq
curl -s -X POST "$BASE/api/cron/snapshot-stats" \
  -H "Authorization: Bearer $CRON_SECRET" | jq
```

| # | Testfall | Erwartung |
|---|---|---|
| 8.1 | `GET /api/events` | Array `events[]` mit Typ/Message/Timestamp |
| 8.2 | `GET /api/analytics/<testId>` (Pro) | `daily[]` Zeitreihe + `current` Snapshot |
| 8.3 | `GET /api/analytics/<testId>` (Free) | 402 + `{ upgrade: true }` |
| 8.4 | `POST /api/domains` | 201 + Domain-Objekt |
| 8.5 | `POST /api/domains` (Duplicate) | 409 "domain already exists" |
| 8.6 | `POST /api/domains` (localhost) | 400 "invalid domain" (SSRF-Schutz) |
| 8.7 | `POST /api/domains/verify` | `{ verified: true/false }` |
| 8.8 | `GET /api/profile` | `{ plan, onboarded, notify_on_winner, ... }` |
| 8.9 | `PATCH /api/profile` | `{ ok: true }` |
| 8.10 | `GET /api/results/export?format=csv` | CSV-Download mit Header |
| 8.11 | `POST /api/token/regenerate` | Neuer `api_token`, alter ungültig |
| 8.12 | `POST /api/cron/check-winners` (falsches Secret) | 401 |
| 8.13 | Ohne Token (alle Endpoints) | 401 |

---

## 🔧 Vor Test-Start zu fixen

| # | Issue | Aktion |
|---|---|---|
| F1 | **Upstash Redis** (§11.1) | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` in Vercel Env-Vars setzen. Ohne ist Rate-Limiting ein No-Op. |
| F2 | **RESEND_API_KEY** | In Vercel Env-Vars setzen für Winner-E-Mails. Ohne schlagen Cron-Mails still fehl. |
| F3 | **CRON_SECRET** | Prüfen ob in Vercel Env-Vars gesetzt (für Cron-Jobs). |

---

## Testreihenfolge (empfohlen)

1. **F1–F3 fixen** (Env-Vars)
2. **Signup** (2.1–2.12) — Basis-Auth
3. **Source-Tracking** (3.1–3.3) — Onboarding-Pfad
4. **Badge-Demo** (1.1–1.3) — Dogfood
5. **Chrome Extension Hash-Modes** (4.1–4.4) — Picker-Auto-Start
6. **Goal-Picker** (5.1–5.5) — Goal erfassen
7. **Conversions** (6.1–6.6) — Kern-Flow
8. **Winner** (7.1–7.6) — Statistik + Cron
9. **API-Endpoints** (8.1–8.13) — curl-Durchlauf
