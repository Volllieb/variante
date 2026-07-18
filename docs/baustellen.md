# Offene Baustellen

| # | Thema | Status | Aktion |
|---|---|---|---|
| 1 | Upstash Redis Env-Vars | ✅ Erledigt | `amazing-mudfish-98038.upstash.io`, Free Tier, beide Env-Vars in Vercel gesetzt (Production + Preview). |
| 2 | SRI-Hash bei ab.js-Update | 🟡 Prozess | Bei jedem `ab.js`-Release: `sha384`-Hash neu generieren und in `README.md` + `DashboardClient.tsx` aktualisieren. |
| 3 | OpenAI-Kosten-Tracking | ✅ Erledigt | `OPENAI_MAX_MONTHLY_COST` Env-Var (default $20) + `profiles.monthly_gen_cost` + Check in /api/generate. Migration 012. |
| 4 | SENTRY_PROJECT in Vercel | ✅ Erledigt | `vercel env add SENTRY_PROJECT production preview --value variante`. 4 Sentry-Vars jetzt vollständig (DSN, ORG, PROJECT, AUTH_TOKEN). |
| 5 | ab-tool Vercel-Projekt: Env-Vars fehlen | 🟡 Später | `ab-tool`-Projekt deployt aktiv, hat aber keine Env-Vars. Entweder Env-Vars dorthin spiegeln oder Git-Integration auf `variante`-Projekt prüfen. |
| 6 | Tote Files (Wrapup 17.07.) | ✅ Erledigt | Am 18.07. gelöscht (HeroAnimation, AIWorkflowAnimation, LangToggle, ThemeToggle, NewTestFlow + CSS-Module). Rest waren False Positives: `WhatToTestNext.tsx` + `NotificationCenter.tsx` sind seit dem Unified-Flow-Umbau aktiv eingebunden, `lib/detectLang.ts` wird von `page.tsx` importiert. |
| 7 | TODO in TestCreationPanel.tsx:167 | 🟡 Später | `pageContext: undefined, // TODO: später aus ab.js picker anreichern` — Page-Context aus ab.js-Picker für bessere AI-Vorschläge nutzen. |
| 8 | Stale-Editor-Buffer überschreiben Agent-Commits | 🔴 Prozess | 18.07.: Commit `d0a6eff` hat via veralteter Editor-Buffer die A11y-Fixes aus `742114b` still revertiert (in `419d7d1` wiederhergestellt) und Teile des Landing-Refactors `6d08349` rückgängig gemacht. Regel: Vor dem Speichern aus offenen Editor-Tabs nach Agent-Commits die Datei neu laden; nach jedem Commit `git diff` gegenlesen. |
| 9 | E2E-Coverage-Lücken (Roadmap §5.1) | 🟡 Später | Domain-Verification, Agent-Run, Stripe-Checkout ohne E2E-Spec. |
| 10 | k6-Loadtest ausführen | 🟡 Offen | Script liegt in `ab-tool/__tests__/load/main.k6.js` (Profile: smoke/load/stress, Doku im Header). Vor Launch: k6 installieren, `LOADTEST_SECRET` in Vercel-Preview setzen, gegen Preview-Deployment fahren. Akzeptanz: p95 <2s, Error-Rate <1%. |
