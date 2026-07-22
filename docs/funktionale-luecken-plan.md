# Funktionale Lücken — Plan

> Erstellt: 22.07.2026. Ziel: Produkt funktional vollständig machen.
> Wenn dieser Plan abgearbeitet ist, wird diese Datei gelöscht.

## Übersicht

| # | Lücke | Typ | Aufwand | Agent |
|---|---|---|---|---|
| 1 | AgentPanel UI fehlt | Feature | mittel | engineer |
| 2 | Preview-first Onboarding fehlt | Feature | aufwändig | engineer |
| 3 | Element-Picker nicht im Web-Wizard | UX | mittel | engineer |
| 4 | E2E-Coverage-Lücken | Quality | mittel | engineer |
| 5 | k6-Loadtest nie ausgeführt | Quality | trivial | engineer |
| 6 | Snippet-Check-Redesign | Cleanup | mittel | engineer |

---

## 1. AgentPanel UI einbinden

**Problem:** `POST /api/agent` + `lib/agentTools.ts` leben, aber `AgentPanel.tsx` existiert nicht im Codebase. Der autonome CRO-Agent ist für User nicht erreichbar.

**Was zu tun:**
- `AgentPanel.tsx` im Dashboard einbauen (existierte laut Historie mal, wurde aber nie committed oder später gelöscht)
- Entry-Point: "Auto-Optimize"-Button irgendwo im Dashboard (Overview oder Tests-Seite)
- `useChat()`-Streaming-UI mit Live-Tool-Status-Zeilen
- `router.refresh()` nach erfolgreichem Run

**Abhängigkeiten:** Keine. `/api/agent` ist deployed und funktioniert.

**Akzeptanz:** Button im Dashboard → Klick → Agent läuft → Test erscheint in Test-Liste.

---

## 2. Preview-first Onboarding (Hybrid Onboarding v4)

**Problem:** User muss Snippet installieren bevor er irgendwas sieht. Kein Aha-Moment. Plan existiert seit 17.07. in `docs/future-features/hybrid-onboarding-plan.md`, aber kein Code.

**Was zu tun (Phase 1: Website):**
- `/api/preview` Route: URL → `fetch` + cheerio → GPT-4o → CSS-Regeln → urlbox Dual-Screenshot
- `/api/preview/refine` Route: Chat-basierte Verfeinerung
- Preview-UI auf `/onboarding`: URL-Eingabe → Screenshot-Toggle → Refine-Chat → Gate (Sign-up) → Snippet-Install
- `PreviewReadyBanner` im Dashboard ist schon vorbereitet, braucht nur die API
- Temp-Session-User → Claim nach Sign-up (`/api/claim-tests` existiert bereits)

**Abhängigkeiten:** urlbox.io API-Key. `lib/extractPageCode.ts` und `lib/screenshot.ts` existieren bereits.

**Akzeptanz:** User gibt URL ein → sieht Original+Variant-Screenshots → toggled → signt up → installiert Snippet → Test geht live.

---

## 3. Element-Picker in Web-Wizard integrieren

**Problem:** `NewTestDrawer` Step 0 (`StepUrlAndElement`) erwartet manuellen CSS-Selector. Der in `ab.js` eingebaute Picker funktioniert auf Kundenseiten, ist aber nicht mit dem Web-Dashboard verbunden.

**Was zu tun:**
- In `StepUrlAndElement.tsx` einen "Pick element on my site"-Button einbauen
- Wenn User klickt: Öffnet `https://user-site.com#ab_pick=<tempId>` in neuem Tab
- User pickt Element → Selector wird via Polling oder PostMessage zurückgegeben
- Oder simpler: Copy-Paste-Instruktion wie beim Snippet ("Füg diesen Code in die Console ein")

**Akzeptanz:** User klickt "Pick element" → pickt auf eigener Site → Selector erscheint automatisch im Wizard.

---

## 4. E2E-Coverage schließen

**Problem:** Baustelle #9. Keine automatisierten Tests für:
- Domain-Verification-Flow (Snippet install → Verify)
- Agent-Run (POST /api/agent → Test erscheint)
- Stripe-Checkout (nur manuell testbar)

**Was zu tun:**
- `domain.spec.ts`: Snippet-Install → Verify-Button → Domain confirmed
- `agent.spec.ts`: POST /api/agent mit Test-Domain → Test in DB
- Stripe-Checkout bleibt manuell (kein Stripe-Testmodus-Automation nötig für MVP)

**Akzeptanz:** `npm run test:e2e` deckt alle kritischen User-Flows ab.

---

## 5. k6-Loadtest ausführen

**Problem:** Baustelle #10. Script liegt in `ab-tool/__tests__/load/main.k6.js`, nie ausgeführt.

**Was zu tun:**
- k6 installieren (`winget install k6`)
- `LOADTEST_SECRET` in Vercel-Preview setzen
- Smoke-Test gegen Preview-Deployment fahren
- Ergebnisse dokumentieren (p95, Error-Rate)
- Bei Problemen: Bottlenecks fixen

**Akzeptanz:** p95 <2s, Error-Rate <1% unter Last.

---

## 6. Health Check → Snippet Check umbauen

**Problem:** Baustelle #11. `/dashboard/health` ist over-engineered (3 Steps, Figma-Bezug). Konzept für Snippet-Status-Badge im Dashboard existiert.

**Was zu tun:**
- `SnippetStatusBadge` ist schon im Dashboard — prüfen ob er korrekt funktioniert
- `/dashboard/health`-Seite entfernen oder auf Snippet-Only reduzieren
- Sidebar-Link aktualisieren
- `docs/future-features/redesign-snippet-check.md` als erledigt markieren

**Akzeptanz:** Snippet-Status ist direkt im Dashboard sichtbar, keine separate Health-Seite nötig.

---

## Reihenfolge

```
[1. AgentPanel UI] → sofortiger Wert, kleinster Aufwand
  ↓
[3. Element-Picker] → macht Wizard komplett
  ↓
[2. Preview-Onboarding] → größter Hebel für Conversion, aufwändigster Schritt
  ↓
[6. Health→Snippet] → Cleanup, während Onboarding frisch ist
  ↓
[4. E2E-Coverage] → Qualität vor Loadtest
  ↓
[5. k6-Loadtest] → Performance-Baseline vor Launch
```

## Nicht in diesem Plan

- **Agency-Tier:** Auf Eis bis 5+ Pro-Kunden (PROJEKT.md §5)
- **Self-Improving v3 (Learning Loop):** Konzept, kein Blocke
- **Figma-Plugin-Parität (Phase 2 Onboarding):** Extra-Plan im hybrid-onboarding-plan.md
- **OG-Image:** Kosmetik, kein funktionaler Blocker
- **Leadgen-Pipeline Vervollständigung:** GTM, nicht Produkt
- **AccountClient-Refactor (P2/P3):** Code-Qualität, kein funktionaler Bug
