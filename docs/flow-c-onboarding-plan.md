# Flow C — Onboarding-Redesign: Signup first, dann interaktives Onboarding

> Stand: 20.07.2026
> Status: Geplant (noch nicht umgesetzt)
>
> **Abhängigkeit:** Der Snippet-Check-Redesign (`docs/redesign-snippet-check.md`) sollte VOR oder parallel zu Flow C umgesetzt werden, da beide den Domain-Eingabe-Flow betreffen. Der Snippet-Status-Badge im Dashboard (aus dem Redesign) wird im Onboarding-Step 2 referenziert.

## Ziel

```
Landingpage → /signup → /onboarding (interaktiv) → /dashboard (mit Kontext)
```

Der User signed zuerst up, wird dann durch die produktiven ersten Schritte geführt und landet nicht in einem leeren Dashboard.

## Aktueller Flow (vor Änderung)

```
Landingpage → /onboarding (3 erklärende Steps) → /signup → Email bestätigen → /dashboard (leer)
```

Probleme:
- Onboarding ist nur Erklärung, keine Aktion
- Nach Signup landet User im leeren Dashboard
- Der Onboarding-Moment verpufft zwischen Signup-Hürde und Dashboard

## Zukünftiger Flow (Flow C)

```
Landingpage → /signup (2 Felder) → /onboarding (interaktiv) → /dashboard (mit erstem Test-Kontext)
```

- Signup ist der schnellstmögliche Einstieg
- Onboarding führt direkt durch die ersten produktiven Schritte
- Dashboard hat Kontext (Snippet installiert, Domain hinterlegt)

---

## Phase 1: Flow-Umkehr (Swap Signup/Onboarding)

### 1.1 Landingpage-Header & CTAs umbiegen

**Datei:** `ab-tool/app/page.tsx`

- Alle `signupUrl("/onboarding")` → `signupUrl("/signup")`
- Nav-Button: `/onboarding` → `/signup`
- Pricing-CTA-Links: `/onboarding` → `/signup`
- "Start now — it's free" CTA: `/onboarding` → `/signup`

**Aufwand:** trivial

### 1.2 Signup-Seite: Redirect-Logik umkehren

**Datei:** `ab-tool/app/signup/page.tsx`

Aktuell: `useEffect` redirectet von `/signup` zu `/onboarding` wenn `source`/`plan` gesetzt sind.

Neu:
- Kein Redirect mehr zu `/onboarding` — Signup ist der Einstieg
- `skip`-Parameter entfällt (Onboarding kommt nach Signup, nicht davor)
- Nach erfolgreichem Signup (Session vorhanden) → `/onboarding` statt `/dashboard`
- Bei Email-Confirmation: `emailRedirectTo` auf `/onboarding` statt `/dashboard`
- `onboardingQS()`-Helper anpassen oder entfernen

**Aufwand:** mittel

### 1.3 Auth-Callback anpassen

**Datei:** `ab-tool/app/auth/callback/route.ts`

- `next`-Param default: `/onboarding` statt `/dashboard` für frische Signups
- Aber: bestehende User (Login) weiterhin → `/dashboard`
- Lösung: `next`-Param unterscheiden — Signup setzt `/onboarding`, Login setzt `/dashboard`
- `ensureProfile` bleibt unverändert

**Aufwand:** mittel

### 1.4 Onboarding-Seite: Von statisch zu interaktiv (Post-Signup)

**Datei:** `ab-tool/app/onboarding/page.tsx`

- Wird `'use client'` (war Server Component)
- Erwartet Session — wenn keine da, redirect zu `/signup`
- 3 interaktive Steps statt 3 erklärenden Karten:

#### Step 1: Snippet anzeigen
- Session User erkennen via `getBrowserSupabase().auth.getSession()`
- API-Token aus `profiles` laden (via Server Action oder API-Route)
- Fertigen Snippet-Code mit Token generieren
- Copy-Button mit "Copied!"-Feedback
- Erklärung: "Paste this into your `<head>` tag"

#### Step 2: Domain verifizieren (optional)
- Eingabefeld für Domain-URL
- Speichert in `domains`-Tabelle (via Server Action)
- Erklärung: "Add your site so we know where to run tests"
- Kann übersprungen werden (später im Dashboard)

#### Step 3: Ready!
- Zusammenfassung: Snippet kopiert, Domain hinterlegt
- CTA: "Go to dashboard" → `/dashboard`

**Aufwand:** aufwändig

---

## Phase 2: Dashboard-Integration

### 2.1 Dashboard-Banner für fehlendes Snippet

**Datei:** `ab-tool/app/dashboard/DashboardClient.tsx`

- Wenn `hasVerifiedDomain` aber kein API-Call vom Snippet in den letzten 24h → Banner: "Install the snippet to start tracking"
- Wenn kein `hasVerifiedDomain` → Banner: "Add your site to start testing"
- Beide Banner haben CTA zurück zum `/onboarding`

**Aufwand:** mittel

### 2.2 Onboarding abschließbar machen

- User kann Onboarding jederzeit abbrechen → `/dashboard`
- Dashboard zeigt Banner "Finish onboarding" wenn Steps ausgelassen wurden

**Aufwand:** trivial (in 2.1 enthalten)

---

## Phase 3: Aufräumen & Qualität

### 3.1 Alte statische Onboarding-Seite entfernen

- `STEPS`-Array und erklärender Content fliegt raus
- Wird durch interaktive Steps ersetzt

### 3.2 @ponytail Review

- Code-Review der neuen Flow-Logik
- Prüfung: keine broken Links, keine zirkulären Redirects

### 3.3 Build & Deploy

- `npm run vercel-build` muss grün
- Commit & Push auf `main`

---

## Todo-Liste

| # | Task | Agent | Aufwand |
|---|---|---|---|
| 1 | Landingpage-Links umbiegen | @engineer | trivial |
| 2 | Signup-Redirect-Logik umkehren | @engineer | mittel |
| 3 | Auth-Callback: next-Param für Signups | @engineer | mittel |
| 4 | Onboarding interaktiv bauen (Step 1: Snippet) | @engineer | aufwändig |
| 5 | Onboarding interaktiv bauen (Step 2: Domain) | @engineer | mittel |
| 6 | Onboarding interaktiv bauen (Step 3: Ready) | @engineer | trivial |
| 7 | Dashboard-Banner für fehlendes Snippet | @engineer | mittel |
| 8 | @ponytail Review | @ponytail | — |
| 9 | Build & Deploy | @engineer | trivial |

## Risiken & Annahmen

- **Annahme:** `profiles.api_token` existiert für jeden User (wird vom DB-Trigger `handle_new_user` gesetzt)
- **Annahme:** Email-Confirmation ist ON — User mit unbestätigter Email können kein Snippet sehen → müssen erst bestätigen. Der `/onboarding`-Besuch nach Bestätigung funktioniert via `emailRedirectTo`
- **Risiko:** Zirkulärer Redirect wenn Auth-Callback und Onboarding sich gegenseitig hochschicken — muss durch `next`-Param-Logik verhindert werden
- **Risiko:** Google OAuth User landen nach Signup direkt im Dashboard (aktuell) — müssen auch zu `/onboarding` umgeleitet werden
