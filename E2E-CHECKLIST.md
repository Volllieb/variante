# E2E-Test-Checkliste — variante

> Stand: 08.07.2026. Kompletten Loop testen: Landing → Account → Figma → Snippet (inkl. Picker) → Traffic → Conversions → Billing → Winner.
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

- [ ] **Pricing** — Free (0 €, 1 Experiment, Badge an) vs Pro (35 €/mo, unbegrenzt, kein Badge), "Most popular"-Badge auf Pro
- [ ] **Footer** — "Made in Bavaria", Privacy, Imprint, © 2026
- [ ] **Badge-Demo** — "A/B by Variante"-Floating-Badge unten rechts, klickbar → `/signup`


## Phase 2: Auth

### Signup
- [x] **Email-Signup** edge cases (09.07.2026 — 3 Bugs gefixt, siehe unten)
- [x] **Source-Tracking** — `/signup?source=figma-plugin` → Source/Plan überleben jetzt Resend Confirmation, Google OAuth, Forgot-Password (09.07.2026)
- [ ] "Forgot password?" → Email eingeben → Reset-Link per Email
- [ ] Reset-Link klicken → `/update-password` → Neues Passwort setzen → Redirect `/dashboard`
- [x] **email===password-Check** asymmetrisch → jetzt `norm(email) === norm(password)` (09.07.2026)

### Auth-Bugs gefixt (09.07.2026)
| Bug | File | Fix |
|---|---|---|
| `source`/`plan` gingen bei Resend-Confirmation verloren | `signup/page.tsx` | `qsR` wird jetzt an `emailRedirectTo` gehängt |
| `source`/`plan` gingen bei Google OAuth Signup/Login verloren | `signup/page.tsx`, `login/page.tsx` | `qsG` wird jetzt an `redirectTo` gehängt |
| `source`/`plan` gingen beim Forgot-Password verloren | `login/page.tsx` | Source/Plan werden jetzt in `resetPasswordForEmail` redirectTo preserved |
| `source`/`plan`-Forwarding nach Password-Reset | `update-password/page.tsx` | Liest `useSearchParams()` und forwarded source/plan zum Dashboard |
| `email===password`-Check nur halb normalisiert | `signup/page.tsx` | `norm(email) === norm(password)` statt `norm(email) === password` |




---

## ⚠️ Chrome Extension — Deprecated (08.07.2026)

> Der Element-Picker ist jetzt direkt im `ab.js`-Snippet integriert. Die folgenden Extension-Tests sind obsolet und nur als Archiv erhalten.

- [ ] ~~**CWS-Install** — [Chrome Web Store](https://chromewebstore.google.com/detail/variante-—-ab-test-elemen/hopbdjfpmknemchgoonjommfemgihkbh) → "variante — A/B Test Element Picker" installieren~~

### URL-Hash-Modi (jetzt im Snippet-Picker)
- [ ] `#ab_pick=<testId>` — Startet Picker automatisch (kein Popup nötig)
- [ ] `#ab_goal=<testId>` — Startet Goal-Modus, klickbares Element = Goal

### Goal-Picker (jetzt im Snippet)
- [ ] Goal-Modus aktivieren (Test-ID mit Goal-Flag) → Klick auf Button/Link → Goal gespeichert

---

## Phase 9: Conversions

- [ ] **Goal klicken** — Klick auf Goal-Element → `sendBeacon` zu `/api/event`
- [ ] **`/api/event` 200** — POST mit `testId`, `variant`, `event=conversion`
- [ ] **sessionStorage-Dedup** — Zweiter Klick: `ab_conv_<test_id>` verhindert Doppel-Call
- [ ] **Dashboard aktualisieren** — Reload → Conversions gestiegen
- [ ] **Pausierter Test** — `status=paused`: `/api/event` → 409, kein Counter

## Phase 10: Results & Analyse

- [ ] **Dashboard → Test-Kachel** — Name, Status, Uplift %, Visitors, Conversions
- [ ] **Kachel klicken** → `/results/<id>`
- [ ] **Results-Seite** — CR % pro Variante, Visitors, Conversions
- [ ] **Preview** — Miniatur-iframe A + B nebeneinander mit Site-CSS
- [ ] **Auto-Refresh** — Pollt alle 5s, Zahlen aktualisieren sich live


## Phase 12: Winner-Mechanismus


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


- [ ] **Imprint** — `/imprint` lädt, Impressum-Daten korrekt
- [ ] **Kein CDN/Drittanbieter** — Network-Tab auf Landing Page: Nur `getvariante.com` + `supabase.co` + `openai.com` (bei Gen)
