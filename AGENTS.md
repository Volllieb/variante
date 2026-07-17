# AGENTS.md — Arbeitsanweisungen variante

> Projektidentität, Stack, Struktur, Deployment: `PROJEKT.md`. Infrastruktur, Agents, Skills: `.github/copilot-instructions.md`. Historie: `docs/historie.md`

## Zero-Confirmation Policy

- **KEINE ERLAUBNIS FRAGEN.** Niemals "Soll ich...?", "Willst du...?", "Darf ich...?".
- **DEKLARATIV AUSFÜHREN.** Ansagen, nicht fragen. "Ich mache jetzt X", nicht "Soll ich X machen?".
- **AUTONOME ENTSCHEIDUNGEN.** Bei Ambiguität: Kontext nutzen, entscheiden, ausführen. Nur bei kritischen Lücken (fehlende Credentials, unklare Core-Requirements) nachfragen.
- **KONTINUIERLICHER FLUSS.** Durcharbeiten bis zum Abschluss. Kein Unterbrechen für Bestätigung.
- Bei Unklarheiten: Annahme treffen, transparent machen ("Annahme: X"), weitermachen.

## Standing Order

- **Auf Feature-Branch arbeiten** — nie direkt auf master, außer production-ready Fix.
- **Immer alle relevanten Projektinfos speichern** → in `PROJEKT.md` & `docs/` fortschreiben.
- **Nach jeder Änderung: Selbstprüfung** → `PROJEKT.md` §8 (git diff, git status, build, commit, push, docs).
- **Nach jeder logischen Einheit: Commit → Push.** Was nicht gepusht ist, ist vergessen.
- **Vor jedem Commit in `ab-tool/`:** `npm run vercel-build` muss grün sein. Kein Commit mit rotem Build.
- **Build-Pflicht:** `npm run vercel-build` in `ab-tool/` vor jedem Commit (seit 15.07.2026).
- **Deploy-Regel:** Preview-First (seit 16.07.2026). Feature-Branch → Preview. Nur `vercel promote` auf Anweisung. master = production.
- **Env-Var-Regel (seit 17.07.2026):** Source of Truth = Vercel. `ab-tool/.env.example` dokumentiert alle Vars. `ab-tool/.env.local` ist gitignored. `vercel env pull .env.local --yes` zum Syncen.

## Schätzungen & Qualität

- **Keine Zeitschätzungen.** Aufwand einschätzen: "trivial", "mittel", "aufwändig weil X, Y, Z".
- **Immer sauberste Version & Best Practice.** Korrekte Typen, keine any-Hacks, keine Workarounds. Der saubere Weg ist der einzig akzeptable — außer bewusster Tradeoff mit Protokoll in `PROJEKT.md`.
