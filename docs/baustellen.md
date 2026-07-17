# Offene Baustellen

| # | Thema | Status | Aktion |
|---|---|---|---|
| 1 | Upstash Redis Env-Vars | ✅ Erledigt | `amazing-mudfish-98038.upstash.io`, Free Tier, beide Env-Vars in Vercel gesetzt (Production + Preview). |
| 2 | SRI-Hash bei ab.js-Update | 🟡 Prozess | Bei jedem `ab.js`-Release: `sha384`-Hash neu generieren und in `README.md` + `DashboardClient.tsx` aktualisieren. |
| 3 | OpenAI-Kosten-Tracking | ✅ Erledigt | `OPENAI_MAX_MONTHLY_COST` Env-Var (default $20) + `profiles.monthly_gen_cost` + Check in /api/generate. Migration 012. |
| 4 | SENTRY_PROJECT in Vercel | ✅ Erledigt | `vercel env add SENTRY_PROJECT production preview --value variante`. 4 Sentry-Vars jetzt vollständig (DSN, ORG, PROJECT, AUTH_TOKEN). |
| 5 | ab-tool Vercel-Projekt: Env-Vars fehlen | 🟡 Später | `ab-tool`-Projekt deployt aktiv, hat aber keine Env-Vars. Entweder Env-Vars dorthin spiegeln oder Git-Integration auf `variante`-Projekt prüfen. |
| 6 | Tote Files (Wrapup 17.07.) | 🟡 Cleanup | 7 ungenutzte Files: `lib/detectLang.ts` (dupliziert in page.tsx), `app/components/AIWorkflowAnimation.tsx` (+ CSS), `app/components/HeroAnimation.tsx` (+ CSS), `app/components/LangToggle.tsx`, `app/components/NotificationCenter.tsx`, `app/components/ThemeToggle.tsx`, `app/dashboard/components/WhatToTestNext.tsx`. Entweder löschen oder in `docs/future-features/` verschieben. |
| 7 | TODO in TestCreationPanel.tsx:167 | 🟡 Später | `pageContext: undefined, // TODO: später aus ab.js picker anreichern` — Page-Context aus ab.js-Picker für bessere AI-Vorschläge nutzen. |
