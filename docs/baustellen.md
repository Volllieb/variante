# Offene Baustellen

> Stand: 24.07.2026 — Sync mit PROJEKT.md §11 und `docs/produktionsreife-massnahmenplan.md`.

| # | Thema | Status | Aktion |
|---|---|---|---|
| 1 | SRI-Hash bei ab.js-Update | 🟡 Prozess | Bei jedem `ab.js`-Release: `sha384`-Hash neu generieren und in Snippet-Referenzen aktualisieren. Langfristig: Hash aus `lib/snippetCode.ts` als Single Source generieren. |
| 2 | k6-Loadtest ausführen | 🟡 Offen | `ab-tool/__tests__/load/main.k6.js` (smoke/load/stress). p95 <2s, Error <1%. |
| 3 | E2E-Coverage-Lücken | 🟡 Offen | Domain-Verification, Agent-Run, Stripe-Checkout ohne E2E-Spec. |
| 4 | Component-Splitting | 🟡 Später | `AccountClient.tsx` (876 Z.) + `ResultsClient.tsx` (1248 Z.) aufteilen. |
| 5 | Supabase CLI Migration | 🟡 Später | Von manuellem SQL-Editor auf `supabase db push` umstellen. |
| 6 | `paused`-State-Machine | 🟡 Dokumentation | Erlaubte Status-Übergänge dokumentieren und in CHECK-Constraints abbilden. |
| 7 | Counter-Tabelle (PERF-01 Vollausbau) | 🟡 Später | `test_counters`-Tabelle für Hot-Path-Entlastung von `tests`-Row-Locks. |
| 8 | TODO in TestCreationPanel.tsx:167 | 🟡 Später | `pageContext: undefined` — Page-Context aus ab.js-Picker für bessere AI-Vorschläge nutzen. File liegt in `docs/future-features/components/`. |
